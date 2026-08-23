import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // ── Autenticação obrigatória: só admin ou o organizador dono do evento ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) throw new Error('Não autorizado');

    const { order_id } = await req.json();
    if (!order_id) throw new Error('order_id é obrigatório');

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, mp_payment_id, total_amount, event_id, events(organizer_id)')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) throw new Error('Pedido não encontrado');

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const isOrganizer = (order as any).events?.organizer_id === user.id;
    if (!isAdmin && !isOrganizer) throw new Error('Não autorizado a reembolsar este pedido');

    if (order.status !== 'paid') throw new Error('Só é possível reembolsar pedidos pagos');
    if (!order.mp_payment_id) throw new Error('Pedido sem pagamento associado no Mercado Pago');

    const accessToken = Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) throw new Error('Mercado Pago não configurado');

    // ── Reembolso real, direto na API do Mercado Pago ──
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${order.mp_payment_id}/refunds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `refund-${order.id}`,
        },
      }
    );

    if (!mpResponse.ok) {
      const mpError = await mpResponse.json().catch(() => ({}));
      console.error('Mercado Pago refund error:', mpError);
      throw new Error(mpError?.message || 'Erro ao reembolsar no Mercado Pago');
    }

    // ── Marca como reembolsado com "compare-and-swap": o .eq('status','paid')
    //    garante que só UM caminho (aqui ou o webhook) muda o status. Quem mudar
    //    é quem devolve o estoque -- assim nunca devolvemos em dobro. ──
    const { data: updatedRows } = await supabase
      .from('orders')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refunded_by: user.id,
      })
      .eq('id', order.id)
      .eq('status', 'paid')
      .select('id');

    const fuiEuQueMudei = Array.isArray(updatedRows) && updatedRows.length > 0;

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, ticket_type_id, quantity')
      .eq('order_id', order.id);

    const orderItemIds = (orderItems || []).map((oi) => oi.id);
    if (orderItemIds.length > 0) {
      await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .in('order_item_id', orderItemIds);
    }

    // ── Devolve o estoque ao lote. Antes isso NÃO acontecia: cada estorno
    //    queimava um lugar pra sempre e você deixava de vender um ingresso livre. ──
    if (fuiEuQueMudei) {
      for (const oi of (orderItems || [])) {
        if (!oi.ticket_type_id || !oi.quantity) continue;
        const { error: releaseError } = await supabase.rpc('release_tickets', {
          p_ticket_type_id: oi.ticket_type_id,
          p_quantity: oi.quantity,
        });
        if (releaseError) {
          console.error('Erro ao devolver estoque no estorno:', { oi, releaseError });
        }
      }
      console.log('Estoque devolvido ao lote apos estorno:', { orderId: order.id });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('refund-order error:', error?.message);
    return new Response(JSON.stringify({ error: error?.message || 'Erro desconhecido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});