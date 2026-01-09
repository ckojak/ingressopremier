import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Eye, 
  Calendar, 
  MapPin,
  User,
  Mail,
  Phone,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  image_url: string | null;
  created_at: string | null;
  organizer_id: string;
  organizer?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

const EventApprovals = () => {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchPendingEvents = async () => {
    try {
      // Fetch draft events as "pending" for approval workflow
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch organizer info separately
      const eventsWithOrganizers = await Promise.all(
        (data || []).map(async (event) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", event.organizer_id)
            .single();
          
          return { ...event, organizer: profile };
        })
      );
      
      setEvents(eventsWithOrganizers as PendingEvent[]);
    } catch (error) {
      console.error("Error fetching pending events:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const handleApprove = async (eventId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId);

      if (error) throw error;
      
      toast.success("Evento aprovado e publicado!");
      fetchPendingEvents();
      setViewDialogOpen(false);
    } catch (error) {
      console.error("Error approving event:", error);
      toast.error("Erro ao aprovar evento");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEvent) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ 
          status: "cancelled"
        })
        .eq("id", selectedEvent.id);

      if (error) throw error;
      
      toast.success("Evento rejeitado");
      fetchPendingEvents();
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setRejectReason("");
    } catch (error) {
      console.error("Error rejecting event:", error);
      toast.error("Erro ao rejeitar evento");
    } finally {
      setProcessing(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    (event.organizer as any)?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return "Data não definida";
    return format(new Date(dateStr), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Solicitações de Eventos</h1>
        <p className="text-muted-foreground mt-1">
          Aprove ou rejeite eventos criados por produtores
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{events.length}</p>
              <p className="text-sm text-muted-foreground">Aguardando aprovação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou produtor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredEvents.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma solicitação pendente
            </h3>
            <p className="text-muted-foreground">
              Todas as solicitações de eventos foram processadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {event.image_url && (
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full sm:w-32 h-32 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mb-2">
                            <Clock className="w-3 h-3 mr-1" />
                            Aguardando aprovação
                          </Badge>
                          <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                            {event.title}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatEventDate(event.start_date)}
                        </p>
                        {(event.city || event.state) && (
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {[event.city, event.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {(event.organizer as any)?.full_name || "Produtor não identificado"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedEvent(event);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(event.id)}
                          disabled={processing}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            setSelectedEvent(event);
                            setRejectDialogOpen(true);
                          }}
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Event Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  Enviado em {selectedEvent.created_at ? format(new Date(selectedEvent.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "N/A"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedEvent.image_url && (
                  <img 
                    src={selectedEvent.image_url} 
                    alt={selectedEvent.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Data de Início</Label>
                    <p className="font-medium">{formatEventDate(selectedEvent.start_date)}</p>
                  </div>
                  {selectedEvent.end_date && (
                    <div>
                      <Label className="text-muted-foreground">Data de Término</Label>
                      <p className="font-medium">{formatEventDate(selectedEvent.end_date)}</p>
                    </div>
                  )}
                </div>

                {selectedEvent.venue_name && (
                  <div>
                    <Label className="text-muted-foreground">Local</Label>
                    <p className="font-medium">{selectedEvent.venue_name}</p>
                    {selectedEvent.venue_address && (
                      <p className="text-sm text-muted-foreground">{selectedEvent.venue_address}</p>
                    )}
                  </div>
                )}

                {(selectedEvent.city || selectedEvent.state) && (
                  <div>
                    <Label className="text-muted-foreground">Cidade/Estado</Label>
                    <p className="font-medium">
                      {[selectedEvent.city, selectedEvent.state].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                )}

                {selectedEvent.category && (
                  <div>
                    <Label className="text-muted-foreground">Categoria</Label>
                    <p className="font-medium">{selectedEvent.category}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Informações do Produtor
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {(selectedEvent.organizer as any)?.full_name || "N/A"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {(selectedEvent.organizer as any)?.email || "N/A"}
                    </p>
                    {(selectedEvent.organizer as any)?.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {(selectedEvent.organizer as any)?.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Rejeitar
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedEvent.id)}
                  disabled={processing}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Aprovar e Publicar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Rejeitar Evento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja rejeitar este evento? O produtor será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectReason">Motivo da rejeição (opcional)</Label>
            <Textarea
              id="rejectReason"
              placeholder="Descreva o motivo da rejeição..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive hover:bg-destructive/90"
              disabled={processing}
            >
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventApprovals;
