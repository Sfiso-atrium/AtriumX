-- 016_public_profile_read_for_listings.sql
-- Logged-out visitors saw an empty feed even though active listings exist.
-- getListings()/getBusinessListings() embed the seller via
-- `profiles!inner(*)`. Supabase enforces RLS on the joined table too, and
-- profiles only has one SELECT policy -- profiles_select_own, scoped TO
-- authenticated -- so the anon role couldn't read ANY profiles row. Because
-- it's an inner join, a listing whose seller row can't be read gets dropped
-- from the result entirely -- so every listing vanished for anon visitors,
-- even though listings_select_active already makes the listing itself
-- public.
--
-- Note: profiles_select_own already lets any authenticated user read every
-- column of every profile (including email) despite its name -- this just
-- extends that same access to anon so the join succeeds for logged-out
-- users too. It doesn't expose anything to authenticated users that wasn't
-- already exposed. If email should actually stay hidden from other users,
-- that needs a separate follow-up (a public view exposing only safe
-- columns) -- flagging it here rather than folding it into this fix.
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT TO anon USING (true);
-- Fixes "infinite recursion detected in policy for relation profiles",
-- caused by profiles_select_admin querying profiles from within its own
-- policy on profiles. Moves the admin check into a SECURITY DEFINER
-- function, which runs with the function owner's privileges and so bypasses
-- RLS for this one internal lookup -- it never re-enters profiles' own
-- policies, which is what removes the recursion.
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM profiles p WHERE p.id = uid), false);
$$;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
