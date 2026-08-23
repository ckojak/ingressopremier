import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? `: ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK][${timestamp}] ${step}${detailsStr}`);
};

async function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): Promise<boolean> {
  if (!xSignature || !xRequestId) {
    logStep('Assinatura ou Request ID ausentes', { xSignature: !!xSignature, xRequestId: !!xRequestId });
    return false;
  }
  try {
    const parts: Record<string, string> = {};
    xSignature.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) parts[key.trim()] = value.trim();
    });
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) {
      logStep('Formato de assinatura inválido', { parts });
      return false;
    }
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(manifest));
    const calculatedSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    return calculatedSignature === v1;
  } catch (error) {
    logStep('Erro ao verificar assinatura', { error: String(error) });
    return false;
  }
}

const getMercadoPagoCredentials = () => ({
  accessToken: Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN'),
  webhookSecret: Deno.env.get('PREMIERPASS_MERCADOPAGO_WEBHOOK_SECRET'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    const body = await req.json();
    logStep('Webhook recebido', { type: body.type, action: body.action, data_id: body.data?.id });

    const { type, data } = body;
    if (type !== 'payment') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    const paymentId = data?.id;
    if (!paymentId) throw new Error('Payment ID não encontrado');
    const paymentIdStr = String(paymentId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const siteId = 'premierpass';
    const credentials = getMercadoPagoCredentials();
    if (!credentials.accessToken) {
      throw new Error(`MERCADOPAGO_ACCESS_TOKEN não configurado para site: ${siteId}`);
    }
    const isSandbox = credentials.accessToken.startsWith('TEST-');

    if (credentials.webhookSecret) {
      const dataId = body.data?.id?.toString() || '';
      const isValidSignature = await verifyWebhookSignature(xSignature, xRequestId, dataId, credentials.webhookSecret);
      if (!isValidSignature) {
        logStep('ALERTA DE SEGURANÇA: Assinatura de webhook inválida', { siteId });
        return new Response(JSON.stringify({ error: 'Assinatura inválida' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
        });
      }
    } else {
      logStep('AVISO: Webhook secret não configurado - verificação de assinatura desabilitada', { siteId });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
    });
    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`Erro ao buscar pagamento: ${errorText}`);
    }
    const payment = await paymentResponse.json();
    logStep('Detalhes do pagamento', {
      id: payment.id, status: payment.status, status_detail: payment.status_detail,
      external_reference: payment.external_reference, transaction_amount: payment.transaction_amount,
      live_mode: payment.live_mode
    });

    const orderId = payment.external_reference;
    if (!orderId) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();
    if (orderError || !order) throw new Error('Pedido não encontrado');

    const previousStatus = order.status;
    let newStatus = order.status;
    if (payment.status === 'approved') newStatus = 'paid';
    else if (payment.status === 'pending' || payment.status === 'in_process') newStatus = 'pending';
    else if (payment.status === 'rejected' || payment.status === 'cancelled') newStatus = 'cancelled';
    else if (payment.status === 'refunded' || payment.status === 'charged_back') newStatus = 'refunded';

    try {
      await supabaseClient.from('webhook_logs').insert({
        payment_id: paymentIdStr, order_id: order.id, site_id: order.site_id || siteId,
        payment_status: payment.status, event_type: type, amount: payment.transaction_amount,
        payer_email: payment.payer?.email ?? order.customer_email, is_sandbox: isSandbox,
        details: {
          status_detail: payment.status_detail, payment_method_id: payment.payment_method_id,
          payment_type_id: payment.payment_type_id, live_mode: payment.live_mode,
        },
      });
    } catch (logError) {
      logStep('Falha ao registrar webhook_log', { error: String(logError) });
    }

    if (newStatus !== previousStatus) {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: newStatus,
          payment_intent_id: paymentIdStr,
          mp_payment_id: paymentIdStr,
          payment_method: payment.payment_method_id ?? order.payment_method,
          paid_at: newStatus === 'paid' ? (payment.date_approved ?? new Date().toISOString()) : order.paid_at
        })
        .eq('id', orderId);
      if (updateError) throw new Error('Erro ao atualizar pedido');
      logStep('Status do pedido atualizado', { orderId, previousStatus, newStatus });

      // O estoque já foi reservado atomicamente (reserve_tickets) no momento em
      // que o Pix/cartão foi gerado -- então aqui NÃO incrementamos quantity_sold
      // de novo (isso duplicaria a contagem). Só devolvemos o estoque reservado
      // se o pagamento acabou não indo pra frente.
      if ((newStatus === 'cancelled' || newStatus === 'refunded') && previousStatus === 'pending') {
        for (const item of order.order_items) {
          const { error: releaseError } = await supabaseClient.rpc('release_tickets', {
            p_ticket_type_id: item.ticket_type_id,
            p_quantity: item.quantity,
          });
          if (releaseError) {
            logStep('Erro ao liberar estoque reservado', { item, releaseError });
          }
        }
        logStep('Estoque reservado devolvido (pagamento não confirmado)', { orderId });
      }
    }

    if (newStatus === 'paid') {
      const { data: existingTickets, error: checkError } = await supabaseClient
        .from('tickets')
        .select('id')
        .in('order_item_id', order.order_items.map((item: any) => item.id))
        .limit(1);
      if (checkError) logStep('Erro ao verificar ingressos existentes', checkError);

      if (existingTickets && existingTickets.length > 0) {
        logStep('Ingressos já existem para este pedido, pulando criação', { existingCount: existingTickets.length });
      } else {
        logStep('Gerando ingressos para pedido aprovado', { orderItemsCount: order.order_items.length });

        for (const item of order.order_items) {
          for (let i = 0; i < item.quantity; i++) {
            const ticketCode = generateTicketCode();
            const { data: newTicket, error: ticketError } = await supabaseClient
              .from('tickets')
              .insert({
                order_item_id: item.id,
                user_id: order.user_id,
                event_id: order.event_id,
                ticket_type_id: item.ticket_type_id,
                ticket_code: ticketCode,
                qr_code: ticketCode,
                status: 'active',
                site_id: order.site_id || siteId,
                attendee_name: order.customer_name ?? null,
                attendee_email: order.customer_email ?? null,
                recipient_name: order.customer_name ?? null,
                recipient_email: order.customer_email ?? null,
              })
              .select()
              .single();
            if (ticketError) {
              logStep('Erro ao criar ingresso', { error: ticketError, item, ticketCode });
            } else {
              logStep('Ingresso criado', { ticketId: newTicket?.id, ticketCode });
            }
          }
          // NOTA: quantity_sold NÃO é incrementado aqui -- já foi reservado
          // atomicamente por reserve_tickets() na hora de gerar o Pix/cobrar o cartão.
        }

        if (order.coupon_id) {
          const { data: couponRow } = await supabaseClient
            .from('coupons').select('used_count').eq('id', order.coupon_id).maybeSingle();
          if (couponRow) {
            await supabaseClient.from('coupons')
              .update({ used_count: (couponRow.used_count || 0) + 1 })
              .eq('id', order.coupon_id);
            logStep('Uso do cupom registrado', { couponId: order.coupon_id });
          }
        }

        logStep('Ingressos gerados com sucesso');
        try {
          await supabaseClient.functions.invoke('send-ticket-email', { body: { orderId } });
          logStep('Email de confirmação enviado');
        } catch (emailError) {
          logStep('Erro ao enviar email', emailError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logStep('Erro geral', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});

function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}