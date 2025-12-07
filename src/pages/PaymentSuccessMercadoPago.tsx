import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Ticket, ArrowRight, Loader2 } from "lucide-react";
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
  const [processing, setProcessing] = useState(false);

  const orderId = searchParams.get("order_id");
  const paymentStatus = searchParams.get("status");
  const paymentId = searchParams.get("payment_id");

  useEffect(() => {
    const processPayment = async () => {
      if (!orderId) {
        toast.error("ID do pedido não encontrado");
        navigate("/");
        return;
      }

      try {
        // Buscar detalhes do pedido
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

        // Se o pagamento foi aprovado e o pedido ainda está pendente, processar
        if (paymentStatus === "approved" && orderData.status === "pending") {
          setProcessing(true);

          // Atualizar status do pedido
          const { error: updateError } = await supabase
            .from("orders")
            .update({ 
              status: "paid",
              payment_intent_id: paymentId 
            })
            .eq("id", orderId);

          if (updateError) throw updateError;

          // Gerar ingressos
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", orderId);

          if (orderItems) {
            for (const item of orderItems) {
              for (let i = 0; i < item.quantity; i++) {
                const ticketCode = generateTicketCode();
                await supabase.from("tickets").insert({
                  order_item_id: item.id,
                  user_id: orderData.user_id,
                  event_id: orderData.event_id,
                  ticket_type_id: item.ticket_type_id,
                  ticket_code: ticketCode,
                });
              }

              // Atualizar quantidade vendida
              const { data: ticketType } = await supabase
                .from("ticket_types")
                .select("quantity_sold")
                .eq("id", item.ticket_type_id)
                .single();

              await supabase
                .from("ticket_types")
                .update({ quantity_sold: (ticketType?.quantity_sold || 0) + item.quantity })
                .eq("id", item.ticket_type_id);
            }
          }

          // Enviar email de confirmação
          try {
            await supabase.functions.invoke("send-ticket-email", {
              body: { orderId },
            });
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }

          setOrder(prev => prev ? { ...prev, status: "paid" } : null);
          toast.success("Pagamento confirmado com sucesso!");
        }
      } catch (error) {
        console.error("Error processing payment:", error);
        toast.error("Erro ao processar pagamento");
      } finally {
        setLoading(false);
        setProcessing(false);
      }
    };

    processPayment();
  }, [orderId, paymentStatus, paymentId, navigate]);

  const generateTicketCode = (): string => {
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
        <main className="pt-24 pb-16 min-h-[70vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">
              {processing ? "Processando seu pagamento..." : "Carregando..."}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = order?.status === "paid" || paymentStatus === "approved";

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
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-12 h-12 text-yellow-500" />
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
                    <Button asChild className="w-full gap-2">
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
