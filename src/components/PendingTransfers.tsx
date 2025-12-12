import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, Ticket, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PendingTransfer {
  id: string;
  transfer_code: string;
  created_at: string;
  from_user_id: string;
  ticket: {
    id: string;
    ticket_code: string;
    event: {
      id: string;
      title: string;
      start_date: string;
      venue_name: string | null;
    } | null;
    ticket_type: {
      name: string;
    } | null;
  } | null;
  sender: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface PendingTransfersProps {
  onTransferHandled: () => void;
}

const PendingTransfers = ({ onTransferHandled }: PendingTransfersProps) => {
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const { sendLocalNotification, isSubscribed } = usePushNotifications();

  const fetchPendingTransfers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get transfers where user's email matches - use ticket_id to join
      const { data: transfersData, error } = await supabase
        .from("ticket_transfers")
        .select(`
          id,
          transfer_code,
          created_at,
          from_user_id,
          ticket_id
        `)
        .eq("to_user_email", user.email?.toLowerCase())
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch ticket info and sender info for each transfer
      const transfersWithDetails = await Promise.all(
        (transfersData || []).map(async (transfer) => {
          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", transfer.from_user_id)
            .maybeSingle();

          // Fetch ticket with event and type info
          let ticketData = null;
          if (transfer.ticket_id) {
            const { data: ticket } = await supabase
              .from("tickets")
              .select(`
                id,
                ticket_code,
                events (id, title, start_date, venue_name),
                ticket_types (name)
              `)
              .eq("id", transfer.ticket_id)
              .maybeSingle();
            
            if (ticket) {
              ticketData = {
                id: ticket.id,
                ticket_code: ticket.ticket_code,
                event: ticket.events as any,
                ticket_type: ticket.ticket_types as any,
              };
            }
          }

          return {
            ...transfer,
            ticket: ticketData,
            sender: senderProfile,
          };
        })
      );

      setTransfers(transfersWithDetails);
      
      // Send local push notification for new pending transfers
      if (transfersWithDetails.length > 0 && isSubscribed) {
        const latestTransfer = transfersWithDetails[0];
        sendLocalNotification(
          "🎟️ Você recebeu um ingresso!",
          `${latestTransfer.sender?.full_name || "Alguém"} está transferindo um ingresso para ${latestTransfer.ticket?.event?.title || "um evento"}`,
          `/meus-ingressos`
        );
      }
    } catch (error) {
      console.error("Error fetching pending transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTransfers();
  }, []);

  const handleAccept = async (transfer: PendingTransfer) => {
    // Validate ticket ID before proceeding
    const ticketId = transfer.ticket?.id;
    if (!ticketId) {
      toast({
        title: "Erro",
        description: "Ingresso não encontrado para esta transferência.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(transfer.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Update transfer status
      const { error: transferError } = await supabase
        .from("ticket_transfers")
        .update({
          status: "accepted",
          to_user_id: user.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer.id);

      if (transferError) throw transferError;

      // Transfer ticket ownership and update transfer_status
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          user_id: user.id,
          attendee_email: user.email,
          transfer_status: "completed",
        })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      // Send notification to sender
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        await supabase.functions.invoke("send-notification", {
          body: {
            type: "transfer_accepted",
            data: {
              recipientEmail: transfer.sender?.email,
              recipientName: transfer.sender?.full_name,
              senderName: userProfile?.full_name || user.email,
              eventTitle: transfer.ticket?.event?.title,
              eventDate: transfer.ticket?.event?.start_date 
                ? format(new Date(transfer.ticket.event.start_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "",
              ticketCode: transfer.ticket?.ticket_code,
            },
          },
        });
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }

      toast({
        title: "Ingresso aceito!",
        description: "O ingresso foi adicionado à sua conta.",
      });

      // Remove from local state immediately
      setTransfers(prev => prev.filter(t => t.id !== transfer.id));
      onTransferHandled();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (transfer: PendingTransfer) => {
    // Validate ticket ID before proceeding
    const ticketId = transfer.ticket?.id;
    if (!ticketId) {
      toast({
        title: "Erro",
        description: "Ingresso não encontrado para esta transferência.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(transfer.id);
    try {
      // Update transfer status to rejected
      const { error: transferError } = await supabase
        .from("ticket_transfers")
        .update({
          status: "rejected",
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer.id);

      if (transferError) throw transferError;

      // Reset ticket transfer_status back to none so it returns to owner
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({ transfer_status: "none" })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      toast({
        title: "Transferência recusada",
        description: "A transferência foi recusada. O ingresso voltou para o proprietário original.",
      });

      // Remove from local state immediately for instant UI feedback
      setTransfers(prev => prev.filter(t => t.id !== transfer.id));
      onTransferHandled();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-muted rounded-xl h-24" />
      </div>
    );
  }

  if (transfers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Ticket className="w-5 h-5 text-primary" />
        Transferências Pendentes
        <Badge variant="secondary">{transfers.length}</Badge>
      </h2>

      <div className="space-y-4">
        {transfers.map((transfer) => (
          <Card key={transfer.id} className="bg-card border-primary/20 border-2">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    {transfer.ticket?.event?.title}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>De: {transfer.sender?.full_name || transfer.sender?.email}</span>
                    </div>
                    {transfer.ticket?.event?.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(transfer.ticket.event.start_date), "dd MMM yyyy • HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tipo: {transfer.ticket?.ticket_type?.name} • Código: {transfer.ticket?.ticket_code}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(transfer)}
                    disabled={processing === transfer.id}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(transfer)}
                    disabled={processing === transfer.id}
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" />
                    {processing === transfer.id ? "Processando..." : "Aceitar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

export default PendingTransfers;
