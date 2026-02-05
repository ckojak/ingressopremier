import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, Loader2, RefreshCw, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PaymentErrorBoundary from "@/components/PaymentErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'failed' | 'processing';

interface OrderData {
  id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  event_id: string;
  events?: {
    title: string;
  };
}

const CheckoutStatusContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const status = searchParams.get("status"); // success, pending, failure from MP back_urls

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('processing');

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at, event_id, events(title)")
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
        setLoading(false);
        return;
      }

      const orderData = {
        ...data,
        events: data.events as { title: string } | undefined
      } as OrderData;

      setOrder(orderData);
      setCurrentStatus(orderData.status as OrderStatus);
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  // Set initial status based on MP redirect param
  useEffect(() => {
    if (status === 'success') {
      setCurrentStatus('paid');
    } else if (status === 'failure') {
      setCurrentStatus('failed');
    } else if (status === 'pending') {
      setCurrentStatus('pending');
    }
  }, [status]);

  // Listen for realtime updates on this order
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          const newStatus = payload.new.status as OrderStatus;
          setCurrentStatus(newStatus);
          
          if (newStatus === 'paid') {
            // Redirect to success page after a short delay
            setTimeout(() => {
              navigate(`/pagamento-sucesso?order_id=${orderId}`);
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate]);

  // Auto-redirect if already paid
  useEffect(() => {
    if (currentStatus === 'paid' && orderId) {
      const timer = setTimeout(() => {
        navigate(`/pagamento-sucesso?order_id=${orderId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStatus, orderId, navigate]);

  const getStatusContent = () => {
    switch (currentStatus) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-500" />,
          title: "Pagamento Aprovado!",
          description: "Seu pagamento foi confirmado. Redirecionando para seus ingressos...",
          color: "text-green-500",
          bgColor: "bg-green-500/10"
        };
      case 'pending':
      case 'processing':
        return {
          icon: <Clock className="w-16 h-16 text-yellow-500 animate-pulse" />,
          title: "Processando Pagamento",
          description: "Estamos aguardando a confirmação do seu pagamento. Isso pode levar alguns instantes.",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10"
        };
      case 'cancelled':
      case 'failed':
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: "Pagamento Não Aprovado",
          description: "Houve um problema com seu pagamento. Por favor, tente novamente.",
          color: "text-red-500",
          bgColor: "bg-red-500/10"
        };
      default:
        return {
          icon: <Loader2 className="w-16 h-16 text-muted-foreground animate-spin" />,
          title: "Verificando Status",
          description: "Aguarde enquanto verificamos o status do seu pagamento...",
          color: "text-muted-foreground",
          bgColor: "bg-muted"
        };
    }
  };

  const statusContent = getStatusContent();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Pedido não encontrado
                </h2>
                <p className="text-muted-foreground mb-6">
                  Não foi possível identificar seu pedido.
                </p>
                <Button onClick={() => navigate("/eventos")}>
                  Voltar para eventos
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="py-12">
                {/* Status Icon */}
                <div className={`w-24 h-24 mx-auto rounded-full ${statusContent.bgColor} flex items-center justify-center mb-6`}>
                  {statusContent.icon}
                </div>

                {/* Status Text */}
                <div className="text-center mb-8">
                  <h1 className={`text-2xl font-bold mb-2 ${statusContent.color}`}>
                    {statusContent.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {statusContent.description}
                  </p>
                </div>

                {/* Order Info */}
                {order && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Evento:</span> {order.events?.title}</p>
                      <p><span className="font-medium">Pedido:</span> {order.id.slice(0, 8)}...</p>
                      <p><span className="font-medium">Valor:</span> R$ {order.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                )}

                {/* Processing Animation */}
                {(currentStatus === 'pending' || currentStatus === 'processing') && (
                  <div className="flex justify-center items-center gap-2 text-muted-foreground text-sm mb-6">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aguardando confirmação do pagamento...</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  {currentStatus === 'paid' && (
                    <Button 
                      onClick={() => navigate("/meus-ingressos")}
                      className="w-full gap-2"
                    >
                      <Ticket className="w-4 h-4" />
                      Ver Meus Ingressos
                    </Button>
                  )}

                  {(currentStatus === 'cancelled' || currentStatus === 'failed') && (
                    <>
                      <Button 
                        onClick={() => order && navigate(`/evento/${order.event_id}`)}
                        className="w-full gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigate("/eventos")}
                        className="w-full"
                      >
                        Ver Outros Eventos
                      </Button>
                    </>
                  )}

                  {(currentStatus === 'pending' || currentStatus === 'processing') && (
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/meus-ingressos")}
                      className="w-full"
                    >
                      Ir para Meus Ingressos
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const CheckoutStatus = () => {
  return (
    <PaymentErrorBoundary
      fallbackTitle="Erro ao verificar pagamento"
      fallbackMessage="Não foi possível verificar o status do seu pagamento. Verifique 'Meus Ingressos' ou tente novamente."
    >
      <CheckoutStatusContent />
    </PaymentErrorBoundary>
  );
};

export default CheckoutStatus;
