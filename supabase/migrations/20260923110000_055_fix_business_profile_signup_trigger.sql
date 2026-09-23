-- Fix business/accommodation signup profiles.
--
-- Migration 044 rebuilt handle_new_user() and accidentally stopped copying
-- account_type from auth metadata, which caused newly-created business and
-- accommodation accounts to be inserted into profiles as students. That made
-- /accommodation render as an empty page because the accommodation route
-- correctly requires a business accommodation account.
--
-- Keep the existing university behavior, while preserving the account type
-- supplied during signup and assigning the normal business plan.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text;
  v_plan text;
BEGIN
  v_account_type := CASE
    WHEN NEW.raw_user_meta_data->>'account_type' = 'business' THEN 'business'
    ELSE 'student'
  END;

  v_plan := CASE
    WHEN v_account_type = 'business' THEN 'noticeboard'
    ELSE 'ghost'
  END;

  INSERT INTO profiles (
    id,
    email,
    full_name,
    residence,
    university,
    avatar_initials,
    avatar_color,
    plan,
    account_type,
    watched_residences
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'residence',
    COALESCE(NEW.raw_user_meta_data->>'university', 'University of the Witwatersrand'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_initials',
      upper(left(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#1A5F7A'),
    v_plan,
    v_account_type,
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'residence', '')]
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Repair business accounts that were created while the broken trigger was
-- active. business_profiles is the authoritative indicator that an account
-- is a business account.
UPDATE profiles p
SET
  account_type = 'business',
  plan = CASE
    WHEN p.plan = 'ghost' THEN 'noticeboard'
    ELSE p.plan
  END
WHERE EXISTS (
  SELECT 1
  FROM business_profiles bp
  WHERE bp.id = p.id
)
AND p.account_type <> 'business';
