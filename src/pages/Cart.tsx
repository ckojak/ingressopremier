import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Lock, CreditCard, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TicketType = Tables<"ticket_types">;
type Event = Tables<"events">;

interface CartItem {
  ticketType: TicketType;
  event: Event;
  quantity: number;
}

const SERVICE_FEE_PERCENTAGE = 0.05; // 5% taxa de serviço

const Cart = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        loadCart();
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadCart();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCart = async () => {
    const savedCart = localStorage.getItem("cart");
    if (!savedCart) return;

    try {
      const parsed = JSON.parse(savedCart);
      const loadedItems: CartItem[] = [];

      for (const item of parsed.items || []) {
        const { data: ticketType } = await supabase
          .from("ticket_types")
          .select("*, events(*)")
          .eq("id", item.ticketTypeId)
          .single();

        if (ticketType) {
          loadedItems.push({
            ticketType: ticketType as TicketType,
            event: (ticketType as any).events as Event,
            quantity: item.quantity,
          });
        }
      }

      setCartItems(loadedItems);
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  };

  const updateQuantity = (ticketTypeId: string, delta: number) => {
    setCartItems(prev => {
      const updated = prev.map(item => {
        if (item.ticketType.id === ticketTypeId) {
          const newQuantity = item.quantity + delta;
          const available = item.ticketType.quantity_available - (item.ticketType.quantity_sold || 0);
          const maxPerOrder = item.ticketType.max_per_order || 10;
          
          if (newQuantity <= 0) {
            return null;
          }
          if (newQuantity > Math.min(available, maxPerOrder)) {
            toast.error(`Máximo de ${Math.min(available, maxPerOrder)} ingressos`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[];

      // Update localStorage
      const cartData = {
        items: updated.map(item => ({
          ticketTypeId: item.ticketType.id,
          quantity: item.quantity,
        })),
      };
      localStorage.setItem("cart", JSON.stringify(cartData));

      return updated;
    });
  };

  const removeItem = (ticketTypeId: string) => {
    setCartItems(prev => {
      const updated = prev.filter(item => item.ticketType.id !== ticketTypeId);
      
      const cartData = {
        items: updated.map(item => ({
          ticketTypeId: item.ticketType.id,
          quantity: item.quantity,
        })),
      };
      localStorage.setItem("cart", JSON.stringify(cartData));

      return updated;
    });
    toast.success("Item removido do carrinho");
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.ticketType.price) * item.quantity,
    0
  );
  
  const serviceFee = subtotal * SERVICE_FEE_PERCENTAGE;
  const total = subtotal + serviceFee;

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    setProcessing(true);

    try {
      // Group items by event
      const eventGroups = cartItems.reduce((acc, item) => {
        const eventId = item.event.id;
        if (!acc[eventId]) {
          acc[eventId] = [];
        }
        acc[eventId].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      // For simplicity, process first event group
      const firstEventId = Object.keys(eventGroups)[0];
      const items = eventGroups[firstEventId];

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          eventId: firstEventId,
          items: items.map(item => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
            unitPrice: Number(item.ticketType.price),
          })),
          serviceFee,
        },
      });

      if (error) throw error;

      if (data?.url) {
        localStorage.removeItem("cart");
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
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-64 bg-muted rounded" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center py-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="w-24 h-24 mx-auto rounded-full bg-secondary flex items-center justify-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  Faça login para ver seu carrinho
                </h1>
                <p className="text-muted-foreground">
                  Você precisa estar logado para adicionar e visualizar itens no carrinho.
                </p>
                <Button asChild size="lg">
                  <Link to="/auth">Entrar ou Cadastrar</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
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
            Continuar comprando
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-8">
              Meu <span className="text-gradient">Carrinho</span>
            </h1>

            {cartItems.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Seu carrinho está vazio
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Explore nossos eventos e adicione ingressos ao seu carrinho
                  </p>
                  <Button asChild>
                    <Link to="/eventos">Ver eventos</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                  {cartItems.map((item, index) => (
                    <motion.div
                      key={item.ticketType.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="bg-card border-border">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {item.event.image_url ? (
                              <img
                                src={item.event.image_url}
                                alt={item.event.title}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center">
                                <Ticket className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">
                                {item.event.title}
                              </h3>
                              <p className="text-sm text-primary font-medium">
                                {item.ticketType.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(item.event.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-lg font-bold text-primary mt-2">
                                R$ {Number(item.ticketType.price).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end justify-between">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.ticketType.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.ticketType.id, -1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center font-medium text-foreground">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.ticketType.id, 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Order Summary */}
                <div>
                  <Card className="bg-card border-border sticky top-24">
                    <CardHeader>
                      <CardTitle className="text-foreground">Resumo do Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {cartItems.map(item => (
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
                          <span className="text-muted-foreground">Taxa de serviço (5%)</span>
                          <span className="text-foreground">R$ {serviceFee.toFixed(2)}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold text-primary">
                          R$ {total.toFixed(2)}
                        </span>
                      </div>

                      <Button
                        className="w-full gap-2"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={processing}
                      >
                        <CreditCard className="w-5 h-5" />
                        {processing ? "Processando..." : "Finalizar Compra"}
                      </Button>

                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        Pagamento 100% seguro
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
