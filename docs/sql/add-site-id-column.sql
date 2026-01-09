-- =====================================================
-- SQL COMMANDS TO ADD site_id COLUMN TO ALL TABLES
-- Execute these commands in your Supabase SQL Editor
-- Project: rbkuplzntpayendbfzud
-- =====================================================

-- 1. Add site_id column to EVENTS table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS site_id TEXT NOT NULL DEFAULT 'premierpass';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_events_site_id ON public.events(site_id);

-- 2. Add site_id column to ORDERS table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS site_id TEXT NOT NULL DEFAULT 'premierpass';

CREATE INDEX IF NOT EXISTS idx_orders_site_id ON public.orders(site_id);

-- 3. Add site_id column to TICKETS table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS site_id TEXT NOT NULL DEFAULT 'premierpass';

CREATE INDEX IF NOT EXISTS idx_tickets_site_id ON public.tickets(site_id);

-- 4. Add site_id column to TICKET_TYPES table (optional, inherited from events)
ALTER TABLE public.ticket_types 
ADD COLUMN IF NOT EXISTS site_id TEXT NOT NULL DEFAULT 'premierpass';

CREATE INDEX IF NOT EXISTS idx_ticket_types_site_id ON public.ticket_types(site_id);

-- 5. Add site_id column to COUPONS table (if exists)
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS site_id TEXT NOT NULL DEFAULT 'premierpass';

CREATE INDEX IF NOT EXISTS idx_coupons_site_id ON public.coupons(site_id);

-- =====================================================
-- UPDATE EXISTING DATA (if needed)
-- =====================================================

-- If you have existing data that belongs to Quintal, update it:
-- UPDATE public.events SET site_id = 'quintal' WHERE title ILIKE '%quintal%';
-- UPDATE public.orders SET site_id = 'quintal' WHERE event_id IN (SELECT id FROM events WHERE site_id = 'quintal');

-- =====================================================
-- ADD ADMIN USER (bmw.reta@hotmail.com)
-- =====================================================

-- First, get the user ID and then insert role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'bmw.reta@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- CONFIGURE SUPABASE REDIRECT URLs
-- =====================================================
-- Go to Supabase Dashboard > Authentication > URL Configuration
-- Add these to "Redirect URLs":
-- 
-- For PremierPass:
--   https://your-premierpass-domain.com/auth
--   https://your-premierpass-domain.com/
--
-- For Quintal:
--   https://your-quintal-domain.com/auth
--   https://your-quintal-domain.com/
--
-- For localhost development:
--   http://localhost:3000/auth
--   http://localhost:5173/auth
-- =====================================================
