-- Launch-audit hardening: counter RPCs must not be executable by anonymous/public callers.
-- The existing client flows continue to call these functions as authenticated users.

REVOKE EXECUTE ON FUNCTION public.increment_contact_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_report_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_listing_likes(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_listing_likes(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_event_likes(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_event_likes(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_contact_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_report_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_listing_likes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_listing_likes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_event_likes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_event_likes(uuid) TO authenticated, service_role;
