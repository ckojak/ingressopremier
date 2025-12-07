import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
}

interface CheckoutRequest {
  event_id: string;
  items: CheckoutItem[];
}

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  quantity_available: number;
  quantity_sold: number;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? `: ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
    }

    logStep('Iniciando checkout Mercado Pago');

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

    const { event_id, items }: CheckoutRequest = await req.json();
    logStep('Request recebido', { event_id, items });

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
      const available = ticketType.quantity_available - (ticketType.quantity_sold || 0);
      if (item.quantity > available) {
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

      const itemTotal = item.unit_price * item.quantity;
      subtotal += itemTotal;

      mpItems.push({
        id: ticketType.id,
        title: `${event.title} - ${ticketType.name}`,
        description: ticketType.description || `Ingresso para ${event.title}`,
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: item.unit_price
      });
    }

    // Taxas: 8% taxa de serviço + 5% taxa da plataforma
    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + serviceFee + platformFee;

    // Adicionar taxas como itens
    mpItems.push({
      id: 'service-fee',
      title: 'Taxa de Serviço (8%)',
      description: 'Taxa administrativa do processamento',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: serviceFee
    });

    mpItems.push({
      id: 'platform-fee',
      title: 'Taxa da Plataforma (5%)',
      description: 'Taxa da plataforma PremierPass',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: platformFee
    });

    logStep('Totais calculados', { subtotal, serviceFee, platformFee, totalAmount });

    // Criar pedido pendente no Supabase (usando admin client para bypass RLS)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        event_id: event_id,
        total_amount: totalAmount,
        status: 'pending',
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
        unit_price: item.unit_price
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

    // Buscar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, cpf, phone')
      .eq('id', user.id)
      .single();

    const origin = req.headers.get('origin') || 'https://premierpass.com.br';

    // Criar preferência no Mercado Pago
    const preferenceData = {
      items: mpItems,
      payer: {
        email: user.email,
        name: profile?.full_name || user.email,
        identification: profile?.cpf ? {
          type: 'CPF',
          number: profile.cpf.replace(/\D/g, '')
        } : undefined
      },
      back_urls: {
        success: `${origin}/pagamento-sucesso?order_id=${order.id}`,
        failure: `${origin}/evento/${event_id}?payment=failed`,
        pending: `${origin}/pagamento-pendente?order_id=${order.id}`
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'PREMIERPASS',
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1
      }
    };

    logStep('Criando preferência no Mercado Pago', { external_reference: order.id });

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
    logStep('Preferência criada', { id: preference.id, init_point: preference.init_point });

    // Atualizar pedido com ID da preferência
    await supabaseAdmin
      .from('orders')
      .update({ payment_intent_id: preference.id })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        checkout_url: preference.init_point,
        sandbox_url: preference.sandbox_init_point,
        order_id: order.id,
        preference_id: preference.id
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
