import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Calendar, MapPin, QrCode, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TicketTransfer from "@/components/TicketTransfer";
import PendingTransfers from "@/components/PendingTransfers";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

interface TicketWithDetails {
  id: string;
  ticket_code: string;
  attendee_name: string | null;
  attendee_email: string | null;
  is_used: boolean;
  used_at: string | null;
  created_at: string | null;
  wasTransferred: boolean;
  transfer_status: string;
  event: {
    id: string;
    title: string;
    start_date: string;
    venue_name: string | null;
    city: string | null;
    state: string | null;
    image_url: string | null;
  } | null;
  ticket_type: {
    name: string;
    price: number;
  } | null;
}

const MyTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [transferTicket, setTransferTicket] = useState<TicketWithDetails | null>(null);

  const fetchTickets = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_code,
          attendee_name,
          attendee_email,
          is_used,
          used_at,
          created_at,
          transfer_status,
          events (id, title, start_date, venue_name, city, state, image_url),
          ticket_types (name, price)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check which tickets were received via transfer
      const ticketIds = (data || []).map(t => t.id);
      const { data: transfersData } = await supabase
        .from("ticket_transfers")
        .select("ticket_id")
        .in("ticket_id", ticketIds)
        .eq("status", "accepted");

      const transferredTicketIds = new Set((transfersData || []).map(t => t.ticket_id));

      const formattedTickets = (data || []).map(ticket => ({
        ...ticket,
        event: ticket.events as TicketWithDetails["event"],
        ticket_type: ticket.ticket_types as TicketWithDetails["ticket_type"],
        wasTransferred: transferredTicketIds.has(ticket.id),
        transfer_status: ticket.transfer_status || "none",
      }));

      setTickets(formattedTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [navigate]);

  const upcomingTickets = tickets.filter(
    t => t.event && new Date(t.event.start_date) >= new Date() && !t.is_used
  );
  const pastTickets = tickets.filter(
    t => t.event && (new Date(t.event.start_date) < new Date() || t.is_used)
  );

  const TicketCard = ({ ticket }: { ticket: TicketWithDetails }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer"
      onClick={() => setSelectedTicket(ticket)}
    >
      <Card className="bg-card border-border hover:border-primary/50 transition-colors overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {ticket.event?.image_url ? (
            <div className="md:w-48 h-32 md:h-auto">
              <img
                src={ticket.event.image_url}
                alt={ticket.event.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="md:w-48 h-32 md:h-auto bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Ticket className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          <CardContent className="flex-1 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {ticket.event?.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {ticket.ticket_type?.name}
                </p>
              </div>
              <div className="flex gap-1">
                {ticket.wasTransferred && (
                  <Badge variant="outline" className="text-xs">
                    Recebido
                  </Badge>
                )}
                {ticket.transfer_status === "pending" && (
                  <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-500">
                    Transferência Pendente
                  </Badge>
                )}
                <Badge variant={ticket.is_used ? "secondary" : "default"}>
                  {ticket.is_used ? "Utilizado" : "Válido"}
                </Badge>
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {ticket.event && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(ticket.event.start_date), "dd MMM yyyy • HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {ticket.event.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {ticket.event.venue_name && `${ticket.event.venue_name}, `}
                        {ticket.event.city}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" disabled={ticket.transfer_status === "pending"}>
                <QrCode className="w-4 h-4" />
                Ver QR Code
              </Button>
              {!ticket.is_used && ticket.event && new Date(ticket.event.start_date) >= new Date() && ticket.transfer_status !== "pending" && (
                ticket.wasTransferred ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            disabled
                          >
                            <Send className="w-4 h-4" />
                            Transferir
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ingressos recebidos por transferência não podem ser transferidos novamente</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTransferTicket(ticket);
                    }}
                  >
                    <Send className="w-4 h-4" />
                    Transferir
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Meus <span className="text-gradient">Ingressos</span>
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus ingressos comprados
            </p>
          </motion.div>

          {/* Pending Transfers Section */}
          <PendingTransfers onTransferHandled={fetchTickets} />

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-xl h-32" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <Ticket className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Você ainda não tem ingressos
                </h2>
                <p className="text-muted-foreground mb-6">
                  Explore nossos eventos e garanta seu ingresso!
                </p>
                <Button onClick={() => navigate("/eventos")}>
                  Ver eventos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="upcoming" className="space-y-6">
              <TabsList>
                <TabsTrigger value="upcoming">
                  Próximos ({upcomingTickets.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Histórico ({pastTickets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingTickets.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhum ingresso para eventos futuros
                    </CardContent>
                  </Card>
                ) : (
                  upcomingTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {pastTickets.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhum ingresso no histórico
                    </CardContent>
                  </Card>
                ) : (
                  pastTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />

      {/* QR Code Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seu Ingresso</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  {selectedTicket.event?.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedTicket.ticket_type?.name}
                </p>
              </div>

              <div className="flex justify-center p-6 bg-white rounded-xl">
                <QRCodeSVG
                  value={`PREMIERPASS-${selectedTicket.ticket_code}`}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Código do ingresso</p>
                <p className="font-mono text-lg font-bold text-foreground">
                  {selectedTicket.ticket_code}
                </p>
              </div>

              {selectedTicket.event && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(selectedTicket.event.start_date), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {selectedTicket.event.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {selectedTicket.event.venue_name && `${selectedTicket.event.venue_name}, `}
                        {selectedTicket.event.city}, {selectedTicket.event.state}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>Apresente este QR Code na entrada do evento para validação.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      {transferTicket && (
        <TicketTransfer
          ticketId={transferTicket.id}
          ticketCode={transferTicket.ticket_code}
          eventTitle={transferTicket.event?.title || ""}
          eventDate={transferTicket.event?.start_date}
          open={!!transferTicket}
          onOpenChange={(open) => !open && setTransferTicket(null)}
          onSuccess={fetchTickets}
        />
      )}
    </div>
  );
};

export default MyTickets;