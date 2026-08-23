import { useEffect, useMemo, useState } from "react";
import { Download, Calendar, TrendingUp, Ticket, Users, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { format, subDays, startOfMonth } from "date-fns";
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
import { useSiteContext } from "@/hooks/useSiteContext";

type Event = Tables<"events">;

interface SalesData {
  dateKey: string; // yyyy-MM-dd, for correct chronological sorting
  date: string; // dd/MM, for chart axis labels
  fullDate: string; // dd/MM/yyyy, for the evolution table
  revenue: number;
  tickets: number;
}

interface EventSales {
  eventId: string;
  eventTitle: string;
  ticketsSold: number;
  revenue: number;
}

interface TicketTypeSales {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface PaymentMethodBucket {
  count: number;
  revenue: number;
}

interface CouponSales {
  code: string;
  count: number;
  revenue: number;
  discount: number;
}

const COLORS = ["hsl(190, 90%, 50%)", "hsl(330, 85%, 60%)", "hsl(45, 90%, 50%)", "hsl(120, 60%, 50%)", "hsl(270, 70%, 60%)"];
const PAYMENT_COLORS: Record<"pix" | "card", string> = {
  pix: "hsl(160, 70%, 42%)",
  card: "hsl(30, 90%, 55%)",
};

type SalesView = "evento" | "tipo" | "pagamento" | "cupom";
type EvolutionRange = "7d" | "hoje" | "periodo";

const Reports = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [period, setPeriod] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [eventSales, setEventSales] = useState<EventSales[]>([]);
  const [ticketTypeSales, setTicketTypeSales] = useState<TicketTypeSales[]>([]);
  const [paymentMethodSales, setPaymentMethodSales] = useState<Record<"pix" | "card", PaymentMethodBucket>>({
    pix: { count: 0, revenue: 0 },
    card: { count: 0, revenue: 0 },
  });
  const [couponSales, setCouponSales] = useState<CouponSales[]>([]);
  const [totals, setTotals] = useState({
    revenue: 0,
    tickets: 0,
    orders: 0,
    avgTicketPrice: 0,
  });
  const { toast } = useToast();
  const { getStatsSiteIds } = useSiteContext();

  const [showRevenue, setShowRevenue] = useState(true);
  const [salesView, setSalesView] = useState<SalesView>("tipo");
  const [evolutionRange, setEvolutionRange] = useState<EvolutionRange>("7d");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get site_ids for stats (isolated per site)
      const statsSiteIds = getStatsSiteIds();

      // Fetch user events and filter by site in memory
      const { data: allEventsData } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id);

      // Filter by site_id in memory
      const eventsData = (allEventsData || []).filter((event: any) => {
        const eventSiteId = event.site_id || 'premierpass';
        return statsSiteIds.includes(eventSiteId);
      });

      setEvents(eventsData);

      // Calculate date range
      const endDate = new Date();
      const startDate = period === "30"
        ? subDays(endDate, 30)
        : period === "90"
        ? subDays(endDate, 90)
        : startOfMonth(new Date(new Date().getFullYear(), 0, 1)); // Year

      // Fetch orders - only for events that belong to the current site
      const eventIds = eventsData.map((e: any) => e.id);

      if (eventIds.length === 0) {
        setSalesData([]);
        setEventSales([]);
        setTicketTypeSales([]);
        setPaymentMethodSales({ pix: { count: 0, revenue: 0 }, card: { count: 0, revenue: 0 } });
        setCouponSales([]);
        setTotals({ revenue: 0, tickets: 0, orders: 0, avgTicketPrice: 0 });
        setLoading(false);
        return;
      }

      let ordersQuery = supabase
        .from("orders")
        .select("*, order_items(*, ticket_types(*)), events!inner(*)")
        .eq("status", "paid")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .in("event_id", eventIds);

      if (selectedEvent !== "all") {
        ordersQuery = ordersQuery.eq("event_id", selectedEvent);
      }

      const { data: ordersData } = await ordersQuery;

      // Process sales data by date
      const salesByDate: Record<string, { revenue: number; tickets: number }> = {};
      const eventSalesMap: Record<string, EventSales> = {};
      const ticketTypeMap: Record<string, TicketTypeSales> = {};
      const paymentMethodMap: Record<"pix" | "card", PaymentMethodBucket> = {
        pix: { count: 0, revenue: 0 },
        card: { count: 0, revenue: 0 },
      };
      const couponMap: Record<string, CouponSales> = {};

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

        // Forma de pagamento: hoje só existem PIX e cartão (Checkout Pro exclui boleto/pix,
        // e o webhook grava a bandeira real do cartão -- qualquer coisa != 'pix' é cartão)
        const methodBucket: "pix" | "card" = order.payment_method === "pix" ? "pix" : "card";
        paymentMethodMap[methodBucket].count += 1;
        paymentMethodMap[methodBucket].revenue += orderTotal;

        // Cupom usado no pedido
        if (order.coupon_code) {
          const code = order.coupon_code as string;
          if (!couponMap[code]) {
            couponMap[code] = { code, count: 0, revenue: 0, discount: 0 };
          }
          couponMap[code].count += 1;
          couponMap[code].revenue += orderTotal;
          couponMap[code].discount += Number(order.discount_amount || 0);
        }

        (order.order_items || []).forEach((item: any) => {
          const qty = item.quantity || 1;
          salesByDate[dateKey].tickets += qty;
          totalTickets += qty;
          if (event && eventSalesMap[event.id]) {
            eventSalesMap[event.id].ticketsSold += qty;
          }

          const ticketType = item.ticket_types;
          if (ticketType) {
            if (!ticketTypeMap[ticketType.id]) {
              ticketTypeMap[ticketType.id] = {
                id: ticketType.id,
                name: ticketType.name || "Ingresso",
                quantity: 0,
                revenue: 0,
              };
            }
            ticketTypeMap[ticketType.id].quantity += qty;
            ticketTypeMap[ticketType.id].revenue += Number(item.unit_price || 0) * qty;
          }
        });
      });

      // Convert to array and sort chronologically pela chave real (yyyy-MM-dd),
      // não pela string formatada -- senão períodos que cruzam mês/ano ordenam errado.
      const salesArray = Object.entries(salesByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, data]) => {
          // new Date("yyyy-MM-dd") interpreta como UTC meia-noite -- em fuso negativo
          // (Brasil) isso "volta" um dia na exibição. Construindo com y/m/d local evita isso.
          const [y, m, d] = dateKey.split("-").map(Number);
          const localDate = new Date(y, m - 1, d);
          return {
            dateKey,
            date: format(localDate, "dd/MM", { locale: ptBR }),
            fullDate: format(localDate, "dd/MM/yyyy", { locale: ptBR }),
            revenue: data.revenue,
            tickets: data.tickets,
          };
        });

      setSalesData(salesArray);
      setEventSales(Object.values(eventSalesMap).sort((a, b) => b.revenue - a.revenue));
      setTicketTypeSales(Object.values(ticketTypeMap).sort((a, b) => b.revenue - a.revenue));
      setPaymentMethodSales(paymentMethodMap);
      setCouponSales(Object.values(couponMap).sort((a, b) => b.revenue - a.revenue));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, period]);

  // "Por evento" só faz sentido olhando todos os eventos de uma vez
  useEffect(() => {
    if (selectedEvent !== "all" && salesView === "evento") {
      setSalesView("tipo");
    }
  }, [selectedEvent, salesView]);

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
        ...salesData.map(d => [d.fullDate, d.revenue, d.tickets])
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

      // Ticket type sheet
      const ticketTypeData = [
        ["Tipo de Ingresso", "Quantidade", "Receita"],
        ...ticketTypeSales.map(t => [t.name, t.quantity, t.revenue])
      ];
      const ticketTypeWs = XLSX.utils.aoa_to_sheet(ticketTypeData);
      XLSX.utils.book_append_sheet(wb, ticketTypeWs, "Por Tipo de Ingresso");

      // Coupon sheet
      if (couponSales.length > 0) {
        const couponData = [
          ["Cupom", "Usos", "Receita", "Desconto Total"],
          ...couponSales.map(c => [c.code, c.count, c.revenue, c.discount])
        ];
        const couponWs = XLSX.utils.aoa_to_sheet(couponData);
        XLSX.utils.book_append_sheet(wb, couponWs, "Por Cupom");
      }

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

  const formatBRL = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const pixPercent = totals.revenue > 0 ? (paymentMethodSales.pix.revenue / totals.revenue) * 100 : 0;
  const cardPercent = totals.revenue > 0 ? (paymentMethodSales.card.revenue / totals.revenue) * 100 : 0;

  // Linhas da tabela "Evolução das Vendas" -- mais recente primeiro, filtradas pelo período escolhido
  const evolutionRows = useMemo(() => {
    const descending = [...salesData].reverse();
    const todayKey = format(new Date(), "yyyy-MM-dd");
    if (evolutionRange === "hoje") {
      return descending.filter(d => d.dateKey === todayKey);
    }
    if (evolutionRange === "7d") {
      return descending.slice(0, 7);
    }
    return descending;
  }, [salesData, evolutionRange]);

  const paymentPieData = [
    { key: "pix", name: "PIX", value: paymentMethodSales.pix.revenue, count: paymentMethodSales.pix.count },
    { key: "card", name: "Cartão", value: paymentMethodSales.card.revenue, count: paymentMethodSales.card.count },
  ].filter(d => d.value > 0 || d.count > 0);

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

      <Tabs defaultValue="geral" className="w-full">
        <TabsList>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
        </TabsList>

        {/* ─────────────────────── VISÃO GERAL ─────────────────────── */}
        <TabsContent value="geral" className="space-y-6 mt-6">
          {/* Total vendido + split PIX/Cartão */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total vendido</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowRevenue((v) => !v)}
                aria-label={showRevenue ? "Ocultar valor" : "Mostrar valor"}
              >
                {showRevenue ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-foreground">
                {showRevenue ? formatBRL(totals.revenue) : "R$ ••••••"}
              </div>

              {(paymentMethodSales.pix.count > 0 || paymentMethodSales.card.count > 0) && (
                <div className="space-y-1.5">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                    {pixPercent > 0 && (
                      <div style={{ width: `${pixPercent}%`, backgroundColor: PAYMENT_COLORS.pix }} />
                    )}
                    {cardPercent > 0 && (
                      <div style={{ width: `${cardPercent}%`, backgroundColor: PAYMENT_COLORS.card }} />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_COLORS.pix }} />
                      {pixPercent.toFixed(1)}% PIX
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_COLORS.card }} />
                      {cardPercent.toFixed(1)}% Cartão
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  {formatBRL(totals.avgTicketPrice)}
                </div>
              </CardContent>
            </Card>
          </div>

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

          {/* Evolução das Vendas */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Evolução das Vendas</CardTitle>
              <Tabs value={evolutionRange} onValueChange={(v) => setEvolutionRange(v as EvolutionRange)}>
                <TabsList>
                  <TabsTrigger value="7d">7 dias</TabsTrigger>
                  <TabsTrigger value="hoje">Hoje</TabsTrigger>
                  <TabsTrigger value="periodo">Período</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Carregando...</div>
              ) : evolutionRows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">Nenhuma venda nesse recorte</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evolutionRows.map((row) => (
                      <TableRow key={row.dateKey}>
                        <TableCell>{row.fullDate}</TableCell>
                        <TableCell className="text-right">{row.tickets}</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatBRL(row.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────── VENDAS ─────────────────────────── */}
        <TabsContent value="vendas" className="space-y-6 mt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={salesView} onValueChange={(v) => setSalesView(v as SalesView)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Ver por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tipo">Por tipo de ingresso</SelectItem>
                <SelectItem value="pagamento">Meio de pagamento</SelectItem>
                <SelectItem value="cupom">Por cupom</SelectItem>
                <SelectItem value="evento" disabled={selectedEvent !== "all"}>Por evento</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{totals.tickets}</strong> ingressos</span>
              <span className="text-border">|</span>
              <span><strong className="text-foreground">{formatBRL(totals.revenue)}</strong> total vendido</span>
            </div>
          </div>

          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : (
            <>
              {/* POR TIPO DE INGRESSO */}
              {salesView === "tipo" && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Vendas por Tipo de Ingresso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ticketTypeSales.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Nenhuma venda no período
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <ResponsiveContainer width="100%" height={Math.max(200, ticketTypeSales.length * 60)}>
                          <BarChart data={ticketTypeSales} layout="vertical" margin={{ left: 24 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" horizontal={false} />
                            <XAxis
                              type="number"
                              stroke="hsl(220, 10%, 60%)"
                              tick={{ fill: "hsl(220, 10%, 60%)" }}
                              tickFormatter={(value) => `R$${value}`}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={160}
                              stroke="hsl(220, 10%, 60%)"
                              tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 12 }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(220, 18%, 10%)",
                                border: "1px solid hsl(220, 15%, 18%)",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                            />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                              {ticketTypeSales.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo de ingresso</TableHead>
                              <TableHead className="text-right">Vendidos</TableHead>
                              <TableHead className="text-right">Receita</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ticketTypeSales.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>{t.name}</TableCell>
                                <TableCell className="text-right">{t.quantity}</TableCell>
                                <TableCell className="text-right font-medium text-foreground">
                                  {formatBRL(t.revenue)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* MEIO DE PAGAMENTO */}
              {salesView === "pagamento" && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Vendas por Meio de Pagamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {paymentPieData.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Nenhuma venda no período
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-6 items-center">
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={paymentPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {paymentPieData.map((d) => (
                                <Cell key={d.key} fill={PAYMENT_COLORS[d.key as "pix" | "card"]} />
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
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PAYMENT_COLORS.pix }} />
                              <span className="text-foreground font-medium">PIX</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-foreground">{formatBRL(paymentMethodSales.pix.revenue)}</div>
                              <div className="text-xs text-muted-foreground">{paymentMethodSales.pix.count} pedidos</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PAYMENT_COLORS.card }} />
                              <span className="text-foreground font-medium">Cartão</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-foreground">{formatBRL(paymentMethodSales.card.revenue)}</div>
                              <div className="text-xs text-muted-foreground">{paymentMethodSales.card.count} pedidos</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* POR CUPOM */}
              {salesView === "cupom" && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Vendas por Cupom</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {couponSales.length === 0 ? (
                      <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                        Sem vendas por cupom no período.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cupom</TableHead>
                            <TableHead className="text-right">Usos</TableHead>
                            <TableHead className="text-right">Receita</TableHead>
                            <TableHead className="text-right">Desconto dado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {couponSales.map((c) => (
                            <TableRow key={c.code}>
                              <TableCell className="font-medium text-foreground">{c.code}</TableCell>
                              <TableCell className="text-right">{c.count}</TableCell>
                              <TableCell className="text-right font-medium text-foreground">
                                {formatBRL(c.revenue)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatBRL(c.discount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* POR EVENTO */}
              {salesView === "evento" && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Vendas por Evento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {eventSales.length === 0 ? (
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
                                  {formatBRL(event.revenue)}
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
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;  date: string;
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
  const { getStatsSiteIds, siteId } = useSiteContext();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get site_ids for stats (isolated per site)
      const statsSiteIds = getStatsSiteIds();

      // Fetch user events and filter by site in memory
      const { data: allEventsData } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id);
      
      // Filter by site_id in memory
      const eventsData = (allEventsData || []).filter((event: any) => {
        const eventSiteId = event.site_id || 'premierpass';
        return statsSiteIds.includes(eventSiteId);
      });
      
      setEvents(eventsData);

      // Calculate date range
      const endDate = new Date();
      const startDate = period === "30" 
        ? subDays(endDate, 30)
        : period === "90"
        ? subDays(endDate, 90)
        : startOfMonth(new Date(new Date().getFullYear(), 0, 1)); // Year

      // Fetch orders - only for events that belong to the current site
      const eventIds = eventsData.map((e: any) => e.id);
      
      if (eventIds.length === 0) {
        setSalesData([]);
        setEventSales([]);
        setTotals({ revenue: 0, tickets: 0, orders: 0, avgTicketPrice: 0 });
        setLoading(false);
        return;
      }

      let ordersQuery = supabase
        .from("orders")
        .select("*, order_items(*, ticket_types(*)), events!inner(*)")
        .eq("status", "paid")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .in("event_id", eventIds);

      if (selectedEvent !== "all") {
        ordersQuery = ordersQuery.eq("event_id", selectedEvent);
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
