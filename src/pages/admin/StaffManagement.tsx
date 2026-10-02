import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Link2, Calendar, Mail, MessageCircle } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Event = Tables<"events">;

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  access_code: string;
  is_active: boolean;
  created_at: string;
  last_access_at: string | null;
  accepted_at: string | null;
  event: {
    title: string;
  } | null;
}

const PRODUCTION_ORIGIN = "https://premierpass.com.br";

// O link do staff tem que apontar pro site de produção, mesmo se o painel
// for aberto pelo preview do Lovable ou localhost.
const getPublicOrigin = () => {
  const { origin, hostname } = window.location;
  if (hostname.includes("lovable") || hostname === "localhost" || hostname === "127.0.0.1") {
    return PRODUCTION_ORIGIN;
  }
  return origin;
};

const buildStaffLink = (accessCode: string) => `${getPublicOrigin()}/staff-checkin/${accessCode}`;

const buildInviteMessage = (member: StaffMember) =>
  `Olá${member.name ? `, ${member.name}` : ""}! Você foi convidado(a) para a equipe de check-in${
    member.event?.title ? ` do evento ${member.event.title}` : ""
  } no PremierPass.\n\n` +
  `1) Entre (ou crie sua conta) no PremierPass com ESTE e-mail: ${member.email}\n` +
  `2) Abra o link e toque em "Aceitar e continuar": ${buildStaffLink(member.access_code)}`;

const StaffManagement = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", eventId: "" });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchStaff(selectedEvent);
    }
  }, [selectedEvent]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Admin enxerga os eventos de todos os produtores; produtor só os próprios
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (rolesData || []).some((r) => r.role === "admin");

      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("start_date", { ascending: true });

      if (!isAdmin) {
        query = query.eq("organizer_id", user.id);
      }

      const { data: eventsData, error } = await query;

      if (error) throw error;
      setEvents(eventsData || []);
      
      if (eventsData && eventsData.length > 0) {
        setSelectedEvent(eventsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("checkin_staff")
        .select(`
          id,
          name,
          email,
          access_code,
          is_active,
          created_at,
          last_access_at,
          accepted_at,
          events (title)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaff(data?.map(s => ({
        ...s,
        event: s.events as { title: string } | null,
      })) || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  // Código de acesso gerado com aleatoriedade criptográfica (não Math.random)
  const generateAccessCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let code = "";
    for (let i = 0; i < bytes.length; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
  };

  const handleAddStaff = async () => {
    const email = newStaff.email.trim().toLowerCase();

    if (!email || !newStaff.eventId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Evita convite duplicado pro mesmo e-mail no mesmo evento
      const { data: existing } = await supabase
        .from("checkin_staff")
        .select("id")
        .eq("event_id", newStaff.eventId)
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        toast.error("Este e-mail já está na equipe deste evento.");
        return;
      }

      const accessCode = generateAccessCode();

      const { error } = await supabase
        .from("checkin_staff")
        .insert({
          event_id: newStaff.eventId,
          email,
          name: newStaff.name.trim() || null,
          access_code: accessCode,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Staff adicionado! Agora envie o convite.");
      setIsDialogOpen(false);
      setNewStaff({ name: "", email: "", eventId: "" });
      if (newStaff.eventId === selectedEvent) {
        fetchStaff(selectedEvent);
      } else {
        setSelectedEvent(newStaff.eventId);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("checkin_staff")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("Staff removido com sucesso!");
      fetchStaff(selectedEvent);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const copyLink = async (accessCode: string) => {
    try {
      await navigator.clipboard.writeText(buildStaffLink(accessCode));
      toast.success("Link copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente: " + buildStaffLink(accessCode));
    }
  };

  const sendWhatsApp = (member: StaffMember) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildInviteMessage(member))}`, "_blank");
  };

  const sendEmail = (member: StaffMember) => {
    const subject = `Convite para a equipe de check-in${member.event?.title ? ` — ${member.event.title}` : ""}`;
    window.location.href = `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      buildInviteMessage(member)
    )}`;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Equipe de Check-in</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a equipe que fará o check-in nos eventos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Staff de Check-in</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="event">Evento *</Label>
                <Select value={newStaff.eventId} onValueChange={(v) => setNewStaff({ ...newStaff, eventId: v })}>
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
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="Nome do colaborador"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Um link único é gerado para este colaborador</li>
                  <li>Ele precisa entrar (ou criar conta) no PremierPass com exatamente este e-mail</li>
                  <li>Ao abrir o link, toca em "Aceitar e continuar" e já pode escanear</li>
                  <li>Com outro e-mail, o acesso é negado</li>
                </ul>
              </div>
              <Button onClick={handleAddStaff} className="w-full">
                Adicionar Staff
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Você não tem eventos publicados para gerenciar equipe.
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

          {/* Staff List */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Equipe de Check-in
                <Badge variant="secondary">{staff.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum colaborador adicionado para este evento.
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex flex-col gap-3 p-4 rounded-lg bg-secondary/30 border border-border md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {member.name || "Sem nome"}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                          {member.accepted_at ? (
                            <p className="text-xs text-green-500 mt-1">
                              Aceitou em {format(new Date(member.accepted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          ) : (
                            <p className="text-xs text-yellow-500 mt-1">
                              Ainda não aceitou o convite
                            </p>
                          )}
                          {member.last_access_at && (
                            <p className="text-xs text-muted-foreground">
                              Último acesso: {format(new Date(member.last_access_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={member.is_active && member.accepted_at ? "default" : "secondary"}
                        >
                          {!member.is_active ? "Inativo" : member.accepted_at ? "Aceito" : "Aguardando aceite"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendWhatsApp(member)}
                          className="gap-1"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendEmail(member)}
                          className="gap-1"
                        >
                          <Mail className="w-4 h-4" />
                          E-mail
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(member.access_code)}
                          className="gap-1"
                        >
                          <Link2 className="w-4 h-4" />
                          Copiar Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(member.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Staff</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este colaborador? O link de acesso será invalidado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffManagement;
