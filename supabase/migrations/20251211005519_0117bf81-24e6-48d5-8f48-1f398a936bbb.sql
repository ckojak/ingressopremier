-- Add website and contact fields to events table
ALTER TABLE public.events 
ADD COLUMN website text,
ADD COLUMN contact text;