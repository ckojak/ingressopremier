import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Minus, Plus, ShoppingCart, ArrowLeft, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Event = Tables<"events">;
type TicketType = Tables<"ticket_types">;

interface CartItem {
  ticketType: TicketType;
  quantity: number;
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!id) return;

      try {
        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .eq("status", "published")
          .single();

        if (eventError) throw eventError;
        setEvent(eventData);

        // Fetch ticket types
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("event_id", id)
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (ticketsError) throw ticketsError;
        setTicketTypes(ticketsData || []);

        // Restore cart from localStorage if returning from login
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

  const SERVICE_FEE_PERCENTAGE = 0.05;

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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Adicione ingressos ao carrinho");
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

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          eventId: id,
          items: cart.map(item => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
            unitPrice: Number(item.ticketType.price),
          })),
          serviceFee,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <div className="animate-pulse">
            <div className="h-[60vh] bg-muted" />
            <div className="container mx-auto px-4 py-8">
              <div className="h-8 bg-muted rounded w-1/2 mb-4" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Event Image */}
      <section className="relative min-h-[60vh] flex items-end">
        {/* Background Image */}
        <div className="absolute inset-0">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
        </div>

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="absolute top-20 left-4 md:left-8 gap-2 text-foreground hover:bg-background/20 z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        {/* Content Container */}
        <div className="relative z-10 w-full pb-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
              {/* Event Info - Left Side */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-2"
              >
                {event.category && (
                  <Badge className="mb-4 bg-primary/90 text-primary-foreground border-0 px-3 py-1">
                    {event.category}
                  </Badge>
                )}

                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                  {event.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-foreground/80">
                  {event.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span>
                        {event.venue_name ? `${event.venue_name} - ` : ""}
                        {event.city}, {event.state}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="capitalize">
                      {format(new Date(event.start_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span>
                      {format(new Date(event.start_date), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Tickets Section - Right Side (visible on desktop) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="hidden lg:block"
              >
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  Ingressos
                </h2>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="pb-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - About Event */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-card/50 border border-border rounded-xl p-6"
              >
                <h2 className="text-xl font-semibold text-foreground mb-4">Sobre o evento</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description || event.short_description || "Mais informações em breve."}
                </p>
              </motion.div>

              {/* Location Section */}
              {event.venue_address && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-card/50 border border-border rounded-xl p-6"
                >
                  <h2 className="text-xl font-semibold text-foreground mb-4">Local</h2>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-1" />
                    <div className="text-muted-foreground">
                      {event.venue_name && (
                        <p className="font-medium text-foreground">{event.venue_name}</p>
                      )}
                      <p>{event.venue_address}</p>
                      <p>{event.city}, {event.state}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Tickets */}
            <div className="space-y-4">
              {/* Mobile Tickets Header */}
              <h2 className="text-xl font-semibold text-foreground lg:hidden flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Ingressos
              </h2>

              {ticketTypes.length === 0 ? (
                <div className="bg-card/50 border border-border rounded-xl p-6 text-center">
                  <p className="text-muted-foreground">
                    Ingressos não disponíveis no momento
                  </p>
                </div>
              ) : (
                ticketTypes.map((ticket, index) => {
                  const available = ticket.quantity_available - (ticket.quantity_sold || 0);
                  const quantity = getCartQuantity(ticket.id);

                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                      className="bg-card/50 border border-border rounded-xl p-5 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground text-lg">{ticket.name}</h3>
                          {ticket.description && (
                            <p className="text-sm text-muted-foreground">{ticket.description}</p>
                          )}
                        </div>
                        <span className="text-xl font-bold text-primary whitespace-nowrap ml-4">
                          R$ {Number(ticket.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {available > 0 ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-lg border-border"
                              onClick={() => updateCart(ticket, -1)}
                              disabled={quantity === 0}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold text-foreground text-lg">
                              {quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-lg border-border"
                              onClick={() => updateCart(ticket, 1)}
                              disabled={quantity >= Math.min(available, ticket.max_per_order || 10)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          <Button
                            variant="default"
                            size="sm"
                            className="gap-2 px-4"
                            onClick={() => {
                              if (quantity === 0) {
                                updateCart(ticket, 1);
                              }
                              handleAddToCart();
                            }}
                            disabled={quantity === 0 && cart.every(c => c.ticketType.id !== ticket.id)}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Adicionar
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="w-fit">
                          Esgotado
                        </Badge>
                      )}
                    </motion.div>
                  );
                })
              )}

              {/* Cart Summary */}
              {cart.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-24"
                >
                  <h3 className="font-semibold text-foreground">Resumo</h3>
                  
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.ticketType.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.ticketType.name}
                        </span>
                        <span className="text-foreground">
                          R$ {(Number(item.ticketType.price) * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-border" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de serviço (5%)</span>
                      <span className="text-foreground">R$ {serviceFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={processing}
                  >
                    {processing ? "Processando..." : "Comprar agora"}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetails;
