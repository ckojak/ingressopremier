import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
}

interface CheckoutRequest {
  event_id: string;
  items: CheckoutItem[];
  site_id?: string; // Site identifier for multi-tenant payment isolation
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
}

// Get Mercado Pago credentials based on site_id
const getMercadoPagoCredentials = (siteId: string) => {
  if (siteId === 'premierpass') {
    const token = Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
    if (token) {
      console.log("Using PremierPass Mercado Pago credentials");
      return token;
    }
  }
  // Default to Quintal credentials
  console.log("Using Quintal (default) Mercado Pago credentials");
  return Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
};

serve(async (req) => {
  console.log("=== Create PIX Payment Function Started ===");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error('Authentication failed');
    }

    console.log("User authenticated:", user.id);

    const body: CheckoutRequest = await req.json();
    const { event_id, items, site_id } = body;

    console.log("Request body:", JSON.stringify(body));

    if (!event_id || !items || items.length === 0) {
      throw new Error('Invalid request: event_id and items required');
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      console.error("Event error:", eventError);
      throw new Error('Event not found');
    }

    console.log("Event found:", event.title);

    // Determine site_id from event or request
    const effectiveSiteId = site_id || event.site_id || 'quintal';
    const mpAccessToken = getMercadoPagoCredentials(effectiveSiteId);
    
    if (!mpAccessToken) {
      console.error("Mercado Pago access token not configured for site:", effectiveSiteId);
      throw new Error('Mercado Pago access token not configured');
    }

    // Get ticket types and validate availability
    const ticketTypeIds = items.map(item => item.ticket_type_id);
    const { data: ticketTypes, error: ticketError } = await supabase
      .from('ticket_types')
      .select('*')
      .in('id', ticketTypeIds);

    if (ticketError || !ticketTypes) {
      console.error("Ticket types error:", ticketError);
      throw new Error('Ticket types not found');
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems: { ticket_type_id: string; quantity: number; unit_price: number }[] = [];

    for (const item of items) {
      const ticketType = ticketTypes.find((tt: TicketType) => tt.id === item.ticket_type_id);
      if (!ticketType) {
        throw new Error(`Ticket type ${item.ticket_type_id} not found`);
      }

      const available = ticketType.quantity_available - ticketType.quantity_sold;
      if (item.quantity > available) {
        throw new Error(`Not enough tickets available for ${ticketType.name}`);
      }

      subtotal += ticketType.price * item.quantity;
      orderItems.push({
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: ticketType.price
      });
    }

    // Calculate fees (8% service fee)
    const serviceFeePercentage = 0.08;
    const serviceFee = Math.round(subtotal * serviceFeePercentage * 100) / 100;
    const totalAmount = subtotal + serviceFee;

    console.log("Order totals - Subtotal:", subtotal, "Service Fee:", serviceFee, "Total:", totalAmount);

    // Get user profile for payer info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, cpf')
      .eq('id', user.id)
      .single();

    // Create pending order with site_id for multi-tenant isolation
    console.log("Creating order with data:", {
      user_id: user.id,
      event_id: event_id,
      site_id: effectiveSiteId,
      status: 'pending',
      total_amount: totalAmount
    });

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        event_id: event_id,
        site_id: effectiveSiteId,
        status: 'pending',
        total_amount: totalAmount
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error details:", JSON.stringify(orderError));
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    if (!order) {
      console.error("Order is null after insert");
      throw new Error('Failed to create order: no data returned');
    }

    console.log("Order created:", order.id);

    // Create order items
    const orderItemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    console.log("Creating order items:", JSON.stringify(orderItemsToInsert));

    const { data: createdItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert)
      .select();

    if (itemsError) {
      console.error("Order items error:", JSON.stringify(itemsError));
      // Don't throw - continue with PIX creation but log the error
    } else {
      console.log("Order items created:", JSON.stringify(createdItems));
    }

    // Create PIX payment via Mercado Pago API
    const totalCents = Math.round(totalAmount * 100);
    
    const paymentData = {
      transaction_amount: totalAmount,
      payment_method_id: "pix",
      payer: {
        email: user.email,
        first_name: profile?.full_name?.split(' ')[0] || 'Cliente',
        last_name: profile?.full_name?.split(' ').slice(1).join(' ') || '',
        identification: profile?.cpf ? {
          type: "CPF",
          number: profile.cpf.replace(/\D/g, '')
        } : undefined
      },
      description: `Ingressos - ${event.title}`,
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`
    };

    console.log("Creating PIX payment:", JSON.stringify(paymentData));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id
      },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", JSON.stringify(mpResult));
      
      // Delete the order if payment creation failed
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      
      throw new Error(`Payment creation failed: ${mpResult.message || 'Unknown error'}`);
    }

    console.log("PIX payment created:", mpResult.id);

    // Update order with payment ID
    await supabase
      .from('orders')
      .update({ 
        mp_preference_id: mpResult.id.toString(),
        mp_payment_id: mpResult.id.toString()
      })
      .eq('id', order.id);

    // Extract PIX data
    const pixData = mpResult.point_of_interaction?.transaction_data;
    
    if (!pixData) {
      console.error("No PIX data in response:", JSON.stringify(mpResult));
      throw new Error('PIX data not available');
    }

    const isSandbox = mpAccessToken.startsWith('TEST-');

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      payment_id: mpResult.id,
      pix_qr_code: pixData.qr_code,
      pix_qr_code_base64: pixData.qr_code_base64,
      pix_copy_paste: pixData.qr_code,
      expiration_date: mpResult.date_of_expiration,
      total_amount: totalAmount,
      is_sandbox: isSandbox
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
