import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SERVICE_FEE = 0.08;
const PROTECTION_FEE = 3;
const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-PIX] ${step}${details ? `: ${JSON.stringify(details)}` : ''}`);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Não autenticado');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error('Não autenticado');

    const body = await req.json();
    const { event_id, items, site_id, purchase_protection } = body;
    let { customer_name, customer_cpf, customer_phone } = body;

    const mpAccessToken =
      Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) throw new Error('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN não configurado');

    if (!event_id) throw new Error('Evento não informado');
    if (!Array.isArray(items) || items.length === 0) throw new Error('Carrinho vazio');

    // Completar dados do comprador pelo perfil quando não enviados
    const { data: profile } = await supabase
      .from('profiles').select('full_name, email, phone').eq('id', user.id).maybeSingle();
    customer_name = customer_name || profile?.full_name || user.email;
    customer_phone = customer_phone || profile?.phone || null;
    customer_cpf = (customer_cpf || '').replace(/\D/g, '') || null;
    if (!customer_name) throw new Error('Nome do comprador obrigatório');
// Limite de 4 ingressos por CPF por evento (soma pedidos pagos + pendentes)
    if (customer_cpf && customer_cpf.length >= 11) {
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('id, order_items(quantity)')
        .eq('event_id', event_id)
        .eq('customer_cpf', customer_cpf)
        .in('status', ['paid', 'pending']);

      const alreadyBought = (existingOrders || []).reduce(
        (sum: number, o: any) =>
          sum + (o.order_items || []).reduce((s: number, oi: any) => s + oi.quantity, 0),
        0
      );
      const newQty = items.reduce((s: number, i: any) => s + Math.max(1, Math.floor(Number(i.quantity) || 0)), 0);
      if (alreadyBought + newQty > 4) {
        throw new Error(
          `Limite de 4 ingressos por CPF atingido para este evento (você já tem ${alreadyBought}).`
        );
      }
    }

    const ticketTypeIds = items.map((i: any) => i.ticket_type_id);
    const [{ data: event }, { data: ticketTypes, error: ttErr }] = await Promise.all([
      supabase.from('events').select('id, title, site_id').eq('id', event_id).maybeSingle(),
      supabase
        .from('ticket_types')
        .select('id, name, price, event_id, is_active, quantity, quantity_available, quantity_sold, max_per_order')
        .in('id', ticketTypeIds),
    ]);
    if (!event) throw new Error('Evento não encontrado');
    if (ttErr) throw new Error(`Erro ao buscar ingressos: ${ttErr.message}`);
    if (!ticketTypes || ticketTypes.length !== ticketTypeIds.length) throw new Error('Ingresso inválido');

    // Preço autoritativo do servidor + validação de estoque
    let subtotal = 0;
    const orderItemsPayload: any[] = [];
    for (const item of items) {
      const tt = ticketTypes.find((t: any) => t.id === item.ticket_type_id);
      if (!tt || tt.event_id !== event_id || !tt.is_active) throw new Error('Ingresso indisponível');
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 0));
      const maxPerOrder = tt.max_per_order || 10;
      if (qty > maxPerOrder) throw new Error(`Máximo de ${maxPerOrder} ingressos por pedido: ${tt.name}`);
      const stock = Number(tt.quantity_available || tt.quantity || 0);
      if (stock > 0 && (tt.quantity_sold || 0) + qty > stock) throw new Error(`Ingresso esgotado: ${tt.name}`);
      const unit = Number(tt.price);
      subtotal += unit * qty;
      orderItemsPayload.push({ ticket_type_id: tt.id, quantity: qty, unit_price: unit });
    }

    const serviceFee = Math.round(subtotal * SERVICE_FEE * 100) / 100;
    const protectionFee = purchase_protection === true ? PROTECTION_FEE : 0;
    const totalAmount = Math.round((subtotal + serviceFee + protectionFee) * 100) / 100;
    if (totalAmount <= 0) throw new Error('Valor inválido para pagamento PIX');

    const effectiveSiteId = site_id || event.site_id || 'premierpass';

    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      user_id: user.id,
      event_id,
      site_id: effectiveSiteId,
      status: 'pending',
      payment_method: 'pix',
      total_amount: totalAmount,
      service_fee: serviceFee,
      customer_name,
      customer_email: user.email,
      customer_phone,
      customer_cpf,
    }).select().single();
    if (orderErr || !order) throw new Error(`Erro criando pedido: ${orderErr?.message}`);

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItemsPayload.map((oi) => ({ ...oi, order_id: order.id })));
    if (itemsErr) {
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
      throw new Error(`Erro criando itens: ${itemsErr.message}`);
    }

    const isSandbox = mpAccessToken.startsWith('TEST-');
    const [firstName, ...rest] = String(customer_name).trim().split(' ');
    const paymentData: Record<string, unknown> = {
      transaction_amount: totalAmount,
      payment_method_id: 'pix',
      payer: {
        email: user.email,
        first_name: firstName,
        last_name: rest.join(' ') || 'Cliente',
        ...(customer_cpf && customer_cpf.length >= 11
          ? { identification: { type: 'CPF', number: customer_cpf } }
          : {}),
      },
      description: `Ingresso: ${event.title}`,
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'PREMIERPASS',
      date_of_expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${order.id}`,
      },
      body: JSON.stringify(paymentData),
    });

    const mpResult = await mpResponse.json();
    if (!mpResponse.ok) {
      log('Erro Mercado Pago', { status: mpResponse.status, mpResult });
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
      throw new Error(mpResult.message || mpResult.cause?.[0]?.description || 'Erro no Mercado Pago');
    }

    const pixData = mpResult.point_of_interaction?.transaction_data;
    if (!pixData) throw new Error('Mercado Pago não retornou dados PIX');

    await supabase.from('orders').update({
      payment_intent_id: String(mpResult.id),
      mp_payment_id: String(mpResult.id),
      pix_qr_code: pixData.qr_code,
      pix_qr_code_base64: pixData.qr_code_base64,
    }).eq('id', order.id);

    log('PIX gerado', { orderId: order.id, paymentId: mpResult.id, isSandbox });

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      payment_id: mpResult.id,
      pix_qr_code: pixData.qr_code,
      pix_qr_code_base64: pixData.qr_code_base64,
      pix_copy_paste: pixData.qr_code,
      expiration_date: mpResult.date_of_expiration,
      total_amount: totalAmount,
      service_fee: serviceFee,
      protection_fee: protectionFee,
      is_sandbox: isSandbox,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    log('erro', { message: error?.message });
    return new Response(JSON.stringify({ success: false, error: error?.message ?? 'Erro desconhecido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
