-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  min_purchase_amount NUMERIC DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  organizer_id UUID NOT NULL,
  UNIQUE(code, event_id)
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Admins can manage all coupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Organizers can manage their own coupons"
ON public.coupons
FOR ALL
USING (auth.uid() = organizer_id);

CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Create ticket_transfers table
CREATE TABLE public.ticket_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_email TEXT NOT NULL,
  to_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  transfer_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_transfers
CREATE POLICY "Users can view their own transfers"
ON public.ticket_transfers
FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create transfers for their tickets"
ON public.ticket_transfers
FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id AND
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_transfers.ticket_id 
    AND tickets.user_id = auth.uid()
    AND tickets.is_used = false
  )
);

CREATE POLICY "Users can update their transfers"
ON public.ticket_transfers
FOR UPDATE
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Add coupon_id to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Create index for faster coupon lookups
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_event_id ON public.coupons(event_id);
CREATE INDEX idx_ticket_transfers_ticket_id ON public.ticket_transfers(ticket_id);
CREATE INDEX idx_ticket_transfers_transfer_code ON public.ticket_transfers(transfer_code);