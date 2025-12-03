import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const { data: order, error } = await supabase
          .from("orders")
          .select(`
            *,
            events (title, start_date, venue_name, city, state),
            order_items (quantity, unit_price, ticket_types (name))
          `)
          .eq("id", orderId)
          .single();

        if (!error && order) {
          setOrderDetails(order);

          // Update order status to paid
          await supabase
            .from("orders")
            .update({ status: "paid" })
            .eq("id", orderId);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

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
                      Um email de confirmação será enviado para{" "}
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
              <Link to="/">
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Home className="w-4 h-4" />
                  Voltar ao início
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