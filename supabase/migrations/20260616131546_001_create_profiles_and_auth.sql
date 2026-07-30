
-- PROFILES
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  residence text,
  avatar_initials text NOT NULL DEFAULT '',
  avatar_color text NOT NULL DEFAULT '#1A5F7A',
  plan text NOT NULL DEFAULT 'ghost' CHECK (plan IN ('ghost','flash','visible','loud','unmissable')),
  plan_expires_at timestamptz,
  avg_rating numeric(3,2) NOT NULL DEFAULT 0,
  total_ratings integer NOT NULL DEFAULT 0,
  total_listings integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  watched_residences text[] NOT NULL DEFAULT '{}',
  joined_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (
    id, email, full_name, residence,
    avatar_initials, avatar_color,
    plan, watched_residences
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'residence',
    COALESCE(NEW.raw_user_meta_data->>'avatar_initials', upper(left(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#1A5F7A'),
    'ghost',
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'residence', '')]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
