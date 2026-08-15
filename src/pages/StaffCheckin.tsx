import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, Check, X, Search, Ticket, Calendar, User, LogOut, Mail, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { normalizeTicketCode } from "@/lib/ticket-code";

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

type InviteInfo = {
  invite_email: string;
  invite_name: string | null;
  is_active: boolean;
  accepted: boolean;
  event_id: string;
  event_title: string;
  event_start_date: string;
  event_venue_name: string | null;
};

type Step = "loading" | "invite_error" | "email_mismatch" | "confirm_accept" | "checkin";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

const StaffCheckin = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [ticketCode, setTicketCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [lastCheckedTicket, setLastCheckedTicket] = useState<TicketWithDetails | null>(null);
  const [checkResult, setCheckResult] = useState<"success" | "error" | "already_used" | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<TicketWithDetails[]>([]);
  const [autoScanSupported, setAutoScanSupported] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const detectorRef = useRef<InstanceType<NonNullable<Window["BarcodeDetector"]>> | null>(null);
  const checkingRef = useRef(false);

  const loadInvite = useCallback(async () => {
    if (!accessCode) {
      navigate("/");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate(`/auth?next=${encodeURIComponent(`/staff-checkin/${accessCode}`)}`);
      return;
    }

    setSessionEmail(session.user.email ?? null);

    const { data, error } = await supabase.rpc("get_checkin_invite", {
      p_access_code: accessCode,
    });

    const inviteData = data?.[0] as InviteInfo | undefined;

    if (error || !inviteData || !inviteData.is_active) {
      setStep("invite_error");
      return;
    }

    setInvite(inviteData);

    const emailMatches =
      inviteData.invite_email.toLowerCase() === (session.user.email ?? "").toLowerCase();

    if (!emailMatches) {
      setStep("email_mismatch");
      return;
    }

    if (!inviteData.accepted) {
      setStep("confirm_accept");
      return;
    }

    enterCheckinMode(inviteData);
  }, [accessCode, navigate]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  useEffect(() => {
    if (step === "checkin") {
      startCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const enterCheckinMode = (inviteData: InviteInfo) => {
    setEvent({
      id: inviteData.event_id,
      title: inviteData.event_title,
      start_date: inviteData.event_start_date,
      venue_name: inviteData.event_venue_name,
    });
    setStaffName(inviteData.invite_name || inviteData.invite_email);
    setStep("checkin");
    fetchRecentCheckIns(inviteData.event_id);
  };

  const handleAcceptInvite = async () => {
    if (!accessCode || !invite) return;
    setAccepting(true);
    try {
      const { error } = await supabase.rpc("accept_checkin_invite", {
        p_access_code: accessCode,
      });

      if (error) throw error;

      toast.success("Convite aceito! Você já faz parte da equipe de check-in.");
      enterCheckinMode({ ...invite, accepted: true });
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      toast.error("Não foi possível aceitar o convite. Tente novamente.");
    } finally {
      setAccepting(false);
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPermission(true);
      startAutoScan();
    } catch (err) {
      setCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startAutoScan = () => {
    if (!("BarcodeDetector" in window) || !window.BarcodeDetector) {
      setAutoScanSupported(false);
      return;
    }
    setAutoScanSupported(true);

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      setAutoScanSupported(false);
      return;
    }

    if (scanIntervalRef.current) window.clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = window.setInterval(async () => {
      if (checkingRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      if (!detectorRef.current) return;

      try {
        const results = await detectorRef.current.detect(videoRef.current);
        if (results.length > 0 && results[0].rawValue) {
          runCheckIn(results[0].rawValue);
        }
      } catch {
        // frame não pôde ser lido, tenta de novo no próximo intervalo
      }
    }, 350);
  };

  const runCheckIn = async (rawCode: string) => {
    const code = normalizeTicketCode(rawCode);
    if (!code || checkingRef.current || !event || !accessCode) return;

    checkingRef.current = true;
    setChecking(true);
    setCheckResult(null);

    try {
      const { data: ticketRows, error: findError } = await supabase.rpc(
        "find_ticket_for_checkin",
        {
          p_ticket_code: code,
          p_access_code: accessCode,
        }
      );

      const ticket = ticketRows?.[0];

      if (findError || !ticket) {
        setCheckResult("error");
        setLastCheckedTicket(null);
        toast.error("Ingresso não encontrado para este evento");
        return;
      }

      const ticketData: TicketWithDetails = {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        attendee_name: ticket.attendee_name,
        attendee_email: ticket.attendee_email,
        is_used: ticket.is_used,
        used_at: ticket.used_at,
        ticket_type: ticket.ticket_type_name ? { name: ticket.ticket_type_name } : null,
      };

      setLastCheckedTicket(ticketData);

      const { data: rpcData, error: rpcError } = await supabase.rpc("checkin_ticket", {
        p_ticket_id: ticket.id,
        p_access_code: accessCode,
      });

      if (rpcError) throw rpcError;

      const result = rpcData as unknown as {
        success: boolean;
        already_used: boolean;
        attendee_name: string | null;
        used_at: string | null;
      };

      if (!result?.success) {
        if (result?.already_used) {
          setCheckResult("already_used");
          setLastCheckedTicket({ ...ticketData, is_used: true, used_at: result.used_at });
          toast.error("Este ingresso já foi utilizado!");
        } else {
          setCheckResult("error");
          toast.error("Ingresso não encontrado para este evento");
        }
        return;
      }

      setCheckResult("success");
      toast.success("Check-in realizado com sucesso!");

      setLastCheckedTicket({ ...ticketData, is_used: true, used_at: result.used_at ?? new Date().toISOString() });
      fetchRecentCheckIns(event.id);
    } catch (error: any) {
      console.error("Check-in error:", error);
      setCheckResult("error");
      toast.error("Erro ao realizar check-in");
    } finally {
      setChecking(false);
      setTicketCode("");
      inputRef.current?.focus();
      window.setTimeout(() => {
        checkingRef.current = false;
      }, 1200);
    }
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketCode.trim()) {
      toast.error("Digite o código do ingresso");
      return;
    }
    runCheckIn(ticketCode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Verificando acesso...</div>
      </div>
    );
  }

  if (step === "invite_error") {
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

  if (step === "email_mismatch" && invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Mail className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">E-mail diferente</h2>
            <p className="text-muted-foreground mb-2">
              Este convite foi enviado para <strong>{invite.invite_email}</strong>.
            </p>
            <p className="text-muted-foreground mb-6">
              Você está logado como <strong>{sessionEmail}</strong>. Saia e entre com a conta correta pra aceitar o convite.
            </p>
            <Button onClick={handleLogout} className="w-full">
              Sair e entrar com outra conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirm_accept" && invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Convite de check-in</h2>
            <p className="text-muted-foreground mb-1">
              Você foi convidado para fazer parte da equipe de check-in de:
            </p>
            <p className="text-lg font-medium text-foreground mb-6">{invite.event_title}</p>
            <Button onClick={handleAcceptInvite} disabled={accepting} className="w-full">
              {accepting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Aceitar e continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step !== "checkin" || !event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  Premier<span className="text-gradient">Pass</span>
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
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
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

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Validar Ingresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="camera" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="camera" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Escanear QR Code
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Código Manual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="camera">
                {cameraPermission === false ? (
                  <div className="aspect-video rounded-lg bg-secondary flex flex-col items-center justify-center p-6 text-center">
                    <X className="w-10 h-10 text-destructive mb-3" />
                    <p className="text-foreground font-medium mb-1">Câmera não disponível</p>
                    <p className="text-sm text-muted-foreground">Use a aba "Código Manual" ao lado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-8 border-2 border-primary rounded-xl opacity-50" />
                      </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      {autoScanSupported
                        ? "Aponte a câmera para o QR Code — a leitura é automática"
                        : "Seu navegador não lê QR automaticamente aqui — use a aba \"Código Manual\""}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual">
                <form onSubmit={handleCheckIn} className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        ref={inputRef}
                        placeholder="Digite ou escaneie o código"
                        value={ticketCode}
                        onChange={(e) => setTicketCode(normalizeTicketCode(e.target.value))}
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
              </TabsContent>
            </Tabs>

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
