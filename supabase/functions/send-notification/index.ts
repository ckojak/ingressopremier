import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "transfer_accepted" | "transfer_rejected" | "coupon_applied" | "event_submitted" | "event_approved" | "event_rejected";
  data: {
    transferId?: string;
    ticketCode?: string;
    eventTitle?: string;
    eventDate?: string;
    eventId?: string;
    recipientEmail?: string;
    recipientName?: string;
    senderName?: string;
    orderId?: string;
    couponCode?: string;
    discountAmount?: number;
    customerEmail?: string;
    customerName?: string;
    producerEmail?: string;
    producerName?: string;
    adminEmails?: string[];
    rejectionReason?: string;
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
      emailSubject = "✅ Transferência de ingresso aceita!";
      emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #18181b; border-radius: 14px; padding: 40px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #06b6d4; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px;">Premier<span style="color: #ec4899;">Pass</span></h1>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                    <span style="font-size: 40px;">🎉</span>
                  </div>
                  <h2 style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                    Transferência Aceita!
                  </h2>
                </div>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
                  Olá <strong style="color: #ffffff;">${data.recipientName || 'participante'}</strong>,
                </p>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                  A transferência de ingresso de <strong style="color: #06b6d4;">${data.senderName || 'outro usuário'}</strong> foi aceita com sucesso!
                </p>
                
                <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3f3f46;">
                  <h3 style="color: #06b6d4; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">📋 Detalhes do Ingresso</h3>
                  <p style="color: #ffffff; margin: 8px 0; font-size: 15px;"><strong>Evento:</strong> ${data.eventTitle}</p>
                  <p style="color: #ffffff; margin: 8px 0; font-size: 15px;"><strong>Data:</strong> ${data.eventDate}</p>
                  <p style="color: #ffffff; margin: 8px 0; font-size: 15px;"><strong>Código:</strong> <span style="color: #06b6d4; font-family: monospace;">${data.ticketCode}</span></p>
                </div>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 24px 0;">
                  O ingresso já está disponível na seção "Meus Ingressos" da conta do novo proprietário.
                </p>
                
                <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 32px;">
                  © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "transfer_rejected") {
      toEmail = data.recipientEmail!;
      emailSubject = "❌ Transferência de ingresso recusada";
      emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #18181b; border-radius: 14px; padding: 40px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #06b6d4; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px;">Premier<span style="color: #ec4899;">Pass</span></h1>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                    <span style="font-size: 40px;">😔</span>
                  </div>
                  <h2 style="color: #ef4444; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                    Transferência Recusada
                  </h2>
                </div>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
                  Olá <strong style="color: #ffffff;">${data.recipientName || 'participante'}</strong>,
                </p>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                  A transferência de ingresso para <strong style="color: #06b6d4;">${data.eventTitle}</strong> foi recusada pelo destinatário.
                </p>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 24px 0;">
                  O ingresso permanece na sua conta e pode ser usado normalmente ou transferido para outra pessoa.
                </p>
                
                <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 32px;">
                  © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "coupon_applied") {
      toEmail = data.customerEmail!;
      emailSubject = "🎟️ Cupom aplicado com sucesso!";
      emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #18181b; border-radius: 14px; padding: 40px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #06b6d4; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px;">Premier<span style="color: #ec4899;">Pass</span></h1>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                    <span style="font-size: 40px;">🎟️</span>
                  </div>
                  <h2 style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                    Cupom Aplicado!
                  </h2>
                </div>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
                  Olá <strong style="color: #ffffff;">${data.customerName || 'cliente'}</strong>,
                </p>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                  O cupom <strong style="color: #06b6d4;">${data.couponCode}</strong> foi aplicado com sucesso ao seu pedido!
                </p>
                
                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.1)); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid rgba(16, 185, 129, 0.3);">
                  <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 8px 0;">Você economizou</p>
                  <p style="color: #10b981; font-size: 36px; font-weight: bold; margin: 0;">
                    R$ ${data.discountAmount?.toFixed(2)}
                  </p>
                </div>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 24px 0; text-align: center;">
                  Continue aproveitando os melhores eventos com a PremierPass! 🎉
                </p>
                
                <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 32px;">
                  © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "event_submitted") {
      // Send to all admins
      const adminEmails = data.adminEmails || [];
      
      for (const adminEmail of adminEmails) {
        const submitEmailHtml = `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
                <div style="background-color: #18181b; border-radius: 14px; padding: 40px;">
                  
                  <!-- Logo -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #06b6d4; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px;">Premier<span style="color: #ec4899;">Pass</span></h1>
                  </div>

                  <!-- Header -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                      <span style="font-size: 40px;">📋</span>
                    </div>
                    <h2 style="color: #eab308; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                      Novo Evento para Aprovação
                    </h2>
                  </div>
                  
                  <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
                    Um novo evento foi enviado para aprovação:
                  </p>
                  
                  <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3f3f46;">
                    <h3 style="color: #06b6d4; font-size: 18px; margin: 0 0 8px 0; font-weight: 600;">${data.eventTitle}</h3>
                  </div>
                  
                  <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 24px 0; text-align: center;">
                    Acesse o painel administrativo para revisar e aprovar este evento.
                  </p>
                  
                  <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 32px;">
                    © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
        
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "PremierPass <onboarding@resend.dev>",
            to: [adminEmail],
            subject: "📋 Novo evento aguardando aprovação",
            html: submitEmailHtml,
          }),
        });
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Admin notifications sent" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (type === "event_approved") {
      toEmail = data.producerEmail!;
      emailSubject = "✅ Seu evento foi aprovado!";
      emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #18181b; border-radius: 14px; padding: 40px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #06b6d4; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px;">Premier<span style="color: #ec4899;">Pass</span></h1>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                    <span style="font-size: 40px;">🎉</span>
                  </div>
                  <h2 style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                    Evento Aprovado!
                  </h2>
                </div>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
                  Olá <strong style="color: #ffffff;">${data.producerName || 'produtor'}</strong>,
                </p>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                  Seu evento foi aprovado e está disponível para venda de ingressos!
                </p>
                
                <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3f3f46;">
                  <h3 style="color: #06b6d4; font-size: 18px; margin: 0 0 8px 0; font-weight: 600;">${data.eventTitle}</h3>
                </div>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 24px 0; text-align: center;">
                  Acesse seu painel para configurar os tipos de ingressos e acompanhar as vendas.
                </p>
                
                <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 32px;">
                  © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "event_rejected") {
      toEmail = data.producerEmail!;
      emailSubject = "❌ Seu evento não foi aprovado";
      emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #18181b; border-radius: 14px; padding: 40px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #06b6d4; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px;">Premier<span style="color: #ec4899;">Pass</span></h1>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                    <span style="font-size: 40px;">😔</span>
                  </div>
                  <h2 style="color: #ef4444; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                    Evento Não Aprovado
                  </h2>
                </div>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
                  Olá <strong style="color: #ffffff;">${data.producerName || 'produtor'}</strong>,
                </p>
                
                <p style="color: #d4d4d8; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                  Infelizmente seu evento não foi aprovado.
                </p>
                
                <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3f3f46;">
                  <h3 style="color: #06b6d4; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">${data.eventTitle}</h3>
                  ${data.rejectionReason ? `
                  <p style="color: #a1a1aa; font-size: 14px; margin: 0;"><strong>Motivo:</strong> ${data.rejectionReason}</p>
                  ` : ''}
                </div>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 24px 0; text-align: center;">
                  Você pode editar as informações do evento e enviar novamente para aprovação.
                </p>
                
                <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 32px;">
                  © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    if (!toEmail) {
      throw new Error("No recipient email provided");
    }

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PremierPass <onboarding@resend.dev>",
        to: [toEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

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
