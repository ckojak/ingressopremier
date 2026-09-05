import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CART-RECOVERY] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const escapeHtml = (v: string) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const SITE_URL = "https://premierpass.com.br";

const buildHtml = (opts: {
  customerName?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  venueName?: string | null;
  totalAmount: number;
  link: string;
}) => {
  const nome = opts.customerName ? escapeHtml(opts.customerName.split(" ")[0]) : "Olá";
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin:0; padding:0; background-color:#0a0a0a; -webkit-font-smoothing:antialiased;">
    <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
      <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding:2px; border-radius:16px;">
        <div style="background-color:#18181b; border-radius:14px; padding:40px;">

          <div style="text-align:center; margin-bottom:32px;">
            <h1 style="color:#06b6d4; font-size:36px; font-weight:800; margin:0; letter-spacing:-1px;">Premier<span style="color:#ec4899;">Pass</span></h1>
            <p style="color:#52525b; font-size:12px; margin:8px 0 0 0; text-transform:uppercase; letter-spacing:2px;">Seu pedido continua aqui</p>
          </div>

          <h2 style="color:#ffffff; font-size:22px; font-weight:700; margin:0 0 12px 0;">${nome}, seu pedido ficou pendente</h2>
          <p style="color:#a1a1aa; font-size:15px; line-height:1.7; margin:0 0 24px 0;">
            Vimos que você começou a compra mas o pagamento ainda não foi concluído.
            Se quiser continuar, é só usar o link abaixo. Se mudou de ideia, pode ignorar este e-mail tranquilamente.
          </p>

          ${opts.eventTitle ? `
          <div style="background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(8,145,178,0.1)); border-radius:12px; padding:24px; margin-bottom:24px; border:1px solid rgba(6,182,212,0.3);">
            <h3 style="color:#ffffff; font-size:18px; margin:0 0 12px 0; font-weight:600;">${escapeHtml(opts.eventTitle)}</h3>
            <div style="color:#d4d4d8; font-size:14px; line-height:1.8;">
              ${opts.eventDate ? `<p style="margin:0 0 6px 0;">📅 ${escapeHtml(opts.eventDate)}</p>` : ""}
              ${opts.venueName ? `<p style="margin:0;">📍 ${escapeHtml(opts.venueName)}</p>` : ""}
            </div>
          </div>` : ""}

          <div style="border-top:1px solid #27272a; padding-top:20px; margin-bottom:24px;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="color:#a1a1aa; font-size:14px;">Valor do pedido</td>
                <td style="text-align:right; color:#06b6d4; font-size:20px; font-weight:700;">R$ ${opts.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div style="text-align:center; margin:32px 0;">
            <a href="${opts.link}" style="display:inline-block; background: linear-gradient(135deg,#06b6d4,#0891b2); color:#ffffff; text-decoration:none; padding:16px 40px; border-radius:8px; font-weight:600; font-size:16px;">
              Continuar minha compra
            </a>
          </div>

          <div style="background-color:#27272a; border-radius:12px; padding:20px;">
            <p style="color:#71717a; font-size:13px; margin:0; line-height:1.6;">
              A confirmação do ingresso acontece somente após o pagamento aprovado. Em caso de dúvida, fale com o nosso suporte pelo site.
            </p>
          </div>

          <div style="margin-top:32px; text-align:center;">
            <p style="color:#52525b; font-size:12px; margin:0;">© ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.</p>
            <p style="color:#52525b; font-size:11px; margin:8px 0 0 0;">Este é um e-mail automático. Não responda a esta mensagem.</p>
          </div>

        </div>
      </div>
    </div>
  </body>
  </html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Somente chamadas internas (cron/service role) ou admin podem disparar.
  const cronToken = req.headers.get("x-cron-token") || "";
  let autorizado = false;
  if (cronToken) {
    const { data: ok } = await supabase.rpc("verify_cron_token", { _token: cronToken });
    autorizado = ok === true;
  }
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!autorizado && jwt !== serviceKey) {
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const { data: got } = await supabase.auth.getUser(jwt);
    const user = got?.user;
    const { data: ehAdmin } = user
      ? await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      : { data: false };
    if (!user || !ehAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissao" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, customer_email, customer_name, total_amount, event_id, created_at,
        events (title, slug, start_date, venue_name)
      `)
      .eq("status", "pending")
      .eq("recovery_email_sent", false)
      .lt("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not("customer_email", "is", null)
      .limit(100);

    if (error) throw error;

    logStep("Pedidos elegiveis", { count: orders?.length ?? 0 });

    let sent = 0;
    const failures: Array<{ orderId: string; error: string }> = [];

    for (const order of orders ?? []) {
      const ev = (order as any).events;
      const link = ev?.id || order.event_id
        ? `${SITE_URL}/evento/${ev?.slug || order.event_id}`
        : `${SITE_URL}/meus-ingressos`;

      const eventDate = ev?.start_date
        ? new Date(ev.start_date).toLocaleDateString("pt-BR", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          })
        : null;

      try {
        await resend.emails.send({
          from: "PremierPass <onboarding@resend.dev>",
          to: [order.customer_email as string],
          subject: ev?.title
            ? `Seu pedido para ${ev.title} ainda está pendente`
            : "Seu pedido no PremierPass ainda está pendente",
          html: buildHtml({
            customerName: order.customer_name,
            eventTitle: ev?.title ?? null,
            eventDate,
            venueName: ev?.venue_name ?? null,
            totalAmount: Number(order.total_amount || 0),
            link,
          }),
        });

        // Marca somente pedidos que ainda estao pending (evita marcar pedido
        // que virou paid entre a busca e o envio).
        await supabase
          .from("orders")
          .update({ recovery_email_sent: true })
          .eq("id", order.id)
          .eq("status", "pending");

        sent++;
      } catch (e: any) {
        failures.push({ orderId: order.id, error: e?.message ?? String(e) });
        logStep("Falha no envio", { orderId: order.id, error: e?.message });
      }
    }

    logStep("Concluido", { sent, failures: failures.length });

    return new Response(JSON.stringify({ success: true, eligible: orders?.length ?? 0, sent, failures }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
