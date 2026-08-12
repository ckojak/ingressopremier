-- ============================================================
-- PREMIER PASS — PRODUCTION HARDENING
-- Rode este SQL no Supabase (uma vez) antes do go-live.
-- ============================================================

-- 1) Colunas opcionais usadas pelo webhook / checkout ---------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_mp_payment_id_uidx
  ON public.orders (mp_payment_id) WHERE mp_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_event_id_idx ON public.orders (event_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

-- 2) RLS — ATIVAÇÃO -------------------------------------------
ALTER TABLE public.events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets      ENABLE ROW LEVEL SECURITY;

-- 3) Função helper de role (evita recursão em policies) -------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- 4) EVENTS — Produtor só vê/edita os próprios; público lê publicados
DROP POLICY IF EXISTS "events_public_read"     ON public.events;
DROP POLICY IF EXISTS "events_producer_all"    ON public.events;
DROP POLICY IF EXISTS "events_admin_all"       ON public.events;

CREATE POLICY "events_public_read" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "events_producer_all" ON public.events
  FOR ALL TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "events_admin_all" ON public.events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) TICKET_TYPES — só o dono do evento (ou admin) altera
DROP POLICY IF EXISTS "tt_public_read"   ON public.ticket_types;
DROP POLICY IF EXISTS "tt_owner_write"   ON public.ticket_types;
DROP POLICY IF EXISTS "tt_admin_all"     ON public.ticket_types;

CREATE POLICY "tt_public_read" ON public.ticket_types
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "tt_owner_write" ON public.ticket_types
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));

CREATE POLICY "tt_admin_all" ON public.ticket_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6) ORDERS — Cliente vê só seus; produtor vê do seu evento; admin vê tudo
DROP POLICY IF EXISTS "orders_owner_read"    ON public.orders;
DROP POLICY IF EXISTS "orders_producer_read" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all"     ON public.orders;

CREATE POLICY "orders_owner_read" ON public.orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "orders_producer_read" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
-- Writes em orders são feitos pela edge function (service_role bypassa RLS).

-- 7) ORDER_ITEMS — herdam visibilidade do pedido
DROP POLICY IF EXISTS "oi_via_order" ON public.order_items;
CREATE POLICY "oi_via_order" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
                  AND (o.user_id = auth.uid()
                       OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = o.event_id AND e.organizer_id = auth.uid())
                       OR public.has_role(auth.uid(),'admin'))));

-- 8) TICKETS — Cliente só vê os próprios; produtor vê do seu evento
DROP POLICY IF EXISTS "tickets_owner_read"    ON public.tickets;
DROP POLICY IF EXISTS "tickets_producer_read" ON public.tickets;
DROP POLICY IF EXISTS "tickets_admin_all"     ON public.tickets;

CREATE POLICY "tickets_owner_read" ON public.tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "tickets_producer_read" ON public.tickets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));

CREATE POLICY "tickets_admin_all" ON public.tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 9) RPC ATÔMICA — confirmar pedido + gerar tickets em 1 transação
--    Chamada pelo webhook (service_role).
CREATE OR REPLACE FUNCTION public.confirm_order_paid(
  _order_id uuid,
  _mp_payment_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order record;
  _item  record;
  _i     int;
BEGIN
  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF _order.status = 'paid' THEN RETURN; END IF;  -- idempotência

  UPDATE public.orders
    SET status = 'paid',
        paid_at = now(),
        mp_payment_id = COALESCE(mp_payment_id, _mp_payment_id),
        payment_intent_id = COALESCE(payment_intent_id, _mp_payment_id),
        updated_at = now()
  WHERE id = _order_id;

  FOR _item IN
    SELECT oi.ticket_type_id, oi.quantity, oi.unit_price
    FROM public.order_items oi WHERE oi.order_id = _order_id
  LOOP
    FOR _i IN 1.._item.quantity LOOP
      INSERT INTO public.tickets (user_id, event_id, ticket_type_id, order_id, status)
      VALUES (_order.user_id, _order.event_id, _item.ticket_type_id, _order_id, 'valid');
    END LOOP;

    UPDATE public.ticket_types
      SET quantity_sold = COALESCE(quantity_sold,0) + _item.quantity
      WHERE id = _item.ticket_type_id;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.confirm_order_paid(uuid, text) FROM public, anon, authenticated;