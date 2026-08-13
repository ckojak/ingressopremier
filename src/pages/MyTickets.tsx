import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Calendar, MapPin, QrCode, Download } from "lucide-react";
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
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PaymentErrorBoundary from "@/components/PaymentErrorBoundary";
import TicketCardSkeleton from "@/components/skeletons/TicketCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { downloadTicketPdf } from "@/lib/ticket-pdf";

interface TicketWithDetails {
  id: string;
  ticket_code: string;
  attendee_name: string | null;
  attendee_email: string | null;
  is_used: boolean;
  used_at: string | null;
  created_at: string | null;

  event_id: string | null;
  ticket_type_id: string | null;
  order_item_id: string | null;

  is_complimentary: boolean;
  wasTransferred: boolean;
  transfer_status: string;
  order_status: "pending" | "paid" | "cancelled" | "failed";

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

const MyTicketsContent = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (ticket: TicketWithDetails) => {
    setDownloadingId(ticket.id);
    try {
      const location = ticket.event
        ? [ticket.event.venue_name, ticket.event.city, ticket.event.state].filter(Boolean).join(", ") ||
          "Local a confirmar"
        : "Local a confirmar";

      await downloadTicketPdf({
        eventTitle: ticket.event?.title || "Ingresso PremierPass",
        dateTime: ticket.event
          ? format(new Date(ticket.event.start_date), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
          : "Data a confirmar",
        location,
        holderName: ticket.attendee_name || "-",
        ticketTypeName: ticket.ticket_type?.name || "Ingresso",
        ticketCode: ticket.ticket_code,
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar o PDF do ingresso.");
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchTickets = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    try {
      // First, fetch tickets with all possible relations
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
          event_id,
          ticket_type_id,
          order_item_id,
          order_items!left(
            ticket_type_id,
            orders!left(status)
          ),
          events(id, title, start_date, venue_name, city, state, image_url),
          ticket_types(name, price)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check which tickets were received via transfer
      const ticketIds = (data || []).map((t) => t.id);
      const { data: transfersData } = await supabase
        .from("ticket_transfers")
        .select("ticket_id")
        .in("ticket_id", ticketIds)
        .eq("status", "accepted");

      const transferredTicketIds = new Set((transfersData || []).map((t) => t.ticket_id));

      // Fallback fetch for missing event/ticket_type relations (by IDs)
      const missingEventIds = Array.from(
        new Set(
          (data || [])
            .filter((t) => !t.events && t.event_id)
            .map((t) => t.event_id)
        )
      ) as string[];

      const missingTicketTypeIds = Array.from(
        new Set(
          (data || [])
            .filter((t) => !t.ticket_types && t.ticket_type_id)
            .map((t) => t.ticket_type_id)
        )
      ) as string[];

      const [eventsFallbackRes, ticketTypesFallbackRes] = await Promise.all([
        missingEventIds.length
          ? supabase
              .from("events")
              .select("id, title, start_date, venue_name, city, state, image_url")
              .in("id", missingEventIds)
          : Promise.resolve({ data: [], error: null } as any),
        missingTicketTypeIds.length
          ? supabase.from("ticket_types").select("id, name, price").in("id", missingTicketTypeIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const eventsById = new Map<string, TicketWithDetails["event"]>();
      (eventsFallbackRes.data || []).forEach((e: any) => eventsById.set(e.id, e));

      const ticketTypesById = new Map<string, TicketWithDetails["ticket_type"]>();
      (ticketTypesFallbackRes.data || []).forEach((tt: any) =>
        ticketTypesById.set(tt.id, { name: tt.name, price: tt.price })
      );

      // Fetch order_items separately (some RLS setups may hide nested joins)
      const orderItemIds = Array.from(
        new Set((data || []).map((t: any) => t.order_item_id).filter(Boolean))
      ) as string[];

      const { data: orderItemsData } = orderItemIds.length
        ? await supabase
            .from("order_items")
            .select(`
              id,
              ticket_type_id,
              orders(status)
            `)
            .in("id", orderItemIds)
        : ({ data: [] } as any);

      const orderItemsById = new Map<
        string,
        { ticket_type_id: string | null; orders: { status: string } | null }
      >();
      (orderItemsData || []).forEach((oi: any) => {
        orderItemsById.set(oi.id, {
          ticket_type_id: oi.ticket_type_id ?? null,
          orders: oi.orders ?? null,
        });
      });

      // Collect ticket_type_ids from order_items (nested or direct) to fetch event info
      const orderItemTicketTypeIds = Array.from(
        new Set([
          ...(data || []).map((t: any) => (t.order_items as any)?.ticket_type_id).filter(Boolean),
          ...(orderItemsData || []).map((oi: any) => oi.ticket_type_id).filter(Boolean),
        ])
      ) as string[];

      // Fetch ticket types with events for order_items
      let ticketTypesWithEvents: Record<
        string,
        { name: string; price: number; event: TicketWithDetails["event"] }
      > = {};
      if (orderItemTicketTypeIds.length > 0) {
        const { data: ttData } = await supabase
          .from("ticket_types")
          .select(
            `
            id,
            name,
            price,
            events(id, title, start_date, venue_name, city, state, image_url)
          `
          )
          .in("id", orderItemTicketTypeIds);

        (ttData || []).forEach((tt: any) => {
          ticketTypesWithEvents[tt.id] = {
            name: tt.name,
            price: tt.price,
            event: tt.events,
          };
        });
      }

      const formattedTickets: TicketWithDetails[] = (data || []).map((ticket: any) => {
        const isComplimentary = !ticket.order_item_id;

        const directTicketType = ticket.ticket_types as { name: string; price: number } | null;
        const directEvent = ticket.events as TicketWithDetails["event"];

        const eventFromId = ticket.event_id ? eventsById.get(ticket.event_id) : null;
        const ticketTypeFromId = ticket.ticket_type_id ? ticketTypesById.get(ticket.ticket_type_id) : null;

        let orderStatus: string = "paid";
        let ticketType: { name: string; price: number } | null = directTicketType || ticketTypeFromId;
        let event: TicketWithDetails["event"] = directEvent || eventFromId || null;

        if (!isComplimentary) {
          // Paid ticket - get status from order_items (nested or direct)
          const nestedOrderItem = ticket.order_items as
            | { ticket_type_id: string | null; orders: { status: string } | null }
            | null;
          const directOrderItem = ticket.order_item_id
            ? orderItemsById.get(ticket.order_item_id)
            : undefined;

          const resolvedOrderItem = nestedOrderItem || directOrderItem || null;
          orderStatus = resolvedOrderItem?.orders?.status || "paid";

          // If no direct event/ticket_type, try to get from order_items -> ticket_types
          const ttId = resolvedOrderItem?.ticket_type_id || null;
          if (ttId && ticketTypesWithEvents[ttId]) {
            const ttInfo = ticketTypesWithEvents[ttId];
            if (!ticketType) ticketType = { name: ttInfo.name, price: ttInfo.price };
            if (!event) event = ttInfo.event;
          }
        }

        return {
          ...ticket,
          event_id: ticket.event_id || null,
          ticket_type_id: ticket.ticket_type_id || null,
          order_item_id: ticket.order_item_id || null,
          is_complimentary: isComplimentary,
          event,
          ticket_type: ticketType,
          wasTransferred: transferredTicketIds.has(ticket.id),
          transfer_status: ticket.transfer_status || "none",
          order_status: orderStatus as TicketWithDetails["order_status"],
        };
      });

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

  const now = new Date();

  const upcomingTickets = tickets.filter(
    (t) => !t.is_used && !!t.event && new Date(t.event.start_date) >= now
  );
  const pastTickets = tickets.filter(
    (t) => t.is_used || !t.event || new Date(t.event.start_date) < now
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
                  {ticket.event?.title || "Ingresso PremierPass"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {ticket.ticket_type?.name || "Ingresso"}
                </p>
              </div>
              <div className="flex gap-1 flex-wrap">
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
                {/* Status Badge */}
                {ticket.is_used ? (
                  <Badge variant="secondary" className="text-xs">
                    Utilizado
                  </Badge>
                ) : ticket.is_complimentary ? (
                  <Badge variant="secondary" className="text-xs">
                    Cortesia
                  </Badge>
                ) : ticket.order_status === "pending" ? (
                  <Badge className="text-xs bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                    Pagamento Pendente
                  </Badge>
                ) : ticket.order_status === "cancelled" || ticket.order_status === "failed" ? (
                  <Badge className="text-xs bg-red-500/20 text-red-600 border-red-500/30">
                    Pagamento Recusado
                  </Badge>
                ) : (
                  <Badge
                    variant="default"
                    className="text-xs bg-green-500/20 text-green-600 border-green-500/30"
                  >
                    Aprovado
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {ticket.event ? (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(ticket.event.start_date), "dd MMM yyyy • HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {(ticket.event.venue_name || ticket.event.city || ticket.event.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {ticket.event.venue_name ? `${ticket.event.venue_name}${ticket.event.city ? ", " : ""}` : ""}
                        {ticket.event.city || ""}
                        {ticket.event.state
                          ? `${ticket.event.city ? " • " : ticket.event.venue_name ? " • " : ""}${ticket.event.state}`
                          : ""}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {ticket.created_at
                      ? `Comprado em ${format(new Date(ticket.created_at), "dd MMM yyyy", { locale: ptBR })}`
                      : "Detalhes do evento indisponíveis"}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" disabled={ticket.transfer_status === "pending"}>
                <QrCode className="w-4 h-4" />
                Ver QR Code
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1"
                disabled={downloadingId === ticket.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPdf(ticket);
                }}
              >
                <Download className="w-4 h-4" />
                {downloadingId === ticket.id ? "Gerando..." : "Baixar PDF"}
              </Button>
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


          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <TicketCardSkeleton key={i} />
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
                  {selectedTicket.event?.title || "Ingresso PremierPass"}
                </h3>
                {selectedTicket.ticket_type?.name && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket.ticket_type.name}
                  </p>
                )}
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

              <Button
                className="w-full gap-2"
                disabled={downloadingId === selectedTicket.id}
                onClick={() => handleDownloadPdf(selectedTicket)}
              >
                <Download className="w-4 h-4" />
                {downloadingId === selectedTicket.id ? "Gerando PDF..." : "Baixar PDF"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

const MyTickets = () => {
  return (
    <PaymentErrorBoundary
      fallbackTitle="Erro ao carregar ingressos"
      fallbackMessage="Não foi possível carregar seus ingressos. Verifique sua conexão e tente novamente."
    >
      <MyTicketsContent />
    </PaymentErrorBoundary>
  );
};

export default MyTickets;