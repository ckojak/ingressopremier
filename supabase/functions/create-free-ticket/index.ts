import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-FREE-TICKET] ${step}${details ? `: ${JSON.stringify(details)}` : ''}`);

// Valida CPF (11 dígitos + dígitos verificadores). Rejeita sequências repetidas (111.111.111-11 etc).
const isValidCpf = (raw: unknown): boolean => {
  const cpf = String(raw ?? '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const t of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(cpf[i]) * (t + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(cpf[t])) return false;
  }
  return true;
};

function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
    const { event_id, items, site_id } = body;
    let { customer_name, customer_cpf, customer_phone } = body;

    if (!event_id) throw new Error('Evento não informado');
    if (!Array.isArray(items) || items.length === 0) throw new Error('Carrinho vazio');

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

    // CPF obrigatório e válido (a regra não pode existir só na tela).
    if (!customer_cpf || !isValidCpf(customer_cpf)) throw new Error('CPF inválido ou não informado');

    const ticketTypeIds = normalizedItems.map((i) => i.ticket_type_id);
    const [{ data: event }, { data: ticketTypes, error: ttErr }] = await Promise.all([
      supabase.from('events').select('id, title, site_id').eq('id', event_id).maybeSingle(),
      supabase
        .from('ticket_types')
        .select('id, name, price, event_id, is_active, is_complimentary, max_per_order')
        .in('id', ticketTypeIds),
    ]);
    if (!event) throw new Error('Evento não encontrado');
    if (ttErr) throw new Error(`Erro ao buscar ingressos: ${ttErr.message}`);
    if (!ticketTypes || ticketTypes.length !== ticketTypeIds.length) throw new Error('Ingresso inválido');

    // Trava de segurança: essa função só gera ingresso sem cobrança para tipos
    // marcados como cortesia (is_complimentary=true) com preço zerado. Qualquer
    // outro tipo tem que passar pelo Pix/Cartão normalmente (create-pix-payment /
    // create-mercadopago-card-payment).
    for (const tt of ticketTypes) {
      if (!tt.is_complimentary || Number(tt.price) !== 0) {
        throw new Error(`"${tt.name}" não é um ingresso cortesia — use pagamento normal.`);
      }
    }

    // Limite por CPF: soma o que esse CPF já tem (pago ou pendente) do mesmo tipo
    // de ingresso e compara com o max_per_order do tipo. Roda ANTES de reservar
    // estoque, então não precisa devolver nada se bloquear.
    for (const item of normalizedItems) {
      const tt = ticketTypes.find((t: any) => t.id === item.ticket_type_id);
      if (!tt) continue;
      const limite = tt.max_per_order || 10;
      const { data: usados, error: usadosErr } = await supabase
        .from('order_items')
        .select('quantity, orders!inner(customer_cpf, status)')
        .eq('ticket_type_id', tt.id)
        .eq('orders.customer_cpf', customer_cpf)
        .in('orders.status', ['paid', 'pending']);
      if (usadosErr) throw new Error('Não foi possível validar o limite por CPF. Tente novamente.');
      const jaTem = (usados || []).reduce((s: number, r: any) => s + Number(r.quantity || 0), 0);
      if (jaTem + item.quantity > limite) {
        throw new Error(`Limite de ${limite} ingresso(s) por CPF atingido para "${tt.name}" (você já tem ${jaTem}).`);
      }
    }

    const orderItemsPayload: any[] = [];
    for (const item of normalizedItems) {
      const tt = ticketTypes.find((t: any) => t.id === item.ticket_type_id);
      if (!tt || tt.event_id !== event_id || !tt.is_active) throw new Error('Ingresso indisponível');
      const qty = item.quantity;
      const maxPerOrder = tt.max_per_order || 10;
      if (qty > maxPerOrder) throw new Error(`Máximo de ${maxPerOrder} ingressos por pedido: ${tt.name}`);

      const { data: reserveResult, error: reserveErr } = await supabase
        .rpc('reserve_tickets', { p_ticket_type_id: tt.id, p_quantity: qty })
        .single();

      if (reserveErr || !reserveResult?.success) {
        await releaseAll();
        throw new Error(`Ingresso esgotado: ${tt.name}`);
      }
      reserved.push({ ticket_type_id: tt.id, quantity: qty });

      orderItemsPayload.push({ ticket_type_id: tt.id, quantity: qty, unit_price: 0 });
    }

    const effectiveSiteId = site_id || event.site_id || 'premierpass';
    const nowIso = new Date().toISOString();

    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      user_id: user.id,
      event_id,
      site_id: effectiveSiteId,
      status: 'paid',
      payment_method: 'complimentary',
      total_amount: 0,
      service_fee: 0,
      customer_name,
      customer_email: user.email,
      customer_phone,
      customer_cpf,
      paid_at: nowIso,
    }).select().single();
    if (orderErr || !order) {
      await releaseAll();
      throw new Error(`Erro criando pedido: ${orderErr?.message}`);
    }

    const { data: insertedItems, error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItemsPayload.map((oi) => ({ ...oi, order_id: order.id })))
      .select();
    if (itemsErr || !insertedItems) {
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
      await releaseAll();
      throw new Error(`Erro criando itens: ${itemsErr?.message}`);
    }

    for (const item of insertedItems) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketCode = generateTicketCode();
        const { error: ticketError } = await supabase.from('tickets').insert({
          order_item_id: item.id,
          user_id: user.id,
          event_id,
          ticket_type_id: item.ticket_type_id,
          ticket_code: ticketCode,
          qr_code: ticketCode,
          status: 'active',
          is_complimentary: true,
          site_id: effectiveSiteId,
          attendee_name: customer_name,
          attendee_email: user.email,
          recipient_name: customer_name,
          recipient_email: user.email,
        });
        if (ticketError) {
          log('Erro ao criar ingresso cortesia', { error: ticketError, item, ticketCode });
        }
      }
    }

    log('Ingresso(s) cortesia gerado(s)', { orderId: order.id, userId: user.id, eventId: event_id });

    try {
      await supabase.functions.invoke('send-ticket-email', { body: { orderId: order.id } });
      log('Email de confirmação enviado', { orderId: order.id });
    } catch (emailError) {
      log('Erro ao enviar email', emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    log('erro', { message: error?.message });
    return new Response(JSON.stringify({ success: false, error: error?.message ?? 'Erro desconhecido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
