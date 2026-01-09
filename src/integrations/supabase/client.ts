// PremierPass - Cliente Supabase Independente
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Credenciais do projeto PremierPass (Supabase independente)
const SUPABASE_URL = import.meta.env.VITE_PREMIERPASS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_PREMIERPASS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validação das credenciais
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Credenciais Supabase não configuradas. Verifique as variáveis de ambiente.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});