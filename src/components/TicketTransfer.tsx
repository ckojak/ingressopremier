import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TicketTransferProps {
  ticketId: string;
  ticketCode: string;
  eventTitle: string;
  eventDate?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TicketTransfer = ({
  ticketId,
  ticketCode,
  eventTitle,
  eventDate,
  open,
  onOpenChange,
  onSuccess,
}: TicketTransferProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateTransferCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Erro",
        description: "Informe o e-mail do destinatário",
        variant: "destructive",
      });
      return;
    }

    // Check if event is within 2 hours
    if (eventDate) {
      const eventTime = new Date(eventDate).getTime();
      const now = Date.now();
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      
      if (eventTime - now < twoHoursInMs) {
        toast({
          title: "Transferência não permitida",
          description: "Não é possível transferir ingressos com menos de 2 horas para o evento.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get user profile for sender name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const senderName = profile?.full_name || profile?.email || "Um usuário";

      // Check if user already has a pending transfer for this ticket
      const { data: existingTransfer } = await supabase
        .from("ticket_transfers")
        .select("id")
        .eq("ticket_id", ticketId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingTransfer) {
        throw new Error("Já existe uma transferência pendente para este ingresso");
      }

      // Create transfer request
      const transferCode = generateTransferCode();
      const { data: transferData, error } = await supabase
        .from("ticket_transfers")
        .insert({
          ticket_id: ticketId,
          from_user_id: user.id,
          to_user_email: email.toLowerCase(),
          transfer_code: transferCode,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket transfer_status to pending
      await supabase
        .from("tickets")
        .update({ transfer_status: "pending" })
        .eq("id", ticketId);

      // Format event date
      const formattedDate = eventDate 
        ? format(new Date(eventDate), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
        : "Data não informada";

      // Send transfer email
      const { error: emailError } = await supabase.functions.invoke("send-transfer-email", {
        body: {
          transferId: transferData.id,
          recipientEmail: email.toLowerCase(),
          transferCode,
          eventTitle,
          eventDate: formattedDate,
          ticketCode,
          senderName,
          siteUrl: window.location.origin,
        },
      });

      if (emailError) {
        console.error("Error sending transfer email:", emailError);
        // Don't throw - transfer was created, just email failed
        toast({
          title: "Transferência criada",
          description: `Transferência criada, mas houve um problema ao enviar o e-mail. O destinatário pode aceitar pelo site.`,
        });
      } else {
        toast({
          title: "Transferência iniciada!",
          description: `Um convite foi enviado para ${email}`,
        });
      }

      setEmail("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Transferir Ingresso</DialogTitle>
          <DialogDescription>
            Transfira seu ingresso para outra pessoa. Ela receberá um convite por e-mail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="p-4 rounded-lg bg-secondary">
            <p className="text-sm text-muted-foreground">Ingresso</p>
            <p className="font-semibold text-foreground">{eventTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">Código: {ticketCode}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-mail do Destinatário *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>O destinatário receberá um e-mail com o link para aceitar</li>
              <li>Você pode cancelar a transferência enquanto não for aceita</li>
              <li>Após aceita, o ingresso será vinculado à conta do destinatário</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Send className="w-4 h-4" />
              {loading ? "Enviando..." : "Transferir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TicketTransfer;
