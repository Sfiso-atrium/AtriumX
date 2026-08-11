-- 019_remove_flash_plan_value.sql
-- 'flash' predates the rename to 'visible' and can no longer be set from
-- the UI, but was never removed from the DB check constraints, so a stale
-- row carrying it would crash any page doing PLAN_TIERS[plan].something.
-- Normalize any leftover rows first (no-op if none exist), then close the
-- constraint so it can't reappear.
UPDATE profiles SET plan = 'visible' WHERE plan = 'flash';
UPDATE listings SET plan_tier = 'visible' WHERE plan_tier = 'flash';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('ghost','visible','loud','unmissable','noticeboard','featured','campus_partner'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_plan_tier_check;
ALTER TABLE listings ADD CONSTRAINT listings_plan_tier_check
  CHECK (plan_tier IN ('ghost','visible','loud','unmissable','noticeboard','featured','campus_partner'));
