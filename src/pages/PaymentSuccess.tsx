import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Ticket, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const processedRef = useRef(false);

  useEffect(() => {
    const processOrder = async () => {
      if (!orderId || processedRef.current) {
        setLoading(false);
        return;
      }

      processedRef.current = true;

      try {
        // Check if order is already paid
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .single();

        if (existingOrder?.status === "paid") {
          // Order already processed, just fetch details
          const { data: order } = await supabase
            .from("orders")
            .select(`
              *,
              events (title, start_date, venue_name, city, state),
              order_items (quantity, unit_price, ticket_types (name))
            `)
            .eq("id", orderId)
            .single();
          setOrderDetails(order);
          setLoading(false);
          return;
        }

        // Get session for user info
        const { data: { session } } = await supabase.auth.getSession();

        // Fetch full order details
        const { data: order, error } = await supabase
          .from("orders")
          .select(`
            *,
            events (id, title, start_date, venue_name, city, state),
            order_items (id, quantity, unit_price, ticket_type_id, ticket_types (name))
          `)
          .eq("id", orderId)
          .single();

        if (error || !order) {
          throw new Error("Order not found");
        }

        setOrderDetails(order);

        // Update order status to paid
        await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderId);

        // Generate tickets for each order item
        const ticketsToCreate: any[] = [];
        
        for (const item of order.order_items || []) {
          for (let i = 0; i < item.quantity; i++) {
            // Generate unique ticket code
            const ticketCode = generateTicketCode();
            
            ticketsToCreate.push({
              ticket_code: ticketCode,
              order_item_id: item.id,
              ticket_type_id: item.ticket_type_id,
              event_id: order.events?.id,
              user_id: session?.user?.id || null,
              attendee_email: order.customer_email,
              attendee_name: order.customer_name,
              is_used: false,
            });
          }
        }

        if (ticketsToCreate.length > 0) {
          const { error: ticketError } = await supabase
            .from("tickets")
            .insert(ticketsToCreate);

          if (ticketError) {
            console.error("Error creating tickets:", ticketError);
          }

          // Update quantity_sold on ticket_types
          for (const item of order.order_items || []) {
            const { data: ticketType } = await supabase
              .from("ticket_types")
              .select("quantity_sold")
              .eq("id", item.ticket_type_id)
              .single();

            if (ticketType) {
              await supabase
                .from("ticket_types")
                .update({ quantity_sold: (ticketType.quantity_sold || 0) + item.quantity })
                .eq("id", item.ticket_type_id);
            }
          }
        }

        // Send confirmation email
        try {
          await supabase.functions.invoke("send-ticket-email", {
            body: { orderId },
          });
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      } catch (error) {
        console.error("Error processing order:", error);
      } finally {
        setLoading(false);
      }
    };

    processOrder();
  }, [orderId]);

  // Generate a unique ticket code
  const generateTicketCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Pagamento Confirmado!
              </h1>
              <p className="text-muted-foreground">
                Seus ingressos foram reservados com sucesso.
              </p>
            </div>

            {loading ? (
              <Card className="bg-card border-border">
                <CardContent className="py-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
                  </div>
                </CardContent>
              </Card>
            ) : orderDetails ? (
              <Card className="bg-card border-border text-left">
                <CardContent className="py-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {orderDetails.events?.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {orderDetails.events?.venue_name && `${orderDetails.events.venue_name}, `}
                        {orderDetails.events?.city}, {orderDetails.events?.state}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-2">
                    <h4 className="font-medium text-foreground">Detalhes do pedido</h4>
                    {orderDetails.order_items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.ticket_types?.name}
                        </span>
                        <span className="text-foreground">
                          R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-2 border-t border-border">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">
                        R$ {Number(orderDetails.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                    <p>
                      Um email de confirmação foi enviado para{" "}
                      <span className="text-foreground font-medium">
                        {orderDetails.customer_email}
                      </span>{" "}
                      com seus ingressos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Obrigado pela sua compra! Seus ingressos serão enviados por email.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/meus-ingressos">
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Ticket className="w-4 h-4" />
                  Ver meus ingressos
                </Button>
              </Link>
              <Link to="/eventos">
                <Button className="gap-2 w-full sm:w-auto">
                  Ver mais eventos
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;