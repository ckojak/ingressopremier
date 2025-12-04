import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Plus, Send, Ticket, Calendar, Search, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Event = Tables<"events">;
type TicketType = Tables<"ticket_types">;

interface ComplimentaryTicket {
  id: string;
  ticket_code: string;
  attendee_name: string | null;
  attendee_email: string | null;
  is_used: boolean;
  created_at: string;
  ticket_type: {
    name: string;
  } | null;
}

const Complimentary = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [complimentaryTickets, setComplimentaryTickets] = useState<ComplimentaryTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTicket, setNewTicket] = useState({
    eventId: "",
    ticketTypeId: "",
    recipientName: "",
    recipientEmail: "",
    quantity: 1,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTicketTypes(selectedEvent);
      fetchComplimentaryTickets(selectedEvent);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("status", "published")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
      
      if (data && data.length > 0) {
        setSelectedEvent(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketTypes = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true);

      if (error) throw error;
      setTicketTypes(data || []);
    } catch (error) {
      console.error("Error fetching ticket types:", error);
    }
  };

  const fetchComplimentaryTickets = async (eventId: string) => {
    try {
      // Fetch tickets that were created without an order (complimentary)
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_code,
          attendee_name,
          attendee_email,
          is_used,
          created_at,
          ticket_types (name)
        `)
        .eq("event_id", eventId)
        .is("order_item_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplimentaryTickets(data?.map(t => ({
        ...t,
        ticket_type: t.ticket_types as { name: string } | null,
      })) || []);
    } catch (error) {
      console.error("Error fetching complimentary tickets:", error);
    }
  };

  const generateTicketCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSendComplimentary = async () => {
    if (!newTicket.eventId || !newTicket.ticketTypeId || !newTicket.recipientEmail) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const tickets = [];
      for (let i = 0; i < newTicket.quantity; i++) {
        tickets.push({
          event_id: newTicket.eventId,
          ticket_type_id: newTicket.ticketTypeId,
          ticket_code: generateTicketCode(),
          attendee_name: newTicket.recipientName || null,
          attendee_email: newTicket.recipientEmail.toLowerCase(),
          user_id: null, // Will be null for complimentary tickets until claimed
          order_item_id: null, // No order for complimentary
        });
      }

      // Insert tickets using service role via edge function would be needed
      // For now, we'll create a workaround by temporarily adjusting
      const { data: insertedTickets, error } = await supabase
        .from("tickets")
        .insert(tickets)
        .select();

      if (error) throw error;

      // Get event details for email
      const event = events.find(e => e.id === newTicket.eventId);
      const ticketType = ticketTypes.find(t => t.id === newTicket.ticketTypeId);

      // Send email notification
      await supabase.functions.invoke("send-ticket-email", {
        body: {
          type: "complimentary",
          recipientEmail: newTicket.recipientEmail.toLowerCase(),
          recipientName: newTicket.recipientName || "Convidado",
          eventTitle: event?.title,
          eventDate: event?.start_date 
            ? format(new Date(event.start_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
            : "",
          venueName: event?.venue_name || "",
          ticketTypeName: ticketType?.name,
          ticketCodes: insertedTickets?.map(t => t.ticket_code) || [],
          quantity: newTicket.quantity,
          siteUrl: window.location.origin,
        },
      });

      toast.success(`${newTicket.quantity} cortesia(s) enviada(s) com sucesso!`);
      setIsDialogOpen(false);
      setNewTicket({
        eventId: "",
        ticketTypeId: "",
        recipientName: "",
        recipientEmail: "",
        quantity: 1,
      });
      fetchComplimentaryTickets(selectedEvent);
    } catch (error: any) {
      console.error("Error sending complimentary:", error);
      toast.error(error.message || "Erro ao enviar cortesia");
    } finally {
      setSending(false);
    }
  };

  const filteredTickets = complimentaryTickets.filter(ticket =>
    ticket.attendee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.attendee_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticket_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cortesias</h1>
          <p className="text-muted-foreground mt-1">
            Envie ingressos cortesia para convidados especiais
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Gift className="w-4 h-4" />
              Enviar Cortesia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Ingresso Cortesia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Evento *</Label>
                <Select 
                  value={newTicket.eventId} 
                  onValueChange={(v) => {
                    setNewTicket({ ...newTicket, eventId: v, ticketTypeId: "" });
                    fetchTicketTypes(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Ingresso *</Label>
                <Select 
                  value={newTicket.ticketTypeId} 
                  onValueChange={(v) => setNewTicket({ ...newTicket, ticketTypeId: v })}
                  disabled={!newTicket.eventId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Convidado</Label>
                <Input
                  value={newTicket.recipientName}
                  onChange={(e) => setNewTicket({ ...newTicket, recipientName: e.target.value })}
                  placeholder="Nome do convidado"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail do Convidado *</Label>
                <Input
                  type="email"
                  value={newTicket.recipientEmail}
                  onChange={(e) => setNewTicket({ ...newTicket, recipientEmail: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Select 
                  value={newTicket.quantity.toString()} 
                  onValueChange={(v) => setNewTicket({ ...newTicket, quantity: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} ingresso{num > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>O convidado receberá um e-mail com os ingressos</li>
                  <li>Os ingressos poderão ser usados diretamente no evento</li>
                  <li>Cortesias não geram cobrança</li>
                </ul>
              </div>
              <Button 
                onClick={handleSendComplimentary} 
                className="w-full gap-2"
                disabled={sending}
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Enviar Cortesia"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Gift className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Você não tem eventos publicados para enviar cortesias.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Event Selection */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Selecionar Evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {format(new Date(event.start_date), "dd/MM/yyyy", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Complimentary Tickets List */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  Cortesias Enviadas
                  <Badge variant="secondary">{complimentaryTickets.length}</Badge>
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTickets.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {searchQuery ? "Nenhum resultado encontrado." : "Nenhuma cortesia enviada para este evento."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Gift className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {ticket.attendee_name || "Sem nome"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {ticket.attendee_email}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Código: {ticket.ticket_code} • {ticket.ticket_type?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ticket.is_used ? "secondary" : "default"}>
                          {ticket.is_used ? "Utilizado" : "Válido"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Complimentary;