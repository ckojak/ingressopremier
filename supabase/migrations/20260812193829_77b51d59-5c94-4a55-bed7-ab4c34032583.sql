CREATE TABLE public.organizer_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  document_type text NOT NULL DEFAULT 'cpf',
  document_number text,
  document_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.organizer_verifications TO authenticated;
GRANT ALL ON public.organizer_verifications TO service_role;

ALTER TABLE public.organizer_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ov_select_own_or_admin" ON public.organizer_verifications
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ov_insert_own" ON public.organizer_verifications
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "ov_update_own_pending" ON public.organizer_verifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status IN ('pending','rejected'))
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "ov_admin_all" ON public.organizer_verifications
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ov_updated
BEFORE UPDATE ON public.organizer_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ov_status ON public.organizer_verifications(status);