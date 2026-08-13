import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Ticket, 
  DollarSign, 
  TrendingUp, 
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  Eye,
  Wallet,
  MessageCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import OrganizerVerificationCard from "@/components/OrganizerVerificationCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProducerStats {
  totalEvents: number;
  pendingEvents: number;
  publishedEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  netRevenue: number;
}

interface ProducerEvent {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  image_url: string | null;
  tickets_sold: number;
}

const SERVICE_FEE_RATE = 0.08;
const WITHDRAWAL_WHATSAPP = "5521979934676";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { label: "Aguardando aprovação", variant: "outline", icon: Clock },
  published: { label: "Publicado", variant: "default", icon: CheckCircle2 },
  draft: { label: "Rascunho", variant: "secondary", icon: AlertTriangle },
  rejected: { label: "Rejeitado", variant: "destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelado", variant: "destructive", icon: AlertTriangle },
};

const ProducerDashboard = () => {
  const [stats, setStats] = useState<ProducerStats>({
    totalEvents: 0,
    pendingEvents: 0,
    publishedEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    netRevenue: 0,
  });
  const [recentEvents, setRecentEvents] = useState<ProducerEvent[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [producerName, setProducerName] = useState<string>("");
  const [pendingEventTitles, setPendingEventTitles] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();
        setProducerName(profile?.full_name || profile?.email || user.email || "Produtor");

        // Fetch events
        const { data: events } = await supabase
          .from("events")
          .select("*")
          .eq("organizer_id", user.id)
          .order("created_at", { ascending: false });

        const eventsData = events || [];
        const eventIds = eventsData.map(e => e.id);

        // Fetch tickets for these events
        let ticketsCount = 0;
        let revenue = 0;
        let netRevenue = 0;

        if (eventIds.length > 0) {
          const { count } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .in("event_id", eventIds);

          ticketsCount = count || 0;
          
          // Get revenue from orders
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount, service_fee")
            .eq("status", "paid")
            .in("event_id", eventIds);
            
          revenue = orders?.reduce((acc, o) => acc + Number(o.total_amount || 0), 0) || 0;
          netRevenue =
            orders?.reduce((acc, o) => {
              const total = Number(o.total_amount || 0);
              const fee = Number(o.service_fee || 0) || total * SERVICE_FEE_RATE;
              return acc + Math.max(total - fee, 0);
            }, 0) || 0;
        }

        setStats({
          totalEvents: eventsData.length,
          pendingEvents: eventsData.filter(e => e.status === "pending").length,
          publishedEvents: eventsData.filter(e => e.status === "published").length,
          totalTicketsSold: ticketsCount,
          totalRevenue: revenue,
          netRevenue,
        });

        setPendingEventTitles(
          eventsData.filter((e: any) => e.status === "pending").map((e: any) => e.title)
        );

        // Get recent events with ticket counts
        const recentEventsWithTickets = await Promise.all(
          eventsData.slice(0, 5).map(async (event) => {
            const { count } = await supabase
              .from("tickets")
              .select("*", { count: "exact", head: true })
              .eq("event_id", event.id);
            
            return {
              id: event.id,
              title: event.title,
              status: event.status || "draft",
              start_date: event.start_date,
              image_url: event.image_url,
              tickets_sold: count || 0,
            };
          })
        );

        setRecentEvents(recentEventsWithTickets);

        // Generate sales chart data (last 14 days)
        if (eventIds.length > 0) {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount, created_at")
            .eq("status", "paid")
            .in("event_id", eventIds);

          const last14Days = Array.from({ length: 14 }, (_, i) => {
            const date = subDays(new Date(), 13 - i);
            return {
              date: format(date, "dd/MM", { locale: ptBR }),
              fullDate: date,
              revenue: 0,
            };
          });

          orders?.forEach(order => {
            const orderDate = new Date(order.created_at || "");
            const dayIndex = last14Days.findIndex(day => {
              const start = startOfDay(day.fullDate);
              const end = endOfDay(day.fullDate);
              return orderDate >= start && orderDate <= end;
            });
            if (dayIndex !== -1) {
              last14Days[dayIndex].revenue += Number(order.total_amount);
            }
          });

          setSalesData(last14Days.map(({ date, revenue }) => ({ date, revenue })));
        }
      } catch (error) {
        console.error("Error fetching producer data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducerData();
  }, []);

  const statCards = [
    {
      title: "Meus Eventos",
      value: stats.totalEvents,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Aguardando Aprovação",
      value: stats.pendingEvents,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Ingressos Vendidos",
      value: stats.totalTicketsSold,
      icon: Ticket,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Faturamento bruto",
      value: `R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  const formatBRL = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const withdrawalMessage = () => {
    const eventsList = recentEvents.length
      ? recentEvents.map(e => `- ${e.title} (${e.tickets_sold} ingressos)`).join("\n")
      : "- (sem eventos listados)";
    return (
      `Olá! Sou ${producerName} e gostaria de solicitar o saque da minha receita no PremierPass.\n\n` +
      `Eventos:\n${eventsList}\n\n` +
      `Ingressos vendidos: ${stats.totalTicketsSold}\n` +
      `Faturamento bruto: ${formatBRL(stats.totalRevenue)}\n` +
      `Valor líquido a receber (já descontada a taxa de serviço de 8%): ${formatBRL(stats.netRevenue)}`
    );
  };

  const handleWithdrawal = () => {
    window.open(
      `https://wa.me/${WITHDRAWAL_WHATSAPP}?text=${encodeURIComponent(withdrawalMessage())}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meu Painel</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus eventos e acompanhe suas vendas
          </p>
        </div>
        <Link to="/admin/eventos">
          <Button className="gap-2 gradient-primary">
            <Plus className="w-4 h-4" />
            Criar Evento
          </Button>
        </Link>
      </div>

      {/* Info Alert */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">
              Os eventos criados passam por aprovação
            </p>
            <p className="text-xs text-muted-foreground mt-1">
 lovable-sync-1786570868
              Seu evento será analisado pela nossa equipe em até 4 horas.
=======
              Seus dados serão verificados e o evento será publicado em até 4 horas após a aprovação.
 main
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending approval banner */}
      {pendingEventTitles.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-500">
                {pendingEventTitles.length === 1
                  ? "Seu evento está em análise"
                  : `${pendingEventTitles.length} eventos em análise`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Seu evento será analisado pela nossa equipe em até <strong>4 horas</strong>.
                Você receberá um aviso assim que for aprovado.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {pendingEventTitles.join(" • ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identity verification (KYC) */}
      <OrganizerVerificationCard />

      {/* Net revenue + withdrawal */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Wallet className="w-5 h-5 text-primary" />
            Receita líquida a receber
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-green-500">
              {loading ? "..." : formatBRL(stats.netRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Faturamento bruto {formatBRL(stats.totalRevenue)} menos a taxa de serviço de 8%.
            </p>
          </div>
          <Button
            onClick={handleWithdrawal}
            disabled={loading || stats.netRevenue <= 0}
            className="gap-2 gradient-primary"
          >
            <MessageCircle className="w-4 h-4" />
            Solicitar saque
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stat.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              Vendas (Últimos 14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma venda ainda</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/eventos" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group">
                <span className="text-foreground">Criar novo evento</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
            <Link to="/admin/ingressos" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group">
                <span className="text-foreground">Gerenciar ingressos</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
            <Link to="/admin/cortesias" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group">
                <span className="text-foreground">Gerar cortesias</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
            <Link to="/admin/checkin" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group">
                <span className="text-foreground">Check-in de ingressos</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Meus Eventos Recentes</CardTitle>
          <Link to="/admin/eventos">
            <Button variant="outline" size="sm">Ver todos</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Você ainda não criou nenhum evento</p>
              <Link to="/admin/eventos">
                <Button className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Criar meu primeiro evento
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => {
                const config = statusConfig[event.status] || statusConfig.draft;
                const StatusIcon = config.icon;
                
                return (
                  <div 
                    key={event.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={config.variant} className="text-xs">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {event.tickets_sold} ingressos vendidos
                        </span>
                      </div>
                      {event.start_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.start_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <Link to={`/admin/eventos`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProducerDashboard;
