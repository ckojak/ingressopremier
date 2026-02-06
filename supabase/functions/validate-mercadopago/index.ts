import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ValidateRequest {
  site_id: string;
  access_token?: string; // Optional: if provided, validate this token instead of stored one
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Acesso negado: apenas administradores');
    }

    const body: ValidateRequest = await req.json();
    const { site_id, access_token } = body;

    // Get the access token to validate
    let tokenToValidate = access_token;
    
    if (!tokenToValidate) {
      // Use stored credentials
      if (site_id === 'premierpass') {
        tokenToValidate = Deno.env.get('PREMIERPASS_MERCADOPAGO_ACCESS_TOKEN');
      } else {
        tokenToValidate = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      }
    }

    if (!tokenToValidate) {
      return new Response(JSON.stringify({
        success: false,
        valid: false,
        error: 'Token de acesso não configurado para este site',
        configured: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate token by calling Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenToValidate}`
      }
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error('Mercado Pago validation error:', errorData);
      
      return new Response(JSON.stringify({
        success: true,
        valid: false,
        error: 'Token inválido ou expirado',
        configured: true,
        is_sandbox: tokenToValidate.startsWith('TEST-')
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userData = await mpResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      valid: true,
      configured: true,
      is_sandbox: tokenToValidate.startsWith('TEST-'),
      account_info: {
        id: userData.id,
        nickname: userData.nickname,
        email: userData.email,
        site_id: userData.site_id,
        country_id: userData.country_id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
