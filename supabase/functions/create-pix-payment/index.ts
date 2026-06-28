import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Não autenticado');

    const { event_id, items, customer_name, customer_cpf, site_id } = await req.json();
    const mpAccessToken = Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN') || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');

    if (!Array.isArray(items) || items.length === 0) throw new Error('Carrinho vazio');
    if (!customer_name || !customer_cpf || customer_cpf.length < 11) throw new Error('Nome e CPF obrigatórios');

    // Busca o evento e os tipos de ingresso reais (preço autoritativo do servidor)
    const ticketTypeIds = items.map((i: any) => i.ticket_type_id);
    const [{ data: event }, { data: ticketTypes }] = await Promise.all([
      supabase.from('events').select('id, title').eq('id', event_id).single(),
      supabase.from('ticket_types').select('id, name, price, event_id, is_active, quantity_total, quantity_sold').in('id', ticketTypeIds),
    ]);
    if (!event) throw new Error('Evento não encontrado');
    if (!ticketTypes || ticketTypes.length !== items.length) throw new Error('Ingresso inválido');

    // Validar disponibilidade e calcular subtotal autoritativo
    let subtotal = 0;
    const orderItemsPayload: any[] = [];
    for (const item of items) {
      const tt = ticketTypes.find((t: any) => t.id === item.ticket_type_id);
      if (!tt || tt.event_id !== event_id || !tt.is_active) throw new Error(`Ingresso indisponível`);
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 0));
      if (tt.quantity_total && (tt.quantity_sold || 0) + qty > tt.quantity_total) {
        throw new Error(`Ingresso esgotado: ${tt.name}`);
      }
      const unit = Number(tt.price);
      subtotal += unit * qty;
      orderItemsPayload.push({ ticket_type_id: tt.id, quantity: qty, unit_price: unit });
    }

    // Taxa PIX 8%
    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100;

    // Cria o pedido (somente colunas existentes em orders)
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      user_id: user.id,
      event_id,
      status: 'pending',
      total_amount: totalAmount,
      customer_name,
      customer_email: user.email,
    }).select().single();
    if (orderErr || !order) throw new Error(`Erro criando pedido: ${orderErr?.message}`);

    // Cria os order_items vinculados ao pedido
    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItemsPayload.map(oi => ({ ...oi, order_id: order.id })));
    if (itemsErr) {
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error(`Erro criando itens: ${itemsErr.message}`);
    }

    // Cria pagamento PIX no Mercado Pago
    const isSandbox = mpAccessToken.startsWith('TEST-');
    const paymentData = {
      transaction_amount: totalAmount,
      payment_method_id: "pix",
      payer: {
        email: user.email,
        first_name: customer_name.split(' ')[0],
        last_name: customer_name.split(' ').slice(1).join(' ') || 'Cliente',
        identification: { type: "CPF", number: customer_cpf }
      },
      description: `Ingresso: ${event.title}`,
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'PREMIERPASS',
    };

    const idempotencyKey = `${order.id}-${Date.now()}`;
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();
    if (!mpResponse.ok) {
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
      throw new Error(mpResult.message || mpResult.cause?.[0]?.description || "Erro no Mercado Pago");
    }

    const pixData = mpResult.point_of_interaction?.transaction_data;
    if (!pixData) throw new Error('Mercado Pago não retornou dados PIX');

    // Persistir payment_intent_id para idempotência do webhook
    await supabase.from('orders').update({
      payment_intent_id: String(mpResult.id),
    }).eq('id', order.id);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      payment_id: mpResult.id,
      pix_qr_code: pixData.qr_code,
      pix_qr_code_base64: pixData.qr_code_base64,
      pix_copy_paste: pixData.qr_code,
      expiration_date: mpResult.date_of_expiration,
      total_amount: totalAmount,
      is_sandbox: isSandbox,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[create-pix-payment] erro:', error?.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
