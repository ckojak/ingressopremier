-- Token compartilhado entre o cron e a edge function de recuperacao de carrinho
DO $$
DECLARE _t text := encode(gen_random_bytes(32), 'hex');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cart_recovery_cron_token') THEN
    PERFORM vault.create_secret(_t, 'cart_recovery_cron_token', 'Token interno usado pelo agendador de lembretes de carrinho');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_cron_token(_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'cart_recovery_cron_token'
      AND decrypted_secret = _token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_cron_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_token(text) TO service_role;