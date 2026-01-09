import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Ticket, 
  Calendar, 
  User, 
  Heart, 
  Clock, 
  MapPin,
  ArrowRight,
  QrCode,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { format, isFuture, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TicketData {
  id: string;
  event_title: string;
  event_date: string | null;
  event_location: string | null;
  event_image: string | null;
  ticket_type: string;
}

interface UserProfile {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

const ClientDashboard = () => {
  const [upcomingTickets, setUpcomingTickets] = useState<TicketData[]>([]);
  const [pastTicketsCount, setPastTicketsCount] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();

        setProfile({
          full_name: profileData?.full_name || user.user_metadata?.full_name || "Usuário",
          email: user.email || "",
          avatar_url: profileData?.avatar_url || null,
        });

        const { data: ticketsData } = await supabase
          .from("tickets")
          .select("id, ticket_type_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10);

        const formattedTickets: TicketData[] = [];
        
        for (const ticket of ticketsData || []) {
          const { data: ticketType } = await supabase
            .from("ticket_types")
            .select("name, event_id")
            .eq("id", ticket.ticket_type_id)
            .single();
          
          if (ticketType?.event_id) {
            const { data: event } = await supabase
              .from("events")
              .select("title, start_date, location, image_url")
              .eq("id", ticketType.event_id)
              .single();
            
            formattedTickets.push({
              id: ticket.id,
              event_title: event?.title || "Evento",
              event_date: event?.start_date || null,
              event_location: event?.location || null,
              event_image: event?.image_url || null,
              ticket_type: ticketType?.name || "Ingresso",
            });
          }
        }

        const now = new Date();
        setUpcomingTickets(formattedTickets.filter(t => t.event_date && isFuture(new Date(t.event_date))));
        setPastTicketsCount(formattedTickets.filter(t => t.event_date && isPast(new Date(t.event_date))).length);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const quickActions = [
    { icon: Calendar, label: "Ver Eventos", path: "/eventos", color: "text-primary", bgColor: "bg-primary/10" },
    { icon: Ticket, label: "Meus Ingressos", path: "/meus-ingressos", color: "text-accent", bgColor: "bg-accent/10" },
    { icon: User, label: "Meu Perfil", path: "/perfil", color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { icon: Heart, label: "Favoritos", path: "/eventos", color: "text-red-500", bgColor: "bg-red-500/10" },
  ];

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16 border-2 border-primary">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Olá, {firstName}! 👋</h1>
              <p className="text-muted-foreground">Bem-vindo ao seu painel</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Link to={action.path}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer group">
                  <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                    <div className={`w-12 h-12 rounded-xl ${action.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon className={`w-6 h-6 ${action.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Próximos Eventos
            </CardTitle>
            <Link to="/meus-ingressos">
              <Button variant="ghost" size="sm" className="gap-1">Ver todos <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : upcomingTickets.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">Você não tem eventos próximos</p>
                <Link to="/eventos"><Button className="gap-2"><Calendar className="w-4 h-4" />Explorar Eventos</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingTickets.slice(0, 3).map((ticket) => (
                  <div key={ticket.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    {ticket.event_image ? (
                      <img src={ticket.event_image} alt={ticket.event_title} className="w-20 h-20 object-cover rounded-lg" />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center"><Calendar className="w-8 h-8 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{ticket.event_title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {ticket.event_date && format(new Date(ticket.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      {ticket.event_location && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" /><span className="truncate">{ticket.event_location}</span>
                        </div>
                      )}
                      <Badge variant="secondary" className="mt-2">{ticket.ticket_type}</Badge>
                    </div>
                    <Link to="/meus-ingressos"><Button variant="outline" size="sm" className="gap-1"><QrCode className="w-4 h-4" />QR Code</Button></Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-accent" />Seus Números</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                <span className="text-foreground">Próximos eventos</span>
                <span className="text-2xl font-bold text-primary">{upcomingTickets.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                <span className="text-foreground">Eventos passados</span>
                <span className="text-2xl font-bold text-accent">{pastTicketsCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-muted-foreground" />Configurações Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Link to="/perfil" className="block"><div className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"><span className="text-foreground">Editar Perfil</span><ArrowRight className="w-4 h-4 text-muted-foreground" /></div></Link>
              <Link to="/meus-ingressos" className="block"><div className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"><span className="text-foreground">Histórico de Ingressos</span><ArrowRight className="w-4 h-4 text-muted-foreground" /></div></Link>
              <Link to="/suporte" className="block"><div className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"><span className="text-foreground">Suporte</span><ArrowRight className="w-4 h-4 text-muted-foreground" /></div></Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ClientDashboard;
