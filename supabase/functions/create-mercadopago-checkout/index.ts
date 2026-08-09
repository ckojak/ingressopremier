import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
  unit_price?: number; // ignorado: o preço é sempre buscado no banco
}

interface CheckoutRequest {
  event_id: string;
  items: CheckoutItem[];
  site_id?: string; // Site identifier for multi-tenant payment isolation
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

// Get Mercado Pago credentials based on site_id
const getMercadoPagoCredentials = (siteId: string) => {
  // Use PremierPass credentials
  const token = Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
  if (token) {
    logStep('Using PremierPass Mercado Pago credentials');
    return token;
  }
  // Fallback
  logStep('Using default Mercado Pago credentials');
  return Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cliente para autenticação (usando anon key)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Cliente para operações de banco (usando service role para bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    const { event_id, items, site_id }: CheckoutRequest = await req.json();
    logStep('Request recebido', { event_id, items, site_id });

    if (!event_id || !items || items.length === 0) {
      throw new Error('Dados inválidos: event_id e items são obrigatórios');
    }

    // Buscar detalhes do evento
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

    // Determine site_id from event or request - default to premierpass
    const effectiveSiteId = site_id || event.site_id || 'premierpass';
    const mercadopagoAccessToken = getMercadoPagoCredentials(effectiveSiteId);
    
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado para o site: ' + effectiveSiteId);
    }

    // Detectar ambiente
    const isSandbox = mercadopagoAccessToken.startsWith('TEST-');
    logStep('Ambiente detectado', { 
      site: effectiveSiteId,
      ambiente: isSandbox ? 'SANDBOX' : 'PRODUÇÃO' 
    });

    // Buscar tipos de ingresso
    const ticketTypeIds = items.map(item => item.ticket_type_id);
    const { data: ticketTypes, error: ticketTypesError } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .in('id', ticketTypeIds);

    if (ticketTypesError || !ticketTypes) {
      logStep('Erro ao buscar tipos de ingresso', ticketTypesError);
      throw new Error('Tipos de ingresso não encontrados');
    }

    // Verificar disponibilidade
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
      const stock = Number(ticketType.quantity_available || 0);
      const available = stock - (ticketType.quantity_sold || 0);
      if (stock > 0 && item.quantity > available) {
        throw new Error(`Quantidade insuficiente para ${ticketType.name}. Disponível: ${available}`);
      }
    }

    // Calcular totais
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
      if (!ticketType) continue;

      // Preço autoritativo vindo do banco (nunca confiar no cliente)
      const unitPrice = Number(ticketType.price);
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      mpItems.push({
        id: ticketType.id,
        title: `${event.title} - ${ticketType.name}`,
        description: ticketType.description || `Ingresso para ${event.title}`,
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: unitPrice
      });
    }

    // Taxa de serviço: 8% (igual ao exibido no frontend e no PIX)
    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100;
    if (totalAmount <= 0) throw new Error('Valor inválido para pagamento');

    mpItems.push({
      id: 'service-fee',
      title: 'Taxa de Serviço (8%)',
      description: 'Taxa administrativa do processamento',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: serviceFee
    });

    logStep('Totais calculados', { subtotal, serviceFee, totalAmount });

    // Buscar perfil do usuário (dados do comprador)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle();

    // Criar pedido pendente no Supabase com site_id para isolamento multi-tenant
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
        customer_name: profile?.full_name || user.email,
        customer_email: user.email,
        customer_phone: profile?.phone || null,
        payment_intent_id: null
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep('Erro ao criar pedido', orderError);
      throw new Error('Erro ao criar pedido');
    }

    logStep('Pedido criado', { orderId: order.id });

    // Criar itens do pedido
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
      throw new Error('Erro ao criar itens do pedido');
    }

    logStep('Itens do pedido criados');

    const origin = req.headers.get('origin') || 'https://adminpremierpass.lovable.app';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    // Criar preferência no Mercado Pago
    const preferenceData = {
      items: mpItems,
      payer: {
        email: user.email,
        name: profile?.full_name || user.email,
      },
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
          { id: 'ticket' }, // Exclui boleto
          { id: 'bank_transfer' } // Exclui PIX (será usado via checkout transparente)
        ],
        installments: 12,
        default_installments: 1
      },
      // Configuração específica para PIX - validade de 30 minutos
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    logStep('Criando preferência no Mercado Pago', { 
      external_reference: order.id,
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
      throw new Error(`Erro ao criar preferência: ${errorData}`);
    }

    const preference = await mpResponse.json();
    
    // SIMPLIFICADO: Usar apenas a detecção pelo prefixo do token (mais confiável)
    // Token TEST- = sandbox, Token APP_USR- = produção
    const checkoutUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;
    
    logStep('Checkout configurado', { 
      ambiente: isSandbox ? 'SANDBOX' : 'PRODUÇÃO',
      url: checkoutUrl
    });

    // Atualizar pedido com ID da preferência
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
