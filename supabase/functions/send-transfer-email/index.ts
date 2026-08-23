import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Dominios onde o link "Aceitar Ingresso" pode apontar. Antes a URL vinha no
// corpo da requisicao, entao dava pra gerar um e-mail com a marca PremierPass
// apontando pra um site falso. Agora so estes valem.
const SITES_PERMITIDOS = [
  "https://premierpass.com.br",
  "https://www.premierpass.com.br",
];
const SITE_PADRAO = "https://premierpass.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const negar = (msg: string, status: number) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// Escapa HTML pra que nome/titulo de evento nao consigam injetar markup ou
// link dentro do corpo do e-mail.
const escapeHtml = (v: string) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const formatarData = (iso: string | null): string => {
  if (!iso) return "Data nao informada";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return "Data nao informada";
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // ══════════════════════════════════════════════════════════════════
    // AUTENTICACAO. Antes a funcao era totalmente aberta: qualquer um da
    // internet mandava e-mail com a marca PremierPass, com destinatario e
    // texto livres, incluindo um botao "Aceitar Ingresso" apontando pra
    // onde quisesse.
    // ══════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    const isInternal = !!jwt && jwt === SUPABASE_SERVICE_ROLE_KEY;

    let callerId = "";
    if (!isInternal) {
      if (!jwt) return negar("Nao autenticado", 401);
      const { data: got } = await supabase.auth.getUser(jwt);
      if (!got?.user) return negar("Nao autenticado", 401);
      callerId = got.user.id;
    }

    const body = await req.json().catch(() => ({}));
    const transferId = String(body?.transferId || "").trim();
    if (!transferId) return negar("transferId e obrigatorio", 400);

    // ══════════════════════════════════════════════════════════════════
    // A partir daqui NADA vem do corpo da requisicao. Destinatario, codigo,
    // evento, data e nome do remetente saem todos do banco -- assim nao da
    // pra usar esta funcao pra mandar e-mail arbitrario pra qualquer pessoa.
    // ══════════════════════════════════════════════════════════════════
    const { data: transfer } = await supabase
      .from("ticket_transfers")
      .select("id, ticket_id, from_user_id, to_user_email, to_email, transfer_code, status")
      .eq("id", transferId)
      .maybeSingle();

    if (!transfer) return negar("Transferencia nao encontrada", 404);

    // So o dono da transferencia (ou o proprio sistema) dispara este e-mail.
    if (!isInternal && transfer.from_user_id !== callerId) {
      return negar("Esta transferencia nao e sua", 403);
    }
    if (transfer.status !== "pending") {
      return negar("Transferencia ja concluida ou cancelada", 400);
    }

    const destinatario = String(transfer.to_user_email || transfer.to_email || "")
      .toLowerCase().trim();
    if (!destinatario) return negar("Transferencia sem destinatario", 400);

    // Ingresso -> tipo de ingresso -> evento
    const { data: ticket } = await supabase
      .from("tickets")
      .select("ticket_code, event_id, ticket_type_id")
      .eq("id", transfer.ticket_id)
      .maybeSingle();

    let eventId = ticket?.event_id ?? null;
    if (!eventId && ticket?.ticket_type_id) {
      const { data: tt } = await supabase
        .from("ticket_types").select("event_id").eq("id", ticket.ticket_type_id).maybeSingle();
      eventId = tt?.event_id ?? null;
    }

    let eventTitle = "Evento";
    let eventDateIso: string | null = null;
    if (eventId) {
      const { data: ev } = await supabase
        .from("events").select("title, start_date").eq("id", eventId).maybeSingle();
      if (ev?.title) eventTitle = ev.title;
      eventDateIso = ev?.start_date ?? null;
    }

    const { data: remetente } = await supabase
      .from("profiles").select("full_name, email").eq("id", transfer.from_user_id).maybeSingle();
    const senderName = remetente?.full_name || remetente?.email || "Um usuario";

    // URL do site: so aceita se estiver na lista branca.
    const pedido = String(body?.siteUrl || "").replace(/\/+$/, "");
    const siteUrl = SITES_PERMITIDOS.includes(pedido) ? pedido : SITE_PADRAO;

    const safeSender = escapeHtml(senderName);
    const safeEvent = escapeHtml(eventTitle);
    const safeDate = escapeHtml(formatarData(eventDateIso));
    const safeTicketCode = escapeHtml(ticket?.ticket_code || "");
    const acceptUrl = `${siteUrl}/aceitar-transferencia?code=${encodeURIComponent(transfer.transfer_code || "")}`;

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
                <strong style="color: #06b6d4;">${safeSender}</strong> está transferindo um ingresso para você!
              </p>

              <div style="background-color: #262626; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #06b6d4; font-size: 18px; margin: 0 0 15px 0;">Detalhes do Evento</h3>
                <p style="color: #ffffff; margin: 8px 0; font-size: 16px;"><strong>Evento:</strong> ${safeEvent}</p>
                <p style="color: #ffffff; margin: 8px 0; font-size: 16px;"><strong>Data:</strong> ${safeDate}</p>
                <p style="color: #ffffff; margin: 8px 0; font-size: 16px;"><strong>Código:</strong> ${safeTicketCode}</p>
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
                  Se você não conhece ${safeSender}, ignore este e-mail.
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PremierPass <onboarding@resend.dev>",
        to: [destinatario],
        subject: `🎟️ ${senderName} está transferindo um ingresso para você!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error("Falha ao enviar e-mail de transferencia:", emailResult);
      throw new Error("Falha ao enviar e-mail");
    }

    console.log("E-mail de transferencia enviado", { transferId, temDestinatario: !!destinatario });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-transfer-email function:", error?.message);
    return new Response(JSON.stringify({ error: error?.message || "Erro desconhecido" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);