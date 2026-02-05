import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Clock, Loader2, QrCode, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO, differenceInSeconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import PaymentErrorBoundary from "@/components/PaymentErrorBoundary";

interface PixData {
  order_id: string;
  payment_id: number;
  pix_qr_code: string;
  pix_qr_code_base64: string;
  pix_copy_paste: string;
  expiration_date: string;
  total_amount: number;
  is_sandbox: boolean;
}

function CheckoutPixContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const orderId = searchParams.get('order_id');

  // Load PIX data from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('pix_checkout_data');
    if (storedData) {
      const data = JSON.parse(storedData) as PixData;
      setPixData(data);
      
      // Calculate time left
      if (data.expiration_date) {
        const expDate = parseISO(data.expiration_date);
        const secondsLeft = differenceInSeconds(expDate, new Date());
        setTimeLeft(Math.max(0, secondsLeft));
      }
      
      setLoading(false);
    } else if (!orderId) {
      navigate('/');
    } else {
      setLoading(false);
    }
  }, [orderId, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Listen for payment status updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel('pix-payment-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus) {
            setPaymentStatus(newStatus);
            if (newStatus === 'paid') {
              toast({
                title: "Pagamento confirmado!",
                description: "Seus ingressos foram gerados com sucesso.",
              });
              sessionStorage.removeItem('pix_checkout_data');
              setTimeout(() => navigate('/meus-ingressos'), 2000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate, toast]);

  // Poll for payment status as backup
  useEffect(() => {
    if (!orderId || paymentStatus === 'paid') return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      
      if (data?.status === 'paid') {
        setPaymentStatus('paid');
        toast({
          title: "Pagamento confirmado!",
          description: "Seus ingressos foram gerados com sucesso.",
        });
        sessionStorage.removeItem('pix_checkout_data');
        setTimeout(() => navigate('/meus-ingressos'), 2000);
      }
    };

    const pollInterval = setInterval(checkStatus, 5000);
    return () => clearInterval(pollInterval);
  }, [orderId, paymentStatus, navigate, toast]);

  const handleCopyPixCode = async () => {
    if (!pixData?.pix_copy_paste) return;
    
    try {
      await navigator.clipboard.writeText(pixData.pix_copy_paste);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole o código no app do seu banco.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Tente copiar manualmente.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!pixData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dados do PIX não encontrados</h2>
            <p className="text-muted-foreground mb-4">
              A sessão expirou ou houve um erro.
            </p>
            <Button onClick={() => navigate('/')}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-500 mb-2">
                Pagamento Confirmado!
              </h2>
              <p className="text-muted-foreground mb-4">
                Seus ingressos foram gerados. Redirecionando...
              </p>
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {pixData.is_sandbox && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-500">
                Ambiente de teste - pagamento simulado
              </p>
            </div>
          )}

          <Card className="border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <QrCode className="h-6 w-6 text-primary" />
                <CardTitle>Pagamento via PIX</CardTitle>
              </div>
              <p className="text-muted-foreground text-sm">
                Escaneie o QR code ou copie o código
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Timer */}
              {timeLeft > 0 && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Expira em <span className="font-mono font-bold text-foreground">{formatTime(timeLeft)}</span>
                  </span>
                </div>
              )}

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  {pixData.pix_qr_code_base64 ? (
                    <img 
                      src={`data:image/png;base64,${pixData.pix_qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-56 h-56"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-muted rounded">
                      <QrCode className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor total</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {pixData.total_amount.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Copy button */}
              <Button 
                onClick={handleCopyPixCode} 
                className="w-full gap-2"
                variant={copied ? "secondary" : "default"}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Código copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar código PIX
                  </>
                )}
              </Button>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Aguardando confirmação do pagamento...
                </span>
              </div>

              {/* Instructions */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Como pagar:</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Abra o app do seu banco</li>
                  <li>Escolha pagar com PIX</li>
                  <li>Escaneie o QR code ou cole o código</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              onClick={() => {
                sessionStorage.removeItem('pix_checkout_data');
                navigate(-1);
              }}
            >
              Cancelar pagamento
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function CheckoutPix() {
  return (
    <PaymentErrorBoundary
      fallbackTitle="Erro no pagamento PIX"
      fallbackMessage="Ocorreu um erro ao processar o pagamento PIX. Tente novamente ou escolha outra forma de pagamento."
    >
      <CheckoutPixContent />
    </PaymentErrorBoundary>
  );
}
