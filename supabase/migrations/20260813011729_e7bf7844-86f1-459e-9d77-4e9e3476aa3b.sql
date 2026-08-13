CREATE OR REPLACE FUNCTION public.checkin_ticket(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _t public.tickets%ROWTYPE;
BEGIN
  UPDATE public.tickets
     SET is_used = true,
         used_at = now(),
         checked_in_at = now(),
         status = 'used'
   WHERE id = p_ticket_id
     AND is_used = false
  RETURNING * INTO _t;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_used', false,
      'attendee_name', _t.attendee_name,
      'used_at', _t.used_at
    );
  END IF;

  SELECT * INTO _t FROM public.tickets WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'already_used', false, 'attendee_name', NULL, 'used_at', NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'already_used', true,
    'attendee_name', _t.attendee_name,
    'used_at', _t.used_at
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.checkin_ticket(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
          NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email IN ('bmw.reta@hotmail.com', 'bmw.kojak@gmail.com') THEN
    _role := 'admin';
  ELSE
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;