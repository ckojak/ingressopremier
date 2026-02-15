import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Minus, Plus, ShoppingCart, ArrowLeft, Ticket, AlertTriangle, QrCode, Globe, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input"; // Importado para os novos campos
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
  return (
    categoryLower.includes("online") ||
    titleLower.includes("online") ||
    descLower.includes("100% online") ||
    descLower.includes("acesso exclusivo via")
  );
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
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // NOVOS ESTADOS PARA O CHECKOUT DIRETO
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!id) return;

      try {
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .eq("status", "published")
          .single();

        if (eventError) throw eventError;
        setEvent(eventData);

        const { data: ticketsData, error: ticketsError } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("event_id", id)
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (ticketsError) throw ticketsError;
        setTicketTypes(ticketsData || []);

        const pendingCart = localStorage.getItem("pendingCart");
        if (pendingCart) {
          const parsed = JSON.parse(pendingCart);
          if (parsed.eventId === id && ticketsData) {
            const restoredCart: CartItem[] = [];
            for (const item of parsed.items) {
              const ticketType = ticketsData.find(t => t.id === item.ticketTypeId);
              if (ticketType) {
                restoredCart.push({ ticketType, quantity: item.quantity });
              }
            }
            if (restoredCart.length > 0) {
              setCart(restoredCart);
              toast.success("Seu carrinho foi restaurado!");
            }
            localStorage.removeItem("pendingCart");
          }
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        toast.error("Evento não encontrado");
        navigate("/eventos");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, navigate]);

  const updateCart = (ticketType: TicketType, delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.ticketType.id === ticketType.id);
      const available = ticketType.quantity_available - (ticketType.quantity_sold || 0);
      const maxPerOrder = ticketType.max_per_order || 10;

      if (existing) {
        const newQuantity = existing.quantity + delta;
        if (newQuantity <= 0) {
          return prev.filter(item => item.ticketType.id !== ticketType.id);
        }
        if (newQuantity > Math.min(available, maxPerOrder)) {
          toast.error(`Máximo de ${Math.min(available, maxPerOrder)} ingressos por pedido`);
          return prev;
        }
        return prev.map(item =>
          item.ticketType.id === ticketType.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else if (delta > 0) {
        if (delta > Math.min(available, maxPerOrder)) {
          toast.error(`Máximo de ${Math.min(available, maxPerOrder)} ingressos por pedido`);
          return prev;
        }
        return [...prev, { ticketType, quantity: delta }];
      }
      return prev;
    });
  };

  const getCartQuantity = (ticketTypeId: string) => {
    return cart.find(item => item.ticketType.id === ticketTypeId)?.quantity || 0;
  };

  const SERVICE_FEE_PERCENTAGE = 0.08;

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.ticketType.price) * item.quantity,
    0
  );

  const serviceFee = subtotal * SERVICE_FEE_PERCENTAGE;
  const totalAmount = subtotal + serviceFee;
  const totalTickets = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = () => {
    if (cart.length === 0) {
      toast.error("Adicione ingressos ao carrinho");
      return;
    }

    const existingCart = localStorage.getItem("cart");
    let cartData = existingCart ? JSON.parse(existingCart) : { items: [] };

    cart.forEach(item => {
      const existingIndex = cartData.items.findIndex(
        (i: any) => i.ticketTypeId === item.ticketType.id
      );

      if (existingIndex >= 0) {
        cartData.items[existingIndex].quantity += item.quantity;
      } else {
        cartData.items.push({
          ticketTypeId: item.ticketType.id,
          quantity: item.quantity,
        });
      }
    });

    localStorage.setItem("cart", JSON.stringify(cartData));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success(`${totalTickets} ingresso(s) adicionado(s) ao carrinho!`);
    setCart([]);
  };

  // LOGICA ALTERADA PARA CAPTURAR DADOS NA TELA (CARTÃO)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Adicione ingressos ao carrinho");
      return;
    }

    if (!customerName || customerCpf.length < 11) {
      toast.error("Preencha seu nome e CPF completo para continuar");
      return;
    }

    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        localStorage.setItem("pendingCart", JSON.stringify({
          eventId: id,
          items: cart.map(item => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
          })),
        }));
        toast.info("Faça login para continuar com a compra");
        navigate("/auth", { state: { from: `/evento/${id}` } });
        return;
      }

      const checkoutPayload = {
        event_id: id,
        site_id: siteId,
        customer_name: customerName,
        customer_cpf: customerCpf,
        items: cart.map(item => ({
          ticket_type_id: item.ticketType.id,
          quantity: item.quantity,
          unit_price: Number(item.ticketType.price),
        })),
      };

      const { data: mpData, error: mpError } = await supabase.functions.invoke("create-mercadopago-checkout", {
        body: checkoutPayload,
      });

      if (!mpError && (mpData?.checkout_url || mpData?.sandbox_url)) {
        if (mpData.is_sandbox) {
          setIsSandboxMode(true);
          toast.info("Modo de teste ativo - use cartões de teste");
        }
        window.location.href = mpData.checkout_url;
        return;
      }

      toast.info("Processando pagamento alternativo...");

      const { data: stripeData, error: stripeError } = await supabase.functions.invoke("create-stripe-checkout", {
        body: checkoutPayload,
      });

      if (stripeError) throw new Error("Não foi possível processar o pagamento. Tente novamente.");

      if (stripeData?.checkout_url) {
        window.location.href = stripeData.checkout_url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setProcessing(false);
    }
  };

  // LOGICA ALTERADA PARA CAPTURAR DADOS NA TELA (PIX)
  const handlePixCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Adicione ingressos ao carrinho");
      return;
    }

    if (!customerName || customerCpf.length < 11) {
      toast.error("Nome e CPF são obrigatórios para gerar o PIX");
      return;
    }

    setProcessingPix(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        localStorage.setItem("pendingCart", JSON.stringify({
          eventId: id,
          items: cart.map(item => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
          })),
        }));
        toast.info("Faça login para continuar com a compra");
        navigate("/auth", { state: { from: `/evento/${id}` } });
        return;
      }

      const checkoutPayload = {
        event_id: id,
        site_id: siteId,
        customer_name: customerName,
        customer_cpf: customerCpf,
        items: cart.map(item => ({
          ticket_type_id: item.ticketType.id,
          quantity: item.quantity,
        })),
      };

      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: checkoutPayload,
      });

      if (error) {
        throw new Error("Não foi possível gerar o PIX. Tente novamente.");
      }

      if (data?.success) {
        sessionStorage.setItem('pix_checkout_data', JSON.stringify(data));
        navigate(`/checkout/pix?order_id=${data.order_id}`);
      } else {
        throw new Error(data?.error || "Erro ao gerar pagamento PIX");
      }
    } catch (error: any) {
      console.error("PIX checkout error:", error);
      toast.error(error.message || "Erro ao processar pagamento PIX");
    } finally {
      setProcessingPix(false);
    }
  };

  if (loading) {
    return <EventDetailsSkeleton />;
  }

  if (!event) {
    return null;
  }

  const online = isOnlineEvent(event);

  return (
    <PaymentErrorBoundary
      fallbackTitle="Erro ao carregar evento"
      fallbackMessage="Não foi possível carregar os detalhes do evento. Tente novamente."
    >
    <div className="min-h-screen bg-background">
      <Header />
      <main className={`pt-24 ${isMobile && cart.length > 0 ? 'pb-44' : 'pb-16'}`}>
        {/* Mobile: Full-width hero image */}
        {isMobile && (
          <div className="relative w-full aspect-[16/9] overflow-hidden mb-4">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 flex items-center justify-center">
                <Ticket className="w-20 h-20 text-primary/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {event.category && (
                <Badge className="bg-primary text-primary-foreground shadow-lg text-xs">
                  {event.category}
                </Badge>
              )}
              {online && (
                <Badge className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 text-xs font-bold animate-pulse">
                  <Globe className="w-3 h-3 mr-1" />
                  100% Online
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {!isMobile && (
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 shadow-2xl shadow-primary/10">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 flex items-center justify-center">
                        <Ticket className="w-24 h-24 text-primary/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      {event.category && (
                        <Badge className="bg-primary text-primary-foreground shadow-lg">
                          {event.category}
                        </Badge>
                      )}
                      {online && (
                        <Badge className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 font-bold animate-pulse">
                          <Globe className="w-3.5 h-3.5 mr-1" />
                          100% Online
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {event.title.split(' ').map((word, i) => 
                    i === 0 ? <span key={i}>{word} </span> : <span key={i} className="text-gradient">{word} </span>
                  )}
                </h1>

                <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>
                      {format(new Date(event.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span>
                      {format(new Date(event.start_date), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {online ? (
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">Acesso Online Exclusivo</span>
                    </div>
                  ) : event.city ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span>
                        {event.venue_name && `${event.venue_name}, `}
                        {event.city}, {event.state}
                      </span>
                    </div>
                  ) : null}
                </div>

                {event.short_description && (
                  <p className="text-lg text-muted-foreground mb-4">
                    {event.short_description}
                  </p>
                )}

                {event.description && (
                  <div className="prose prose-invert max-w-none">
                    <h2 className="text-xl font-semibold text-foreground mb-2">Sobre o evento</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                )}

                {!online && event.venue_address && (
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold text-foreground mb-2">Local</h2>
                    <p className="text-muted-foreground">
                      {event.venue_name && <span className="font-medium">{event.venue_name}</span>}
                      <br />
                      {event.venue_address}
                      <br />
                      {event.city}, {event.state}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            <div className={`space-y-6 ${isMobile ? '' : ''}`}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border-border sticky top-24 shadow-xl shadow-primary/5">
                  {isSandboxMode && (
                    <Alert className="m-4 mb-0 border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertTitle className="text-yellow-500">Modo de Teste</AlertTitle>
                      <AlertDescription className="text-yellow-500/80 text-sm">
                        Use cartões de teste do Mercado Pago.
                      </AlertDescription>
                    </Alert>
                  )}
                  <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-primary" />
                      <span>Ingressos</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ticketTypes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Ingressos não disponíveis
                      </p>
                    ) : (
                      ticketTypes.map(ticket => {
                        const available = ticket.quantity_available - (ticket.quantity_sold || 0);
                        const quantity = getCartQuantity(ticket.id);
                        const isUrgent = available > 0 && available <= 15;

                        return (
                        <div
                          key={ticket.id}
                          className="p-4 rounded-lg bg-gradient-to-br from-secondary/50 to-secondary/30 space-y-3 border border-border/50 hover:border-primary/30 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-foreground">{ticket.name}</h3>
                                {ticket.description && (
                                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                                )}
                              </div>
                              <span className="text-lg font-bold text-primary">
                                R$ {Number(ticket.price).toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              {available > 0 ? (
                                <>
                                  <span className="text-sm text-muted-foreground">
                                    {available} disponíveis
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => updateCart(ticket, -1)}
                                      disabled={quantity === 0}
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="w-8 text-center font-medium text-foreground">
                                      {quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => updateCart(ticket, 1)}
                                      disabled={quantity >= Math.min(available, ticket.max_per_order || 10)}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <Badge variant="destructive" className="w-full justify-center py-2">
                                  Esgotado
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {cart.length > 0 && (
                      <>
                        <Separator />
                        
                        {/* NOVOS CAMPOS DE DADOS PARA O MERCADO PAGO */}
                        <div className="space-y-4 py-2">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">Dados para o Ingresso</p>
                          <div className="space-y-2">
                            <Input
                              placeholder="Seu Nome Completo"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="bg-secondary/50 border-border"
                            />
                            <Input
                              placeholder="Seu CPF (Somente números)"
                              value={customerCpf}
                              maxLength={11}
                              onChange={(e) => setCustomerCpf(e.target.value.replace(/\D/g, ""))}
                              className="bg-secondary/50 border-border"
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          {cart.map(item => (
                            <div key={item.ticketType.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {item.quantity}x {item.ticketType.name}
                              </span>
                              <span className="text-foreground">
                                R$ {(Number(item.ticketType.price) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Taxa de serviço (8%)</span>
                            <span className="text-foreground">R$ {serviceFee.toFixed(2)}</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center pt-2">
                          <span className="font-semibold text-foreground text-lg">Total</span>
                          <span className="text-2xl font-bold text-gradient">
                            R$ {totalAmount.toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-3 pt-2 relative z-20">
                          <Button
                            className="w-full gap-2 border-primary/50 hover:bg-primary/10 hover:text-primary min-h-[48px]"
                            variant="outline"
                            size="lg"
                            onClick={handleAddToCart}
                            disabled={processing || processingPix}
                          >
                            <ShoppingCart className="w-5 h-5" />
                            Carrinho
                          </Button>
                          
                          <Button
                            className="w-full gap-2 bg-secondary hover:bg-secondary/80 min-h-[48px]"
                            size="lg"
                            onClick={handlePixCheckout}
                            disabled={processingPix || processing}
                            variant="secondary"
                          >
                            <QrCode className="w-5 h-5" />
                            {processingPix ? "Gerando PIX..." : "Pagar com PIX"}
                          </Button>

                          <Button
                            className="w-full gap-2 gradient-primary shadow-lg shadow-primary/20 min-h-[52px] text-base font-semibold"
                            size="lg"
                            onClick={handleCheckout}
                            disabled={processing || processingPix}
                          >
                            {processing ? "Processando..." : "Comprar com Cartão"}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {isMobile && cart.length > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_30px_rgba(0,0,0,0.5)]"
        >
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">{totalTickets} ingresso(s) · Taxa 8%</p>
                <p className="text-xl font-bold text-gradient">
                  R$ {totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1 bg-secondary hover:bg-secondary/80 min-h-[48px] text-sm font-semibold"
                onClick={handlePixCheckout}
                disabled={processingPix || processing}
                variant="secondary"
              >
                <QrCode className="w-4 h-4" />
                {processingPix ? "PIX..." : "PIX"}
              </Button>
              <Button
                className="flex-[2] gap-1 gradient-primary shadow-lg shadow-primary/20 min-h-[48px] text-sm font-bold"
                onClick={handleCheckout}
                disabled={processing || processingPix}
              >
                {processing ? "Processando..." : "🔒 Garantir Acesso"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <Footer />
    </div>
    </PaymentErrorBoundary>
  );
};

export default EventDetails;
