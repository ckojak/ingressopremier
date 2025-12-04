-- Add cpf column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Create index for CPF lookup
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);