import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Minus, Plus, ShoppingCart, ArrowLeft, Ticket, AlertTriangle, QrCode, Globe, Flame, CreditCard, ShieldCheck, Lock, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cpfError, formatCpf, onlyDigits } from "@/lib/cpf";

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
  const [cpfTouched, setCpfTouched] = useState(false);
  const [purchaseProtection, setPurchaseProtection] = useState(false);
  const [organizer, setOrganizer] = useState<{ name: string; document: string | null; verified: boolean } | null>(null);
  const [address, setAddress] = useState({
    zip: "", street: "", number: "", complement: "", district: "", city: "", state: "",
  });

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

  // Sobre o produtor (perfil + verificação KYC)
  useEffect(() => {
    const fetchOrganizer = async () => {
      const organizerId = (event as any)?.organizer_id;
      if (!organizerId) return;
      const [{ data: profile }, { data: verification }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", organizerId).maybeSingle(),
        supabase
          .from("organizer_verifications")
          .select("document_number, status")
          .eq("user_id", organizerId)
          .eq("status", "approved")
          .maybeSingle(),
      ]);
      if (profile?.full_name || verification) {
        setOrganizer({
          name: profile?.full_name || "Produtor PremierPass",
          document: verification?.document_number ?? null,
          verified: !!verification,
        });
      }
    };
    fetchOrganizer();
  }, [event]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.ticketType.price) * item.quantity, 0);
  const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
  // Detalhamento visual das taxas (soma exatamente os mesmos 8% já cobrados)
  const convenienceFee = Math.round(subtotal * 0.055 * 100) / 100;
  const processingFee = Math.round((serviceFee - convenienceFee) * 100) / 100;
  const protectionFee = purchaseProtection ? 3 : 0;
  const totalAmount = Math.round((subtotal + serviceFee + protectionFee) * 100) / 100;

  const cpfValidationError = cpfTouched ? cpfError(customerCpf) : null;

  const validateCustomerData = () => {
    if (cart.length === 0) {
      toast.error("Adicione ingressos");
      return false;
    }
    if (!customerName.trim()) {
      toast.error("Informe o nome completo");
      return false;
    }
    setCpfTouched(true);
    const err = cpfError(customerCpf);
    if (err) {
      toast.error(err);
      return false;
    }
    const missing = !address.zip || !address.street || !address.number || !address.district || !address.city || !address.state;
    if (missing) {
      toast.error("Preencha o endereço de cobrança completo");
      return false;
    }
    return true;
  };

  const handlePixCheckout = async () => {
    if (!validateCustomerData()) return;

    setProcessingPix(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: {
          event_id: id,
          site_id: siteId,
          customer_name: customerName,
          customer_cpf: onlyDigits(customerCpf),
          purchase_protection: purchaseProtection,
          billing_address: address,
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
    if (!validateCustomerData()) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      const { data, error } = await supabase.functions.invoke("create-mercadopago-checkout", {
        body: {
          event_id: id,
          site_id: siteId,
          customer_cpf: onlyDigits(customerCpf),
          purchase_protection: purchaseProtection,
          billing_address: address,
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

            {/* Sobre o produtor */}
            {organizer && (
              <Card className="bg-card/80 backdrop-blur-sm border-border">
                <CardContent className="p-4 md:p-5 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground">Sobre o produtor</h2>
                    <p className="text-sm text-muted-foreground">{organizer.name}</p>
                    {organizer.document && (
                      <p className="text-xs text-muted-foreground mt-0.5">Documento: {organizer.document}</p>
                    )}
                    {organizer.verified && (
                      <Badge className="mt-2 text-[11px] gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        Produtor verificado
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
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
                  (() => {
                    const total = Number(ticket.quantity_available ?? 0);
                    const sold = Number(ticket.quantity_sold ?? 0);
                    const remaining = Math.max(total - sold, 0);
                    const soldOut = remaining <= 0;
                    const threshold = Math.min(total * 0.15, 20);
                    const isLow = !soldOut && total > 0 && remaining <= threshold;

                    return (
                      <div
                        key={ticket.id}
                        className={`p-4 rounded-lg flex justify-between items-center gap-3 border transition-colors ${
                          soldOut
                            ? "border-transparent bg-muted/40 opacity-70"
                            : cart[0]?.ticketType.id === ticket.id
                              ? "border-primary bg-primary/10"
                              : "border-transparent bg-secondary/30"
                        }`}
                      >
                        <div className="min-w-0">
                          <h3 className="font-semibold">{ticket.name}</h3>
                          <p className="text-primary font-bold">R$ {Number(ticket.price).toFixed(2)}</p>
                          {soldOut ? (
                            <Badge variant="secondary" className="mt-2 text-[11px]">Esgotado</Badge>
                          ) : isLow ? (
                            <Badge className="mt-2 text-[11px] bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 gap-1">
                              <Flame className="w-3 h-3" />
                              {remaining <= 5 ? "Últimas unidades!" : `Restam ${remaining} ingressos`}
                            </Badge>
                          ) : null}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={soldOut}
                          onClick={() => setCart([{ ticketType: ticket, quantity: 1 }])}
                        >
                          {soldOut ? "Esgotado" : cart[0]?.ticketType.id === ticket.id ? "Selecionado" : "Selecionar"}
                        </Button>
                      </div>
                    );
                  })()
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
                      <div className="space-y-1">
                        <Input
                          placeholder="CPF"
                          inputMode="numeric"
                          value={formatCpf(customerCpf)}
                          maxLength={14}
                          aria-invalid={!!cpfValidationError}
                          className={cpfValidationError ? "border-destructive focus-visible:ring-destructive" : ""}
                          onChange={(e) => setCustomerCpf(onlyDigits(e.target.value).slice(0, 11))}
                          onBlur={() => setCpfTouched(true)}
                        />
                        {cpfValidationError && (
                          <p className="text-xs text-destructive">{cpfValidationError}</p>
                        )}
                      </div>
                    </div>

                    {/* Endereço de cobrança */}
                    <div className="bg-secondary/30 p-4 rounded-xl border border-border space-y-3">
                      <p className="text-xs font-bold text-primary uppercase">Endereço de Cobrança</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="CEP" inputMode="numeric" value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} />
                        <Input placeholder="Número" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                      </div>
                      <Input placeholder="Rua / Logradouro" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                      <Input placeholder="Complemento (opcional)" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                      <Input placeholder="Bairro" value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} />
                      <div className="grid grid-cols-3 gap-2">
                        <Input className="col-span-2" placeholder="Cidade" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                        <Input placeholder="UF" maxLength={2} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
                      </div>
                    </div>

                    {/* Compra Protegida */}
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-secondary/20 cursor-pointer">
                      <Checkbox
                        checked={purchaseProtection}
                        onCheckedChange={(v) => setPurchaseProtection(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        <span className="font-semibold block">Compra Protegida — R$ 3,00</span>
                        <span className="text-xs text-muted-foreground">
                          Cobertura opcional de reembolso em caso de imprevistos comprovados.
                        </span>
                      </span>
                    </label>

                    {/* Resumo com taxas detalhadas */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal dos ingressos</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Taxa de conveniência</span>
                        <span>R$ {convenienceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Taxa de processamento</span>
                        <span>R$ {processingFee.toFixed(2)}</span>
                      </div>
                      {protectionFee > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Compra Protegida</span>
                          <span>R$ {protectionFee.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>R$ {totalAmount.toFixed(2)}</span>
                    </div>

                    {/* Selos de segurança */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-primary" /> Pagamento seguro</span>
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Dados criptografados</span>
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

                    {paymentMethod === "pix" && (
                      <p className="text-xs text-muted-foreground">
                        O QR Code do PIX expira em <strong>2 minutos</strong>. A confirmação costuma ser imediata,
                        mas em casos raros pode levar até 2 horas.
                      </p>
                    )}

                    {/* Política de cancelamento */}
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Política de cancelamento
                      </p>
                      <p>
                        Cancelamento com reembolso integral em até 7 dias após a compra, desde que solicitado com no
                        mínimo 48 horas de antecedência do início do evento.
                      </p>
                      <p>
                        Fora desse prazo, você ainda pode <strong>transferir o ingresso</strong> para outra pessoa pelo
                        painel "Meus Ingressos", sem custo adicional.
                      </p>
                    </div>
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