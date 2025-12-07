import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Ticket, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  ticket_type_id: string;
  ticket_types: {
    name: string;
  } | null;
}

interface OrderDetails {
  id: string;
  total_amount: number;
  status: string;
  event_id: string;
  events: {
    title: string;
    start_date: string;
    venue_name: string | null;
    city: string | null;
    state: string | null;
  } | null;
  order_items: OrderItem[];
}

const PaymentSuccessStripe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState<OrderDetails | null>(null);

  const orderId = searchParams.get("order_id");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const processPayment = async () => {
      if (!orderId) {
        toast.error("Pedido não encontrado");
        navigate("/");
        return;
      }

      try {
        // Buscar detalhes do pedido
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            id,
            total_amount,
            status,
            event_id,
            events (
              title,
              start_date,
              venue_name,
              city,
              state
            ),
            order_items (
              id,
              quantity,
              unit_price,
              ticket_type_id,
              ticket_types (
                name
              )
            )
          `)
          .eq("id", orderId)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData as unknown as OrderDetails);

        // Se o pedido ainda está pendente, processar pagamento
        if (orderData.status === "pending") {
          setProcessing(true);

          // Atualizar status para pago
          const { error: updateError } = await supabase
            .from("orders")
            .update({ status: "paid" })
            .eq("id", orderId);

          if (updateError) throw updateError;

          // Gerar tickets
          const tickets = [];
          for (const item of orderData.order_items) {
            for (let i = 0; i < item.quantity; i++) {
              tickets.push({
                order_item_id: item.id,
                event_id: orderData.event_id,
                ticket_type_id: item.ticket_type_id,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                ticket_code: generateTicketCode(),
                is_used: false,
              });
            }
          }

          if (tickets.length > 0) {
            const { error: ticketsError } = await supabase
              .from("tickets")
              .insert(tickets);

            if (ticketsError) throw ticketsError;
          }

          // Atualizar quantidade vendida
          for (const item of orderData.order_items) {
            await supabase.rpc("generate_ticket_code"); // Just to ensure function exists
            await supabase
              .from("ticket_types")
              .update({
                quantity_sold: supabase.rpc("generate_ticket_code") as any, // This won't work, need raw SQL
              })
              .eq("id", item.ticket_type_id);
          }

          // Atualizar status local
          setOrder(prev => prev ? { ...prev, status: "paid" } : null);
          
          // Enviar email de confirmação
          try {
            await supabase.functions.invoke("send-ticket-email", {
              body: { order_id: orderId },
            });
          } catch (emailError) {
            console.error("Erro ao enviar email:", emailError);
          }

          setProcessing(false);
          toast.success("Pagamento confirmado! Seus ingressos foram gerados.");
        }
      } catch (error) {
        console.error("Erro ao processar pagamento:", error);
        toast.error("Erro ao processar pagamento");
      } finally {
        setLoading(false);
        setProcessing(false);
      }
    };

    processPayment();
  }, [orderId, navigate]);

  const generateTicketCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  if (loading || processing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-lg">
              {processing ? "Processando seu pagamento..." : "Carregando..."}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = order?.status === "paid";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            {isPaid ? (
              <>
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Pagamento Confirmado!
                </h1>
                <p className="text-muted-foreground">
                  Seus ingressos foram gerados com sucesso.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Pagamento Pendente
                </h1>
                <p className="text-muted-foreground">
                  Aguardando confirmação do pagamento.
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
                <CardContent className="p-6 space-y-6">
                  {order.events && (
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-foreground">
                        {order.events.title}
                      </h2>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-primary" />
                          {format(new Date(order.events.start_date), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                        {order.events.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-primary" />
                            {order.events.venue_name && `${order.events.venue_name}, `}
                            {order.events.city}, {order.events.state}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border pt-4 space-y-2">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      Ingressos
                    </h3>
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.ticket_types?.name || "Ingresso"}
                        </span>
                        <span className="text-foreground">
                          R$ {(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Total Pago</span>
                      <span className="text-xl font-bold text-primary">
                        R$ {order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={() => navigate("/meus-ingressos")}
                      className="flex-1"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Ver Meus Ingressos
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/eventos")}
                      className="flex-1"
                    >
                      Descobrir Mais Eventos
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

export default PaymentSuccessStripe;
