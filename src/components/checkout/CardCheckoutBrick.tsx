import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────
// Checkout de cartão TRANSPARENTE (formulário dentro do próprio site).
//
// Como funciona:
// 1. Este componente carrega o SDK oficial do Mercado Pago (mercadopago.js)
//    e renderiza o "Payment Brick" dele dentro da própria página.
// 2. O comprador digita os dados do cartão ali. O número do cartão NUNCA
//    passa pelo nosso site nem pelo nosso servidor — o SDK do Mercado Pago
//    transforma isso num token de uso único direto no navegador da pessoa.
// 3. Só esse token (não o cartão) é enviado pra Edge Function
//    "create-mercadopago-card-payment", que cobra o cartão usando a
//    credencial secreta do Mercado Pago no servidor.
//
// PRÉ-REQUISITO ainda pendente: precisa da CHAVE PÚBLICA do Mercado Pago
// (Public Key — começa com APP_USR- ou TEST-, é diferente do Access Token,
// e essa aqui É segura de expor no navegador) cadastrada como variável de
// ambiente VITE_MERCADOPAGO_PUBLIC_KEY no projeto.
// ─────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CardCheckoutBrickProps {
  eventId: string;
  siteId: string;
  amount: number; // valor total (com taxa de serviço já incluída) só para exibição no Brick
  items: { ticket_type_id: string; quantity: number }[];
  payerEmail: string;
  onSuccess: (orderId: string) => void;
  onError?: (message: string) => void;
}

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined;

const CardCheckoutBrick = ({
  eventId,
  siteId,
  amount,
  items,
  payerEmail,
  onSuccess,
  onError,
}: CardCheckoutBrickProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!MP_PUBLIC_KEY) {
      console.error("VITE_MERCADOPAGO_PUBLIC_KEY não configurada");
      return;
    }

    let cancelled = false;

    const loadSdkAndRenderBrick = async () => {
      // Carrega o SDK oficial do Mercado Pago (só uma vez)
      if (!window.MercadoPago) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://sdk.mercadopago.com/js/v2";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar SDK do Mercado Pago"));
          document.body.appendChild(script);
        });
      }

      if (cancelled) return;

      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      const bricksBuilder = mp.bricks();

      const controller = await bricksBuilder.create("payment", "card-payment-brick-container", {
        initialization: {
          amount,
        },
        customization: {
          visual: { style: { theme: "dark" } },
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
          },
        },
        callbacks: {
          onReady: () => {
            if (!cancelled) setLoading(false);
          },
          onError: (error: unknown) => {
            console.error("Payment Brick error:", error);
            onError?.("Erro ao carregar o formulário de pagamento");
          },
          onSubmit: async ({ formData }: { formData: any }) => {
            setProcessing(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                throw new Error("Você precisa estar logado para pagar");
              }

              const { data, error } = await supabase.functions.invoke(
                "create-mercadopago-card-payment",
                {
                  body: {
                    event_id: eventId,
                    site_id: siteId,
                    items,
                    token: formData.token,
                    payment_method_id: formData.payment_method_id,
                    issuer_id: formData.issuer_id,
                    installments: formData.installments,
                    payer: {
                      email: formData.payer.email || payerEmail,
                      identification: formData.payer.identification,
                    },
                  },
                }
              );

              if (error) throw error;

              if (data?.status === "approved") {
                toast.success("Pagamento aprovado!");
                onSuccess(data.order_id);
              } else if (data?.status === "rejected") {
                toast.error("Pagamento recusado. Tente outro cartão.");
                onError?.("Pagamento recusado");
              } else {
                // in_process / pending — o webhook confirma depois
                toast.info("Pagamento em análise. Você será avisado quando confirmar.");
                onSuccess(data.order_id);
              }
            } catch (err: any) {
              console.error("Card payment error:", err);
              toast.error(err.message || "Erro ao processar pagamento");
              onError?.(err.message);
            } finally {
              setProcessing(false);
            }
          },
        },
      });

      brickControllerRef.current = controller;
    };

    loadSdkAndRenderBrick();

    return () => {
      cancelled = true;
      brickControllerRef.current?.unmount?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!MP_PUBLIC_KEY) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          Checkout de cartão ainda não configurado (falta a chave pública do Mercado Pago).
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Pagar com cartão
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando formulário seguro...
          </div>
        )}
        {processing && (
          <div className="flex items-center justify-center py-4 text-primary gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processando pagamento...
          </div>
        )}
        <div id="card-payment-brick-container" ref={containerRef} />
      </CardContent>
    </Card>
  );
};

export default CardCheckoutBrick;
