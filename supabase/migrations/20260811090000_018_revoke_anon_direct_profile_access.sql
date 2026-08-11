-- 018_revoke_anon_direct_profile_access.sql
-- 016_public_profile_read_for_listings re-opened anon SELECT on the raw
-- profiles table (email included) to fix the logged-out feed. That's no
-- longer needed: 016_profile_email_privacy already grants anon SELECT on
-- profiles_public (the safe, email-free view), and getListings/
-- getBusinessListings already query through that view. This just removes
-- the now-redundant, unsafe policy so anon can no longer read email
-- directly off the base table.
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
