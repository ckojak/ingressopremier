import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
}

interface CheckoutRequest {
  event_id: string;
  items: CheckoutItem[];
  site_id?: string;
  customer_name?: string; // Novo campo recebido do site
  customer_cpf?: string;  // Novo campo recebido do site
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
}

const getMercadoPagoCredentials = () => {
  // Prioriza o token que você adicionou (MERCADOPAGO_ACCESS_TOKEN)
  return Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
};

serve(async (req) => {
  console.log("=== Create PIX Payment Function Started ===");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header required');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) throw new Error('Authentication failed');

    const body: CheckoutRequest = await req.json();
    const { event_id, items, site_id, customer_name, customer_cpf } = body;

    if (!event_id || !items || items.length === 0) {
      throw new Error('Invalid request: event_id and items required');
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) throw new Error('Event not found');

    const mpAccessToken = getMercadoPagoCredentials();
    if (!mpAccessToken) throw new Error('Mercado Pago access token not configured');

    const ticketTypeIds = items.map(item => item.ticket_type_id);
    const { data: ticketTypes } = await supabase.from('ticket_types').select('*').in('id', ticketTypeIds);

    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const ticketType = ticketTypes?.find((tt: any) => tt.id === item.ticket_type_id);
      if (!ticketType) throw new Error(`Ticket type ${item.ticket_type_id} not found`);
      subtotal += ticketType.price * item.quantity;
      orderItems.push({ ticket_type_id: item.ticket_type_id, quantity: item.quantity, unit_price: ticketType.price });
    }

    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = subtotal + serviceFee;

    // Tenta pegar do banco, mas usa o da TELA como prioridade
    const { data: profile } = await supabase.from('profiles').select('full_name, cpf').eq('id', user.id).single();
    
    const finalName = customer_name || profile?.full_name || 'Cliente';
    const finalCpf = customer_cpf || profile?.cpf;

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id: user.id,
      event_id: event_id,
      site_id: site_id || 'premierpass',
      status: 'pending',
      total_amount: totalAmount
    }).select().single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

    const paymentData = {
      transaction_amount: totalAmount,
      payment_method_id: "pix",
      payer: {
        email: user.email,
        first_name: finalName.split(' ')[0],
        last_name: finalName.split(' ').slice(1).join(' ') || ' ',
        identification: finalCpf ? {
          type: "CPF",
          number: finalCpf.replace(/\D/g, '')
        } : undefined
      },
      description: `Ingressos - ${event.title}`,
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`
    };

    console.log("Sending to Mercado Pago:", JSON.stringify(paymentData));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id
      },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP Error:", mpResult);
      throw new Error(`Payment failed: ${mpResult.message || 'Check MP Token'}`);
    }

    const pixData = mpResult.point_of_interaction?.transaction_data;

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      pix_qr_code: pixData.qr_code,
      pix_copy_paste: pixData.qr_code,
      pix_qr_code_base64: pixData.qr_code_base64,
      total_amount: totalAmount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
