CREATE TABLE public.accommodation_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_hash text NOT NULL UNIQUE CHECK (receipt_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text NOT NULL,
  email text NOT NULL,
  contact_number text NOT NULL,
  website text,
  payload jsonb NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','claimed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  claimed_listing_id uuid REFERENCES public.accommodation_listings(id),
  claimed_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.accommodation_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.accommodation_submissions FROM anon, authenticated;
GRANT ALL ON public.accommodation_submissions TO service_role;
CREATE INDEX accommodation_submissions_ip_time ON public.accommodation_submissions(ip_hash,created_at);
CREATE INDEX accommodation_submissions_status_time ON public.accommodation_submissions(status,created_at);

-- Called only by the intake Edge Function after field/image validation.
CREATE FUNCTION public.reserve_accommodation_submission(p_receipt_hash text,p_ip_hash text,p_email text,p_phone text,p_website text,p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash,0));
  SELECT id INTO v_id FROM accommodation_submissions WHERE receipt_hash=p_receipt_hash;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  IF (SELECT count(*) FROM accommodation_submissions WHERE ip_hash=p_ip_hash AND created_at>now()-interval '1 hour') >= 10
     OR (SELECT count(*) FROM accommodation_submissions WHERE email=lower(trim(p_email)) AND created_at>now()-interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'Too many submissions. Please try again later.';
  END IF;
  INSERT INTO accommodation_submissions(receipt_hash,ip_hash,email,contact_number,website,payload)
  VALUES(p_receipt_hash,p_ip_hash,lower(trim(p_email)),p_phone,p_website,p_payload) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_accommodation_submission(text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_accommodation_submission(text,text,text,text,text,jsonb) TO service_role;

CREATE FUNCTION public.get_accommodation_submissions_admin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(s)-ARRAY['receipt_hash','ip_hash'] ORDER BY created_at DESC)
    FROM accommodation_submissions s WHERE status IN ('pending','approved','rejected')),'[]'::jsonb);
END;
$$;
CREATE FUNCTION public.review_accommodation_submission(p_id uuid,p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  UPDATE accommodation_submissions SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),reviewed_by=auth.uid() WHERE id=p_id AND status IN ('pending','approved','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission is not available for review.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_accommodation_submissions_admin() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.review_accommodation_submission(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_accommodation_submissions_admin(),public.review_accommodation_submission(uuid,boolean) TO authenticated;

-- A deliberately limited public projection. Email, receipt, IP and review data stay private.
CREATE FUNCTION public.get_public_accommodation_submissions(p_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT COALESCE(jsonb_agg(row ORDER BY created_at DESC),'[]'::jsonb) FROM (
  SELECT s.created_at, s.payload || jsonb_build_object(
    'id',s.id,'seller_id',NULL,'image_urls',s.image_urls,'video_url',NULL,
    'seller_website',s.website,'contact_number',s.contact_number,'guest_submission',true,
    'status','active','plan_tier','accommodation_free','created_at',s.created_at,
    'avg_rating',0,'total_reviews',0,'max_universities',1,'reach_paused',false,
    'active_universities',s.payload->'universities','building_addresses','[]'::jsonb,
    'monthly_rent',NULL,'redirect_listing_id',s.claimed_listing_id) AS row
  FROM accommodation_submissions s
  WHERE (s.status='approved' OR (p_id IS NOT NULL AND s.status='claimed')) AND (p_id IS NULL OR s.id=p_id)
    AND (auth.uid() IS NULL OR public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND NOT p.is_blocked AND (
        (p.account_type='student' AND (s.payload->'universities') ? p.university)
        OR EXISTS (SELECT 1 FROM business_profiles bp WHERE bp.id=p.id AND bp.is_accommodation)
      )
    ))
  ORDER BY s.created_at DESC LIMIT 200
 ) visible;
$$;
REVOKE ALL ON FUNCTION public.get_public_accommodation_submissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_accommodation_submissions(uuid) TO anon,authenticated;

CREATE FUNCTION public.claim_accommodation_submission(p_id uuid,p_receipt_hash text,p_image_urls text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s accommodation_submissions; v_listing uuid; v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to your accommodation account first.'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
  SELECT * INTO s FROM accommodation_submissions WHERE id=p_id AND receipt_hash=p_receipt_hash FOR UPDATE;
  IF NOT FOUND OR lower(v_email) IS DISTINCT FROM s.email THEN RAISE EXCEPTION 'Use the verified email and saved receipt from this submission.'; END IF;
  IF s.status='claimed' AND s.claimed_by=auth.uid() THEN RETURN s.claimed_listing_id; END IF;
  IF s.status<>'approved' THEN RAISE EXCEPTION 'Your submission must be approved before it can be linked to your account.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles p JOIN business_profiles b ON b.id=p.id
    WHERE p.id=auth.uid() AND p.account_type='business' AND b.is_accommodation AND NOT p.is_blocked) THEN
    RAISE EXCEPTION 'An accommodation provider account is required.';
  END IF;
  IF cardinality(p_image_urls)<>cardinality(s.image_urls) THEN RAISE EXCEPTION 'Photo transfer is incomplete.'; END IF;
  v_listing := public.create_accommodation_listing(
    p_seller_id=>auth.uid(),p_title=>s.payload->>'title',p_building_count=>(s.payload->>'building_count')::integer,
    p_address=>s.payload->>'address',p_description=>s.payload->>'description',
    p_amenities=>ARRAY(SELECT jsonb_array_elements_text(s.payload->'amenities')),
    p_image_urls=>p_image_urls,p_universities=>ARRAY(SELECT jsonb_array_elements_text(s.payload->'universities')),
    p_plan_tier=>public.current_accommodation_plan(auth.uid()),p_room_pricing=>s.payload->'room_pricing',p_video_url=>NULL,p_building_addresses=>'[]'::jsonb
  );
  UPDATE accommodation_submissions SET status='claimed',claimed_by=auth.uid(),claimed_listing_id=v_listing WHERE id=s.id;
  RETURN v_listing;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_accommodation_submission(uuid,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_accommodation_submission(uuid,text,text[]) TO authenticated;
