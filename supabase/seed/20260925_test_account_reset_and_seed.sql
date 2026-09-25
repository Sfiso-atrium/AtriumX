-- AtriumX test-account reset + seed
-- TEST DATA: run in the Supabase SQL Editor.
-- Scope: only the 17 supplied email accounts.
-- The script fails rather than guessing when an account is missing or a
-- business account has no matching business_profiles row.

BEGIN;

CREATE TEMP TABLE atriumx_seed_accounts (
  email text PRIMARY KEY,
  slot integer NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO atriumx_seed_accounts (email, slot) VALUES
  ('mmvelase1@gmail.com', 1),
  ('abongwe@gmail.com', 2),
  ('abongwe@students.wits.ac.za', 3),
  ('babongile@gmail.com', 4),
  ('mmvelase121@gmail.com', 5),
  ('sandile@gmail.com', 6),
  ('sfiso@gmail.com', 7),
  ('thandeka@gmail.com', 8),
  ('mmvelase3@gmail.com', 9),
  ('mmvelase35@gmail.com', 10),
  ('mmvelase10@gmail.com', 11),
  ('sfisoholdings0@gmail.com', 12),
  ('sfisomvelase@gmail.com', 13),
  ('mmvelase21@stu.ac.za', 14),
  ('mmvelases@students.wits.ac.za', 15),
  ('mmvelase@students.wits.ac.za', 16),
  ('saliwa@gmail.com', 17);

-- Resolve all target accounts before modifying anything.
DO $$
DECLARE missing_emails text;
BEGIN
  SELECT string_agg(a.email, ', ' ORDER BY a.slot)
    INTO missing_emails
  FROM atriumx_seed_accounts a
  LEFT JOIN profiles p ON lower(trim(p.email)) = a.email
  WHERE p.id IS NULL;

  IF missing_emails IS NOT NULL THEN
    RAISE EXCEPTION 'Reset aborted. Missing profiles: %', missing_emails;
  END IF;
END;
$$;

-- The existing application uses business_profiles as the concrete business
-- record. Repair only an account whose business_profiles row proves it is a
-- business account.
UPDATE profiles p
SET account_type = 'business'
FROM business_profiles bp, atriumx_seed_accounts a
WHERE bp.id = p.id
  AND lower(trim(p.email)) = a.email
  AND p.account_type <> 'business';

DO $$
DECLARE missing_business_profiles text;
BEGIN
  SELECT string_agg(p.email, ', ' ORDER BY a.slot)
    INTO missing_business_profiles
  FROM atriumx_seed_accounts a
  JOIN profiles p ON lower(trim(p.email)) = a.email
  WHERE p.account_type = 'business'
    AND NOT EXISTS (SELECT 1 FROM business_profiles bp WHERE bp.id = p.id);

  IF missing_business_profiles IS NOT NULL THEN
    RAISE EXCEPTION 'Reset aborted. Business accounts without business_profiles: %', missing_business_profiles;
  END IF;
END;
$$;

-- 1. Delete every normal and accommodation listing owned by the target set.
-- Existing foreign keys handle dependent listing records according to the
-- project's current cascade/set-null rules.
DELETE FROM listings l
USING profiles p, atriumx_seed_accounts a
WHERE l.seller_id = p.id
  AND lower(trim(p.email)) = a.email;

DELETE FROM accommodation_listings l
USING profiles p, atriumx_seed_accounts a
WHERE l.seller_id = p.id
  AND lower(trim(p.email)) = a.email;

-- 2. Distribute the target accounts between two existing universities.
UPDATE profiles p
SET university = CASE
  WHEN a.slot % 2 = 1 THEN 'University of the Witwatersrand'
  ELSE 'University of Pretoria'
END
FROM atriumx_seed_accounts a
WHERE lower(trim(p.email)) = a.email;

-- 3. Student plans: Ghost -> Visible -> Loud -> Unmissable.
WITH ranked AS (
  SELECT p.id, row_number() OVER (ORDER BY a.slot) AS rn
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  WHERE p.account_type = 'student'
), assigned AS (
  SELECT id, CASE ((rn - 1) % 4)
    WHEN 0 THEN 'ghost' WHEN 1 THEN 'visible' WHEN 2 THEN 'loud' ELSE 'unmissable'
  END AS plan_key
  FROM ranked
)
UPDATE profiles p
SET
  plan = a.plan_key,
  plan_expires_at = now() + CASE a.plan_key
    WHEN 'ghost' THEN interval '3 days'
    WHEN 'visible' THEN interval '7 days'
    WHEN 'loud' THEN interval '14 days'
    WHEN 'unmissable' THEN interval '30 days'
  END
FROM assigned a
WHERE p.id = a.id;

-- 4. Ordinary business plans: Noticeboard -> Featured -> Campus Partner.
-- Accommodation is deliberately excluded because it has its own plan column.
WITH ranked AS (
  SELECT p.id,
         row_number() OVER (ORDER BY a.slot) AS rn,
         CASE WHEN a.slot % 2 = 1 THEN 'University of the Witwatersrand' ELSE 'University of Pretoria' END AS primary_university,
         CASE WHEN a.slot % 2 = 1 THEN 'University of Pretoria' ELSE 'University of the Witwatersrand' END AS secondary_university
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  JOIN business_profiles bp ON bp.id = p.id
  WHERE p.account_type = 'business' AND bp.is_accommodation = false
), assigned AS (
  SELECT id, primary_university, secondary_university,
         CASE ((rn - 1) % 3)
           WHEN 0 THEN 'noticeboard' WHEN 1 THEN 'featured' ELSE 'campus_partner'
         END AS plan_key
  FROM ranked
)
UPDATE profiles p
SET
  plan = a.plan_key,
  plan_expires_at = now() + CASE a.plan_key
    WHEN 'noticeboard' THEN interval '7 days'
    WHEN 'featured' THEN interval '14 days'
    WHEN 'campus_partner' THEN interval '30 days'
  END
FROM assigned a
WHERE p.id = a.id;

WITH ranked AS (
  SELECT p.id,
         row_number() OVER (ORDER BY a.slot) AS rn,
         CASE WHEN a.slot % 2 = 1 THEN 'University of the Witwatersrand' ELSE 'University of Pretoria' END AS primary_university,
         CASE WHEN a.slot % 2 = 1 THEN 'University of Pretoria' ELSE 'University of the Witwatersrand' END AS secondary_university
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  JOIN business_profiles bp ON bp.id = p.id
  WHERE p.account_type = 'business' AND bp.is_accommodation = false
), assigned AS (
  SELECT id, primary_university, secondary_university,
         CASE ((rn - 1) % 3)
           WHEN 0 THEN 'noticeboard' WHEN 1 THEN 'featured' ELSE 'campus_partner'
         END AS plan_key
  FROM ranked
)
UPDATE business_profiles bp
SET universities = CASE a.plan_key
  WHEN 'noticeboard' THEN ARRAY[a.primary_university]
  WHEN 'featured' THEN ARRAY[a.primary_university, a.secondary_university]
  WHEN 'campus_partner' THEN ARRAY[a.primary_university, a.secondary_university, 'University of Johannesburg']
END
FROM assigned a
WHERE bp.id = a.id;

-- 5. Accommodation plans use the dedicated accommodation_plan field.
WITH ranked AS (
  SELECT bp.id,
         row_number() OVER (ORDER BY a.slot) AS rn,
         CASE WHEN a.slot % 2 = 1 THEN 'University of the Witwatersrand' ELSE 'University of Pretoria' END AS primary_university,
         CASE WHEN a.slot % 2 = 1 THEN 'University of Pretoria' ELSE 'University of the Witwatersrand' END AS secondary_university
  FROM business_profiles bp
  JOIN profiles p ON p.id = bp.id
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  WHERE p.account_type = 'business' AND bp.is_accommodation = true
), assigned AS (
  SELECT id, primary_university, secondary_university,
         CASE
           WHEN rn = 1 THEN 'accommodation_premium'
           WHEN rn = 2 THEN 'accommodation_featured'
           WHEN rn = 3 THEN 'accommodation_free'
           ELSE CASE ((rn - 1) % 3)
             WHEN 0 THEN 'accommodation_premium'
             WHEN 1 THEN 'accommodation_featured'
             ELSE 'accommodation_free'
           END
         END AS plan_key
  FROM ranked
)
UPDATE business_profiles bp
SET
  accommodation_plan = a.plan_key,
  accommodation_plan_expires_at = now() + interval '30 days',
  universities = CASE a.plan_key
    WHEN 'accommodation_free' THEN ARRAY[a.primary_university]
    WHEN 'accommodation_featured' THEN ARRAY[a.primary_university, a.secondary_university]
    WHEN 'accommodation_premium' THEN ARRAY[a.primary_university, a.secondary_university, 'University of Johannesburg']
  END
FROM assigned a
WHERE bp.id = a.id;

-- Keep ordinary profiles.plan at the business baseline for accommodation
-- accounts so the two account systems never borrow each other's plan field.
UPDATE profiles p
SET plan = 'noticeboard', plan_expires_at = now() + interval '7 days'
FROM atriumx_seed_accounts a, business_profiles bp
WHERE bp.id = p.id
  AND lower(trim(p.email)) = a.email
  AND p.account_type = 'business'
  AND bp.is_accommodation = true;

-- 6. Recreate one active listing for every student account.
-- The existing listing trigger will keep plan_tier consistent with profiles.plan.
WITH ranked AS (
  SELECT p.id, p.residence, row_number() OVER (ORDER BY a.slot) AS rn
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  WHERE p.account_type = 'student'
)
INSERT INTO listings (
  seller_id,title,description,price,category,custom_category,image_urls,video_url,
  residence,listing_type,is_negotiable,plan_tier,status,variants,expires_at,universities
)
SELECT
  id,
  CASE ((rn - 1) % 4)
    WHEN 0 THEN 'Engineering Mathematics Textbook Bundle'
    WHEN 1 THEN 'USB-C Laptop Charger 65W'
    WHEN 2 THEN 'Campus Hoodie — Like New'
    ELSE 'Compact Study Desk'
  END,
  CASE ((rn - 1) % 4)
    WHEN 0 THEN 'Textbook bundle in good condition for campus collection.'
    WHEN 1 THEN '65W USB-C laptop charger in working condition.'
    WHEN 2 THEN 'Campus hoodie in good condition and ready to wear.'
    ELSE 'Compact study desk suitable for a residence room.'
  END,
  CASE ((rn - 1) % 4) WHEN 0 THEN 450 WHEN 1 THEN 350 WHEN 2 THEN 250 ELSE 700 END,
  CASE ((rn - 1) % 4) WHEN 0 THEN 'textbooks' WHEN 1 THEN 'electronics' WHEN 2 THEN 'clothing' ELSE 'furniture' END,
  NULL,
  CASE WHEN ((rn - 1) % 4) IN (1,2,3) THEN ARRAY['/images/entrance/campus-library.jpg'] ELSE '{}' END,
  NULL,
  COALESCE(NULLIF(residence, ''), 'Campus'),
  'single', true,
  CASE ((rn - 1) % 4) WHEN 0 THEN 'ghost' WHEN 1 THEN 'visible' WHEN 2 THEN 'loud' ELSE 'unmissable' END,
  'active',
  '[]'::jsonb,
  now() + CASE ((rn - 1) % 4) WHEN 0 THEN interval '3 days' WHEN 1 THEN interval '7 days' WHEN 2 THEN interval '14 days' ELSE interval '30 days' END,
  '{}'
FROM ranked;

-- 7. Recreate one active ordinary-business listing for every ordinary business.
WITH ranked AS (
  SELECT p.id, bp.business_name, bp.business_type, bp.universities, p.plan
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  JOIN business_profiles bp ON bp.id = p.id
  WHERE p.account_type = 'business' AND bp.is_accommodation = false
)
INSERT INTO listings (
  seller_id,title,description,price,category,custom_category,image_urls,video_url,
  residence,listing_type,is_negotiable,plan_tier,status,variants,expires_at,universities
)
SELECT
  id,
  CASE business_type
    WHEN 'Restaurant' THEN 'Student Meal Special'
    WHEN 'Clothing' THEN 'Campus Clothing Deal'
    WHEN 'Electronics' THEN 'Student Tech Accessories'
    WHEN 'Tutoring' THEN 'Exam Tutoring Sessions'
    WHEN 'Printing' THEN 'Student Printing & Binding'
    WHEN 'Salon' THEN 'Student Hair & Grooming Offer'
    ELSE business_name || ' — Student Offer'
  END,
  'Test listing for ' || business_name || ' to exercise the ordinary business marketplace flow.',
  CASE business_type
    WHEN 'Restaurant' THEN 60 WHEN 'Clothing' THEN 180 WHEN 'Electronics' THEN 250
    WHEN 'Tutoring' THEN 150 WHEN 'Printing' THEN 40 WHEN 'Salon' THEN 120 ELSE 100
  END,
  business_type,
  CASE WHEN business_type = 'Other' THEN business_type ELSE NULL END,
  CASE WHEN plan IN ('featured','campus_partner') THEN ARRAY['/images/entrance/campus-library.jpg'] ELSE '{}' END,
  NULL,
  '', 'ongoing', true, plan, 'active', '[]'::jsonb,
  now() + CASE plan WHEN 'noticeboard' THEN interval '7 days' WHEN 'featured' THEN interval '14 days' ELSE interval '30 days' END,
  universities
FROM ranked;

-- 8. Recreate one accommodation listing per accommodation account.
-- The Premium listing is intentionally created with video_url = NULL here.
-- A real MP4 upload is performed separately by
-- supabase/seed/upload_test_video_and_set_url.mjs, which uses the same
-- Supabase Storage bucket/path convention as the application's video upload.
WITH ranked AS (
  SELECT bp.id, bp.business_name, bp.universities, bp.accommodation_plan, bp.physical_address
  FROM business_profiles bp
  JOIN profiles p ON p.id = bp.id
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  WHERE p.account_type = 'business' AND bp.is_accommodation = true
)
INSERT INTO accommodation_listings (
  seller_id,title,monthly_rent,address,description,amenities,image_urls,video_url,
  universities,plan_tier,status,building_count,room_pricing,building_addresses
)
SELECT
  id,
  business_name || ' Student Accommodation',
  CASE accommodation_plan WHEN 'accommodation_free' THEN 3200 WHEN 'accommodation_featured' THEN 3900 ELSE 4600 END,
  COALESCE(NULLIF(trim(physical_address), ''), 'Campus area'),
  'Test accommodation listing for ' || business_name || ' to exercise the accommodation marketplace flow.',
  ARRAY['Wi-Fi','Security','Study area'],
  CASE WHEN accommodation_plan IN ('accommodation_featured','accommodation_premium') THEN ARRAY['/images/entrance/campus-library.jpg'] ELSE '{}' END,
  NULL,
  universities,
  accommodation_plan,
  'active',
  CASE accommodation_plan WHEN 'accommodation_free' THEN 1 WHEN 'accommodation_featured' THEN 2 ELSE 3 END,
  CASE accommodation_plan
    WHEN 'accommodation_free' THEN '[{"room_type":"single","bursary":3200,"nsfas":3300,"self_funded":3400}]'::jsonb
    WHEN 'accommodation_featured' THEN '[{"room_type":"single","bursary":3900,"nsfas":4000,"self_funded":4100},{"room_type":"shared_2","bursary":3000,"nsfas":3100,"self_funded":3200}]'::jsonb
    ELSE '[{"room_type":"single","bursary":4600,"nsfas":4700,"self_funded":4800},{"room_type":"shared_2","bursary":3500,"nsfas":3600,"self_funded":3700},{"room_type":"shared_3","bursary":3000,"nsfas":3100,"self_funded":3200}]'::jsonb
  END,
  CASE accommodation_plan
    WHEN 'accommodation_free' THEN '[]'::jsonb
    WHEN 'accommodation_featured' THEN jsonb_build_array('Additional building — same campus area')
    ELSE jsonb_build_array('Building 2 — same campus area','Building 3 — same campus area')
  END
FROM ranked;

-- 9. Keep normal profile listing counters accurate.
UPDATE profiles p
SET total_listings = (SELECT count(*) FROM listings l WHERE l.seller_id = p.id)
FROM atriumx_seed_accounts a
WHERE lower(trim(p.email)) = a.email;

-- The separate uploader script verifies that the Premium accommodation listing
-- receives a real object-backed public URL in video_url after the SQL seed.

-- 10. Validate that every supplied account now has exactly one listing in the
-- correct listing system and every business account has university access.
DO $$
DECLARE
  zero_listing_accounts text;
  business_university_errors text;
  multi_listing_accounts text;
BEGIN
  SELECT string_agg(p.email, ', ' ORDER BY a.slot)
    INTO zero_listing_accounts
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  WHERE NOT EXISTS (SELECT 1 FROM listings l WHERE l.seller_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM accommodation_listings al WHERE al.seller_id = p.id);

  IF zero_listing_accounts IS NOT NULL THEN
    RAISE EXCEPTION 'Validation failed. No listing for: %', zero_listing_accounts;
  END IF;

  SELECT string_agg(p.email, ', ' ORDER BY a.slot)
    INTO multi_listing_accounts
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  WHERE (SELECT count(*) FROM listings l WHERE l.seller_id = p.id)
      + (SELECT count(*) FROM accommodation_listings al WHERE al.seller_id = p.id) <> 1;

  IF multi_listing_accounts IS NOT NULL THEN
    RAISE EXCEPTION 'Validation failed. More than one listing for: %', multi_listing_accounts;
  END IF;

  SELECT string_agg(p.email, ', ' ORDER BY a.slot)
    INTO business_university_errors
  FROM profiles p
  JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
  JOIN business_profiles bp ON bp.id = p.id
  WHERE p.account_type = 'business'
    AND COALESCE(array_length(bp.universities, 1), 0) = 0;

  IF business_university_errors IS NOT NULL THEN
    RAISE EXCEPTION 'Validation failed. Business accounts without university access: %', business_university_errors;
  END IF;
END;
$$;

-- Result report: this is the authoritative classification/plan/university
-- state after the reset.
SELECT
  p.email,
  p.account_type,
  p.university,
  p.plan AS profile_plan,
  bp.is_accommodation,
  bp.accommodation_plan,
  bp.universities AS university_access,
  CASE WHEN bp.is_accommodation
    THEN (SELECT count(*) FROM accommodation_listings al WHERE al.seller_id = p.id)
    ELSE (SELECT count(*) FROM listings l WHERE l.seller_id = p.id)
  END AS listing_count,
  CASE WHEN bp.is_accommodation
    THEN (SELECT string_agg(al.title, ' | ' ORDER BY al.created_at) FROM accommodation_listings al WHERE al.seller_id = p.id)
    ELSE (SELECT string_agg(l.title, ' | ' ORDER BY l.created_at) FROM listings l WHERE l.seller_id = p.id)
  END AS listing_titles
FROM profiles p
JOIN atriumx_seed_accounts a ON lower(trim(p.email)) = a.email
LEFT JOIN business_profiles bp ON bp.id = p.id
ORDER BY a.slot;

COMMIT;
