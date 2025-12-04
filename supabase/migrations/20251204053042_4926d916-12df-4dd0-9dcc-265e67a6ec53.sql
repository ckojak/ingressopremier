-- Table for check-in staff members
CREATE TABLE public.checkin_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  access_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  last_access_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.checkin_staff ENABLE ROW LEVEL SECURITY;

-- Organizers can manage staff for their events
CREATE POLICY "Organizers can manage staff for own events"
ON public.checkin_staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = checkin_staff.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Staff can view their own access
CREATE POLICY "Staff can view own access"
ON public.checkin_staff
FOR SELECT
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can manage all staff
CREATE POLICY "Admins can manage all staff"
ON public.checkin_staff
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster lookups
CREATE INDEX idx_checkin_staff_event ON public.checkin_staff(event_id);
CREATE INDEX idx_checkin_staff_access_code ON public.checkin_staff(access_code);
CREATE INDEX idx_checkin_staff_email ON public.checkin_staff(email);

-- Add transfer_status to tickets to block tickets during transfer
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'none' CHECK (transfer_status IN ('none', 'pending', 'completed'));

-- Update tickets policy to allow staff to check in
CREATE POLICY "Staff can view and update tickets for their events"
ON public.tickets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.checkin_staff cs
    WHERE cs.event_id = tickets.event_id
    AND cs.is_active = true
    AND (cs.user_id = auth.uid() OR cs.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- Add policy for users to view pending transfers by their email
DROP POLICY IF EXISTS "Users can view transfers by email" ON public.ticket_transfers;
CREATE POLICY "Users can view transfers by email"
ON public.ticket_transfers
FOR SELECT
USING (
  to_user_email = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Add policy for users to update transfers where they are the recipient
DROP POLICY IF EXISTS "Recipients can update transfers" ON public.ticket_transfers;
CREATE POLICY "Recipients can update transfers"
ON public.ticket_transfers
FOR UPDATE
USING (
  to_user_email = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);