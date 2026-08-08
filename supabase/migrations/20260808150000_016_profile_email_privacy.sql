-- 016_profile_email_privacy.sql
-- The FAQ and Privacy Policy both promise other users never see your email.
-- Today that's not actually true at the database level: profiles_select_own
-- (despite its name) grants any authenticated user SELECT on every column
-- of every profile, including email -- our own app code just never
-- happened to ask for it in most places. But RLS is row-level, not
-- column-level, so anyone with the public anon key can query the REST API
-- directly and pull any user's email regardless of what our own queries do.
--
-- Fix: a view that structurally excludes email (so it can never leave
-- through it, no matter how it's queried), combined with locking the real
-- table down to "you can only read your own row directly." Views created
-- by the migration role run with that role's privileges by default in
-- Postgres, which is what lets everyone read the safe columns through the
-- view even once the base table itself is locked down.

-- 1. Safe, public-readable projection of profiles -- every column except
-- email. Used anywhere the app shows one user's info to a DIFFERENT user
-- (listings feed, listing detail, public profile pages).
CREATE VIEW profiles_public AS
SELECT
  id, full_name, residence, avatar_initials, avatar_color,
  plan, plan_expires_at, account_type, avg_rating, total_ratings,
  total_listings, is_verified, is_admin, watched_residences,
  joined_date, created_at
FROM profiles;

GRANT SELECT ON profiles_public TO anon, authenticated;

-- 2. Tighten the base table: direct SELECT on `profiles` (the one with
-- email) is now owner-only, replacing the old USING (true) that let any
-- authenticated user read anyone's row. Also drops the earlier anon policy
-- suggested for the logged-out-feed fix -- that's superseded by the view now
-- (IF EXISTS makes this safe to run whether or not that one was applied).
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 3. Admins still need full access (including email) to moderate accounts --
-- that's an operational necessity, not a broken promise to "other users."
-- Same self-referencing admin-check pattern already used elsewhere in this
-- schema (e.g. listings_select_admin) -- safe from recursion because the
-- owner-row policy above already authorizes an admin to read their own row
-- independently of this policy.
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
