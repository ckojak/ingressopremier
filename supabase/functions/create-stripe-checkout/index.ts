import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? `: ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não configurado");
    }

    logStep("Iniciando checkout Stripe");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Usuário não autenticado");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      logStep("Erro de autenticação", userError);
      throw new Error("Usuário não autenticado");
    }

    logStep("Usuário autenticado", { id: user.id, email: user.email });

    const { event_id, items }: CheckoutRequest = await req.json();
    logStep("Request recebido", { event_id, items });

    if (!event_id || !items || items.length === 0) {
      throw new Error("Dados inválidos: event_id e items são obrigatórios");
    }

    // Buscar evento
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      logStep("Erro ao buscar evento", eventError);
      throw new Error("Evento não encontrado");
    }

    logStep("Evento encontrado", { title: event.title });

    // Buscar tipos de ingresso
    const ticketTypeIds = items.map(item => item.ticket_type_id);
    const { data: ticketTypes, error: ticketTypesError } = await supabaseAdmin
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds);

    if (ticketTypesError || !ticketTypes) {
      logStep("Erro ao buscar tipos de ingresso", ticketTypesError);
      throw new Error("Tipos de ingresso não encontrados");
    }

    // Verificar disponibilidade
    for (const item of items) {
      const ticketType = ticketTypes.find(tt => tt.id === item.ticket_type_id);
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
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      const ticketType = ticketTypes.find(tt => tt.id === item.ticket_type_id);
      if (!ticketType) continue;

      const itemTotal = item.unit_price * item.quantity;
      subtotal += itemTotal;

      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
            description: ticketType.description || `Ingresso para ${event.title}`,
          },
          unit_amount: Math.round(item.unit_price * 100), // Stripe usa centavos
        },
        quantity: item.quantity,
      });
    }

    // Taxas: 8% serviço + 5% plataforma
    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + serviceFee + platformFee;

    // Adicionar taxas como itens
    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: {
          name: "Taxa de Serviço (8%)",
          description: "Taxa administrativa do processamento",
        },
        unit_amount: Math.round(serviceFee * 100),
      },
      quantity: 1,
    });

    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: {
          name: "Taxa da Plataforma (5%)",
          description: "Taxa da plataforma PremierPass",
        },
        unit_amount: Math.round(platformFee * 100),
      },
      quantity: 1,
    });

    logStep("Totais calculados", { subtotal, serviceFee, platformFee, totalAmount });

    // Criar pedido pendente
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        event_id: event_id,
        total_amount: totalAmount,
        status: "pending",
        payment_intent_id: null,
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep("Erro ao criar pedido", orderError);
      throw new Error("Erro ao criar pedido");
    }

    logStep("Pedido criado", { orderId: order.id });

    // Criar itens do pedido
    const orderItems = items.map(item => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      logStep("Erro ao criar itens do pedido", orderItemsError);
      throw new Error("Erro ao criar itens do pedido");
    }

    logStep("Itens do pedido criados");

    // Inicializar Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Verificar se cliente já existe
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://premierpass.com.br";

    // Criar sessão de checkout com PIX habilitado
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: lineItems,
      mode: "payment",
      payment_method_types: ["card", "boleto", "pix"],
      success_url: `${origin}/pagamento-sucesso-stripe?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/evento/${event_id}?payment=canceled`,
      metadata: {
        order_id: order.id,
        event_id: event_id,
        user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          event_id: event_id,
        },
      },
      locale: "pt-BR",
    });

    logStep("Sessão Stripe criada", { sessionId: session.id, url: session.url });

    // Atualizar pedido com session ID
    await supabaseAdmin
      .from("orders")
      .update({ payment_intent_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        order_id: order.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logStep("Erro geral", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
