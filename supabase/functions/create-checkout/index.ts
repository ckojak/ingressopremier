import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

interface CheckoutItem {
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
}

interface CheckoutRequest {
  eventId: string;
  items: CheckoutItem[];
  serviceFee?: number;
}

const SERVICE_FEE_PERCENTAGE = 0.08; // 8% taxa de serviço

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { eventId, items } = await req.json() as CheckoutRequest;
    if (!eventId || !items || items.length === 0) {
      throw new Error("Invalid request: eventId and items are required");
    }
    logStep("Request parsed", { eventId, itemsCount: items.length });

    // Fetch event details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, title, organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) throw new Error("Event not found");
    logStep("Event fetched", { eventTitle: event.title });

    // Verify ticket types and availability
    const ticketTypeIds = items.map(item => item.ticketTypeId);
    const { data: ticketTypes, error: ticketError } = await supabaseClient
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds)
      .eq("event_id", eventId)
      .eq("is_active", true);

    if (ticketError || !ticketTypes) throw new Error("Failed to fetch ticket types");
    
    // Validate each item
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItems: Array<{ ticketTypeId: string; quantity: number; unitPrice: number; name: string }> = [];

    for (const item of items) {
      const ticketType = ticketTypes.find(t => t.id === item.ticketTypeId);
      if (!ticketType) throw new Error(`Ticket type ${item.ticketTypeId} not found`);
      
      const available = ticketType.quantity_available - (ticketType.quantity_sold || 0);
      if (item.quantity > available) {
        throw new Error(`Not enough tickets available for ${ticketType.name}`);
      }
      
      const maxPerOrder = ticketType.max_per_order || 10;
      if (item.quantity > maxPerOrder) {
        throw new Error(`Maximum ${maxPerOrder} tickets per order for ${ticketType.name}`);
      }

      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
            description: ticketType.description || undefined,
          },
          unit_amount: Math.round(Number(ticketType.price) * 100), // Convert to cents
        },
        quantity: item.quantity,
      });

      orderItems.push({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPrice: Number(ticketType.price),
        name: ticketType.name,
      });
    }

    // Add service fee line item
    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const serviceFee = subtotal * SERVICE_FEE_PERCENTAGE;
    
    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: {
          name: "Taxa de Serviço",
          description: "Taxa administrativa (8%)",
        },
        unit_amount: Math.round(serviceFee * 100),
      },
      quantity: 1,
    });

    logStep("Line items prepared", { count: lineItems.length, serviceFee });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Calculate total (including service fee)
    const totalAmount = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + serviceFee;

    // Create pending order in database
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        event_id: eventId,
        total_amount: totalAmount,
        status: "pending",
        customer_email: user.email,
        customer_name: user.user_metadata?.full_name || user.email,
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep("Order creation failed", { error: orderError });
      throw new Error("Failed to create order");
    }
    logStep("Order created", { orderId: order.id });

    // Create order items
    const orderItemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      ticket_type_id: item.ticketTypeId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    const { error: orderItemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItemsToInsert);

    if (orderItemsError) {
      logStep("Order items creation failed", { error: orderItemsError });
      throw new Error("Failed to create order items");
    }
    logStep("Order items created");

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "https://rbkuplzntpayendbfzud.lovableproject.com";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      payment_method_types: ["card", "pix"],
      success_url: `${origin}/pagamento-sucesso?order_id=${order.id}`,
      cancel_url: `${origin}/evento/${eventId}`,
      metadata: {
        order_id: order.id,
        event_id: eventId,
        user_id: user.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Update order with payment intent
    await supabaseClient
      .from("orders")
      .update({ payment_intent_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});