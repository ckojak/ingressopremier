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
import SEO from "@/components/SEO";
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
  if (event.is_online) return true;
  const titleLower = event.title?.toLowerCase() || "";
  const descLower = event.description?.toLowerCase() || "";
  const categoryLower = event.category?.toLowerCase() || "";
  return categoryLower.includes("online") || titleLower.includes("online") || descLower.includes("100% online");
};

const formatEventDate = (event: Event) => {
  try {
    const start = format(new Date(event.start_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    return start.charAt(0).toUpperCase() + start.slice(1);
  } catch {
    return "Data a confirmar";
  }
};

const formatEventTime = (event: Event) => {
  try {
    return format(new Date(event.start_date), "HH:mm", { locale: ptBR });
  } catch {
    return null;
  }
};

const getEventLocation = (event: Event) => {
  if (isOnlineEvent(event)) return "Evento Online";
  const parts = [event.venue_name, event.city && event.state ? `${event.city}, ${event.state}` : event.city || event.state].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : "Local a confirmar";
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
    if (!customerName || customerCpf.length < 11) return toast.error("Preencha Nome e CPF corretamente!");

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      const { data, error } = await supabase.functions.invoke("create-mercadopago-checkout", {
        body: {
          event_id: id,
          site_id: siteId,
          customer_cpf: customerCpf.replace(/\D/g, ""),
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

  const eventUrl = `https://premierpass.com.br/evento/${event.id}`;
  const metaDescription = (event.description || `Compre ingressos para ${event.title} no PremierPass com segurança e entrega digital imediata.`).slice(0, 155);
  const lowestPrice = ticketTypes.length
    ? Math.min(...ticketTypes.map((t) => Number(t.price)))
    : undefined;
  const heroImage = event.banner_url || event.image_url;
  const eventDate = formatEventDate(event);
  const eventTime = formatEventTime(event);
  const eventLocation = getEventLocation(event);
  const online = isOnlineEvent(event);

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: metaDescription,
    startDate: event.start_date || undefined,
    endDate: event.end_date || undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    image: heroImage ? [heroImage] : undefined,
    url: eventUrl,
    location: online
      ? { "@type": "VirtualLocation", url: event.online_url || eventUrl }
      : {
          "@type": "Place",
          name: event.venue_name || event.title,
          address: {
            "@type": "PostalAddress",
            streetAddress: event.venue_address || undefined,
            addressLocality: event.city || undefined,
            addressRegion: event.state || undefined,
            addressCountry: "BR",
          },
        },
    organizer: { "@type": "Organization", name: "PremierPass", url: "https://premierpass.com.br" },
    offers: ticketTypes.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: Number(t.price),
      priceCurrency: "BRL",
      availability: t.is_active ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: eventUrl,
    })),
    ...(lowestPrice !== undefined ? { lowPrice: lowestPrice } : {}),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={event.title}
        description={metaDescription}
        url={eventUrl}
        type="event"
        image={heroImage || undefined}
        schema={eventSchema}
      />
      <Header />

      {/* Hero com imagem de capa */}
      <div className="relative w-full h-[45vh] min-h-[280px] max-h-[480px] mt-16 md:mt-20 overflow-hidden bg-secondary">
        {heroImage ? (
          <img
            src={heroImage}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <Ticket className="w-16 h-16 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />

        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {event.category && (
              <Badge className="gradient-primary text-primary-foreground border-0">
                {event.category}
              </Badge>
            )}
            {online && (
              <Badge variant="outline" className="bg-background/60 backdrop-blur-sm gap-1">
                <Globe className="w-3 h-3" />
                Online
              </Badge>
            )}
            {event.highlighted && (
              <Badge variant="destructive" className="gap-1">
                <Flame className="w-3 h-3" />
                Em destaque
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      <main className="pb-16 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6 md:mt-8">
          {/* Coluna principal: infos + descrição */}
          <div className="lg:col-span-2 space-y-6">
            {/* Data, hora e local */}
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardContent className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{eventDate}</p>
                    {eventTime && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        {eventTime}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {online ? <Globe className="w-5 h-5 text-primary" /> : <MapPin className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{eventLocation}</p>
                    {!online && event.venue_address && (
                      <p className="text-sm text-muted-foreground truncate">{event.venue_address}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Descrição */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">Sobre o evento</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {event.description || event.short_description || "Sem descrição disponível."}
              </p>
            </div>
          </div>

          {/* Coluna lateral: compra de ingressos */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-primary" /> Ingressos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {ticketTypes.length === 0 && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Sem ingressos disponíveis</AlertTitle>
                    <AlertDescription>Não há lotes ativos para este evento no momento.</AlertDescription>
                  </Alert>
                )}
                {ticketTypes.map(ticket => (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-lg flex justify-between items-center border transition-colors ${
                      cart[0]?.ticketType.id === ticket.id ? "border-primary bg-primary/10" : "border-transparent bg-secondary/30"
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold">{ticket.name}</h3>
                      <p className="text-primary font-bold">R$ {Number(ticket.price).toFixed(2)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCart([{ ticketType: ticket, quantity: 1 }])}>
                      {cart[0]?.ticketType.id === ticket.id ? "Selecionado" : "Selecionar"}
                    </Button>
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
                    {/* Dados do comprador: usado tanto por Pix quanto por Cartão, pois o
                        Mercado Pago usa Nome+CPF pra reduzir recusa por risco no cartão também */}
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                      <p className="text-xs font-bold text-primary uppercase">Dados do Comprador</p>
                      <Input placeholder="Nome Completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      <Input placeholder="CPF (apenas números)" value={customerCpf} maxLength={11} onChange={(e) => setCustomerCpf(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>R$ {totalAmount.toFixed(2)}</span>
                    </div>
                    {paymentMethod === "pix" ? (
                      <Button className="w-full bg-secondary min-h-[48px]" onClick={handlePixCheckout} disabled={processingPix}>
                        {processingPix ? "Gerando..." : "Pagar com PIX"}
                      </Button>
                    ) : (
                      <Button className="w-full min-h-[48px]" onClick={handleCardCheckout} disabled={processing}>
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