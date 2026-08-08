-- 016_fix_listings_plan_tier_check.sql
-- Your live database has a CHECK constraint named listings_plan_tier_check
-- that isn't in any migration file in this repo -- Postgres auto-generates
-- that exact name when a column gets an unnamed inline CHECK, so it was
-- likely added by hand at some point (dashboard SQL editor, or an earlier
-- draft of migration 003 that was edited after the fact). Whatever its
-- origin, it only allows the four student tier values, so any insert with
-- plan_tier = 'noticeboard' | 'featured' | 'campus_partner' gets rejected --
-- which is exactly the error you hit.
--
-- This drops it if present and replaces it with one that allows both sets
-- of tiers, matching the same check already added to profiles.plan in
-- migration 014.

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_plan_tier_check;

ALTER TABLE listings ADD CONSTRAINT listings_plan_tier_check
  CHECK (plan_tier IN ('ghost','flash','visible','loud','unmissable','noticeboard','featured','campus_partner'));
