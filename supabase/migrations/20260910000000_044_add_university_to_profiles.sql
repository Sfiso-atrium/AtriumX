-- 044_add_university_to_profiles.sql
--
-- Multi-university expansion. Previously the app only ever had Wits
-- students, so there was no university field at all -- residence alone
-- was enough. Now that other universities are being onboarded,
-- university becomes the primary scope (which listings a person can see
-- at all); residence stays exactly as it already worked before this --
-- an optional filter dropdown within whatever university's listings
-- someone can already see.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university text;

-- Every account created before this column existed was, by definition, a
-- Wits student -- that was the only option there was. Backfill them
-- rather than leaving them NULL and invisible to the new
-- university-scoped feed.
UPDATE profiles SET university = 'University of the Witwatersrand'
WHERE university IS NULL;

-- Re-point the signup trigger so new accounts actually populate the
-- column. Falls back to Wits only if the client somehow sends nothing --
-- normal signups always pass a real value from the dropdown.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (
    id, email, full_name, residence, university,
    avatar_initials, avatar_color,
    plan, watched_residences
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'residence',
    COALESCE(NEW.raw_user_meta_data->>'university', 'University of the Witwatersrand'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_initials', upper(left(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#1A5F7A'),
    'ghost',
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'residence', '')]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- profiles_public needs the new column too, or the feed's seller join
-- (seller:profiles_public!inner(*)) will never see anyone's university,
-- and university-based filtering will silently match nothing.
-- CREATE OR REPLACE is safe here -- Postgres allows adding columns to the
-- end of a view's column list without dropping it first.
CREATE OR REPLACE VIEW profiles_public AS
SELECT
  id, full_name, residence, avatar_initials, avatar_color,
  plan, plan_expires_at, account_type, avg_rating, total_ratings,
  total_listings, is_verified, is_admin, watched_residences,
  joined_date, created_at, university
FROM profiles;
