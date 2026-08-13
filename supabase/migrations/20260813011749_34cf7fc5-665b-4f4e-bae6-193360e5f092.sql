REVOKE ALL ON FUNCTION public.checkin_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_ticket(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_ticket_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_ticket_code() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;