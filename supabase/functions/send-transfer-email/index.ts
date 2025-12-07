import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferEmailRequest {
  transferId: string;
  recipientEmail: string;
  transferCode: string;
  eventTitle: string;
  eventDate: string;
  ticketCode: string;
  senderName: string;
  siteUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      transferId,
      recipientEmail,
      transferCode,
      eventTitle,
      eventDate,
      ticketCode,
      senderName,
      siteUrl,
    }: TransferEmailRequest = await req.json();

    console.log(`Sending transfer email to: ${recipientEmail}`);
    console.log(`Transfer code: ${transferCode}`);
    console.log(`Site URL: ${siteUrl}`);

    const acceptUrl = `${siteUrl}/aceitar-transferencia?code=${transferCode}`;

    const emailHtml = `
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
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #06b6d4; font-size: 32px; font-weight: bold; margin: 0;">Premier<span style="color: #ec4899;">Pass</span></h1>
              </div>

              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
                🎟️ Você recebeu um ingresso!
              </h2>
              
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá!
              </p>
              
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong style="color: #06b6d4;">${senderName}</strong> está transferindo um ingresso para você!
              </p>
              
              <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #06b6d4; font-size: 18px; margin: 0 0 15px 0;">Detalhes do Evento</h3>
                <p style="color: #ffffff; margin: 8px 0; font-size: 16px;"><strong>Evento:</strong> ${eventTitle}</p>
                <p style="color: #ffffff; margin: 8px 0; font-size: 16px;"><strong>Data:</strong> ${eventDate}</p>
                <p style="color: #ffffff; margin: 8px 0; font-size: 16px;"><strong>Código:</strong> ${ticketCode}</p>
              </div>
              
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Para aceitar o ingresso, clique no botão abaixo:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Aceitar Ingresso
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                Você também pode aceitar o ingresso na seção "Meus Ingressos" do site, se você já tiver uma conta com este email.
              </p>
              
              <div style="border-top: 1px solid #333; margin-top: 30px; padding-top: 20px;">
                <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">
                  Se você não conhece ${senderName}, ignore este e-mail.
                </p>
              </div>
              
              <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 30px;">
                © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PremierPass <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `🎟️ ${senderName} está transferindo um ingresso para você!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent result:", emailResult);

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
    console.error("Error in send-transfer-email function:", error);
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
