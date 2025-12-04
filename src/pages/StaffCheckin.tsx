import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, Check, X, Search, Ticket, Calendar, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TicketWithDetails = {
  id: string;
  ticket_code: string;
  attendee_name: string | null;
  attendee_email: string | null;
  is_used: boolean;
  used_at: string | null;
  ticket_type: {
    name: string;
  } | null;
};

type EventDetails = {
  id: string;
  title: string;
  start_date: string;
  venue_name: string | null;
};

const StaffCheckin = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [ticketCode, setTicketCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [lastCheckedTicket, setLastCheckedTicket] = useState<TicketWithDetails | null>(null);
  const [checkResult, setCheckResult] = useState<"success" | "error" | "already_used" | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<TicketWithDetails[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    verifyAccess();
  }, [accessCode]);

  const verifyAccess = async () => {
    if (!accessCode) {
      navigate("/");
      return;
    }

    try {
      const { data: staffData, error } = await supabase
        .from("checkin_staff")
        .select(`
          id,
          name,
          email,
          event_id,
          is_active,
          events (id, title, start_date, venue_name)
        `)
        .eq("access_code", accessCode)
        .eq("is_active", true)
        .single();

      if (error || !staffData) {
        toast.error("Código de acesso inválido ou expirado");
        navigate("/");
        return;
      }

      // Update last access
      await supabase
        .from("checkin_staff")
        .update({ last_access_at: new Date().toISOString() })
        .eq("id", staffData.id);

      const eventData = staffData.events as EventDetails;
      setEvent(eventData);
      setStaffName(staffData.name || staffData.email);
      setAuthorized(true);
      fetchRecentCheckIns(eventData.id);
    } catch (error) {
      console.error("Error verifying access:", error);
      toast.error("Erro ao verificar acesso");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCheckIns = async (eventId: string) => {
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
          ticket_types(name)
        `)
        .eq("event_id", eventId)
        .eq("is_used", true)
        .order("used_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentCheckIns(data?.map(t => ({
        ...t,
        ticket_type: t.ticket_types as { name: string } | null,
      })) || []);
    } catch (error) {
      console.error("Error fetching recent check-ins:", error);
    }
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!ticketCode.trim() || !event) {
      toast.error("Digite o código do ingresso");
      return;
    }

    setChecking(true);
    setCheckResult(null);

    try {
      const { data: ticket, error: findError } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_code,
          attendee_name,
          attendee_email,
          is_used,
          used_at,
          ticket_types(name)
        `)
        .eq("ticket_code", ticketCode.toUpperCase())
        .eq("event_id", event.id)
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
      };

      setLastCheckedTicket(ticketData);

      if (ticket.is_used) {
        setCheckResult("already_used");
        toast.error("Este ingresso já foi utilizado!");
        return;
      }

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
      
      setLastCheckedTicket({ ...ticketData, is_used: true, used_at: new Date().toISOString() });
      fetchRecentCheckIns(event.id);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Verificando acesso...</div>
      </div>
    );
  }

  if (!authorized || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <X className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground mb-4">
              O código de acesso é inválido ou expirou.
            </p>
            <Button onClick={() => navigate("/")}>Voltar ao início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  Event<span className="text-gradient">ix</span>
                </span>
                <p className="text-xs text-muted-foreground">Check-in</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{staffName}</p>
                <p className="text-xs text-muted-foreground">Staff</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Event Info */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
                <p className="text-muted-foreground">
                  {format(new Date(event.start_date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
                {event.venue_name && (
                  <p className="text-sm text-muted-foreground">{event.venue_name}</p>
                )}
              </div>
            </div>
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
                    placeholder="Digite ou escaneie o código"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                    className="pl-10 h-14 text-lg uppercase"
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="h-14 px-8"
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
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      checkResult === "success"
                        ? "bg-green-500"
                        : checkResult === "already_used"
                        ? "bg-yellow-500"
                        : "bg-destructive"
                    }`}
                  >
                    {checkResult === "success" ? (
                      <Check className="w-7 h-7 text-white" />
                    ) : (
                      <X className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-xl font-semibold ${
                        checkResult === "success"
                          ? "text-green-400"
                          : checkResult === "already_used"
                          ? "text-yellow-400"
                          : "text-destructive"
                      }`}
                    >
                      {checkResult === "success"
                        ? "✓ Check-in Realizado!"
                        : checkResult === "already_used"
                        ? "⚠ Já Utilizado"
                        : "✗ Inválido"}
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
                        <p className="text-yellow-400 font-medium">
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
      </main>
    </div>
  );
};

export default StaffCheckin;