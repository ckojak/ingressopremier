import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Ticket, DollarSign, Users, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Stats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  activeUsers: number;
}

interface SalesData {
  date: string;
  revenue: number;
  tickets: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    activeUsers: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch events count
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("organizer_id", user.id);

        // Fetch tickets sold
        const { data: tickets } = await supabase
          .from("tickets")
          .select("id, event_id, events!inner(organizer_id)")
          .eq("events.organizer_id", user.id);

        // Fetch orders for revenue
        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount, event_id, created_at, events!inner(organizer_id)")
          .eq("events.organizer_id", user.id)
          .eq("status", "paid");

        const totalRevenue = orders?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0;

        setStats({
          totalEvents: eventsCount || 0,
          totalTicketsSold: tickets?.length || 0,
          totalRevenue,
          activeUsers: 0,
        });

        // Generate sales data for chart (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          return {
            date: format(date, "dd/MM", { locale: ptBR }),
            fullDate: date,
            revenue: 0,
            tickets: 0,
          };
        });

        // Aggregate orders by day
        orders?.forEach(order => {
          const orderDate = new Date(order.created_at || "");
          const dayIndex = last7Days.findIndex(day => {
            const start = startOfDay(day.fullDate);
            const end = endOfDay(day.fullDate);
            return orderDate >= start && orderDate <= end;
          });
          if (dayIndex !== -1) {
            last7Days[dayIndex].revenue += Number(order.total_amount);
            last7Days[dayIndex].tickets += 1;
          }
        });

        setSalesData(last7Days.map(({ date, revenue, tickets }) => ({ date, revenue, tickets })));
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total de Eventos",
      value: stats.totalEvents,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Ingressos Vendidos",
      value: stats.totalTicketsSold,
      icon: Ticket,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Receita Total",
      value: `R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Usuários Ativos",
      value: stats.activeUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do seu painel de eventos
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Sales Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              Receita (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
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
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Ticket className="w-5 h-5 text-accent" />
              Vendas de Ingressos (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [value, 'Ingressos']}
                  />
                  <Bar 
                    dataKey="tickets" 
                    fill="hsl(var(--accent))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/eventos"
              className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group"
            >
              <span className="text-foreground">Criar novo evento</span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href="/admin/ingressos"
              className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group"
            >
              <span className="text-foreground">Gerenciar ingressos</span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href="/admin/vendas"
              className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group"
            >
              <span className="text-foreground">Ver relatório de vendas</span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Nenhum evento próximo. Crie seu primeiro evento para começar!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;