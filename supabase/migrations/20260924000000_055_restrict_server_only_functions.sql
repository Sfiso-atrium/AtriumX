-- 055_restrict_server_only_functions.sql
-- Server-only maintenance and Vault access must not be callable by browser roles.
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.send_deadline_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_deadlines() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_study_logs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_listings() FROM PUBLIC, anon, authenticated;
