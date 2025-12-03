import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "transfer_accepted" | "coupon_applied";
  data: {
    transferId?: string;
    ticketCode?: string;
    eventTitle?: string;
    eventDate?: string;
    recipientEmail?: string;
    recipientName?: string;
    senderName?: string;
    orderId?: string;
    couponCode?: string;
    discountAmount?: number;
    customerEmail?: string;
    customerName?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: NotificationRequest = await req.json();

    console.log(`Processing notification type: ${type}`, data);

    let emailHtml = "";
    let emailSubject = "";
    let toEmail = "";

    if (type === "transfer_accepted") {
      toEmail = data.recipientEmail!;
      emailSubject = "Transferência de ingresso aceita!";
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #1a1a1a; border-radius: 14px; padding: 40px;">
                <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
                  🎉 Transferência Aceita!
                </h1>
                
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Olá <strong style="color: #ffffff;">${data.recipientName || 'participante'}</strong>,
                </p>
                
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Você aceitou a transferência de ingresso enviada por <strong style="color: #06b6d4;">${data.senderName || 'outro usuário'}</strong>.
                </p>
                
                <div style="background-color: #262626; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <h2 style="color: #06b6d4; font-size: 18px; margin: 0 0 15px 0;">Detalhes do Ingresso</h2>
                  <p style="color: #ffffff; margin: 5px 0;"><strong>Evento:</strong> ${data.eventTitle}</p>
                  <p style="color: #ffffff; margin: 5px 0;"><strong>Data:</strong> ${data.eventDate}</p>
                  <p style="color: #ffffff; margin: 5px 0;"><strong>Código:</strong> ${data.ticketCode}</p>
                </div>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                  Seu ingresso já está disponível na seção "Meus Ingressos" do seu perfil.
                </p>
                
                <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 30px;">
                  © 2024 Eventix. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "coupon_applied") {
      toEmail = data.customerEmail!;
      emailSubject = "Cupom aplicado com sucesso!";
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #1a1a1a; border-radius: 14px; padding: 40px;">
                <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
                  🎟️ Cupom Aplicado!
                </h1>
                
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Olá <strong style="color: #ffffff;">${data.customerName || 'cliente'}</strong>,
                </p>
                
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  O cupom <strong style="color: #06b6d4;">${data.couponCode}</strong> foi aplicado com sucesso ao seu pedido.
                </p>
                
                <div style="background-color: #262626; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                  <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 5px 0;">Você economizou</p>
                  <p style="color: #10b981; font-size: 32px; font-weight: bold; margin: 0;">
                    R$ ${data.discountAmount?.toFixed(2)}
                  </p>
                </div>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                  Continue aproveitando as melhores experiências com a Eventix!
                </p>
                
                <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 30px;">
                  © 2024 Eventix. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Eventix <onboarding@resend.dev>",
        to: [toEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
