import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, Calendar, MapPin, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransferDetails {
  id: string;
  transfer_code: string;
  from_user_email: string;
  status: string;
  ticket: {
    id: string;
    ticket_code: string;
    event: {
      title: string;
      start_date: string;
      venue_name: string | null;
      city: string | null;
      image_url: string | null;
    };
    ticket_type: {
      name: string;
    };
  };
}

const AcceptTransfer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transferCode = searchParams.get("code");

  useEffect(() => {
    const fetchTransfer = async () => {
      if (!transferCode) {
        setError("Código de transferência não fornecido.");
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate(`/auth?redirect=/aceitar-transferencia?code=${transferCode}`);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("ticket_transfers")
          .select(`
            id,
            transfer_code,
            status,
            from_user_id,
            tickets!inner (
              id,
              ticket_code,
              events (title, start_date, venue_name, city, image_url),
              ticket_types (name)
            )
          `)
          .eq("transfer_code", transferCode)
          .eq("to_user_email", session.user.email)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Transferência não encontrada ou você não é o destinatário.");
          setLoading(false);
          return;
        }

        if (data.status !== "pending") {
          setError(`Esta transferência já foi ${data.status === "accepted" ? "aceita" : data.status === "rejected" ? "recusada" : "cancelada"}.`);
          setLoading(false);
          return;
        }

        // Get sender email
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", data.from_user_id)
          .maybeSingle();

        const ticket = data.tickets as any;
        setTransfer({
          id: data.id,
          transfer_code: data.transfer_code,
          from_user_email: senderProfile?.email || "Usuário",
          status: data.status,
          ticket: {
            id: ticket.id,
            ticket_code: ticket.ticket_code,
            event: ticket.events,
            ticket_type: ticket.ticket_types,
          },
        });
      } catch (err) {
        console.error("Error:", err);
        setError("Erro ao carregar transferência.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransfer();
  }, [transferCode, navigate]);

  const handleAccept = async () => {
    if (!transfer) return;
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Update transfer status
      const { error: updateTransferError } = await supabase
        .from("ticket_transfers")
        .update({
          status: "accepted",
          to_user_id: session.user.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer.id);

      if (updateTransferError) throw updateTransferError;

      // Transfer ticket ownership
      const { error: updateTicketError } = await supabase
        .from("tickets")
        .update({
          user_id: session.user.id,
          attendee_email: session.user.email,
        })
        .eq("id", transfer.ticket.id);

      if (updateTicketError) throw updateTicketError;

      // Send notification email
      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: "transfer_accepted",
            data: {
              transferId: transfer.id,
              ticketCode: transfer.ticket.ticket_code,
              eventTitle: transfer.ticket.event.title,
              eventDate: format(new Date(transfer.ticket.event.start_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }),
              recipientEmail: session.user.email,
              recipientName: session.user.user_metadata?.full_name || session.user.email,
              senderName: transfer.from_user_email,
            },
          },
        });
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }

      toast({
        title: "Transferência aceita!",
        description: "O ingresso agora está na sua conta.",
      });

      navigate("/meus-ingressos");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!transfer) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from("ticket_transfers")
        .update({ status: "rejected" })
        .eq("id", transfer.id);

      if (error) throw error;

      toast({
        title: "Transferência recusada",
        description: "O ingresso permanecerá com o remetente.",
      });

      navigate("/");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Aceitar Transferência" />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-foreground text-center mb-8">
              Transferência de <span className="text-gradient">Ingresso</span>
            </h1>

            {loading ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <X className="w-12 h-12 mx-auto text-destructive mb-4" />
                  <p className="text-foreground font-medium mb-2">{error}</p>
                  <Button onClick={() => navigate("/")} variant="outline" className="mt-4">
                    Voltar ao início
                  </Button>
                </CardContent>
              </Card>
            ) : transfer ? (
              <Card className="bg-card border-border overflow-hidden">
                {transfer.ticket.event.image_url && (
                  <img
                    src={transfer.ticket.event.image_url}
                    alt={transfer.ticket.event.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardContent className="p-6 space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {transfer.from_user_email} quer transferir para você:
                    </p>
                    <h2 className="text-xl font-bold text-foreground">
                      {transfer.ticket.event.title}
                    </h2>
                    <p className="text-primary">{transfer.ticket.ticket_type.name}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(transfer.ticket.event.start_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {transfer.ticket.event.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {transfer.ticket.event.venue_name && `${transfer.ticket.event.venue_name}, `}
                          {transfer.ticket.event.city}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleReject}
                      variant="outline"
                      className="flex-1"
                      disabled={processing}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Recusar
                    </Button>
                    <Button
                      onClick={handleAccept}
                      className="flex-1"
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Aceitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AcceptTransfer;
