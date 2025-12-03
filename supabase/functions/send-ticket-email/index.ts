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
  orderId: string;
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

    const { orderId }: TicketEmailRequest = await req.json();
    if (!orderId) throw new Error("Order ID is required");
    logStep("Order ID received", { orderId });

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
      <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; margin: 8px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${(ticket.ticket_types as any)?.name || 'Ingresso'}</p>
        <p style="margin: 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #333;">
          ${ticket.ticket_code}
        </p>
      </div>
    `).join("") || "";

    // Order items HTML
    const orderItemsHtml = order.order_items?.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}x ${item.ticket_types?.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${(item.unit_price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join("") || "";

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Eventix <onboarding@resend.dev>",
      to: [order.customer_email || ""],
      subject: `🎫 Seus ingressos para ${order.events?.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #0d9488; margin: 0; font-size: 28px;">Eventix</h1>
              <p style="color: #666; margin: 8px 0 0 0;">Confirmação de Compra</p>
            </div>

            <!-- Main Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Success Message -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">✓</span>
                </div>
                <h2 style="color: #333; margin: 0 0 8px 0;">Compra Confirmada!</h2>
                <p style="color: #666; margin: 0;">Seus ingressos estão prontos</p>
              </div>

              <!-- Event Details -->
              <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); border-radius: 12px; padding: 24px; color: white; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 20px;">${order.events?.title}</h3>
                <p style="margin: 0 0 8px 0; opacity: 0.9;">📅 ${formattedDate}</p>
                ${order.events?.venue_name ? `<p style="margin: 0 0 8px 0; opacity: 0.9;">📍 ${order.events.venue_name}</p>` : ""}
                ${order.events?.city ? `<p style="margin: 0; opacity: 0.9;">${order.events.city}${order.events.state ? `, ${order.events.state}` : ""}</p>` : ""}
              </div>

              <!-- Ticket Codes -->
              <div style="margin-bottom: 24px;">
                <h3 style="color: #333; margin: 0 0 16px 0; font-size: 16px;">Seus códigos de ingresso:</h3>
                ${ticketCodesHtml}
                <p style="color: #666; font-size: 12px; margin: 8px 0 0 0; text-align: center;">
                  Apresente estes códigos na entrada do evento
                </p>
              </div>

              <!-- Order Summary -->
              <div style="border-top: 1px solid #eee; padding-top: 24px;">
                <h3 style="color: #333; margin: 0 0 16px 0; font-size: 16px;">Resumo do Pedido</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${orderItemsHtml}
                  <tr>
                    <td style="padding: 12px 8px 8px; font-weight: bold;">Total</td>
                    <td style="padding: 12px 8px 8px; text-align: right; font-weight: bold; color: #0d9488; font-size: 18px;">
                      R$ ${Number(order.total_amount).toFixed(2)}
                    </td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; color: #666; font-size: 12px;">
              <p style="margin: 0 0 8px 0;">Este é um email automático. Não responda a esta mensagem.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Eventix. Todos os direitos reservados.</p>
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