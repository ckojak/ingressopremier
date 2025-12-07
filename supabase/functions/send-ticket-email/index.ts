import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TICKET-EMAIL] ${step}${detailsStr}`);
};

interface TicketEmailRequest {
  orderId?: string;
  type?: "purchase" | "complimentary";
  recipientEmail?: string;
  recipientName?: string;
  eventTitle?: string;
  eventDate?: string;
  venueName?: string;
  ticketTypeName?: string;
  ticketCodes?: string[];
  quantity?: number;
  siteUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const requestBody: TicketEmailRequest = await req.json();
    logStep("Request received", { type: requestBody.type });

    // Handle complimentary tickets
    if (requestBody.type === "complimentary") {
      const { recipientEmail, recipientName, eventTitle, eventDate, venueName, ticketTypeName, ticketCodes, quantity, siteUrl } = requestBody;
      
      if (!recipientEmail || !ticketCodes?.length) {
        throw new Error("Missing required fields for complimentary ticket email");
      }

      // Generate ticket codes HTML for complimentary
      const ticketCodesHtml = ticketCodes.map(code => `
        <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin: 12px 0; text-align: center; border: 1px solid #3f3f46;">
          <p style="margin: 0 0 8px 0; color: #a1a1aa; font-size: 14px;">${ticketTypeName || 'Ingresso Cortesia'}</p>
          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: #06b6d4; letter-spacing: 2px;">
            ${code}
          </p>
        </div>
      `).join("");

      const emailResponse = await resend.emails.send({
        from: "PremierPass <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `🎁 Você recebeu ${quantity || 1} ingresso${(quantity || 1) > 1 ? 's' : ''} cortesia para ${eventTitle}`,
        html: `
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
                    <p style="color: #52525b; font-size: 12px; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Ingresso Cortesia</p>
                  </div>

                  <!-- Gift Icon -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                      <span style="font-size: 40px;">🎁</span>
                    </div>
                    <h2 style="color: #a855f7; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                      Você foi convidado!
                    </h2>
                    <p style="color: #a1a1aa; font-size: 16px; margin: 0;">
                      Olá ${recipientName || 'Convidado'}! Você recebeu um ingresso cortesia.
                    </p>
                  </div>

                  <!-- Event Details Card -->
                  <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.1)); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(6, 182, 212, 0.3);">
                    <h3 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0; font-weight: 600;">${eventTitle}</h3>
                    <div style="color: #d4d4d8; font-size: 15px; line-height: 1.8;">
                      <p style="margin: 0 0 8px 0;">📅 ${eventDate}</p>
                      ${venueName ? `<p style="margin: 0;">📍 ${venueName}</p>` : ""}
                    </div>
                  </div>

                  <!-- Ticket Codes -->
                  <div style="margin-bottom: 24px;">
                    <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">🎫 Seu${ticketCodes.length > 1 ? 's' : ''} código${ticketCodes.length > 1 ? 's' : ''} de ingresso:</h3>
                    ${ticketCodesHtml}
                    <p style="color: #71717a; font-size: 13px; margin: 16px 0 0 0; text-align: center;">
                      Apresente este${ticketCodes.length > 1 ? 's' : ''} código${ticketCodes.length > 1 ? 's' : ''} ou o QR Code na entrada do evento
                    </p>
                  </div>

                  <!-- Info -->
                  <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin-top: 24px;">
                    <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">💡 Informação importante</p>
                    <p style="color: #71717a; font-size: 13px; margin: 0; line-height: 1.6;">
                      Este é um ingresso cortesia. Basta apresentá-lo na entrada do evento para acessar.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 32px; text-align: center;">
                    <p style="color: #52525b; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                    </p>
                  </div>
                  
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      logStep("Complimentary email sent", { emailResponse });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Standard purchase email flow
    const { orderId } = requestBody;
    if (!orderId) throw new Error("Order ID is required");

    // Fetch order with details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        events (title, start_date, venue_name, city, state, venue_address),
        order_items (
          quantity,
          unit_price,
          ticket_types (name)
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }
    logStep("Order fetched", { customerEmail: order.customer_email });

    // Fetch tickets for this order
    const { data: orderItems } = await supabaseClient
      .from("order_items")
      .select("id")
      .eq("order_id", orderId);

    const orderItemIds = orderItems?.map(item => item.id) || [];

    const { data: tickets } = await supabaseClient
      .from("tickets")
      .select("ticket_code, ticket_types (name)")
      .in("order_item_id", orderItemIds);

    logStep("Tickets fetched", { count: tickets?.length });

    // Format date
    const eventDate = new Date(order.events?.start_date || "");
    const formattedDate = eventDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate ticket codes HTML
    const ticketCodesHtml = tickets?.map(ticket => `
      <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin: 12px 0; text-align: center; border: 1px solid #3f3f46;">
        <p style="margin: 0 0 8px 0; color: #a1a1aa; font-size: 14px;">${(ticket.ticket_types as any)?.name || 'Ingresso'}</p>
        <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: #06b6d4; letter-spacing: 2px;">
          ${ticket.ticket_code}
        </p>
      </div>
    `).join("") || "";

    // Order items HTML
    const orderItemsHtml = order.order_items?.map((item: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #d4d4d8;">${item.quantity}x ${item.ticket_types?.name}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #27272a; text-align: right; color: #d4d4d8;">R$ ${(item.unit_price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join("") || "";

    // Send email
    const emailResponse = await resend.emails.send({
      from: "PremierPass <onboarding@resend.dev>",
      to: [order.customer_email || ""],
      subject: `🎫 Seus ingressos para ${order.events?.title}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Card Container -->
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 2px; border-radius: 16px;">
              <div style="background-color: #18181b; border-radius: 14px; padding: 40px;">
                
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #06b6d4; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px;">Premier<span style="color: #ec4899;">Pass</span></h1>
                  <p style="color: #52525b; font-size: 12px; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Confirmação de compra</p>
                </div>

                <!-- Success Icon -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; line-height: 80px;">
                    <span style="font-size: 40px;">✅</span>
                  </div>
                  <h2 style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                    Compra Confirmada!
                  </h2>
                  <p style="color: #a1a1aa; font-size: 16px; margin: 0;">
                    Seus ingressos estão prontos
                  </p>
                </div>

                <!-- Event Details Card -->
                <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.1)); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(6, 182, 212, 0.3);">
                  <h3 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0; font-weight: 600;">${order.events?.title}</h3>
                  <div style="color: #d4d4d8; font-size: 15px; line-height: 1.8;">
                    <p style="margin: 0 0 8px 0;">📅 ${formattedDate}</p>
                    ${order.events?.venue_name ? `<p style="margin: 0 0 8px 0;">📍 ${order.events.venue_name}</p>` : ""}
                    ${order.events?.city ? `<p style="margin: 0;">🏙️ ${order.events.city}${order.events.state ? `, ${order.events.state}` : ""}</p>` : ""}
                  </div>
                </div>

                <!-- Ticket Codes -->
                <div style="margin-bottom: 24px;">
                  <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">🎫 Seus códigos de ingresso:</h3>
                  ${ticketCodesHtml}
                  <p style="color: #71717a; font-size: 13px; margin: 16px 0 0 0; text-align: center;">
                    Apresente estes códigos ou o QR Code na entrada do evento
                  </p>
                </div>

                <!-- Order Summary -->
                <div style="border-top: 1px solid #27272a; padding-top: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">📋 Resumo do Pedido</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    ${orderItemsHtml}
                    <tr>
                      <td style="padding: 16px 0 0; font-weight: 600; color: #ffffff;">Total</td>
                      <td style="padding: 16px 0 0; text-align: right; font-weight: 700; color: #06b6d4; font-size: 20px;">
                        R$ ${Number(order.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://premierpass.com.br/meus-ingressos" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);">
                    Ver meus ingressos
                  </a>
                </div>

                <!-- Help Section -->
                <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin-top: 24px;">
                  <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Precisa de ajuda?</p>
                  <p style="color: #71717a; font-size: 13px; margin: 0; line-height: 1.6;">
                    Acesse a área "Meus Ingressos" no site para visualizar o QR Code ou entrar em contato com o suporte.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 32px; text-align: center;">
                  <p style="color: #52525b; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} PremierPass. Todos os direitos reservados.
                  </p>
                  <p style="color: #52525b; font-size: 11px; margin: 8px 0 0 0;">
                    Este é um email automático. Não responda a esta mensagem.
                  </p>
                </div>
                
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logStep("Email sent", { emailResponse });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
