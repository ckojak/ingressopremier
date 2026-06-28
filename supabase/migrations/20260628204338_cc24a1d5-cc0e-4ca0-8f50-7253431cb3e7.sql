
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'completed';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS website TEXT;

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.coupons c
SET organizer_id = e.organizer_id
FROM public.events e
WHERE c.event_id = e.id AND c.organizer_id IS NULL;

ALTER TABLE public.checkin_staff
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;

ALTER TABLE public.checkin_staff
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.ticket_transfers
  ALTER COLUMN to_email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _code TEXT;
BEGIN
  LOOP
    _code := upper(substring(replace(gen_random_uuid()::text,'-',''),1,12));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.tickets WHERE ticket_code = _code);
  END LOOP;
  RETURN _code;
END; $$;

REVOKE ALL ON FUNCTION public.generate_ticket_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_ticket_code() TO authenticated, service_role;
