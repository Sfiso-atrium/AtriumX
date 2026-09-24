-- Accommodation report warning + 3-day correction window.
-- This extends the accommodation reporting flow from Batch 1 without changing
-- the existing reports table used by ordinary listings.

ALTER TABLE public.accommodation_listings
  ADD COLUMN IF NOT EXISTS report_warning_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_edit_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_required_field text;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS accommodation_listing_id uuid
    REFERENCES public.accommodation_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifications_accommodation_listing_idx
  ON public.notifications(accommodation_listing_id)
  WHERE accommodation_listing_id IS NOT NULL;

-- A listing with an active correction deadline remains visible to students
-- until that deadline. Once the deadline passes, it is no longer selectable
-- by students and therefore drops out of the accommodation feed.
DROP POLICY IF EXISTS "accommodation_listings_select_student_or_owner" ON public.accommodation_listings;
CREATE POLICY "accommodation_listings_select_student_or_owner" ON public.accommodation_listings
FOR SELECT USING (
  seller_id = auth.uid()
  OR (
    status = 'active'
    AND (
      report_edit_deadline_at IS NULL
      OR report_edit_deadline_at > now()
    )
    AND (
      auth.uid() IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.account_type = 'student'
          AND (
            me.university IS NULL
            OR me.university = ANY(public.accommodation_listings.universities)
          )
      )
    )
  )
);

-- Only clear the correction deadline when the specific field named by the
-- admin has actually been changed by the listing owner.
CREATE OR REPLACE FUNCTION public.clear_accommodation_report_deadline_on_required_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.seller_id
     AND OLD.report_edit_deadline_at IS NOT NULL
     AND OLD.report_required_field IS NOT NULL THEN
    CASE OLD.report_required_field
      WHEN 'title' THEN
        IF NEW.title IS DISTINCT FROM OLD.title THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'monthly_rent' THEN
        IF NEW.monthly_rent IS DISTINCT FROM OLD.monthly_rent THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'address' THEN
        IF NEW.address IS DISTINCT FROM OLD.address THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'description' THEN
        IF NEW.description IS DISTINCT FROM OLD.description THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'amenities' THEN
        IF NEW.amenities IS DISTINCT FROM OLD.amenities THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'image_urls' THEN
        IF NEW.image_urls IS DISTINCT FROM OLD.image_urls THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'universities' THEN
        IF NEW.universities IS DISTINCT FROM OLD.universities THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'building_count' THEN
        IF NEW.building_count IS DISTINCT FROM OLD.building_count THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      WHEN 'building_addresses' THEN
        IF NEW.building_addresses IS DISTINCT FROM OLD.building_addresses THEN
          NEW.report_edit_deadline_at := NULL;
          NEW.report_warning_sent_at := NULL;
          NEW.report_required_field := NULL;
        END IF;
      END CASE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accommodation_report_required_edit
  ON public.accommodation_listings;
CREATE TRIGGER accommodation_report_required_edit
BEFORE UPDATE ON public.accommodation_listings
FOR EACH ROW
EXECUTE FUNCTION public.clear_accommodation_report_deadline_on_required_edit();

-- Admin-only RPC. It writes the notification on behalf of the admin because
-- the normal notifications INSERT policy only permits users to insert for
-- themselves.
CREATE OR REPLACE FUNCTION public.send_accommodation_report_warning(
  p_report_id uuid,
  p_message text,
  p_required_field text
)
RETURNS TABLE (
  notification_id uuid,
  accommodation_listing_id uuid,
  edit_deadline_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.accommodation_reports%ROWTYPE;
  v_listing public.accommodation_listings%ROWTYPE;
  v_notification_id uuid;
  v_deadline timestamptz := now() + interval '3 days';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF trim(coalesce(p_message, '')) = '' THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;

  IF p_required_field IS NULL OR p_required_field NOT IN (
    'title',
    'monthly_rent',
    'address',
    'description',
    'amenities',
    'image_urls',
    'universities',
    'building_count',
    'building_addresses'
  ) THEN
    RAISE EXCEPTION 'Choose the information that must be corrected.';
  END IF;

  SELECT * INTO v_report
  FROM public.accommodation_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found.';
  END IF;

  SELECT * INTO v_listing
  FROM public.accommodation_listings
  WHERE id = v_report.accommodation_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accommodation listing not found.';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    message,
    accommodation_listing_id
  )
  VALUES (
    v_listing.seller_id,
    'accommodation_report_warning',
    p_message,
    v_listing.id
  )
  RETURNING id INTO v_notification_id;

  UPDATE public.accommodation_listings
  SET
    report_warning_sent_at = now(),
    report_edit_deadline_at = v_deadline,
    report_required_field = p_required_field
  WHERE id = v_listing.id;

  UPDATE public.accommodation_reports
  SET status = 'reviewed'
  WHERE id = v_report.id;

  RETURN QUERY
  SELECT v_notification_id, v_listing.id, v_deadline;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_accommodation_report_warning(uuid, text, text) TO authenticated;


-- Refresh the existing admin report RPC so the admin page also receives the
-- warning/deadline state after a reload.
-- PostgreSQL does not allow CREATE OR REPLACE FUNCTION when the OUT/TABLE
-- return type changes, so remove the old zero-argument function first.
DROP FUNCTION IF EXISTS public.get_accommodation_reports_admin();

CREATE FUNCTION public.get_accommodation_reports_admin()
RETURNS TABLE (
  id uuid,
  accommodation_listing_id uuid,
  reporter_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  reporter_name text,
  seller_id uuid,
  seller_name text,
  listing_title text,
  listing_image_urls text[],
  report_warning_sent_at timestamptz,
  report_edit_deadline_at timestamptz,
  report_required_field text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.accommodation_listing_id,
    r.reporter_id,
    r.reason,
    r.status,
    r.created_at,
    reporter.full_name,
    a.seller_id,
    seller.full_name,
    a.title,
    a.image_urls,
    a.report_warning_sent_at,
    a.report_edit_deadline_at,
    a.report_required_field
  FROM public.accommodation_reports r
  JOIN public.accommodation_listings a
    ON a.id = r.accommodation_listing_id
  LEFT JOIN public.profiles reporter
    ON reporter.id = r.reporter_id
  LEFT JOIN public.profiles seller
    ON seller.id = a.seller_id
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accommodation_reports_admin() TO authenticated;
