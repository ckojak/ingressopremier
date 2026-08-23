import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
  unit_price?: number;
}

interface CheckoutRequest {
  event_id: string;
  items: CheckoutItem[];
  site_id?: string;
  customer_cpf?: string;
  customer_phone?: string;
}

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  max_per_order: number | null;
  is_active: boolean;
  event_id: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? `: ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-CHECKOUT] ${step}${detailsStr}`);
};

const getMercadoPagoCredentials = () => Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');

// Quebra um telefone BR (com ou sem +55, DDI, DDD, traços, espaços) em area_code + number pro formato do Mercado Pago
const parsePhone = (raw?: string | null): { area_code: string; number: string } | null => {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  if (digits.length < 10) return null;
  const area_code = digits.slice(0, 2);
  const number = digits.slice(2);
  return { area_code, number };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Reservas já feitas nesta chamada -- devolvidas se algo falhar no meio do caminho.
  const reserved: { ticket_type_id: string; quantity: number }[] = [];
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const releaseAll = async () => {
    for (const r of reserved) {
      await supabaseAdmin.rpc('release_tickets', { p_ticket_type_id: r.ticket_type_id, p_quantity: r.quantity });
    }
  };

  try {
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Usuário não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      logStep('Erro de autenticação', userError);
      throw new Error('Usuário não autenticado');
    }

    logStep('Usuário autenticado', { id: user.id, email: user.email });

    const { event_id, items, site_id, customer_cpf, customer_phone }: CheckoutRequest = await req.json();
    logStep('Request recebido', { event_id, items, site_id });

    if (!event_id || !items || items.length === 0) {
      throw new Error('Dados inválidos: event_id e items são obrigatórios');
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      logStep('Erro ao buscar evento', eventError);
      throw new Error('Evento não encontrado');
    }

    logStep('Evento encontrado', { title: event.title });

    const effectiveSiteId = 'premierpass';
    const mercadopagoAccessToken = getMercadoPagoCredentials();

    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado para o site: ' + effectiveSiteId);
    }

    const isSandbox = mercadopagoAccessToken.startsWith('TEST-');
    logStep('Ambiente detectado', {
      site: effectiveSiteId,
      ambiente: isSandbox ? 'SANDBOX' : 'PRODUÇÃO'
    });

    const ticketTypeIds = items.map(item => item.ticket_type_id);
    const { data: ticketTypes, error: ticketTypesError } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .in('id', ticketTypeIds);

    if (ticketTypesError || !ticketTypes) {
      logStep('Erro ao buscar tipos de ingresso', ticketTypesError);
      throw new Error('Tipos de ingresso não encontrados');
    }

    let subtotal = 0;
    const mpItems: {
      id: string;
      title: string;
      description: string;
      quantity: number;
      currency_id: string;
      unit_price: number;
    }[] = [];

    for (const item of items) {
      const ticketType = ticketTypes.find((tt: TicketType) => tt.id === item.ticket_type_id);
      if (!ticketType) {
        throw new Error(`Tipo de ingresso ${item.ticket_type_id} não encontrado`);
      }
      if (ticketType.event_id !== event_id || !ticketType.is_active) {
        throw new Error(`Ingresso indisponível: ${ticketType.name}`);
      }
      const maxPerOrder = ticketType.max_per_order || 10;
      if (item.quantity > maxPerOrder) {
        throw new Error(`Máximo de ${maxPerOrder} ingressos por pedido: ${ticketType.name}`);
      }

      // Reserva ATÔMICA: trava a linha do ticket_type, confere disponibilidade
      // e já incrementa quantity_sold numa única operação de banco -- impede
      // duas compras simultâneas de venderem o mesmo último ingresso.
      // (Antes, esse fluxo só conferia "quantity_available - quantity_sold" em
      // memória, sem travar nada -- por isso o Checkout Pro podia oversell.)
      const { data: reserveResult, error: reserveErr } = await supabaseAdmin
        .rpc('reserve_tickets', { p_ticket_type_id: ticketType.id, p_quantity: item.quantity })
        .single();

      if (reserveErr || !reserveResult?.success) {
        await releaseAll();
        throw new Error(`Ingresso esgotado: ${ticketType.name}`);
      }
      reserved.push({ ticket_type_id: ticketType.id, quantity: item.quantity });

      const unitPrice = Number(ticketType.price);
      subtotal += unitPrice * item.quantity;

      mpItems.push({
        id: ticketType.id,
        title: `${event.title} - ${ticketType.name}`,
        description: ticketType.description || `Ingresso para ${event.title}`,
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: unitPrice
      });
    }

    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100;
    if (totalAmount <= 0) {
      await releaseAll();
      throw new Error('Valor inválido para pagamento');
    }

    mpItems.push({
      id: 'service-fee',
      title: 'Taxa de Serviço (8%)',
      description: 'Taxa administrativa do processamento',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: serviceFee
    });

    logStep('Totais calculados', { subtotal, serviceFee, totalAmount });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle();

    const finalCpf = (customer_cpf || '').replace(/\D/g, '') || null;
    const finalPhoneRaw = customer_phone || profile?.phone || null;
    const finalName = profile?.full_name || user.email || 'Cliente';

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        event_id: event_id,
        site_id: effectiveSiteId,
        total_amount: totalAmount,
        service_fee: serviceFee,
        status: 'pending',
        payment_method: 'mercadopago',
        customer_name: finalName,
        customer_email: user.email,
        customer_phone: finalPhoneRaw,
        customer_cpf: finalCpf,
        payment_intent_id: null
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep('Erro ao criar pedido', orderError);
      await releaseAll();
      throw new Error('Erro ao criar pedido');
    }

    logStep('Pedido criado', { orderId: order.id });

    const orderItems = items.map(item => {
      const ticketType = ticketTypes.find((tt: TicketType) => tt.id === item.ticket_type_id);
      return {
        order_id: order.id,
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: Number(ticketType?.price ?? 0)
      };
    });

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      logStep('Erro ao criar itens do pedido', orderItemsError);
      await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', order.id);
      await releaseAll();
      throw new Error('Erro ao criar itens do pedido');
    }

    logStep('Itens do pedido criados');

    const origin = req.headers.get('origin') || 'https://premierpass.com.br';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    const [firstName, ...restName] = String(finalName).trim().split(' ');
    const surname = restName.join(' ') || 'Cliente';
    const parsedPhone = parsePhone(finalPhoneRaw);

    const payer: Record<string, unknown> = {
      email: user.email,
      name: firstName,
      surname,
    };
    if (parsedPhone) payer.phone = parsedPhone;
    if (finalCpf && finalCpf.length >= 11) {
      payer.identification = { type: 'CPF', number: finalCpf };
    }

    const preferenceData = {
      items: mpItems,
      payer,
      back_urls: {
        success: `${origin}/checkout/status?order_id=${order.id}&status=success`,
        failure: `${origin}/evento/${event_id}`,
        pending: `${origin}/checkout/status?order_id=${order.id}&status=pending`
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'PREMIERPASS',
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'bank_transfer' }
        ],
        installments: 12,
        default_installments: 1
      },
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    logStep('Criando preferência no Mercado Pago', {
      external_reference: order.id,
      payer_has_cpf: !!payer.identification,
      payer_has_phone: !!payer.phone,
      payment_methods: preferenceData.payment_methods
    });

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      logStep('Erro Mercado Pago', { status: mpResponse.status, error: errorData });
      await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', order.id);
      await releaseAll();
      throw new Error(`Erro ao criar preferência: ${errorData}`);
    }

    const preference = await mpResponse.json();

    const checkoutUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;

    logStep('Checkout configurado', {
      ambiente: isSandbox ? 'SANDBOX' : 'PRODUÇÃO',
      url: checkoutUrl
    });

    await supabaseAdmin
      .from('orders')
      .update({ payment_intent_id: preference.id })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        order_id: order.id,
        preference_id: preference.id,
        is_sandbox: isSandbox
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logStep('Erro geral', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});