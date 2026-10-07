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

async function notificarAdminPainel(
  supabaseClient: ReturnType<typeof createClient>,
  params: {
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    orderId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabaseClient.from('admin_notifications').insert({
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      order_id: params.orderId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    logStep('Falha ao gravar admin_notifications', { error: String(e) });
  }
}

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

    const url = new URL(req.url);

    // Notificacoes no formato antigo (IPN: ?id=...&topic=payment) chegam em
    // paralelo ao webhook novo (?data.id=...&type=payment), sem a assinatura
    // x-signature valida. Antes eram barradas com 401 e o Mercado Pago ficava
    // reenviando por horas. O webhook assinado ja cuida de tudo, entao o IPN
    // legado so recebe 200 e nao processa nada.
    const isLegacyIpn = url.searchParams.has('topic') && !url.searchParams.has('data.id');
    if (isLegacyIpn) {
      logStep('IPN legado ignorado (o webhook assinado ja processa)', { topic: url.searchParams.get('topic') });
      return new Response(JSON.stringify({ received: true, ignored: 'ipn_legado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    let bodyJson: any = {};
    const rawBody = await req.text();
    if (rawBody) {
      try {
        bodyJson = JSON.parse(rawBody);
      } catch (_) {
        logStep('Corpo da requisição não é JSON válido (provável teste de IPN)', { rawBody });
      }
    }

    const type = bodyJson.type || url.searchParams.get('topic') || url.searchParams.get('type');
    const data = bodyJson.data || (url.searchParams.get('id') ? { id: url.searchParams.get('id') } : undefined);

    logStep('Webhook recebido', { type, action: bodyJson.action, data_id: data?.id, viaQueryString: !rawBody });

    if (type !== 'payment') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      logStep('Payment ID não encontrado no payload/query -- respondendo 200 mesmo assim');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }
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
      const dataId = paymentIdStr;
      const isValidSignature = await verifyWebhookSignature(xSignature, xRequestId, dataId, credentials.webhookSecret);
      if (!isValidSignature) {
        logStep('ALERTA DE SEGURANÇA: Assinatura de webhook inválida - REJEITADO', { siteId });
        return new Response(JSON.stringify({ error: 'Assinatura inválida' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
        });
      }
    } else {
      logStep('*** ATENCAO CONFIGURACAO *** PREMIERPASS_MERCADOPAGO_WEBHOOK_SECRET ausente: ' +
              'verificacao de assinatura DESLIGADA. Cadastre o secret no Supabase.', { siteId });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
    });
    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      logStep('Pagamento não encontrado na API do MP (esperado em teste de IPN)', { paymentId, errorText });
      return new Response(JSON.stringify({ received: true, note: 'payment_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
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

    if (payment.status === 'approved') {
      const valorPago = Number(payment.transaction_amount || 0);
      const valorEsperado = Number(order.total_amount || 0);
      if (valorPago + 0.01 < valorEsperado) {
        logStep('ALERTA DE SEGURANÇA: valor pago menor que o pedido - NÃO liberando ingresso', {
          orderId, valorPago, valorEsperado, paymentId: paymentIdStr
        });
        try {
          await supabaseClient.from('webhook_logs').insert({
            payment_id: paymentIdStr, order_id: order.id, site_id: order.site_id || siteId,
            payment_status: 'underpaid_rejeitado', event_type: type, amount: valorPago,
            payer_email: payment.payer?.email ?? order.customer_email, is_sandbox: isSandbox,
            details: { motivo: 'valor pago menor que total_amount', valorPago, valorEsperado },
          });
        } catch (_) { /* log é best-effort */ }

        await notificarAdminPainel(supabaseClient, {
          type: 'underpaid_suspect',
          severity: 'critical',
          title: 'Pagamento divergente -- ingresso NÃO liberado',
          message: `Pedido ${order.id}: pago R$ ${valorPago.toFixed(2)} de R$ ${valorEsperado.toFixed(2)} esperado. Possível manipulação no checkout.`,
          orderId: order.id,
          metadata: { paymentId: paymentIdStr, valorPago, valorEsperado, payerEmail: payment.payer?.email ?? order.customer_email },
        });

        return new Response(JSON.stringify({ received: true, ignored: 'valor_divergente' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
      }
    }

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

    if (payment.status === 'charged_back') {
      try {
        await supabaseClient.functions.invoke('send-notification', {
          body: {
            type: 'chargeback_alert',
            data: {
              orderId: order.id,
              paymentId: paymentIdStr,
              amount: payment.transaction_amount,
              customerEmail: order.customer_email,
            },
          },
        });
        logStep('Alerta de chargeback disparado', { orderId, paymentId: paymentIdStr });
      } catch (alertError) {
        logStep('Falha ao disparar alerta de chargeback', { error: String(alertError) });
      }

      await notificarAdminPainel(supabaseClient, {
        type: 'chargeback',
        severity: 'critical',
        title: 'Chargeback recebido do Mercado Pago',
        message: `Pedido ${order.id}: contestação de R$ ${Number(payment.transaction_amount || 0).toFixed(2)}. Prazo curto (3-5 dias úteis) para responder com evidência.`,
        orderId: order.id,
        metadata: { paymentId: paymentIdStr, amount: payment.transaction_amount, customerEmail: order.customer_email },
      });
    }

    // status_detail: sempre atualizado com o motivo mais recente do MP (aprovado,
    // pendente, ou o codigo exato da recusa tipo cc_rejected_high_risk), mesmo
    // quando o status geral (newStatus) nao mudou -- assim o admin sempre ve o
    // motivo mais atual, nao só na primeira vez que o pedido mudou de status.
    if (newStatus !== previousStatus) {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: newStatus,
          status_detail: payment.status_detail ?? order.status_detail,
          payment_intent_id: paymentIdStr,
          mp_payment_id: paymentIdStr,
          payment_method: payment.payment_method_id ?? order.payment_method,
          paid_at: newStatus === 'paid' ? (payment.date_approved ?? new Date().toISOString()) : order.paid_at
        })
        .eq('id', orderId);
      if (updateError) throw new Error('Erro ao atualizar pedido');
      logStep('Status do pedido atualizado', { orderId, previousStatus, newStatus });

      if ((newStatus === 'cancelled' || newStatus === 'refunded') &&
          (previousStatus === 'pending' || previousStatus === 'paid')) {
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
    } else if (payment.status_detail && payment.status_detail !== order.status_detail) {
      await supabaseClient
        .from('orders')
        .update({ status_detail: payment.status_detail })
        .eq('id', orderId);
    }

    if (newStatus === 'paid') {
      // ANTI-DUPLICIDADE: a criação dos ingressos acontece no banco, com trava por pedido.
      // Se o Mercado Pago mandar 2 avisos do mesmo pagamento ao mesmo tempo, um cria e o outro
      // recebe 0 -- então cupom e e-mail também não repetem.
      // Retorno: quantos ingressos ESTA chamada criou. -1 = função do banco indisponível (usa o fallback).
      let ingressosCriadosAgora = -1;
      const { data: criados, error: criarError } = await supabaseClient
        .rpc('create_tickets_for_order', { p_order_id: orderId });
      if (criarError) {
        logStep('Falha na criação atômica de ingressos -- usando o caminho antigo (fallback)', { error: criarError });
      } else {
        ingressosCriadosAgora = Number(criados ?? 0);
      }

      let gerouIngressos = ingressosCriadosAgora > 0;

      if (ingressosCriadosAgora === 0) {
        logStep('Ingressos já existem para este pedido, pulando criação');
      } else if (ingressosCriadosAgora > 0) {
        logStep('Ingressos criados (atômico)', { orderId, quantidade: ingressosCriadosAgora });
      } else {
        // FALLBACK: caminho antigo, só roda se a função do banco falhar.
        const { data: existingTickets, error: checkError } = await supabaseClient
          .from('tickets')
          .select('id')
          .in('order_item_id', order.order_items.map((item: any) => item.id))
          .limit(1);
        if (checkError) logStep('Erro ao verificar ingressos existentes', checkError);

        if (existingTickets && existingTickets.length > 0) {
          logStep('Ingressos já existem para este pedido, pulando criação', { existingCount: existingTickets.length });
        } else {
          logStep('Gerando ingressos para pedido aprovado (fallback)', { orderItemsCount: order.order_items.length });
          gerouIngressos = true;

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
          }
        }
      }

      if (gerouIngressos) {
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
