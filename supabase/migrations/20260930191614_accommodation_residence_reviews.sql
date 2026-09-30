-- A residence outlives its advertisement. Reviews remain when a listing is removed.
CREATE TABLE public.accommodation_residences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 150),
  name_key text GENERATED ALWAYS AS (lower(regexp_replace(trim(name), '\s+', ' ', 'g'))) STORED,
  university text NOT NULL,
  listing_id uuid UNIQUE REFERENCES public.accommodation_listings(id) ON DELETE SET NULL,
  submission_id uuid UNIQUE REFERENCES public.accommodation_submissions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name_key, university)
);
ALTER TABLE public.accommodation_residences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.accommodation_residences FROM anon,authenticated;
GRANT SELECT ON public.accommodation_residences TO anon,authenticated;
GRANT ALL ON public.accommodation_residences TO service_role;
CREATE POLICY residences_public_read ON public.accommodation_residences FOR SELECT TO anon,authenticated USING(true);

ALTER TABLE public.accommodation_reviews ADD COLUMN residence_id uuid REFERENCES public.accommodation_residences(id) ON DELETE RESTRICT;
ALTER TABLE public.accommodation_reviews ADD COLUMN reviewer_name text;
ALTER TABLE public.accommodation_reviews ALTER COLUMN accommodation_listing_id DROP NOT NULL;
ALTER TABLE public.accommodation_reviews DROP CONSTRAINT accommodation_reviews_accommodation_listing_id_fkey;
ALTER TABLE public.accommodation_reviews ADD CONSTRAINT accommodation_reviews_accommodation_listing_id_fkey
  FOREIGN KEY(accommodation_listing_id) REFERENCES public.accommodation_listings(id) ON DELETE SET NULL;

-- Only internal triggers call this function. Matching uses both name AND campus.
CREATE FUNCTION public.ensure_accommodation_residence(p_name text,p_university text,p_listing uuid DEFAULT NULL,p_submission uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_listing IS NOT NULL THEN SELECT id INTO v_id FROM accommodation_residences WHERE listing_id=p_listing; END IF;
  IF v_id IS NULL AND p_submission IS NOT NULL THEN SELECT id INTO v_id FROM accommodation_residences WHERE submission_id=p_submission; END IF;
  IF v_id IS NULL THEN
    INSERT INTO accommodation_residences(name,university,listing_id,submission_id)
    VALUES(trim(p_name),p_university,p_listing,p_submission)
    ON CONFLICT(name_key,university) DO UPDATE SET
      listing_id=COALESCE(accommodation_residences.listing_id,EXCLUDED.listing_id),
      submission_id=COALESCE(accommodation_residences.submission_id,EXCLUDED.submission_id)
    RETURNING id INTO v_id;
  ELSIF p_listing IS NOT NULL THEN
    UPDATE accommodation_residences SET listing_id=p_listing WHERE id=v_id AND listing_id IS NULL;
  END IF;
  IF p_listing IS NOT NULL AND EXISTS(SELECT 1 FROM accommodation_residences WHERE id=v_id AND listing_id IS DISTINCT FROM p_listing) THEN
    RAISE EXCEPTION 'A property with this name is already listed near this university. Use a distinct residence or building name.';
  END IF;
  UPDATE accommodation_reviews r SET accommodation_listing_id=d.listing_id
    FROM accommodation_residences d WHERE d.id=v_id AND r.residence_id=d.id AND r.accommodation_listing_id IS NULL AND d.listing_id IS NOT NULL;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_accommodation_residence(text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;

SELECT public.ensure_accommodation_residence(title,COALESCE(universities[1],'University not specified'),id) FROM public.accommodation_listings WHERE status='active' OR EXISTS(SELECT 1 FROM public.accommodation_reviews WHERE accommodation_listing_id=accommodation_listings.id);
SELECT public.ensure_accommodation_residence(payload->>'title',payload->'universities'->>0,claimed_listing_id,id)
  FROM public.accommodation_submissions WHERE status IN ('approved','claimed');
UPDATE public.accommodation_reviews r SET residence_id=d.id,reviewer_name=COALESCE(NULLIF(trim(p.full_name),''),'Student')
  FROM public.accommodation_residences d,public.profiles p WHERE d.listing_id=r.accommodation_listing_id AND p.id=r.student_id;
ALTER TABLE public.accommodation_reviews ALTER COLUMN residence_id SET NOT NULL;
ALTER TABLE public.accommodation_reviews ALTER COLUMN reviewer_name SET NOT NULL;
CREATE UNIQUE INDEX accommodation_reviews_residence_student ON public.accommodation_reviews(residence_id,student_id);

CREATE FUNCTION public.sync_accommodation_residence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_TABLE_NAME='accommodation_listings' THEN
    IF NEW.status<>'active' THEN RETURN NEW; END IF;
    PERFORM public.ensure_accommodation_residence(NEW.title,COALESCE(NEW.universities[1],'University not specified'),NEW.id);
  ELSIF NEW.status IN ('approved','claimed') THEN
    PERFORM public.ensure_accommodation_residence(NEW.payload->>'title',NEW.payload->'universities'->>0,NEW.claimed_listing_id,NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sync_accommodation_residence AFTER INSERT OR UPDATE OF title,universities,status ON public.accommodation_listings FOR EACH ROW EXECUTE FUNCTION public.sync_accommodation_residence();
CREATE TRIGGER sync_accommodation_submission_residence AFTER INSERT OR UPDATE OF status ON public.accommodation_submissions FOR EACH ROW EXECUTE FUNCTION public.sync_accommodation_residence();
REVOKE ALL ON FUNCTION public.sync_accommodation_residence() FROM PUBLIC,anon,authenticated;

-- Protect authors, ratings and review text from edits by property owners.
CREATE FUNCTION public.guard_accommodation_review() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_name text; v_listing uuid;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
    IF pg_trigger_depth()>1 AND OLD.accommodation_listing_id IS NOT NULL AND NEW.accommodation_listing_id IS NULL
      AND (to_jsonb(NEW)-'accommodation_listing_id')=(to_jsonb(OLD)-'accommodation_listing_id')
      AND NOT EXISTS(SELECT 1 FROM accommodation_listings WHERE id=OLD.accommodation_listing_id) THEN RETURN NEW; END IF;
    IF (to_jsonb(NEW)-ARRAY['reply','replied_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['reply','replied_at']) THEN
      RAISE EXCEPTION 'A property owner may reply but cannot change a student review.';
    END IF;
    IF length(COALESCE(NEW.reply,''))>3000 THEN RAISE EXCEPTION 'Replies must be at most 3000 characters.'; END IF;
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NEW.student_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sign in as a student to review accommodation.'; END IF;
  SELECT full_name INTO v_name FROM profiles WHERE id=auth.uid() AND account_type='student' AND NOT is_blocked;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only active student accounts can post reviews.'; END IF;
  IF NEW.residence_id IS NULL THEN SELECT id INTO NEW.residence_id FROM accommodation_residences WHERE listing_id=NEW.accommodation_listing_id; END IF;
  SELECT listing_id INTO v_listing FROM accommodation_residences WHERE id=NEW.residence_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a residence first.'; END IF;
  IF NEW.stars IS NULL OR NEW.stars NOT BETWEEN 1 AND 5 OR length(trim(COALESCE(NEW.comment,''))) NOT BETWEEN 1 AND 3000 THEN
    RAISE EXCEPTION 'Choose 1–5 stars and write a review of up to 3000 characters.';
  END IF;
  NEW.accommodation_listing_id:=v_listing;
  NEW.reviewer_name:=COALESCE(NULLIF(trim(v_name),''),'Student');
  NEW.reply:=NULL; NEW.replied_at:=NULL; NEW.created_at:=now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_accommodation_review BEFORE INSERT OR UPDATE ON public.accommodation_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_accommodation_review();
REVOKE ALL ON FUNCTION public.guard_accommodation_review() FROM PUBLIC,anon,authenticated;
DROP POLICY accommodation_reviews_insert_student ON public.accommodation_reviews;
CREATE POLICY accommodation_reviews_insert_student ON public.accommodation_reviews FOR INSERT TO authenticated WITH CHECK(
  student_id=auth.uid() AND EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND account_type='student' AND NOT is_blocked)
);

CREATE FUNCTION public.submit_residence_review(p_residence_id uuid,p_name text,p_university text,p_stars integer,p_comment text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_residence uuid:=p_residence_id; v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND account_type='student' AND NOT is_blocked) THEN
    RAISE EXCEPTION 'Sign in with a student account to write a review.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
  IF (SELECT count(*) FROM accommodation_reviews WHERE student_id=auth.uid() AND created_at>now()-interval '1 day')>=10 THEN
    RAISE EXCEPTION 'You have reached the daily review limit. Please try again tomorrow.';
  END IF;
  IF v_residence IS NULL THEN
    IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 150 OR p_university IS NULL OR NOT (p_university=ANY(ARRAY['Cape Peninsula University of Technology','Central University of Technology','Durban University of Technology','Mangosuthu University of Technology','Nelson Mandela University','North-West University','Rhodes University','Sefako Makgatho Health Sciences University','Sol Plaatje University','Stellenbosch University','Tshwane University of Technology','University of Cape Town','University of Fort Hare','University of Johannesburg','University of KwaZulu-Natal','University of Limpopo','University of Mpumalanga','University of Pretoria','University of South Africa','University of the Free State','University of the Western Cape','University of the Witwatersrand','University of Venda','University of Zululand','Vaal University of Technology','Walter Sisulu University'])) THEN
      RAISE EXCEPTION 'Enter a residence name and choose its nearby university.';
    END IF;
    v_residence:=public.ensure_accommodation_residence(p_name,p_university);
  END IF;
  INSERT INTO accommodation_reviews(residence_id,student_id,stars,comment)
    VALUES(v_residence,auth.uid(),p_stars,trim(p_comment)) RETURNING id INTO v_id;
  RETURN v_residence;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'You have already reviewed this residence.';
END;
$$;
REVOKE ALL ON FUNCTION public.submit_residence_review(uuid,text,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_residence_review(uuid,text,text,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_accommodation_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_seller uuid; v_plan text;
BEGIN
  SELECT seller_id INTO v_seller FROM accommodation_listings WHERE id=NEW.accommodation_listing_id;
  IF v_seller IS NULL THEN RETURN NEW; END IF;
  v_plan:=public.current_accommodation_plan(v_seller);
  INSERT INTO notifications(user_id,type,message) VALUES(v_seller,
    CASE WHEN v_plan IN ('accommodation_featured','accommodation_premium') THEN 'review' ELSE 'review_locked' END,
    NEW.reviewer_name || ' left a review on your accommodation.');
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.enforce_accommodation_review_reply_tier() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_seller uuid;
BEGIN
  IF NEW.reply IS DISTINCT FROM OLD.reply AND NEW.reply IS NOT NULL THEN
    SELECT seller_id INTO v_seller FROM accommodation_listings WHERE id=NEW.accommodation_listing_id;
    IF COALESCE(public.current_accommodation_plan(v_seller),'accommodation_free') NOT IN ('accommodation_featured','accommodation_premium') THEN
      RAISE EXCEPTION 'Replying to accommodation reviews requires the Featured or Premium plan.';
    END IF;
    NEW.replied_at:=now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_on_accommodation_review(),public.enforce_accommodation_review_reply_tier() FROM PUBLIC,anon,authenticated;
