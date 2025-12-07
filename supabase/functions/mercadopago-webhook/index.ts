import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? `: ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
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

    const body = await req.json();
    logStep('Webhook recebido', body);

    // Mercado Pago envia notificações com type e data.id
    const { type, data } = body;

    if (type !== 'payment') {
      logStep('Tipo de notificação ignorado', { type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      throw new Error('Payment ID não encontrado');
    }

    logStep('Buscando detalhes do pagamento', { paymentId });

    // Buscar detalhes do pagamento no Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`
      }
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      logStep('Erro ao buscar pagamento', { error: errorText });
      throw new Error(`Erro ao buscar pagamento: ${errorText}`);
    }

    const payment = await paymentResponse.json();
    logStep('Detalhes do pagamento', { 
      id: payment.id, 
      status: payment.status, 
      external_reference: payment.external_reference 
    });

    const orderId = payment.external_reference;
    if (!orderId) {
      logStep('Order ID não encontrado no external_reference');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar pedido
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logStep('Pedido não encontrado', { orderId, error: orderError });
      throw new Error('Pedido não encontrado');
    }

    logStep('Pedido encontrado', { orderId, currentStatus: order.status });

    // Atualizar status baseado no pagamento
    let newStatus = order.status;
    
    if (payment.status === 'approved') {
      newStatus = 'paid';
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      newStatus = 'pending';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      newStatus = 'cancelled';
    }

    if (newStatus !== order.status) {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ 
          status: newStatus,
          payment_intent_id: payment.id.toString()
        })
        .eq('id', orderId);

      if (updateError) {
        logStep('Erro ao atualizar pedido', updateError);
        throw new Error('Erro ao atualizar pedido');
      }

      logStep('Status do pedido atualizado', { orderId, newStatus });

      // Se aprovado, gerar ingressos
      if (newStatus === 'paid' && order.status !== 'paid') {
        logStep('Gerando ingressos para pedido aprovado');

        for (const item of order.order_items) {
          for (let i = 0; i < item.quantity; i++) {
            // Gerar código único do ingresso
            const ticketCode = generateTicketCode();

            const { error: ticketError } = await supabaseClient
              .from('tickets')
              .insert({
                order_item_id: item.id,
                user_id: order.user_id,
                event_id: order.event_id,
                ticket_type_id: item.ticket_type_id,
                ticket_code: ticketCode,
              });

            if (ticketError) {
              logStep('Erro ao criar ingresso', ticketError);
            }
          }

          // Atualizar quantidade vendida
          const { data: ticketTypeData } = await supabaseClient
            .from('ticket_types')
            .select('quantity_sold')
            .eq('id', item.ticket_type_id)
            .single();

          await supabaseClient
            .from('ticket_types')
            .update({ quantity_sold: (ticketTypeData?.quantity_sold || 0) + item.quantity })
            .eq('id', item.ticket_type_id);
        }

        logStep('Ingressos gerados com sucesso');

        // Enviar email de confirmação
        try {
          await supabaseClient.functions.invoke('send-ticket-email', {
            body: { orderId }
          });
          logStep('Email de confirmação enviado');
        } catch (emailError) {
          logStep('Erro ao enviar email', emailError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

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

function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
