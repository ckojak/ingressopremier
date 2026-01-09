import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QRCodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  onSuccess?: (ticketData: any) => void;
}

type ScanStatus = "scanning" | "success" | "error" | "processing";

const QRCodeScanner = ({ open, onOpenChange, eventId, onSuccess }: QRCodeScannerProps) => {
  const [status, setStatus] = useState<ScanStatus>("scanning");
  const [message, setMessage] = useState("");
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      setStatus("scanning");
      setMessage("");
      setTicketInfo(null);
      checkCameraPermission();
    }
  }, [open]);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch (err) {
      setHasPermission(false);
    }
  };

  const handleScan = async (result: any) => {
    if (status !== "scanning") return;
    
    const qrCode = result[0]?.rawValue;
    if (!qrCode) return;

    setStatus("processing");
    
    try {
      // Look up ticket by QR code
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .select("*, ticket_types(name), events(id, title, start_date)")
        .eq("qr_code", qrCode)
        .single();

      if (ticketError || !ticket) {
        setStatus("error");
        setMessage("Ingresso não encontrado. QR Code inválido.");
        return;
      }

      // Check if ticket belongs to the current event (if eventId provided)
      if (eventId && ticket.event_id !== eventId) {
        setStatus("error");
        setMessage("Este ingresso não pertence a este evento.");
        return;
      }

      // Check if already used
      if (ticket.is_used) {
        setStatus("error");
        setMessage("Este ingresso já foi utilizado.");
        setTicketInfo({
          attendeeName: ticket.attendee_name || "N/A",
          ticketType: (ticket.ticket_types as any)?.name || "N/A",
          eventName: (ticket.events as any)?.title || "N/A",
          usedAt: ticket.used_at,
        });
        return;
      }

      // Mark ticket as used
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("id", ticket.id);

      if (updateError) {
        setStatus("error");
        setMessage("Erro ao validar ingresso. Tente novamente.");
        return;
      }

      const ticketData = {
        id: ticket.id,
        attendeeName: ticket.attendee_name || "N/A",
        ticketType: (ticket.ticket_types as any)?.name || "N/A",
        eventName: (ticket.events as any)?.title || "N/A",
      };

      setTicketInfo(ticketData);
      setStatus("success");
      setMessage("Check-in realizado com sucesso!");
      
      onSuccess?.(ticketData);
      toast.success("Check-in realizado!");
      
    } catch (err) {
      console.error("Scan error:", err);
      setStatus("error");
      setMessage("Erro ao processar QR Code. Tente novamente.");
    }
  };

  const handleReset = () => {
    setStatus("scanning");
    setMessage("");
    setTicketInfo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Scanner de QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {hasPermission === false ? (
              <motion.div
                key="no-permission"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="aspect-square rounded-lg bg-secondary flex flex-col items-center justify-center p-6 text-center"
              >
                <XCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-foreground font-medium mb-2">Câmera não disponível</p>
                <p className="text-sm text-muted-foreground">
                  Permita o acesso à câmera nas configurações do seu navegador para usar o scanner.
                </p>
              </motion.div>
            ) : status === "scanning" ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative aspect-square rounded-lg overflow-hidden"
              >
                <Scanner
                  onScan={handleScan}
                  constraints={{ facingMode: "environment" }}
                  styles={{
                    container: {
                      width: "100%",
                      height: "100%",
                    },
                    video: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  }}
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-12 border-2 border-primary rounded-2xl" />
                  <div className="absolute top-12 left-12 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute top-12 right-12 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-12 left-12 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-12 right-12 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                </div>
                <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white bg-black/50 py-2 mx-4 rounded-lg">
                  Aponte para o QR Code do ingresso
                </p>
              </motion.div>
            ) : status === "processing" ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="aspect-square rounded-lg bg-secondary flex flex-col items-center justify-center"
              >
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-foreground font-medium">Verificando ingresso...</p>
              </motion.div>
            ) : status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="aspect-square rounded-lg bg-green-500/10 border border-green-500/30 flex flex-col items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                </motion.div>
                <p className="text-green-500 font-bold text-lg mb-4">{message}</p>
                {ticketInfo && (
                  <div className="text-center space-y-1 text-sm">
                    <p className="text-foreground font-medium">{ticketInfo.attendeeName}</p>
                    <p className="text-muted-foreground">{ticketInfo.ticketType}</p>
                    <p className="text-muted-foreground">{ticketInfo.eventName}</p>
                  </div>
                )}
                <Button onClick={handleReset} className="mt-6 gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Escanear outro
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="aspect-square rounded-lg bg-destructive/10 border border-destructive/30 flex flex-col items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  <XCircle className="w-16 h-16 text-destructive mb-4" />
                </motion.div>
                <p className="text-destructive font-bold text-lg text-center mb-4">{message}</p>
                {ticketInfo && (
                  <div className="text-center space-y-1 text-sm mb-4">
                    <p className="text-foreground font-medium">{ticketInfo.attendeeName}</p>
                    <p className="text-muted-foreground">{ticketInfo.ticketType}</p>
                    {ticketInfo.usedAt && (
                      <p className="text-muted-foreground text-xs">
                        Usado em: {new Date(ticketInfo.usedAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}
                <Button onClick={handleReset} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeScanner;
