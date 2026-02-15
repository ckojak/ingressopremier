import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Não autenticado');

    const { event_id, items, customer_name, customer_cpf } = await req.json();
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    // Busca o evento para pegar o título
    const { data: event } = await supabase.from('events').select('title').eq('id', event_id).single();

    // Cria o pedido no banco primeiro
    const { data: order } = await supabase.from('orders').insert({
      user_id: user.id, event_id, status: 'pending', total_amount: 3.24 // Valor de teste
    }).select().single();

    const paymentData = {
      transaction_amount: 3.24,
      payment_method_id: "pix",
      payer: {
        email: user.email,
        first_name: customer_name.split(' ')[0],
        last_name: customer_name.split(' ').slice(1).join(' ') || 'Ticket',
        identification: { type: "CPF", number: customer_cpf }
      },
      description: `Ingresso: ${event?.title || 'Evento'}`,
      external_reference: order.id
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${mpAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();
    if (!mpResponse.ok) throw new Error(mpResult.message || "Erro no Mercado Pago");

    const pixData = mpResult.point_of_interaction.transaction_data;

    return new Response(JSON.stringify({
      success: true, order_id: order.id, pix_qr_code: pixData.qr_code, pix_copy_paste: pixData.qr_code
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: corsHeaders });
  }
});
