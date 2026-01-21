import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? `: ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK][${timestamp}] ${step}${detailsStr}`);
};

// Verify Mercado Pago webhook signature
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
    // Parse x-signature header: "ts=xxx,v1=xxx"
    const parts: Record<string, string> = {};
    xSignature.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        parts[key.trim()] = value.trim();
      }
    });

    const ts = parts['ts'];
    const v1 = parts['v1'];

    if (!ts || !v1) {
      logStep('Formato de assinatura inválido', { parts });
      return false;
    }

    // Build the manifest string as per Mercado Pago documentation
    // Format: id:data.id;request-id:x-request-id;ts:ts_value;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    // Generate HMAC SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const isValid = calculatedSignature === v1;
    logStep('Verificação de assinatura', { 
      isValid, 
      manifest: manifest.substring(0, 50) + '...',
      receivedSignature: v1.substring(0, 20) + '...',
      calculatedSignature: calculatedSignature.substring(0, 20) + '...'
    });

    return isValid;
  } catch (error) {
    logStep('Erro ao verificar assinatura', { error: String(error) });
    return false;
  }
}

// Get Mercado Pago credentials based on site_id
const getMercadoPagoCredentials = (siteId: string) => {
  // Use PremierPass credentials
  return {
    accessToken: Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN') || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'),
    webhookSecret: Deno.env.get('PREMIERPASS_MERCADOPAGO_WEBHOOK_SECRET') || Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get signature headers first
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    
    logStep('Headers de assinatura recebidos', { 
      hasSignature: !!xSignature, 
      hasRequestId: !!xRequestId 
    });

    const body = await req.json();
    logStep('Webhook recebido', { 
      type: body.type, 
      action: body.action,
      data_id: body.data?.id
    });

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

    // Create Supabase client to look up order and determine site_id
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, try to find the order by mp_payment_id to determine site_id
    const { data: orderByPaymentId } = await supabaseClient
      .from('orders')
      .select('site_id')
      .or(`mp_payment_id.eq.${paymentId},payment_intent_id.eq.${paymentId}`)
      .limit(1)
      .single();

    // Determine site_id from order or default to premierpass
    const siteId = orderByPaymentId?.site_id || 'premierpass';
    const credentials = getMercadoPagoCredentials(siteId);

    logStep('Site identificado', { siteId, hasCredentials: !!credentials.accessToken });

    if (!credentials.accessToken) {
      throw new Error(`MERCADOPAGO_ACCESS_TOKEN não configurado para site: ${siteId}`);
    }

    // Detectar modo de ambiente
    const isSandbox = credentials.accessToken.startsWith('TEST-');
    logStep('Ambiente detectado', { 
      siteId,
      isSandbox, 
      environment: isSandbox ? 'SANDBOX' : 'PRODUÇÃO',
      webhookSecretConfigured: !!credentials.webhookSecret
    });

    // Verify webhook signature if secret is configured
    if (credentials.webhookSecret) {
      const dataId = body.data?.id?.toString() || '';
      const isValidSignature = await verifyWebhookSignature(xSignature, xRequestId, dataId, credentials.webhookSecret);
      
      if (!isValidSignature) {
        logStep('ALERTA DE SEGURANÇA: Assinatura de webhook inválida - possível tentativa de fraude', { siteId });
        return new Response(JSON.stringify({ error: 'Assinatura inválida' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        });
      }
      
      logStep('Assinatura do webhook verificada com sucesso', { siteId });
    } else {
      logStep('AVISO: Webhook secret não configurado - verificação de assinatura desabilitada', { siteId });
    }

    logStep('Buscando detalhes do pagamento', { paymentId, siteId });

    // Buscar detalhes do pagamento no Mercado Pago usando credenciais do site correto
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`
      }
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      logStep('Erro ao buscar pagamento', { error: errorText, siteId });
      throw new Error(`Erro ao buscar pagamento: ${errorText}`);
    }

    const payment = await paymentResponse.json();
    logStep('Detalhes do pagamento', { 
      id: payment.id, 
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method_id: payment.payment_method_id,
      payment_type_id: payment.payment_type_id,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
      currency_id: payment.currency_id,
      payer_email: payment.payer?.email,
      date_created: payment.date_created,
      date_approved: payment.date_approved,
      live_mode: payment.live_mode
    });

    const orderId = payment.external_reference;
    if (!orderId) {
      logStep('Order ID não encontrado no external_reference');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Reusar supabaseClient já criado anteriormente

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

    logStep('Pedido encontrado', { 
      orderId, 
      currentStatus: order.status,
      orderItemsCount: order.order_items?.length || 0,
      orderItems: order.order_items
    });

    // Atualizar status baseado no pagamento
    let newStatus = order.status;
    
    if (payment.status === 'approved') {
      newStatus = 'paid';
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      newStatus = 'pending';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      newStatus = 'cancelled';
    }

    // Atualizar status se diferente
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
    }

    // Se aprovado, gerar ingressos (independente se o status mudou ou não)
    if (newStatus === 'paid') {
      // Verificar se já existem ingressos para este pedido
      const { data: existingTickets, error: checkError } = await supabaseClient
        .from('tickets')
        .select('id')
        .in('order_item_id', order.order_items.map((item: any) => item.id))
        .limit(1);

      if (checkError) {
        logStep('Erro ao verificar ingressos existentes', checkError);
      }

      if (existingTickets && existingTickets.length > 0) {
        logStep('Ingressos já existem para este pedido, pulando criação', { 
          existingCount: existingTickets.length 
        });
      } else {
        logStep('Gerando ingressos para pedido aprovado', {
          orderItemsCount: order.order_items.length,
          orderItems: order.order_items
        });

        for (const item of order.order_items) {
          for (let i = 0; i < item.quantity; i++) {
            // Gerar código único do ingresso
            const ticketCode = generateTicketCode();

            const { data: newTicket, error: ticketError } = await supabaseClient
              .from('tickets')
              .insert({
                order_item_id: item.id,
                user_id: order.user_id,
                event_id: order.event_id,
                ticket_type_id: item.ticket_type_id,
                ticket_code: ticketCode,
              })
              .select()
              .single();

            if (ticketError) {
              logStep('Erro ao criar ingresso', { 
                error: ticketError,
                item: item,
                ticketCode: ticketCode
              });
            } else {
              logStep('Ingresso criado', { ticketId: newTicket?.id, ticketCode });
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
