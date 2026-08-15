/**
 * SECURITY: Environment variable validation
 * Ensures all critical environment variables are properly configured
 */

interface EnvConfig {
  supabase: {
    url: string;
    anonKey: string;
    projectId: string;
  };
  payment: {
    mercadoPagoPublicKey?: string;
    stripePublicKey?: string;
  };
}

function validateEnv(): EnvConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  if (!supabaseUrl) {
    throw new Error(
      "VITE_SUPABASE_URL is not configured. Check your .env.local file."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "VITE_SUPABASE_ANON_KEY is not configured. Check your .env.local file."
    );
  }

  if (!supabaseProjectId) {
    throw new Error(
      "VITE_SUPABASE_PROJECT_ID is not configured. Check your .env.local file."
    );
  }

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      projectId: supabaseProjectId,
    },
    payment: {
      mercadoPagoPublicKey: import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY,
      stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    },
  };
}

export const envConfig = validateEnv();
