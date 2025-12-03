import { useEffect, useState } from "react";
import { Download, Calendar, TrendingUp, DollarSign, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

type Event = Tables<"events">;

interface SalesData {
  date: string;
  revenue: number;
  tickets: number;
}

interface EventSales {
  eventId: string;
  eventTitle: string;
  ticketsSold: number;
  revenue: number;
}

const COLORS = ["hsl(190, 90%, 50%)", "hsl(330, 85%, 60%)", "hsl(45, 90%, 50%)", "hsl(120, 60%, 50%)", "hsl(270, 70%, 60%)"];

const Reports = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [period, setPeriod] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [eventSales, setEventSales] = useState<EventSales[]>([]);
  const [totals, setTotals] = useState({
    revenue: 0,
    tickets: 0,
    orders: 0,
    avgTicketPrice: 0,
  });
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user events
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id);
      
      setEvents(eventsData || []);

      // Calculate date range
      const endDate = new Date();
      const startDate = period === "30" 
        ? subDays(endDate, 30)
        : period === "90"
        ? subDays(endDate, 90)
        : startOfMonth(new Date(new Date().getFullYear(), 0, 1)); // Year

      // Fetch orders
      let ordersQuery = supabase
        .from("orders")
        .select("*, order_items(*, ticket_types(*)), events!inner(*)")
        .eq("status", "paid")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (selectedEvent !== "all") {
        ordersQuery = ordersQuery.eq("event_id", selectedEvent);
      } else {
        ordersQuery = ordersQuery.in("event_id", eventsData?.map(e => e.id) || []);
      }

      const { data: ordersData } = await ordersQuery;

      // Process sales data by date
      const salesByDate: Record<string, { revenue: number; tickets: number }> = {};
      const eventSalesMap: Record<string, EventSales> = {};

      let totalRevenue = 0;
      let totalTickets = 0;

      (ordersData || []).forEach((order: any) => {
        const dateKey = format(new Date(order.created_at), "yyyy-MM-dd");
        
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = { revenue: 0, tickets: 0 };
        }
        
        const orderTotal = Number(order.total_amount);
        salesByDate[dateKey].revenue += orderTotal;
        totalRevenue += orderTotal;

        const event = order.events as Event;
        if (event) {
          if (!eventSalesMap[event.id]) {
            eventSalesMap[event.id] = {
              eventId: event.id,
              eventTitle: event.title,
              ticketsSold: 0,
              revenue: 0,
            };
          }
          eventSalesMap[event.id].revenue += orderTotal;
        }

        (order.order_items || []).forEach((item: any) => {
          const qty = item.quantity || 1;
          salesByDate[dateKey].tickets += qty;
          totalTickets += qty;
          if (event && eventSalesMap[event.id]) {
            eventSalesMap[event.id].ticketsSold += qty;
          }
        });
      });

      // Convert to array and sort by date
      const salesArray = Object.entries(salesByDate)
        .map(([date, data]) => ({
          date: format(new Date(date), "dd/MM", { locale: ptBR }),
          revenue: data.revenue,
          tickets: data.tickets,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSalesData(salesArray);
      setEventSales(Object.values(eventSalesMap).sort((a, b) => b.revenue - a.revenue));
      setTotals({
        revenue: totalRevenue,
        tickets: totalTickets,
        orders: ordersData?.length || 0,
        avgTicketPrice: totalTickets > 0 ? totalRevenue / totalTickets : 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEvent, period]);

  const exportToExcel = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["Relatório de Vendas"],
        ["Período", period === "30" ? "Últimos 30 dias" : period === "90" ? "Últimos 90 dias" : "Este ano"],
        ["Evento", selectedEvent === "all" ? "Todos os eventos" : events.find(e => e.id === selectedEvent)?.title || ""],
        [],
        ["Métrica", "Valor"],
        ["Receita Total", `R$ ${totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
        ["Ingressos Vendidos", totals.tickets],
        ["Total de Pedidos", totals.orders],
        ["Ticket Médio", `R$ ${totals.avgTicketPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

      // Daily sales sheet
      const dailyData = [
        ["Data", "Receita", "Ingressos"],
        ...salesData.map(d => [d.date, d.revenue, d.tickets])
      ];
      const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, dailyWs, "Vendas Diárias");

      // Event sales sheet
      const eventData = [
        ["Evento", "Ingressos Vendidos", "Receita"],
        ...eventSales.map(e => [e.eventTitle, e.ticketsSold, e.revenue])
      ];
      const eventWs = XLSX.utils.aoa_to_sheet(eventData);
      XLSX.utils.book_append_sheet(wb, eventWs, "Vendas por Evento");

      // Download
      XLSX.writeFile(wb, `relatorio-vendas-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      
      toast({ title: "Relatório exportado com sucesso!" });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o arquivo Excel",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de vendas
          </p>
        </div>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingressos Vendidos</CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totals.tickets}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totals.orders}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {totals.avgTicketPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Receita ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : salesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(220, 10%, 60%)" 
                    tick={{ fill: "hsl(220, 10%, 60%)" }}
                  />
                  <YAxis 
                    stroke="hsl(220, 10%, 60%)" 
                    tick={{ fill: "hsl(220, 10%, 60%)" }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(220, 18%, 10%)", 
                      border: "1px solid hsl(220, 15%, 18%)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(0, 0%, 98%)" }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(190, 90%, 50%)" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(190, 90%, 50%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tickets Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Ingressos Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : salesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(220, 10%, 60%)" 
                    tick={{ fill: "hsl(220, 10%, 60%)" }}
                  />
                  <YAxis 
                    stroke="hsl(220, 10%, 60%)" 
                    tick={{ fill: "hsl(220, 10%, 60%)" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(220, 18%, 10%)", 
                      border: "1px solid hsl(220, 15%, 18%)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(0, 0%, 98%)" }}
                    formatter={(value: number) => [value, "Ingressos"]}
                  />
                  <Bar dataKey="tickets" fill="hsl(330, 85%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Event Distribution */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Vendas por Evento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : eventSales.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda no período
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventSales}
                      dataKey="revenue"
                      nameKey="eventTitle"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name.substring(0, 15)}... ${(percent * 100).toFixed(0)}%`}
                    >
                      {eventSales.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(220, 18%, 10%)", 
                        border: "1px solid hsl(220, 15%, 18%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  {eventSales.slice(0, 5).map((event, index) => (
                    <div key={event.eventId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-foreground truncate max-w-[200px]">
                          {event.eventTitle}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          R$ {event.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.ticketsSold} ingressos
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
