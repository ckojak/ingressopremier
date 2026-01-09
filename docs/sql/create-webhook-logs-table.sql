-- Create webhook_logs table for payment monitoring
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  payment_id TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  site_id TEXT NOT NULL DEFAULT 'quintal',
  payment_status TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'payment',
  amount NUMERIC(10,2),
  payer_email TEXT,
  is_sandbox BOOLEAN DEFAULT false,
  details JSONB
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_site_id ON public.webhook_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_status ON public.webhook_logs(payment_status);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;
