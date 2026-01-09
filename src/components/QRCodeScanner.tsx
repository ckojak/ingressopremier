import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
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
  onSuccess?: (ticketData: TicketData) => void;
}

interface TicketData {
  id: string;
  attendeeName: string;
  ticketType: string;
  eventName: string;
  usedAt?: string | null;
}

type ScanStatus = "scanning" | "success" | "error" | "processing";

const QRCodeScanner = ({ open, onOpenChange, eventId, onSuccess }: QRCodeScannerProps) => {
  const [status, setStatus] = useState<ScanStatus>("scanning");
  const [message, setMessage] = useState("");
  const [ticketInfo, setTicketInfo] = useState<TicketData | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      setStatus("scanning");
      setMessage("");
      setTicketInfo(null);
      setManualCode("");
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const processQRCode = async (qrCode: string) => {
    if (status !== "scanning" || !qrCode.trim()) return;

    setStatus("processing");
    
    try {
      // Look up ticket by QR code or ticket_code
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("id, event_id, ticket_type_id, attendee_name, is_used, used_at")
        .or(`qr_code.eq.${qrCode},ticket_code.eq.${qrCode}`)
        .limit(1)
        .single();

      if (ticketError || !ticketData) {
        setStatus("error");
        setMessage("Ingresso não encontrado. Código inválido.");
        return;
      }

      // Check if ticket belongs to the current event
      if (eventId && ticketData.event_id !== eventId) {
        setStatus("error");
        setMessage("Este ingresso não pertence a este evento.");
        return;
      }

      // Fetch ticket type and event names
      const { data: typeData } = await supabase
        .from("ticket_types")
        .select("name")
        .eq("id", ticketData.ticket_type_id)
        .single();
        
      const { data: eventData } = await supabase
        .from("events")
        .select("title")
        .eq("id", ticketData.event_id)
        .single();

      // Check if already used
      if (ticketData.is_used) {
        setStatus("error");
        setMessage("Este ingresso já foi utilizado.");
        setTicketInfo({
          id: ticketData.id,
          attendeeName: ticketData.attendee_name || "N/A",
          ticketType: typeData?.name || "N/A",
          eventName: eventData?.title || "N/A",
          usedAt: ticketData.used_at,
        });
        return;
      }

      // Mark ticket as used
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("id", ticketData.id);

      if (updateError) {
        setStatus("error");
        setMessage("Erro ao validar ingresso. Tente novamente.");
        return;
      }

      const result: TicketData = {
        id: ticketData.id,
        attendeeName: ticketData.attendee_name || "N/A",
        ticketType: typeData?.name || "N/A",
        eventName: eventData?.title || "N/A",
      };

      setTicketInfo(result);
      setStatus("success");
      setMessage("Check-in realizado com sucesso!");
      
      onSuccess?.(result);
      toast.success("Check-in realizado!");
      
    } catch (err) {
      console.error("Scan error:", err);
      setStatus("error");
      setMessage("Erro ao processar código. Tente novamente.");
    }
  };

  const handleReset = () => {
    setStatus("scanning");
    setMessage("");
    setTicketInfo(null);
    setManualCode("");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processQRCode(manualCode.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Check-in de Ingresso
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
                className="space-y-4"
              >
                <div className="aspect-video rounded-lg bg-secondary flex flex-col items-center justify-center p-6 text-center">
                  <XCircle className="w-12 h-12 text-destructive mb-4" />
                  <p className="text-foreground font-medium mb-2">Câmera não disponível</p>
                  <p className="text-sm text-muted-foreground">
                    Use a entrada manual abaixo para validar o ingresso.
                  </p>
                </div>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite o código do ingresso"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                  />
                  <Button type="submit" disabled={!manualCode.trim()}>
                    Validar
                  </Button>
                </form>
              </motion.div>
            ) : status === "scanning" ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
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
                  Posicione o QR Code na câmera ou digite o código manualmente
                </p>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código do ingresso"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                  />
                  <Button type="submit" size="sm" disabled={!manualCode.trim()}>
                    Validar
                  </Button>
                </form>
              </motion.div>
            ) : status === "processing" ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="aspect-video rounded-lg bg-secondary flex flex-col items-center justify-center"
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
                className="aspect-video rounded-lg bg-green-500/10 border border-green-500/30 flex flex-col items-center justify-center p-6"
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
                  Próximo ingresso
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="aspect-video rounded-lg bg-destructive/10 border border-destructive/30 flex flex-col items-center justify-center p-6"
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
