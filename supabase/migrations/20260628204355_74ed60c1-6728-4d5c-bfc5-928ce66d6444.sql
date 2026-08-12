
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE public.checkin_staff ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
