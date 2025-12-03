import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Trash2, Calendar, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import ImageUpload from "@/components/ImageUpload";
import { useIBGEStates, useIBGECities } from "@/hooks/useIBGE";
import { EVENT_CATEGORIES } from "@/lib/constants";

const eventSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título deve ter no máximo 200 caracteres"),
  description: z.string().max(5000, "Descrição deve ter no máximo 5000 caracteres").optional().or(z.literal("")),
  short_description: z.string().max(300, "Descrição curta deve ter no máximo 300 caracteres").optional().or(z.literal("")),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  end_date: z.string().optional().or(z.literal("")),
  venue_name: z.string().max(200, "Nome do local deve ter no máximo 200 caracteres").optional().or(z.literal("")),
  venue_address: z.string().max(500, "Endereço deve ter no máximo 500 caracteres").optional().or(z.literal("")),
  city: z.string().max(100, "Cidade deve ter no máximo 100 caracteres").optional().or(z.literal("")),
  state: z.string().max(50, "Estado deve ter no máximo 50 caracteres").optional().or(z.literal("")),
  category: z.string().max(100, "Categoria deve ter no máximo 100 caracteres").optional().or(z.literal("")),
  image_url: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
  status: z.enum(["draft", "published", "cancelled", "completed"]),
});

type Event = Tables<"events">;

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-500/20 text-green-400",
  cancelled: "bg-destructive/20 text-destructive",
  completed: "bg-blue-500/20 text-blue-400",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    short_description: "",
    start_date: "",
    end_date: "",
    venue_name: "",
    venue_address: "",
    city: "",
    state: "",
    category: "",
    image_url: "",
    status: "draft" as "draft" | "published" | "cancelled" | "completed",
  });

  const { states, loading: statesLoading } = useIBGEStates();
  const { cities, loading: citiesLoading } = useIBGECities(formData.state);

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = eventSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const validatedData = validation.data;

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update({
            title: validatedData.title,
            description: validatedData.description || null,
            short_description: validatedData.short_description || null,
            start_date: validatedData.start_date,
            end_date: validatedData.end_date || null,
            venue_name: validatedData.venue_name || null,
            venue_address: validatedData.venue_address || null,
            city: validatedData.city || null,
            state: validatedData.state || null,
            category: validatedData.category || null,
            image_url: validatedData.image_url || null,
            status: validatedData.status,
          })
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast({ title: "Evento atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from("events")
          .insert({
            title: validatedData.title,
            description: validatedData.description || null,
            short_description: validatedData.short_description || null,
            start_date: validatedData.start_date,
            end_date: validatedData.end_date || null,
            venue_name: validatedData.venue_name || null,
            venue_address: validatedData.venue_address || null,
            city: validatedData.city || null,
            state: validatedData.state || null,
            category: validatedData.category || null,
            image_url: validatedData.image_url || null,
            status: validatedData.status,
            organizer_id: user.id,
          });

        if (error) throw error;
        toast({ title: "Evento criado com sucesso!" });
      }

      setDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "Evento excluído com sucesso!" });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handlePublish = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId);

      if (error) throw error;
      toast({ title: "Evento publicado com sucesso!" });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Erro ao publicar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      short_description: event.short_description || "",
      start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : "",
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : "",
      venue_name: event.venue_name || "",
      venue_address: event.venue_address || "",
      city: event.city || "",
      state: event.state || "",
      category: event.category || "",
      image_url: event.image_url || "",
      status: event.status || "draft",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      short_description: "",
      start_date: "",
      end_date: "",
      venue_name: "",
      venue_address: "",
      city: "",
      state: "",
      category: "",
      image_url: "",
      status: "draft",
    });
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus eventos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingEvent(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Editar Evento" : "Criar Novo Evento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="short_description">Descrição Curta</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição Completa</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data/Hora Início *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data/Hora Fim</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue_name">Nome do Local</Label>
                  <Input
                    id="venue_name"
                    value={formData.venue_name}
                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue_address">Endereço</Label>
                  <Input
                    id="venue_address"
                    value={formData.venue_address}
                    onChange={(e) => setFormData({ ...formData, venue_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value, city: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={statesLoading ? "Carregando..." : "Selecione o estado"} />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.sigla} value={state.sigla}>
                          {state.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                    disabled={!formData.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.state 
                          ? "Selecione um estado primeiro" 
                          : citiesLoading 
                            ? "Carregando..." 
                            : "Selecione a cidade"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.nome}>
                          {city.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Imagem do Evento</Label>
                  <ImageUpload
                    value={formData.image_url}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingEvent ? "Salvar" : "Criar Evento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar eventos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredEvents.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search ? "Nenhum evento encontrado" : "Você ainda não tem eventos. Crie seu primeiro!"}
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
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full md:w-32 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                        <Badge className={statusColors[event.status || "draft"]}>
                          {statusLabels[event.status || "draft"]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(event.start_date), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                        </span>
                        {event.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.city}, {event.state}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {event.status === "draft" && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handlePublish(event.id)}
                          className="gap-1"
                        >
                          <Send className="w-4 h-4" />
                          Publicar
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(event.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os ingressos associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Events;
