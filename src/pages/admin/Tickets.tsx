import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Trash2, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { z } from "zod";
import { formatCurrencyInput, parseCurrencyBRL } from "@/lib/currency";

const ticketSchema = z.object({
  event_id: z.string().uuid("Evento inválido"),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional().or(z.literal("")),
  price: z.string().min(1, "Preço é obrigatório"),
  quantity_available: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, "Quantidade deve ser um número inteiro maior que 0"),
  max_per_order: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) <= 100, "Máximo por pedido deve estar entre 1 e 100"),
  is_active: z.boolean(),
});

const ticketUpdateSchema = ticketSchema.omit({ event_id: true });

type TicketType = Tables<"ticket_types">;
type Event = Tables<"events">;

const Tickets = () => {
  const [ticketTypes, setTicketTypes] = useState<(TicketType & { event?: Event })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    event_id: "",
    name: "",
    description: "",
    price: "",
    quantity_available: "",
    max_per_order: "10",
    is_active: true,
  });

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch events
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id);
      
      setEvents(eventsData || []);

      // Fetch ticket types with events
      const { data: ticketsData } = await supabase
        .from("ticket_types")
        .select("*, events(*)")
        .in("event_id", eventsData?.map(e => e.id) || [])
        .order("created_at", { ascending: false });

      setTicketTypes(ticketsData?.map(t => ({
        ...t,
        event: t.events as Event
      })) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePriceChange = (value: string) => {
    const formatted = formatCurrencyInput(value);
    setFormData({ ...formData, price: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data with zod
    const schema = editingTicket ? ticketUpdateSchema : ticketSchema;
    const validation = schema.safeParse(editingTicket ? {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      quantity_available: formData.quantity_available,
      max_per_order: formData.max_per_order,
      is_active: formData.is_active,
    } : formData);

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
      const priceValue = parseCurrencyBRL(formData.price);

      if (editingTicket) {
        const { error } = await supabase
          .from("ticket_types")
          .update({
            name: formData.name,
            description: formData.description || null,
            price: priceValue,
            quantity_available: parseInt(formData.quantity_available),
            max_per_order: parseInt(formData.max_per_order),
            is_active: formData.is_active,
          })
          .eq("id", editingTicket.id);

        if (error) throw error;
        toast({ title: "Tipo de ingresso atualizado!" });
      } else {
        const { error } = await supabase
          .from("ticket_types")
          .insert({
            event_id: formData.event_id,
            name: formData.name,
            description: formData.description || null,
            price: priceValue,
            quantity_available: parseInt(formData.quantity_available),
            max_per_order: parseInt(formData.max_per_order),
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast({ title: "Tipo de ingresso criado!" });
      }

      setDialogOpen(false);
      setEditingTicket(null);
      resetForm();
      fetchData();
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
        .from("ticket_types")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "Tipo de ingresso excluído!" });
      fetchData();
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

  const handleEdit = (ticket: TicketType) => {
    setEditingTicket(ticket);
    const priceFormatted = formatCurrencyInput((Number(ticket.price) * 100).toString());
    setFormData({
      event_id: ticket.event_id,
      name: ticket.name,
      description: ticket.description || "",
      price: priceFormatted,
      quantity_available: ticket.quantity_available.toString(),
      max_per_order: (ticket.max_per_order || 10).toString(),
      is_active: ticket.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      event_id: "",
      name: "",
      description: "",
      price: "",
      quantity_available: "",
      max_per_order: "10",
      is_active: true,
    });
  };

  const filteredTickets = ticketTypes.filter((ticket) =>
    ticket.name.toLowerCase().includes(search.toLowerCase()) ||
    ticket.event?.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ingressos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os tipos de ingressos dos seus eventos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingTicket(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={events.length === 0}>
              <Plus className="w-4 h-4" />
              Novo Ingresso
            </Button>
          </DialogTrigger>
          <DialogContent
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingTicket ? "Editar Ingresso" : "Criar Tipo de Ingresso"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingTicket && (
                <div className="space-y-2">
                  <Label htmlFor="event">Evento *</Label>
                  <Select
                    value={formData.event_id}
                    onValueChange={(value) => setFormData({ ...formData, event_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um evento" />
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
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Ingresso *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pista, VIP, Camarote"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do tipo de ingresso..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="price"
                      value={formData.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_per_order">Máx. por pedido</Label>
                <Input
                  id="max_per_order"
                  type="number"
                  min="1"
                  value={formData.max_per_order}
                  onChange={(e) => setFormData({ ...formData, max_per_order: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo para vendas</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTicket ? "Salvar" : "Criar Ingresso"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 && !loading && (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Você precisa criar um evento antes de adicionar ingressos.
            </p>
          </CardContent>
        </Card>
      )}

      {events.length > 0 && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ingressos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : filteredTickets.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {search ? "Nenhum ingresso encontrado" : "Nenhum tipo de ingresso criado ainda."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <TicketIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{ticket.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">{ticket.event?.title}</p>
                          </div>
                        </div>
                        <Badge variant={ticket.is_active ? "default" : "secondary"}>
                          {ticket.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Preço</span>
                        <span className="font-semibold text-primary">
                          R$ {Number(ticket.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Disponíveis</span>
                        <span className="text-foreground">
                          {ticket.quantity_available - (ticket.quantity_sold || 0)} / {ticket.quantity_available}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vendidos</span>
                        <span className="text-foreground">{ticket.quantity_sold || 0}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(ticket)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(ticket.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo de ingresso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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

export default Tickets;
