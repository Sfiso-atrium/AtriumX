-- Accommodation account foundation.
-- A business can explicitly identify itself as an accommodation provider.
-- Accommodation plans are kept separate from ordinary business plans so
-- existing marketplace plan logic remains unchanged.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS is_accommodation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accommodation_plan text NOT NULL DEFAULT 'accommodation_free'
    CHECK (accommodation_plan IN ('accommodation_free','accommodation_featured','accommodation_premium')),
  ADD COLUMN IF NOT EXISTS accommodation_plan_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS business_profiles_is_accommodation_idx
  ON business_profiles(is_accommodation);
