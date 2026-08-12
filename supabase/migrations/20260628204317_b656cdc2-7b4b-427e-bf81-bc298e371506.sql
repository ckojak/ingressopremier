
-- Add 'organizer' as alias to producer
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'organizer';

-- ticket_types extra columns
ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_per_order INTEGER NOT NULL DEFAULT 10;

UPDATE public.ticket_types SET quantity_available = quantity WHERE quantity_available = 0;

-- coupons extra
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS min_purchase_amount NUMERIC(10,2);

-- tickets extra
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendee_name TEXT,
  ADD COLUMN IF NOT EXISTS attendee_email TEXT,
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_status TEXT NOT NULL DEFAULT 'none';

-- ticket_transfers extra
ALTER TABLE public.ticket_transfers
  ADD COLUMN IF NOT EXISTS transfer_code TEXT UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text,'-',''),1,12)),
  ADD COLUMN IF NOT EXISTS to_user_email TEXT;

-- Allow self-insert of own role (client/producer/organizer only, never admin)
CREATE POLICY "roles_self_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role <> 'admin');
