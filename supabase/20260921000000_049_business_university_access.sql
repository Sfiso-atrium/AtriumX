-- Business university reach is account-wide. The first signup supplies one
-- university; later listing creation is responsible for extending that set
-- only within the active plan's limit.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS universities text[] NOT NULL DEFAULT '{}';

-- Business applications are no longer reviewed before the account reaches
-- the marketplace. Existing business rows are brought into the same state.
UPDATE business_profiles
SET status = 'approved'
WHERE status = 'pending';

ALTER TABLE business_profiles
  ALTER COLUMN status SET DEFAULT 'approved';
