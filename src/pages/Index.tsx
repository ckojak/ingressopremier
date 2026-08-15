import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CartItemInput {
  ticket_type_id: string;
  quantity: number;
}

interface CardPaymentRequest {
  event_id: string;
  site_id?: string;
  items: CartItemInput[];
  token: string;
  payment_method_id: string;
  issuer_id?: string;
  installments: number;
  purchase_protection?: boolean;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    const body: CardPaymentRequest = await req.json();
    const { event_id, items, token, payment_method_id, issuer_id, installments, payer } = body;

    if (!event_id || !items?.length || !token || !payment_method_id || !payer?.email) {
      throw new Error('Dados de pagamento incompletos');
    }

    const accessToken = Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Mercado Pago não configurado');
    }

    let totalAmount = 0;
    const validatedItems: { ticket_type_id: string; quantity: number; unit_price: number; name: string }[] = [];

    for (const item of items) {
      const { data: ticketType, error: ttError } = await supabase
        .from('ticket_types')
        .select('id, name, price, quantity_available, quantity_sold, max_per_order, event_id')
        .eq('id', item.ticket_type_id)
        .eq('event_id', event_id)
        .single();

      if (ttError || !ticketType) {
        throw new Error('Tipo de ingresso não encontrado');
      }

      const available = ticketType.quantity_available - (ticketType.quantity_sold || 0);
      const maxPerOrder = ticketType.max_per_order || 10;

      if (item.quantity <= 0 || item.quantity > Math.min(available, maxPerOrder)) {
        throw new Error(`Quantidade inválida para ${ticketType.name}`);
      }

      const unitPrice = Number(ticketType.price);
      totalAmount += unitPrice * item.quantity;
      validatedItems.push({
        ticket_type_id: ticketType.id,
        quantity: item.quantity,
        unit_price: unitPrice,
        name: ticketType.name,
      });
    }

    if (payer.identification?.number) {
      const { count } = await supabase
        .from('orders')
        .select('order_items!inner(quantity)', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('customer_cpf', payer.identification.number)
        .eq('status', 'paid');

      const totalRequested = validatedItems.reduce((sum, i) => sum + i.quantity, 0);
      if ((count || 0) + totalRequested > 4) {
        throw new Error('Limite de 4 ingressos por CPF atingido para este evento');
      }
    }

    const SERVICE_FEE_PERCENTAGE = 0.08;
    const serviceFee = totalAmount * SERVICE_FEE_PERCENTAGE;
    // Taxa opcional de "Compra Protegida" (R$3) — calculada aqui no servidor,
    // nunca confiando em nenhum valor de total vindo do navegador. Antes esse
    // valor era mostrado na tela mas não entrava na cobrança real.
    const protectionFee = body.purchase_protection ? 3 : 0;
    const totalWithFee = totalAmount + serviceFee + protectionFee;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        event_id,
        site_id: body.site_id || 'premierpass',
        total_amount: totalWithFee,
        service_fee: serviceFee,
        status: 'pending',
        customer_email: payer.email,
        customer_cpf: payer.identification?.number || null,
        payment_method: 'card',
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Erro ao criar pedido');
    }

    const orderItemsToInsert = validatedItems.map((i) => ({
      order_id: order.id,
      ticket_type_id: i.ticket_type_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsError) {
      throw new Error('Erro ao registrar itens do pedido');
    }

    const idempotencyKey = crypto.randomUUID();
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: totalWithFee,
        token,
        description: `Pedido ${order.id} - PremierPass`,
        installments: installments || 1,
        payment_method_id,
        issuer_id: issuer_id || undefined,
        payer: {
          email: payer.email,
          identification: payer.identification || undefined,
        },
        external_reference: order.id,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      }),
    });

    const mpPayment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago payment error:', mpPayment);
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
      throw new Error(mpPayment?.message || 'Pagamento recusado');
    }

    await supabase
      .from('orders')
      .update({
        mp_payment_id: String(mpPayment.id),
        status: mpPayment.status === 'approved' ? 'paid'
          : mpPayment.status === 'rejected' ? 'failed'
          : 'pending',
      })
      .eq('id', order.id);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      payment_id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
