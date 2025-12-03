import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { QrCode, Check, X, Search, Ticket, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
type TicketWithDetails = {
  id: string;
  ticket_code: string;
  attendee_name: string | null;
  attendee_email: string | null;
  is_used: boolean;
  used_at: string | null;
  event_id: string | null;
  ticket_type: {
    name: string;
  } | null;
  event: {
    title: string;
  } | null;
};

const CheckIn = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [ticketCode, setTicketCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheckedTicket, setLastCheckedTicket] = useState<TicketWithDetails | null>(null);
  const [checkResult, setCheckResult] = useState<"success" | "error" | "already_used" | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<TicketWithDetails[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchRecentCheckIns();
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

  const fetchRecentCheckIns = async () => {
    if (!selectedEvent) return;

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
          event_id,
          ticket_types(name),
          events(title)
        `)
        .eq("event_id", selectedEvent)
        .eq("is_used", true)
        .order("used_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentCheckIns(data?.map(t => ({
        ...t,
        ticket_type: t.ticket_types as { name: string } | null,
        event: t.events as { title: string } | null,
      })) || []);
    } catch (error) {
      console.error("Error fetching recent check-ins:", error);
    }
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!ticketCode.trim() || !selectedEvent) {
      toast.error("Digite o código do ingresso");
      return;
    }

    setChecking(true);
    setCheckResult(null);

    try {
      // Find ticket by code
      const { data: ticket, error: findError } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_code,
          attendee_name,
          attendee_email,
          is_used,
          used_at,
          event_id,
          ticket_types(name),
          events(title)
        `)
        .eq("ticket_code", ticketCode.toUpperCase())
        .eq("event_id", selectedEvent)
        .single();

      if (findError || !ticket) {
        setCheckResult("error");
        setLastCheckedTicket(null);
        toast.error("Ingresso não encontrado para este evento");
        return;
      }

      const ticketData: TicketWithDetails = {
        ...ticket,
        ticket_type: ticket.ticket_types as { name: string } | null,
        event: ticket.events as { title: string } | null,
      };

      setLastCheckedTicket(ticketData);

      if (ticket.is_used) {
        setCheckResult("already_used");
        toast.error("Este ingresso já foi utilizado!");
        return;
      }

      // Mark as used
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString() 
        })
        .eq("id", ticket.id);

      if (updateError) throw updateError;

      setCheckResult("success");
      toast.success("Check-in realizado com sucesso!");
      
      // Update last checked ticket with new status
      setLastCheckedTicket({ ...ticketData, is_used: true, used_at: new Date().toISOString() });
      
      // Refresh recent check-ins
      fetchRecentCheckIns();
    } catch (error: any) {
      console.error("Check-in error:", error);
      setCheckResult("error");
      toast.error("Erro ao realizar check-in");
    } finally {
      setChecking(false);
      setTicketCode("");
      inputRef.current?.focus();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Check-in</h1>
        <p className="text-muted-foreground mt-1">
          Valide os ingressos na entrada do evento
        </p>
      </div>

      {events.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <QrCode className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Você não tem eventos publicados para realizar check-in.
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

          {/* Check-in Form */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Validar Ingresso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      placeholder="Digite ou escaneie o código do ingresso"
                      value={ticketCode}
                      onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                      className="pl-10 h-12 text-lg uppercase"
                      autoFocus
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="h-12 px-8"
                    disabled={checking || !ticketCode.trim()}
                  >
                    {checking ? "Verificando..." : "Validar"}
                  </Button>
                </div>
              </form>

              {/* Result Display */}
              {checkResult && lastCheckedTicket && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-6 rounded-xl ${
                    checkResult === "success"
                      ? "bg-green-500/10 border border-green-500/30"
                      : checkResult === "already_used"
                      ? "bg-yellow-500/10 border border-yellow-500/30"
                      : "bg-destructive/10 border border-destructive/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        checkResult === "success"
                          ? "bg-green-500"
                          : checkResult === "already_used"
                          ? "bg-yellow-500"
                          : "bg-destructive"
                      }`}
                    >
                      {checkResult === "success" ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <X className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-semibold ${
                          checkResult === "success"
                            ? "text-green-400"
                            : checkResult === "already_used"
                            ? "text-yellow-400"
                            : "text-destructive"
                        }`}
                      >
                        {checkResult === "success"
                          ? "Check-in Realizado!"
                          : checkResult === "already_used"
                          ? "Ingresso Já Utilizado"
                          : "Ingresso Inválido"}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Ticket className="w-4 h-4" />
                          {lastCheckedTicket.ticket_code}
                        </p>
                        {lastCheckedTicket.attendee_name && (
                          <p className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {lastCheckedTicket.attendee_name}
                          </p>
                        )}
                        {lastCheckedTicket.ticket_type && (
                          <p>Tipo: {lastCheckedTicket.ticket_type.name}</p>
                        )}
                        {checkResult === "already_used" && lastCheckedTicket.used_at && (
                          <p className="text-yellow-400">
                            Usado em: {format(new Date(lastCheckedTicket.used_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Recent Check-ins */}
          {recentCheckIns.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  Check-ins Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCheckIns.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{ticket.attendee_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{ticket.ticket_code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {ticket.ticket_type?.name}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ticket.used_at && format(new Date(ticket.used_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CheckIn;
