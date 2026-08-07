-- 014_business_accounts.sql
-- Businesses currently have no login and are not rows in `profiles`, so they
-- cannot appear anywhere `conversations`, `messages`, `ratings`, or
-- `notifications` require a profiles.id -- those tables physically reject
-- them. This migration makes a business a second *kind* of profile, so it
-- reuses every one of those tables exactly as students already do, instead
-- of building a parallel chat/notification system.

-- 1. Tag which kind of account a profile is.
ALTER TABLE profiles ADD COLUMN account_type text NOT NULL DEFAULT 'student'
  CHECK (account_type IN ('student', 'business'));

-- 2. Widen the plan check so business tiers can sit in the same column
-- students already use. Same concept either way -- "what tier is this
-- account on" -- so one column, not two.
ALTER TABLE profiles DROP CONSTRAINT profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('ghost','flash','visible','loud','unmissable','noticeboard','featured','campus_partner'));

-- 3. Rebuild business_profiles keyed off the account instead of standing
-- alone, and trim it to only what we actually collect now. Dropping and
-- recreating on the assumption there's no real submitted application data
-- worth preserving yet -- STOP and tell me if that assumption is wrong
-- before running this, since it deletes existing rows.
DROP TABLE IF EXISTS business_profiles;

CREATE TABLE business_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type text NOT NULL,
  custom_business_type text,
  contact_number text NOT NULL,
  -- Whether the business itself is a legitimate, approved account -- separate
  -- from whether any individual listing they post is approved (that still
  -- goes through the normal listings.status pending/active queue everyone
  -- else uses).
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_profiles_select_all" ON business_profiles FOR SELECT USING (true);
CREATE POLICY "business_profiles_insert_own" ON business_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "business_profiles_update_own_or_admin" ON business_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "business_profiles_delete_admin" ON business_profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 4. Business signup creates a profiles row via the same trigger path
-- students use, distinguished by metadata set at signup time. Businesses
-- start on the free 'noticeboard' tier, same as students start on 'ghost'.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (
    id, email, full_name, residence,
    avatar_initials, avatar_color,
    plan, account_type, watched_residences
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'residence',
    COALESCE(NEW.raw_user_meta_data->>'avatar_initials', upper(left(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#1A5F7A'),
    CASE WHEN NEW.raw_user_meta_data->>'account_type' = 'business' THEN 'noticeboard' ELSE 'ghost' END,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'student'),
    ARRAY[COALESCE(NEW.raw_user_meta_data->>'residence', '')]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. Reviews students leave on a business. Kept separate from `ratings`
-- (buyer rates seller after a sale, tied to one listing) since this is
-- open-ended -- any student can review a business any time, no purchase
-- required, and only one review per student per business.
CREATE TABLE business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, student_id)
);

ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_reviews_select_all" ON business_reviews FOR SELECT USING (true);
CREATE POLICY "business_reviews_insert_student" ON business_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = business_id AND account_type = 'business')
  );
CREATE POLICY "business_reviews_reply_business" ON business_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "business_reviews_delete_student" ON business_reviews FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

-- 6. Enforce reply gating in the database, not just the UI. Without this, a
-- business on Noticeboard or Featured could call the API directly and reply
-- anyway -- the frontend check alone doesn't stop that.
CREATE OR REPLACE FUNCTION enforce_review_reply_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan text;
BEGIN
  IF NEW.reply IS DISTINCT FROM OLD.reply AND NEW.reply IS NOT NULL THEN
    SELECT plan INTO v_plan FROM profiles WHERE id = NEW.business_id;
    IF v_plan IS DISTINCT FROM 'campus_partner' THEN
      RAISE EXCEPTION 'Replying to reviews requires the Campus Partner plan.';
    END IF;
    NEW.replied_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_review_reply_tier
  BEFORE UPDATE ON business_reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_review_reply_tier();

-- 7. Same defense-in-depth for chat: a Noticeboard business shouldn't be
-- able to send a reply even by calling the API directly. Students are
-- unaffected -- this only blocks sends where the sender is a business on
-- the free tier.
DROP POLICY "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.account_type = 'business' AND p.plan = 'noticeboard'
    )
  );

-- 8. Message notifications need different wording when the recipient is a
-- free-tier business -- "upgrade to respond" instead of a generic ping --
-- so the frontend knows to show the locked state and an upgrade button.
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv conversations%ROWTYPE;
  v_recipient_id uuid;
  v_sender_name text;
  v_recipient_type text;
  v_recipient_plan text;
BEGIN
  SELECT * INTO v_conv FROM conversations WHERE id = NEW.conversation_id;

  IF v_conv.buyer_id = NEW.sender_id THEN
    v_recipient_id := v_conv.seller_id;
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;

  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
  SELECT account_type, plan INTO v_recipient_type, v_recipient_plan FROM profiles WHERE id = v_recipient_id;

  IF v_recipient_type = 'business' AND v_recipient_plan = 'noticeboard' THEN
    INSERT INTO notifications (user_id, type, message, conversation_id)
    VALUES (v_recipient_id, 'message_locked', 'A student has messaged you. Upgrade to respond.', NEW.conversation_id);
  ELSE
    INSERT INTO notifications (user_id, type, message, conversation_id)
    VALUES (v_recipient_id, 'message', v_sender_name || ' sent you a message.', NEW.conversation_id);
  END IF;

  RETURN NEW;
END;
$$;

-- 9. New review → notify the business, gated the same way if they can't reply.
CREATE OR REPLACE FUNCTION notify_on_business_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan text;
  v_student_name text;
BEGIN
  SELECT plan INTO v_plan FROM profiles WHERE id = NEW.business_id;
  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;

  IF v_plan = 'campus_partner' THEN
    INSERT INTO notifications (user_id, type, message)
    VALUES (NEW.business_id, 'review', v_student_name || ' left you a review.');
  ELSE
    INSERT INTO notifications (user_id, type, message)
    VALUES (NEW.business_id, 'review_locked', v_student_name || ' left you a review. Upgrade to reply.');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_business_review
  AFTER INSERT ON business_reviews
  FOR EACH ROW EXECUTE FUNCTION notify_on_business_review();
