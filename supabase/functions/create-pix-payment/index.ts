import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SERVICE_FEE = 0.08;
const PROTECTION_FEE = 3;
const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-PIX] ${step}${details ? `: ${JSON.stringify(details)}` : ''}`);

// Formata a data de expiração com offset explícito -03:00 (Brasília), no formato
// que o Mercado Pago realmente espera pro campo date_of_expiration. Usar
// .toISOString() (que manda "Z"/UTC puro) fazia o PIX expirar em segundos
// em vez dos 5 minutos configurados -- bug confirmado em produção.
function mpExpirationDate(msFromNow: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const target = new Date(Date.now() + msFromNow);
  const brasiliaOffsetMs = -3 * 60 * 60 * 1000; // Brasília não tem horário de verão desde 2019
  const local = new Date(target.getTime() + brasiliaOffsetMs);
  const y = local.getUTCFullYear();
  const mo = pad(local.getUTCMonth() + 1);
  const d = pad(local.getUTCDate());
  const h = pad(local.getUTCHours());
  const mi = pad(local.getUTCMinutes());
  const s = pad(local.getUTCSeconds());
  const ms = String(local.getUTCMilliseconds()).padStart(3, '0');
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}-03:00`;
}

async function applyCoupon(supabase: any, code: string | undefined, eventId: string, subtotal: number) {
  if (!code) return { discount: 0, couponId: null as string | null, couponCode: null as string | null };

  // Escapa os curingas do LIKE (% e _). Sem isso, mandar "%" como cupom casava
  // com QUALQUER cupom ativo -- desconto de graça sem saber o código.
  const safeCode = code.trim().replace(/([\\%_])/g, '\\$1');

  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, code, discount_type, discount_value, valid_from, valid_until, max_uses, used_count, min_purchase_amount, event_id, is_active')
    .ilike('code', safeCode)
    .maybeSingle();

  if (!coupon || coupon.is_active === false) return { discount: 0, couponId: null, couponCode: null };

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return { discount: 0, couponId: null, couponCode: null };
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return { discount: 0, couponId: null, couponCode: null };
  if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) return { discount: 0, couponId: null, couponCode: null };
  if (coupon.min_purchase_amount && subtotal < Number(coupon.min_purchase_amount)) return { discount: 0, couponId: null, couponCode: null };
  if (coupon.event_id && coupon.event_id !== eventId) return { discount: 0, couponId: null, couponCode: null };

  const discount = coupon.discount_type === 'percentage'
    ? subtotal * (Number(coupon.discount_value) / 100)
    : Math.min(Number(coupon.discount_value), subtotal);

  return { discount: Math.round(discount * 100) / 100, couponId: coupon.id as string, couponCode: coupon.code as string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Reservas já feitas nesta chamada -- devolvidas se algo falhar no meio do caminho.
  const reserved: { ticket_type_id: string; quantity: number }[] = [];
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const releaseAll = async () => {
    for (const r of reserved) {
      await supabase.rpc('release_tickets', { p_ticket_type_id: r.ticket_type_id, p_quantity: r.quantity });
    }
  };

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Não autenticado');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error('Não autenticado');

    const body = await req.json();
    const { event_id, items, site_id, coupon_code, purchase_protection, billing_address } = body;
    let { customer_name, customer_cpf, customer_phone } = body;
    const { utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body;

    const mpAccessToken = Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) throw new Error('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN não configurado');

    if (!event_id) throw new Error('Evento não informado');
    if (!Array.isArray(items) || items.length === 0) throw new Error('Carrinho vazio');

    // Normaliza o carrinho: exige quantidade INTEIRA POSITIVA e SOMA itens repetidos
    // do mesmo tipo de ingresso. Antes dava pra mandar o mesmo ticket_type_id três
    // vezes com 10 cada -- passava nas três validações de max_per_order e levava 30.
    // Também bloqueia quantidade negativa, que corrompia o estoque no reserve_tickets.
    const mergedQty = new Map<string, number>();
    for (const raw of items) {
      const ttId = String(raw?.ticket_type_id || '');
      const qty = Number(raw?.quantity);
      if (!ttId) throw new Error('Item inválido no carrinho');
      if (!Number.isInteger(qty) || qty <= 0) throw new Error('Quantidade inválida no carrinho');
      mergedQty.set(ttId, (mergedQty.get(ttId) || 0) + qty);
    }
    const normalizedItems = Array.from(mergedQty, ([ticket_type_id, quantity]) => ({ ticket_type_id, quantity }));

    const { data: profile } = await supabase
      .from('profiles').select('full_name, email, phone').eq('id', user.id).maybeSingle();
    customer_name = customer_name || profile?.full_name || user.email;
    customer_phone = customer_phone || profile?.phone || null;
    customer_cpf = (customer_cpf || '').replace(/\D/g, '') || null;
    if (!customer_name) throw new Error('Nome do comprador obrigatório');

    // Limite de 4 ingressos por CPF por evento -- conta pedidos pagos E
    // pendentes (não só pagos), pra não deixar alguém empilhar vários PIX
    // pendentes ao mesmo tempo pra burlar o limite.
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
      const newQty = normalizedItems.reduce((s: number, i) => s + i.quantity, 0);
      if (alreadyBought + newQty > 4) {
        throw new Error(`Limite de 4 ingressos por CPF atingido para este evento (você já tem ${alreadyBought}).`);
      }
    }

    const ticketTypeIds = normalizedItems.map((i) => i.ticket_type_id);
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

    let subtotal = 0;
    const orderItemsPayload: any[] = [];
    for (const item of normalizedItems) {
      const tt = ticketTypes.find((t: any) => t.id === item.ticket_type_id);
      if (!tt || tt.event_id !== event_id || !tt.is_active) throw new Error('Ingresso indisponível');
      const qty = item.quantity;
      const maxPerOrder = tt.max_per_order || 10;
      if (qty > maxPerOrder) throw new Error(`Máximo de ${maxPerOrder} ingressos por pedido: ${tt.name}`);

      // Reserva ATÔMICA: trava a linha do ticket_type, confere disponibilidade
      // e já incrementa quantity_sold numa única operação de banco -- impede
      // duas compras simultâneas de venderem o mesmo último ingresso.
      const { data: reserveResult, error: reserveErr } = await supabase
        .rpc('reserve_tickets', { p_ticket_type_id: tt.id, p_quantity: qty })
        .single();

      if (reserveErr || !reserveResult?.success) {
        await releaseAll();
        throw new Error(`Ingresso esgotado: ${tt.name}`);
      }
      reserved.push({ ticket_type_id: tt.id, quantity: qty });

      const unit = Number(tt.price);
      subtotal += unit * qty;
      orderItemsPayload.push({ ticket_type_id: tt.id, quantity: qty, unit_price: unit });
    }

    const { discount, couponId, couponCode } = await applyCoupon(supabase, coupon_code, event_id, subtotal);
    const subtotalAfterDiscount = Math.max(subtotal - discount, 0);

    const serviceFee = Math.round(subtotalAfterDiscount * SERVICE_FEE * 100) / 100;
    const protectionFee = purchase_protection === true ? PROTECTION_FEE : 0;
    const totalAmount = Math.round((subtotalAfterDiscount + serviceFee + protectionFee) * 100) / 100;
    if (totalAmount <= 0) {
      await releaseAll();
      throw new Error('Valor inválido para pagamento PIX');
    }

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
      coupon_id: couponId,
      coupon_code: couponCode,
      discount_amount: discount,
      purchase_protection: protectionFee > 0,
      protection_fee: protectionFee,
      // De qual anúncio/campanha veio essa venda (se veio de algum)
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
    }).select().single();
    if (orderErr || !order) {
      await releaseAll();
      throw new Error(`Erro criando pedido: ${orderErr?.message}`);
    }

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItemsPayload.map((oi) => ({ ...oi, order_id: order.id })));
    if (itemsErr) {
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
      await releaseAll();
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
        ...(billing_address?.zip
          ? {
              address: {
                zip_code: billing_address.zip,
                street_name: billing_address.street,
                street_number: billing_address.number,
                neighborhood: billing_address.district,
                city: billing_address.city,
                federal_unit: billing_address.state,
              },
            }
          : {}),
      },
      description: `Ingresso: ${event.title}`,
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'PREMIERPASS',
      date_of_expiration: mpExpirationDate(5 * 60 * 1000),
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
      await releaseAll();
      throw new Error(mpResult.message || mpResult.cause?.[0]?.description || 'Erro no Mercado Pago');
    }

    const pixData = mpResult.point_of_interaction?.transaction_data;
    if (!pixData) {
      await releaseAll();
      throw new Error('Mercado Pago não retornou dados PIX');
    }

    await supabase.from('orders').update({
      payment_intent_id: String(mpResult.id),
      mp_payment_id: String(mpResult.id),
      pix_qr_code: pixData.qr_code,
      pix_qr_code_base64: pixData.qr_code_base64,
    }).eq('id', order.id);

    log('PIX gerado', { orderId: order.id, paymentId: mpResult.id, isSandbox, discount, protectionFee });

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
      discount_amount: discount,
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