import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Ticket, DollarSign, Users, TrendingUp, Building2, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlatformStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalUsers: number;
  totalOrganizers: number;
  platformFeeRevenue: number;
  serviceFeeRevenue: number;
}

interface SalesData {
  date: string;
  revenue: number;
  tickets: number;
  platformFee: number;
}

const PLATFORM_FEE_PERCENTAGE = 0.05;
const SERVICE_FEE_PERCENTAGE = 0.05;

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b'];

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<PlatformStats>({
    totalEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalOrganizers: 0,
    platformFeeRevenue: 0,
    serviceFeeRevenue: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all events count
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true });

        // Fetch all tickets sold
        const { count: ticketsCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true });

        // Fetch all orders for revenue
        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount, created_at")
          .eq("status", "paid");

        const totalRevenue = orders?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0;
        const serviceFeeRevenue = totalRevenue * SERVICE_FEE_PERCENTAGE;
        const platformFeeRevenue = totalRevenue * PLATFORM_FEE_PERCENTAGE;

        // Fetch users count
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch organizers count
        const { count: organizersCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "organizer");

        setStats({
          totalEvents: eventsCount || 0,
          totalTicketsSold: ticketsCount || 0,
          totalRevenue,
          totalUsers: usersCount || 0,
          totalOrganizers: organizersCount || 0,
          platformFeeRevenue,
          serviceFeeRevenue,
        });

        // Generate sales data for chart (last 30 days)
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const date = subDays(new Date(), 29 - i);
          return {
            date: format(date, "dd/MM", { locale: ptBR }),
            fullDate: date,
            revenue: 0,
            tickets: 0,
            platformFee: 0,
          };
        });

        // Aggregate orders by day
        orders?.forEach(order => {
          const orderDate = new Date(order.created_at || "");
          const dayIndex = last30Days.findIndex(day => {
            const start = startOfDay(day.fullDate);
            const end = endOfDay(day.fullDate);
            return orderDate >= start && orderDate <= end;
          });
          if (dayIndex !== -1) {
            const amount = Number(order.total_amount);
            last30Days[dayIndex].revenue += amount;
            last30Days[dayIndex].tickets += 1;
            last30Days[dayIndex].platformFee += amount * PLATFORM_FEE_PERCENTAGE;
          }
        });

        setSalesData(last30Days.map(({ date, revenue, tickets, platformFee }) => ({ 
          date, 
          revenue, 
          tickets,
          platformFee,
        })));
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const pieData = [
    { name: 'Taxa de Serviço', value: stats.serviceFeeRevenue },
    { name: 'Taxa da Plataforma', value: stats.platformFeeRevenue },
  ];

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
      title: "Faturamento Total",
      value: `R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Usuários Cadastrados",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Organizadores",
      value: stats.totalOrganizers,
      icon: Building2,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Receita da Plataforma",
      value: `R$ ${(stats.platformFeeRevenue + stats.serviceFeeRevenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Percent,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral completa da plataforma Premier Pass
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              Faturamento (Últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
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
                    formatter={(value: number, name: string) => [
                      `R$ ${value.toFixed(2)}`, 
                      name === 'revenue' ? 'Faturamento' : 'Taxa Plataforma'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="platformFee" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Percent className="w-5 h-5 text-yellow-500" />
              Receitas de Taxas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  Taxa de Serviço (5%)
                </span>
                <span className="text-foreground font-medium">
                  R$ {stats.serviceFeeRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  Taxa da Plataforma (5%)
                </span>
                <span className="text-foreground font-medium">
                  R$ {stats.platformFeeRevenue.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Ticket className="w-5 h-5 text-accent" />
            Vendas de Ingressos (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [value, 'Pedidos']}
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
  );
};

export default SuperAdminDashboard;
