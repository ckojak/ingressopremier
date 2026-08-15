/**
 * SECURITY: Server-side RPC functions for secure checkout processing
 * 
 * This file defines all the Supabase RPC function signatures and their expected behavior.
 * The actual implementations should be in your Supabase database as PostgreSQL functions.
 * 
 * Key Security Principles:
 * 1. All calculations happen on the server (backend)
 * 2. Database validates all constraints (inventory, coupon validity, pricing)
 * 3. Transactions are atomic (all-or-nothing)
 * 4. Row-level security (RLS) prevents unauthorized access
 */

import { supabase } from "@/integrations/supabase/client";

export interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
}

export interface CouponValidationRequest {
  coupon_code: string;
  event_id?: string;
  user_id: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  coupon_id?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  error?: string;
}

export interface PriceCalculationRequest {
  items: CheckoutItem[];
  coupon_id?: string;
  event_id: string;
  user_id: string;
}

export interface PriceCalculationResponse {
  subtotal: number; // in cents
  discount: number; // in cents
  service_fee: number; // in cents
  total: number; // in cents
  error?: string;
}

export interface InventoryCheckRequest {
  items: CheckoutItem[];
  user_id: string;
}

export interface InventoryCheckResponse {
  available: boolean;
  details: Array<{
    ticket_type_id: string;
    requested: number;
    available_quantity: number;
  }>;
  error?: string;
}

/**
 * SECURE_VALIDATE_COUPON
 * 
 * Backend RPC function that validates a coupon code with all security checks.
 * This prevents:
 * - Invalid coupon codes
 * - Expired coupons
 * - Usage limit exceeded
 * - Minimum purchase amount not met
 * - Coupon for wrong event
 * 
 * Implementation should:
 * 1. Query coupon by code (case-insensitive)
 * 2. Check all validity dates
 * 3. Check usage limits
 * 4. Verify event_id match
 * 5. Return coupon details or error
 */
export async function validateCouponSecure(
  request: CouponValidationRequest
): Promise<CouponValidationResponse> {
  try {
    const { data, error } = await supabase.rpc(
      "secure_validate_coupon",
      {
        p_code: request.coupon_code.trim().toUpperCase(),
        p_event_id: request.event_id || null,
        p_user_id: request.user_id,
      }
    );

    if (error) {
      console.error("Coupon validation error:", error);
      return {
        valid: false,
        error: "Cupom inválido ou expirado",
      };
    }

    if (!data || data.length === 0) {
      return {
        valid: false,
        error: "Cupom não encontrado",
      };
    }

    const coupon = data[0];

    return {
      valid: true,
      coupon_id: coupon.id,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    };
  } catch (error) {
    console.error("Coupon validation error:", error);
    return {
      valid: false,
      error: "Erro ao validar cupom",
    };
  }
}

/**
 * SECURE_CALCULATE_PRICE
 * 
 * Backend RPC function that calculates final price with all discounts.
 * This prevents price manipulation by ensuring:
 * 1. Inventory is available
 * 2. Coupon is valid and applied correctly
 * 3. Service fee is calculated correctly
 * 4. Total matches backend calculation
 * 
 * Implementation should:
 * 1. Lock ticket_type rows (FOR UPDATE)
 * 2. Validate inventory availability
 * 3. Calculate base subtotal from ticket prices
 * 4. Apply coupon discount if valid
 * 5. Calculate service fee
 * 6. Return complete price breakdown
 */
export async function calculatePriceSecure(
  request: PriceCalculationRequest
): Promise<PriceCalculationResponse> {
  try {
    const { data, error } = await supabase.rpc(
      "secure_calculate_price",
      {
        p_items: JSON.stringify(request.items),
        p_coupon_id: request.coupon_id || null,
        p_event_id: request.event_id,
        p_user_id: request.user_id,
      }
    );

    if (error) {
      console.error("Price calculation error:", error);
      return {
        subtotal: 0,
        discount: 0,
        service_fee: 0,
        total: 0,
        error: "Erro ao calcular preço",
      };
    }

    if (!data || data.length === 0) {
      return {
        subtotal: 0,
        discount: 0,
        service_fee: 0,
        total: 0,
        error: "Erro ao calcular preço",
      };
    }

    const result = data[0];

    return {
      subtotal: result.subtotal,
      discount: result.discount,
      service_fee: result.service_fee,
      total: result.total,
    };
  } catch (error) {
    console.error("Price calculation error:", error);
    return {
      subtotal: 0,
      discount: 0,
      service_fee: 0,
      total: 0,
      error: "Erro ao calcular preço",
    };
  }
}

/**
 * SECURE_CHECK_INVENTORY
 * 
 * Backend RPC function that atomically checks and reserves inventory.
 * This prevents overselling by:
 * 1. Locking ticket_type rows
 * 2. Checking current availability
 * 3. Preventing race conditions
 * 4. Reserving inventory for the order
 * 
 * Implementation should:
 * 1. Loop through items
 * 2. For each item, SELECT FROM ticket_types FOR UPDATE
 * 3. Check: quantity_sold + requested <= quantity_available
 * 4. Return detailed availability info
 */
export async function checkInventorySecure(
  request: InventoryCheckRequest
): Promise<InventoryCheckResponse> {
  try {
    const { data, error } = await supabase.rpc(
      "secure_check_inventory",
      {
        p_items: JSON.stringify(request.items),
        p_user_id: request.user_id,
      }
    );

    if (error) {
      console.error("Inventory check error:", error);
      return {
        available: false,
        details: [],
        error: "Erro ao verificar disponibilidade",
      };
    }

    if (!data || data.length === 0) {
      return {
        available: false,
        details: [],
        error: "Erro ao verificar disponibilidade",
      };
    }

    const result = data[0];

    return {
      available: result.all_available,
      details: result.details || [],
      error: result.error,
    };
  } catch (error) {
    console.error("Inventory check error:", error);
    return {
      available: false,
      details: [],
      error: "Erro ao verificar disponibilidade",
    };
  }
}

/**
 * SECURE_CREATE_ORDER
 * 
 * Backend RPC function that creates an order with complete transaction safety.
 * This is the critical function that:
 * 1. Reserves inventory atomically
 * 2. Applies coupon
 * 3. Calculates final price on server
 * 4. Creates order record
 * 5. Creates individual ticket records
 * 6. Logs the transaction for audit
 * 
 * Implementation should be a single PostgreSQL transaction:
 * - BEGIN
 * - UPDATE ticket_types (decrement quantity_available, increment quantity_sold)
 * - INSERT INTO orders
 * - INSERT INTO order_items
 * - INSERT INTO audit_logs
 * - COMMIT (or ROLLBACK on error)
 */
export interface CreateOrderRequest {
  items: CheckoutItem[];
  coupon_id?: string;
  event_id: string;
  user_id: string;
  payment_method: "pix" | "credit_card" | "stripe";
  payer_email: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id?: string;
  total_amount?: number;
  error?: string;
}

export async function createOrderSecure(
  request: CreateOrderRequest
): Promise<CreateOrderResponse> {
  try {
    const { data, error } = await supabase.rpc(
      "secure_create_order",
      {
        p_items: JSON.stringify(request.items),
        p_coupon_id: request.coupon_id || null,
        p_event_id: request.event_id,
        p_user_id: request.user_id,
        p_payment_method: request.payment_method,
        p_payer_email: request.payer_email,
      }
    );

    if (error) {
      console.error("Order creation error:", error);
      return {
        success: false,
        error: "Erro ao criar pedido. Tente novamente.",
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Erro ao criar pedido",
      };
    }

    const result = data[0];

    return {
      success: true,
      order_id: result.order_id,
      total_amount: result.total_amount,
    };
  } catch (error) {
    console.error("Order creation error:", error);
    return {
      success: false,
      error: "Erro ao criar pedido",
    };
  }
}
