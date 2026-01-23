import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Ticket, ArrowRight, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderItem {
  quantity: number;
  ticket_type_id: string;
  ticket_types?: {
    name: string;
  };
}

interface OrderDetails {
  id: string;
  total_amount: number;
  status: string;
  user_id: string;
  event_id: string;
  events?: {
    title: string;
    start_date: string;
  };
  order_items: OrderItem[];
}

const PaymentSuccessMercadoPago = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);

  const orderId = searchParams.get("order_id");
  const paymentStatus = searchParams.get("status");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        toast.error("ID do pedido não encontrado");
        navigate("/");
        return;
      }

      try {
        // Buscar detalhes do pedido - NÃO processar aqui, o webhook cuida disso
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            *,
            events (title, start_date),
            order_items (quantity, ticket_type_id, ticket_types (name))
          `)
          .eq("id", orderId)
          .single();

        if (orderError) throw orderError;

        setOrder({
          id: orderData.id,
          total_amount: orderData.total_amount,
          status: orderData.status,
          user_id: orderData.user_id,
          event_id: orderData.event_id,
          events: orderData.events,
          order_items: orderData.order_items,
        });

        // Se ainda estiver pendente, mostrar que está aguardando confirmação
        if (orderData.status === "pending" && paymentStatus === "approved") {
          toast.info("Aguardando confirmação do pagamento...");
        } else if (orderData.status === "paid") {
          toast.success("Pagamento confirmado com sucesso!");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Erro ao buscar pedido");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, paymentStatus, navigate]);

  // Escutar atualizações em tempo real do pedido
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-success-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Order update received:', payload);
          const newStatus = payload.new?.status;
          if (newStatus === 'paid') {
            setOrder(prev => prev ? { ...prev, status: 'paid' } : null);
            toast.success("Pagamento confirmado! Seus ingressos estão prontos.");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Polling como fallback para garantir atualização
  useEffect(() => {
    if (!orderId || order?.status === 'paid') return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      
      if (data?.status === 'paid') {
        setOrder(prev => prev ? { ...prev, status: 'paid' } : null);
        toast.success("Pagamento confirmado!");
      }
    };

    const pollInterval = setInterval(checkStatus, 3000);
    return () => clearInterval(pollInterval);
  }, [orderId, order?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 min-h-[70vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = order?.status === "paid";
  const isPending = order?.status === "pending";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            {isPaid ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Pagamento Confirmado!
                </h1>
                <p className="text-muted-foreground">
                  Seus ingressos foram gerados e enviados para seu email.
                </p>
              </>
            ) : isPending ? (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-12 h-12 text-yellow-500 animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Aguardando Confirmação
                </h1>
                <p className="text-muted-foreground">
                  Estamos processando seu pagamento. Isso pode levar alguns instantes.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Atualizando automaticamente...</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Processando Pagamento
                </h1>
                <p className="text-muted-foreground">
                  Aguarde enquanto confirmamos seu pagamento.
                </p>
              </>
            )}
          </motion.div>

          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    Detalhes do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.events && (
                    <div>
                      <p className="text-sm text-muted-foreground">Evento</p>
                      <p className="font-medium text-foreground">{order.events.title}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Ingressos</p>
                    {order.order_items.map((item, index) => (
                      <p key={index} className="font-medium text-foreground">
                        {item.quantity}x {item.ticket_types?.name || "Ingresso"}
                      </p>
                    ))}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {order.total_amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button asChild className="w-full gap-2" disabled={!isPaid}>
                      <Link to="/meus-ingressos">
                        Ver Meus Ingressos
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/eventos">Descobrir Mais Eventos</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessMercadoPago;
