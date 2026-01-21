import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Search, CheckCircle, XCircle, Clock, AlertTriangle, Webhook, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSiteContext } from "@/hooks/useSiteContext";

interface WebhookLog {
  id: string;
  created_at: string;
  payment_id: string;
  order_id: string | null;
  site_id: string;
  payment_status: string;
  event_type: string;
  amount: number | null;
  payer_email: string | null;
  is_sandbox: boolean;
  details: Record<string, unknown> | null;
}

const WebhookLogs = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const { siteId } = useSiteContext();

  const fetchLogs = async () => {
    try {
      // Fetch orders with payment info as a proxy for webhook logs
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('id, created_at, payment_intent_id, status, total_amount, customer_email, event_id')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error("Error fetching orders:", error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Transform orders to webhook-like logs for display
      const transformedLogs: WebhookLog[] = (ordersData || []).map(order => ({
        id: order.id,
        created_at: order.created_at || new Date().toISOString(),
        payment_id: order.payment_intent_id || 'N/A',
        order_id: order.id,
        site_id: 'premierpass', // Default to premierpass
        payment_status: order.status === 'paid' ? 'approved' : (order.status || 'pending'),
        event_type: 'payment',
        amount: Number(order.total_amount) || 0,
        payer_email: order.customer_email,
        is_sandbox: false,
        details: null
      }));

      // Apply filters
      let filteredData = transformedLogs;
      
      if (statusFilter !== "all") {
        filteredData = filteredData.filter(log => log.payment_status === statusFilter);
      }
      
      if (siteFilter !== "all") {
        filteredData = filteredData.filter(log => log.site_id === siteFilter);
      }

      setLogs(filteredData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("webhook_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webhook_logs",
        },
        (payload) => {
          setLogs((prev) => [payload.new as WebhookLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, siteFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "pending":
      case "in_process":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "rejected":
      case "cancelled":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            {status === "rejected" ? "Rejeitado" : "Cancelado"}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const getSiteBadge = (logSiteId: string) => {
    return <Badge className="bg-primary/20 text-primary border-primary/30">PremierPass</Badge>;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.payment_id?.toLowerCase().includes(term) ||
      log.order_id?.toLowerCase().includes(term) ||
      log.payer_email?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="w-6 h-6 text-primary" />
            Logs de Webhook
          </h1>
          <p className="text-muted-foreground">Monitoramento em tempo real dos pagamentos</p>
        </div>

        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os sites</SelectItem>
                <SelectItem value="premierpass">PremierPass</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-400">
              {logs.filter((l) => l.payment_status === "approved").length}
            </div>
            <p className="text-sm text-muted-foreground">Aprovados</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-400">
              {logs.filter((l) => ["pending", "in_process"].includes(l.payment_status)).length}
            </div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-400">
              {logs.filter((l) => ["rejected", "cancelled"].includes(l.payment_status)).length}
            </div>
            <p className="text-sm text-muted-foreground">Rejeitados</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{logs.length}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Últimos Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum webhook recebido ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(log.payment_status)}
                          {getSiteBadge(log.site_id)}
                          {log.is_sandbox && (
                            <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                              Sandbox
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-mono text-muted-foreground">
                          Payment: {log.payment_id}
                        </p>
                        {log.order_id && (
                          <p className="text-sm font-mono text-muted-foreground">
                            Order: {log.order_id}
                          </p>
                        )}
                        {log.payer_email && (
                          <p className="text-sm text-muted-foreground">{log.payer_email}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {log.amount && (
                          <p className="font-semibold">
                            R$ {log.amount.toFixed(2).replace(".", ",")}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookLogs;
