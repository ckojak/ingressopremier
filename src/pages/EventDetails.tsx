import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Minus, Plus, ShoppingCart, ArrowLeft, Ticket, AlertTriangle, QrCode, Globe, Flame, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PaymentErrorBoundary from "@/components/PaymentErrorBoundary";
import EventDetailsSkeleton from "@/components/skeletons/EventDetailsSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useIsMobile } from "@/hooks/use-mobile";

type Event = Tables<"events">;
type TicketType = Tables<"ticket_types">;

interface CartItem {
  ticketType: TicketType;
  quantity: number;
}

const isOnlineEvent = (event: Event) => {
  const titleLower = event.title?.toLowerCase() || "";
  const descLower = event.description?.toLowerCase() || "";
  const categoryLower = event.category?.toLowerCase() || "";
  return categoryLower.includes("online") || titleLower.includes("online") || descLower.includes("100% online");
};

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { siteId } = useSiteContext();
  const isMobile = useIsMobile();
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingPix, setProcessingPix] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  
  // DADOS DO COMPRADOR NA TELA
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!id) return;
      try {
        const { data: eventData } = await supabase.from("events").select("*").eq("id", id).eq("status", "published").single();
        if (eventData) setEvent(eventData);
        const { data: ticketsData } = await supabase.from("ticket_types").select("*").eq("event_id", id).eq("is_active", true).order("price", { ascending: true });
        setTicketTypes(ticketsData || []);
      } catch (error) {
        toast.error("Erro ao carregar evento");
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetails();
  }, [id]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.ticketType.price) * item.quantity, 0);
  const serviceFee = subtotal * 0.08;
  const totalAmount = subtotal + serviceFee;

  const handlePixCheckout = async () => {
    if (cart.length === 0) return toast.error("Adicione ingressos");
    if (!customerName || customerCpf.length < 11) return toast.error("Preencha Nome e CPF corretamente!");

    setProcessingPix(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: {
          event_id: id,
          site_id: siteId,
          customer_name: customerName,
          customer_cpf: customerCpf.replace(/\D/g, ""),
          items: cart.map(item => ({ ticket_type_id: item.ticketType.id, quantity: item.quantity })),
        },
      });

      if (data?.success) {
        sessionStorage.setItem('pix_checkout_data', JSON.stringify(data));
        navigate(`/checkout/pix?order_id=${data.order_id}`);
      } else {
        throw new Error(data?.error || "Falha no PIX");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingPix(false);
    }
  };

  const handleCardCheckout = async () => {
    if (cart.length === 0) return toast.error("Adicione ingressos");

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      const { data, error } = await supabase.functions.invoke("create-mercadopago-checkout", {
        body: {
          event_id: id,
          site_id: siteId,
          items: cart.map(item => ({ ticket_type_id: item.ticketType.id, quantity: item.quantity })),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.checkout_url) throw new Error("Não foi possível iniciar o pagamento com cartão");

      window.location.href = data.checkout_url;
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar pagamento");
      setProcessing(false);
    }
  };

  if (loading) return <EventDetailsSkeleton />;
  if (!event) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
            <p className="text-muted-foreground">{event.description}</p>
          </div>

          <div className="space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-primary" /> Ingressos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {ticketTypes.map(ticket => (
                  <div key={ticket.id} className="p-4 rounded-lg bg-secondary/30 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{ticket.name}</h3>
                      <p className="text-primary font-bold">R$ {Number(ticket.price).toFixed(2)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCart([{ticketType: ticket, quantity: 1}])}>Selecionar</Button>
                  </div>
                ))}

                {cart.length > 0 && (
                  <div className="pt-4 space-y-4 border-t border-border">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-primary uppercase">Forma de Pagamento</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("pix")}
                          className={`p-3 rounded-xl border text-left transition-all ${paymentMethod === "pix" ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:bg-secondary/50"}`}
                        >
                          <QrCode className="w-5 h-5 mb-1 text-primary" />
                          <span className="block text-sm font-semibold">Pix</span>
                          <span className="block text-xs text-muted-foreground">Aprovação imediata</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("card")}
                          className={`p-3 rounded-xl border text-left transition-all ${paymentMethod === "card" ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:bg-secondary/50"}`}
                        >
                          <CreditCard className="w-5 h-5 mb-1 text-primary" />
                          <span className="block text-sm font-semibold">Cartão</span>
                          <span className="block text-xs text-muted-foreground">Crédito ou débito</span>
                        </button>
                      </div>
                    </div>
                    {paymentMethod === "pix" && (
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                      <p className="text-xs font-bold text-primary uppercase">Dados do Comprador</p>
                      <Input placeholder="Nome Completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      <Input placeholder="CPF (apenas números)" value={customerCpf} maxLength={11} onChange={(e) => setCustomerCpf(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>R$ {totalAmount.toFixed(2)}</span>
                    </div>
                    {paymentMethod === "pix" ? (
                    <Button className="w-full bg-secondary" onClick={handlePixCheckout} disabled={processingPix}>
                      {processingPix ? "Gerando..." : "Pagar com PIX"}
                    </Button>
                    ) : (
                    <Button className="w-full" onClick={handleCardCheckout} disabled={processing}>
                      {processing ? "Redirecionando..." : "Pagar com Cartão"}
                    </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventDetails;
