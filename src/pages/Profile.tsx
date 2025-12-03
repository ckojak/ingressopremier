import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Phone, Save, Camera, ShoppingBag, Calendar, MapPin, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotificationSettings } from "@/components/NotificationSettings";

type Profile = Tables<"profiles">;

interface OrderWithDetails {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  event?: {
    title: string;
    start_date: string;
    venue_name: string | null;
    city: string | null;
  };
}

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth", { state: { from: "/perfil" } });
        return;
      }

      setUser(session.user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || "",
          email: profileData.email || session.user.email || "",
          phone: profileData.phone || "",
        });
      }

      // Fetch orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*, events(title, start_date, venue_name, city)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (ordersData) {
        setOrders(ordersData.map(order => ({
          ...order,
          event: order.events as OrderWithDetails["event"],
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-400";
      case "pending":
        return "text-yellow-400";
      case "cancelled":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "pending":
        return "Pendente";
      case "cancelled":
        return "Cancelado";
      case "refunded":
        return "Reembolsado";
      default:
        return status;
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-8">
              Meu <span className="text-gradient">Perfil</span>
            </h1>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="bg-secondary">
                <TabsTrigger value="profile">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="orders">Histórico de Compras</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Informações Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                          {formData.full_name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{formData.full_name || "Usuário"}</p>
                        <p className="text-sm text-muted-foreground">{formData.email}</p>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="email"
                            value={formData.email}
                            disabled
                            className="pl-10 opacity-50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(11) 99999-9999"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      Histórico de Compras
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Você ainda não fez nenhuma compra.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order, index) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-lg bg-secondary/30 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {order.event?.title || "Evento"}
                                </h3>
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {order.event?.start_date 
                                      ? format(new Date(order.event.start_date), "dd MMM yyyy", { locale: ptBR })
                                      : "-"
                                    }
                                  </span>
                                  {order.event?.city && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      {order.event.venue_name && `${order.event.venue_name}, `}
                                      {order.event.city}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  R$ {Number(order.total_amount).toFixed(2)}
                                </p>
                                <p className={`text-sm ${getStatusColor(order.status || "pending")}`}>
                                  {getStatusLabel(order.status || "pending")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Pedido #{order.id.slice(0, 8)}</span>
                              <span>
                                {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationSettings />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
