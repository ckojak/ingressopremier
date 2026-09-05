ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_email_sent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_recovery_pending
  ON public.orders (created_at)
  WHERE status = 'pending' AND recovery_email_sent = false;