import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Clock, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingWithdrawal {
  id: string;
  organizer_id: string;
  organizer_name: string | null;
  organizer_email: string | null;
  event_id: string;
  event_title: string;
  amount: number;
  status: string;
  pix_key: string | null;
  requested_at: string;
}

const formatBRL = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Withdrawals = () => {
  const [requests, setRequests] = useState<PendingWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("list_pending_withdrawals");
      if (error) throw error;
      setRequests((data as PendingWithdrawal[]) || []);
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      toast.error("Erro ao carregar pedidos de saque");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleMarkPaid = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await (supabase as any).rpc("mark_withdrawal_paid", { p_request_id: id });
      if (error) throw error;
      toast.success("Marcado como pago!");
      fetchRequests();
    } catch (error) {
      console.error("Error marking withdrawal as paid:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setProcessingId(null);
    }
  };

  const copyPixKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave PIX copiada!");
  };

  const totalPending = requests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-7 h-7 text-primary" />
          Saques Pendentes
        </h1>
        <p className="text-muted-foreground mt-1">
          Faça a transferência PIX pra chave informada e marque como pago depois.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground text-lg">Total pendente</CardTitle>
          <span className="text-2xl font-bold text-yellow-500">
            {loading ? "..." : formatBRL(totalPending)}
          </span>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : requests.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-70" />
            <p className="text-muted-foreground">Nenhum pedido de saque pendente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req, index) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">
                        {req.organizer_name || req.organizer_email || "Produtor"}
                      </p>
                      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.event_title}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado {format(new Date(req.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {req.pix_key && (
                      <button
                        onClick={() => copyPixKey(req.pix_key!)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                      >
                        <Copy className="w-3 h-3" />
                        Chave PIX: {req.pix_key}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xl font-bold text-foreground">{formatBRL(req.amount)}</span>
                    <Button
                      onClick={() => handleMarkPaid(req.id)}
                      disabled={processingId === req.id}
                      className="gap-2"
                    >
                      {processingId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Marcar como pago
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
