import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Minus, Plus, ShoppingCart, ArrowLeft, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const SERVICE_FEE_PERCENTAGE = 0.08; // 8% taxa de serviço

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

    // Get existing cart from localStorage
    const existingCart = localStorage.getItem("cart");
    let cartData = existingCart ? JSON.parse(existingCart) : { items: [] };

    // Add or update items
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
    setCart([]); // Clear selection after adding
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
        // Save cart to localStorage before redirecting
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

      // Create checkout with Stripe
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
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="animate-pulse space-y-8">
              <div className="h-64 bg-muted rounded-2xl" />
              <div className="h-8 bg-muted rounded w-1/2" />
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
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Details */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Event Image */}
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-6">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Ticket className="w-24 h-24 text-muted-foreground/50" />
                    </div>
                  )}
                  {event.category && (
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                      {event.category}
                    </Badge>
                  )}
                </div>

                {/* Event Info */}
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {event.title}
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
                  {event.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span>
                        {event.venue_name && `${event.venue_name}, `}
                        {event.city}, {event.state}
                      </span>
                    </div>
                  )}
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

                {event.venue_address && (
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

            {/* Ticket Selection & Cart */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="bg-card border-border sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-primary" />
                      Ingressos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ticketTypes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Ingressos não disponíveis no momento
                      </p>
                    ) : (
                      ticketTypes.map(ticket => {
                        const available = ticket.quantity_available - (ticket.quantity_sold || 0);
                        const quantity = getCartQuantity(ticket.id);

                        return (
                          <div
                            key={ticket.id}
                            className="p-4 rounded-lg bg-secondary/50 space-y-3"
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

                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="text-xl font-bold text-primary">
                            R$ {totalAmount.toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <Button
                            className="w-full gap-2"
                            variant="outline"
                            size="lg"
                            onClick={handleAddToCart}
                          >
                            <ShoppingCart className="w-5 h-5" />
                            Adicionar ao carrinho
                          </Button>
                          
                          <Button
                            className="w-full gap-2"
                            size="lg"
                            onClick={handleCheckout}
                            disabled={processing}
                          >
                            {processing ? "Processando..." : `Comprar agora`}
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
      <Footer />
    </div>
  );
};

export default EventDetails;