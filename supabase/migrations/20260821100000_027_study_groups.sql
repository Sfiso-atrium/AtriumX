-- Study Groups: group chat + a group-scoped deadlines/timetable/schedule set,
-- separate from the user's own personal-space tables (migration 023).
-- Membership-gated access via a small SECURITY DEFINER helper, same pattern
-- as the existing notification triggers in this repo.

-- ── GROUPS ───────────────────────────────────────────────────────────────
CREATE TABLE study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  study_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── MEMBERSHIP ───────────────────────────────────────────────────────────
CREATE TABLE study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('creator','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Membership check used by every policy below. SECURITY DEFINER so it can
-- read study_group_members without re-triggering RLS on itself.
CREATE OR REPLACE FUNCTION is_study_group_member(p_group_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_groups_select_member" ON study_groups FOR SELECT TO authenticated
  USING (is_study_group_member(id));
CREATE POLICY "study_groups_insert_own" ON study_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "study_groups_update_creator" ON study_groups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "study_groups_delete_creator" ON study_groups FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_group_members_select_member" ON study_group_members FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
-- Joining via invite link = inserting yourself as a member of a group whose
-- id you got from the link. No separate invite-token table needed.
CREATE POLICY "study_group_members_insert_self" ON study_group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_group_members_delete_self" ON study_group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Creator is auto-added as a member the moment the group is created.
CREATE OR REPLACE FUNCTION add_creator_as_study_group_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO study_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'creator');
  RETURN NEW;
END;
$$;

CREATE TRIGGER add_creator_as_study_group_member
  AFTER INSERT ON study_groups
  FOR EACH ROW EXECUTE FUNCTION add_creator_as_study_group_member();

-- ── GROUP CHAT (text now; image_url wired up in the image-sharing stack) ──
CREATE TABLE study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  image_url text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_group_messages_select_member" ON study_group_messages FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
CREATE POLICY "study_group_messages_insert_member" ON study_group_messages FOR INSERT TO authenticated
  WITH CHECK (is_study_group_member(group_id) AND auth.uid() = sender_id);
CREATE POLICY "study_group_messages_delete_own" ON study_group_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- ── GROUP DEADLINES (shared, any member can manage — mirrors `deadlines`) ─
CREATE TABLE study_group_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  notes text,
  reminded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_group_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_group_deadlines_select_member" ON study_group_deadlines FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
CREATE POLICY "study_group_deadlines_insert_member" ON study_group_deadlines FOR INSERT TO authenticated
  WITH CHECK (is_study_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "study_group_deadlines_update_member" ON study_group_deadlines FOR UPDATE TO authenticated
  USING (is_study_group_member(group_id)) WITH CHECK (is_study_group_member(group_id));
CREATE POLICY "study_group_deadlines_delete_member" ON study_group_deadlines FOR DELETE TO authenticated
  USING (is_study_group_member(group_id));

-- ── GROUP SCHEDULE (mirrors `schedule_entries`) ────────────────────────────
CREATE TABLE study_group_schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  module text NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_group_schedule_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_group_schedule_select_member" ON study_group_schedule_entries FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
CREATE POLICY "study_group_schedule_insert_member" ON study_group_schedule_entries FOR INSERT TO authenticated
  WITH CHECK (is_study_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "study_group_schedule_update_member" ON study_group_schedule_entries FOR UPDATE TO authenticated
  USING (is_study_group_member(group_id)) WITH CHECK (is_study_group_member(group_id));
CREATE POLICY "study_group_schedule_delete_member" ON study_group_schedule_entries FOR DELETE TO authenticated
  USING (is_study_group_member(group_id));

-- ── GROUP TIMETABLE (courses + prep notes — mirrors study_timetable_courses
-- and study_prep_notes) ────────────────────────────────────────────────────
CREATE TABLE study_group_timetable_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  course_name text NOT NULL,
  minutes integer NOT NULL CHECK (minutes > 0),
  prepped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_group_timetable_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_group_courses_select_member" ON study_group_timetable_courses FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
CREATE POLICY "study_group_courses_insert_member" ON study_group_timetable_courses FOR INSERT TO authenticated
  WITH CHECK (is_study_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "study_group_courses_update_member" ON study_group_timetable_courses FOR UPDATE TO authenticated
  USING (is_study_group_member(group_id)) WITH CHECK (is_study_group_member(group_id));
CREATE POLICY "study_group_courses_delete_member" ON study_group_timetable_courses FOR DELETE TO authenticated
  USING (is_study_group_member(group_id));

CREATE TABLE study_group_prep_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES study_group_timetable_courses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  focus_topic text NOT NULL,
  resource text NOT NULL,
  goal text NOT NULL,
  clarification_question text,
  clarified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_group_prep_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_group_prep_select_member" ON study_group_prep_notes FOR SELECT TO authenticated
  USING (is_study_group_member(group_id));
CREATE POLICY "study_group_prep_insert_member" ON study_group_prep_notes FOR INSERT TO authenticated
  WITH CHECK (is_study_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "study_group_prep_update_member" ON study_group_prep_notes FOR UPDATE TO authenticated
  USING (is_study_group_member(group_id)) WITH CHECK (is_study_group_member(group_id));
CREATE POLICY "study_group_prep_delete_member" ON study_group_prep_notes FOR DELETE TO authenticated
  USING (is_study_group_member(group_id));
