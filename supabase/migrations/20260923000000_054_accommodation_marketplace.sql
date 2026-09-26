-- Accommodation marketplace: whole-property listings, university scope,
-- student reviews, and student-only conversations.

CREATE TABLE IF NOT EXISTS accommodation_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  monthly_rent numeric(12,2) NOT NULL CHECK (monthly_rent > 0),
  address text NOT NULL,
  description text NOT NULL,
  amenities text[] NOT NULL DEFAULT '{}',
  image_urls text[] NOT NULL DEFAULT '{}',
  universities text[] NOT NULL DEFAULT '{}',
  plan_tier text NOT NULL CHECK (plan_tier IN ('accommodation_free','accommodation_featured','accommodation_premium')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accommodation_listings_seller_idx ON accommodation_listings(seller_id);
CREATE INDEX IF NOT EXISTS accommodation_listings_created_idx ON accommodation_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS accommodation_listings_universities_gin_idx ON accommodation_listings USING gin(universities);

ALTER TABLE accommodation_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accommodation_listings_select_student_or_owner" ON accommodation_listings
FOR SELECT USING (
  seller_id = auth.uid()
  OR (
    status = 'active'
    AND (
      auth.uid() IS NULL
      OR EXISTS (
        SELECT 1 FROM profiles me
        WHERE me.id = auth.uid()
        AND me.account_type = 'student'
        AND (
          me.university IS NULL
          OR me.university = ANY(accommodation_listings.universities)
        )
      )
    )
  )
);

CREATE POLICY "accommodation_listings_insert_owner" ON accommodation_listings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND EXISTS (
    SELECT 1 FROM business_profiles bp
    WHERE bp.id = auth.uid() AND bp.is_accommodation = true
  )
);

CREATE POLICY "accommodation_listings_update_owner" ON accommodation_listings
FOR UPDATE TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "accommodation_listings_delete_owner" ON accommodation_listings
FOR DELETE TO authenticated
USING (auth.uid() = seller_id);

CREATE TABLE IF NOT EXISTS accommodation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_listing_id uuid NOT NULL REFERENCES accommodation_listings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(accommodation_listing_id, student_id)
);

ALTER TABLE accommodation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accommodation_reviews_select_all" ON accommodation_reviews FOR SELECT USING (true);
CREATE POLICY "accommodation_reviews_insert_student" ON accommodation_reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.account_type = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM accommodation_listings a
    WHERE a.id = accommodation_listing_id AND a.status = 'active'
  )
);
CREATE POLICY "accommodation_reviews_update_owner" ON accommodation_reviews FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM accommodation_listings a WHERE a.id = accommodation_listing_id AND a.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM accommodation_listings a WHERE a.id = accommodation_listing_id AND a.seller_id = auth.uid()
  )
);
CREATE POLICY "accommodation_reviews_delete_student" ON accommodation_reviews FOR DELETE TO authenticated
USING (auth.uid() = student_id);

CREATE OR REPLACE FUNCTION enforce_accommodation_review_reply_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
  v_plan text;
BEGIN
  IF NEW.reply IS DISTINCT FROM OLD.reply AND NEW.reply IS NOT NULL THEN
    SELECT seller_id INTO v_seller_id FROM accommodation_listings WHERE id = NEW.accommodation_listing_id;
    SELECT accommodation_plan INTO v_plan FROM business_profiles WHERE id = v_seller_id;
    IF v_plan NOT IN ('accommodation_featured','accommodation_premium') THEN
      RAISE EXCEPTION 'Replying to accommodation reviews requires the Featured or Premium plan.';
    END IF;
    NEW.replied_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_accommodation_review_reply_tier ON accommodation_reviews;
CREATE TRIGGER enforce_accommodation_review_reply_tier
BEFORE UPDATE ON accommodation_reviews
FOR EACH ROW EXECUTE FUNCTION enforce_accommodation_review_reply_tier();

-- Accommodation conversations reuse the existing chat UI/database. Exactly
-- one subject can be attached to each conversation: normal listing, wanted
-- post, or accommodation property.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS accommodation_listing_id uuid REFERENCES accommodation_listings(id) ON DELETE CASCADE;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_exactly_one_subject;
ALTER TABLE conversations ADD CONSTRAINT conversations_exactly_one_subject CHECK (
  (listing_id IS NOT NULL AND wanted_post_id IS NULL AND accommodation_listing_id IS NULL)
  OR (listing_id IS NULL AND wanted_post_id IS NOT NULL AND accommodation_listing_id IS NULL)
  OR (listing_id IS NULL AND wanted_post_id IS NULL AND accommodation_listing_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_accommodation_buyer_unique
ON conversations(accommodation_listing_id, buyer_id)
WHERE accommodation_listing_id IS NOT NULL;

DROP POLICY IF EXISTS "conversations_insert_buyer" ON conversations;
CREATE POLICY "conversations_insert_buyer" ON conversations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND (
    accommodation_listing_id IS NULL
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.account_type = 'student')
      AND EXISTS (
        SELECT 1 FROM accommodation_listings a
        JOIN profiles seller ON seller.id = a.seller_id
        WHERE a.id = accommodation_listing_id
        AND a.status = 'active'
        AND seller.account_type = 'business'
        AND EXISTS (SELECT 1 FROM business_profiles bp WHERE bp.id = seller.id AND bp.is_accommodation = true)
        AND seller.id = conversations.seller_id
      )
    )
  )
);

-- Keep free accommodation providers reachable. The existing noticeboard chat
-- restriction only applies to ordinary business accounts.
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
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
    WHERE p.id = auth.uid()
    AND p.account_type = 'business'
    AND p.plan = 'noticeboard'
    AND NOT EXISTS (
      SELECT 1 FROM business_profiles bp WHERE bp.id = auth.uid() AND bp.is_accommodation = true
    )
  )
);

CREATE OR REPLACE FUNCTION create_accommodation_listing(
  p_seller_id uuid,
  p_title text,
  p_monthly_rent numeric,
  p_address text,
  p_description text,
  p_amenities text[],
  p_image_urls text[],
  p_universities text[],
  p_plan_tier text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile business_profiles%ROWTYPE;
  v_max_properties integer;
  v_max_universities integer;
  v_max_photos integer;
  v_existing_count integer;
  v_existing_universities text[];
  v_union text[];
  v_previous_max_universities integer := 0;
  v_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_seller_id THEN RAISE EXCEPTION 'Not authorised.'; END IF;

  SELECT * INTO v_profile FROM business_profiles WHERE id = p_seller_id FOR UPDATE;
  IF NOT FOUND OR v_profile.is_accommodation IS NOT TRUE THEN RAISE EXCEPTION 'Accommodation account required.'; END IF;
  IF v_profile.accommodation_plan_expires_at IS NOT NULL AND v_profile.accommodation_plan_expires_at < now() THEN
    v_profile.accommodation_plan := 'accommodation_free';
  END IF;
  IF p_plan_tier IS DISTINCT FROM v_profile.accommodation_plan THEN RAISE EXCEPTION 'Your accommodation plan has changed. Refresh and try again.'; END IF;

  CASE p_plan_tier
    WHEN 'accommodation_free' THEN v_max_properties := 1; v_max_universities := 1; v_max_photos := 8;
    WHEN 'accommodation_featured' THEN v_max_properties := 3; v_max_universities := 2; v_max_photos := 20;
    WHEN 'accommodation_premium' THEN v_max_properties := 10; v_max_universities := 3; v_max_photos := 40;
    ELSE RAISE EXCEPTION 'Invalid accommodation plan.';
  END CASE;

  SELECT count(*) INTO v_existing_count FROM accommodation_listings WHERE seller_id = p_seller_id AND status = 'active';
  IF v_existing_count >= v_max_properties THEN RAISE EXCEPTION 'You have reached the property limit for your accommodation plan.'; END IF;
  IF coalesce(array_length(p_image_urls,1),0) > v_max_photos THEN RAISE EXCEPTION 'Your plan allows up to % photos.', v_max_photos; END IF;
  IF coalesce(array_length(p_universities,1),0) < 1 OR array_length(p_universities,1) > v_max_universities THEN RAISE EXCEPTION 'Choose between 1 and % universities.', v_max_universities; END IF;

  SELECT coalesce(max(
    CASE plan_tier
      WHEN 'accommodation_free' THEN 1
      WHEN 'accommodation_featured' THEN 2
      WHEN 'accommodation_premium' THEN 3
      ELSE 0
    END
  ), 0) INTO v_previous_max_universities
  FROM accommodation_listings
  WHERE seller_id = p_seller_id AND status = 'active';

  IF v_existing_count = 0 THEN
    SELECT coalesce(array_agg(DISTINCT u ORDER BY u), '{}') INTO v_union
    FROM unnest(coalesce(p_universities,'{}'::text[])) u;
    IF coalesce(array_length(v_union,1),0) > v_max_universities THEN RAISE EXCEPTION 'Your plan allows access to % universities.', v_max_universities; END IF;
  ELSIF v_max_universities > v_previous_max_universities THEN
    SELECT coalesce(array_agg(DISTINCT u ORDER BY u), '{}') INTO v_union
    FROM unnest(coalesce(v_profile.universities,'{}'::text[]) || coalesce(p_universities,'{}'::text[])) u;
    IF coalesce(array_length(v_union,1),0) > v_max_universities THEN RAISE EXCEPTION 'Your plan allows access to % universities.', v_max_universities; END IF;
  ELSE
    v_existing_universities := coalesce(v_profile.universities,'{}'::text[]);
    IF EXISTS (SELECT 1 FROM unnest(p_universities) u WHERE NOT (u = ANY(v_existing_universities))) THEN
      RAISE EXCEPTION 'You can only use the university set established by your first accommodation listing unless you upgrade your plan.';
    END IF;
    v_union := v_existing_universities;
  END IF;

  INSERT INTO accommodation_listings(seller_id,title,monthly_rent,address,description,amenities,image_urls,universities,plan_tier,status)
  VALUES(p_seller_id, trim(p_title), p_monthly_rent, trim(p_address), trim(p_description), coalesce(p_amenities,'{}'), coalesce(p_image_urls,'{}'), p_universities, p_plan_tier, 'active')
  RETURNING id INTO v_id;

  IF v_existing_count = 0 AND v_union IS DISTINCT FROM coalesce(v_profile.universities,'{}'::text[]) THEN
    UPDATE business_profiles SET universities = v_union WHERE id = p_seller_id;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv conversations%ROWTYPE;
  v_recipient_id uuid;
  v_sender_name text;
  v_recipient_type text;
  v_recipient_plan text;
  v_is_accommodation boolean := false;
BEGIN
  SELECT * INTO v_conv FROM conversations WHERE id = NEW.conversation_id;
  IF v_conv.buyer_id = NEW.sender_id THEN
    v_recipient_id := v_conv.seller_id;
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
  SELECT account_type, plan INTO v_recipient_type, v_recipient_plan FROM profiles WHERE id = v_recipient_id;
  SELECT coalesce(is_accommodation,false) INTO v_is_accommodation FROM business_profiles WHERE id = v_recipient_id;

  IF v_recipient_type = 'business' AND v_recipient_plan = 'noticeboard' AND NOT v_is_accommodation THEN
    INSERT INTO notifications (user_id, type, message, conversation_id)
    VALUES (v_recipient_id, 'message_locked', 'A student has messaged you. Upgrade to respond.', NEW.conversation_id);
  ELSE
    INSERT INTO notifications (user_id, type, message, conversation_id)
    VALUES (v_recipient_id, 'message', v_sender_name || ' sent you a message.', NEW.conversation_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_on_accommodation_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
  v_student_name text;
  v_plan text;
BEGIN
  SELECT seller_id INTO v_seller_id FROM accommodation_listings WHERE id = NEW.accommodation_listing_id;
  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
  SELECT accommodation_plan INTO v_plan FROM business_profiles WHERE id = v_seller_id;
  IF v_plan IN ('accommodation_featured','accommodation_premium') THEN
    INSERT INTO notifications (user_id, type, message)
    VALUES (v_seller_id, 'review', v_student_name || ' left a review on your accommodation.');
  ELSE
    INSERT INTO notifications (user_id, type, message)
    VALUES (v_seller_id, 'review_locked', v_student_name || ' left a review. Upgrade to reply.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_accommodation_review ON accommodation_reviews;
CREATE TRIGGER notify_on_accommodation_review
AFTER INSERT ON accommodation_reviews
FOR EACH ROW EXECUTE FUNCTION notify_on_accommodation_review();
