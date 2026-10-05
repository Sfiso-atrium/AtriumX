-- Fix wanted-post visibility for signed-in users.
--
-- The original policy compared a wanted post's seeker through the private
-- profiles table. After profile privacy was tightened, authenticated users
-- could only read their own profiles row, so the nested seeker lookup failed
-- for everybody else. The result was that signed-in students only saw their
-- own wanted posts, while guests could still see active posts.
--
-- Keep the private profiles table protected and move the university check
-- into this narrow SECURITY DEFINER predicate. It returns only a boolean.
CREATE OR REPLACE FUNCTION public.can_view_wanted_post_seeker(p_seeker_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.profiles seeker ON seeker.id = p_seeker_id
    LEFT JOIN public.business_profiles bp ON bp.id = me.id
    WHERE me.id = auth.uid()
      AND (
        me.is_admin = true
        OR (
          me.account_type = 'student'
          AND (me.university IS NULL OR seeker.university = me.university)
        )
        OR (
          me.account_type = 'business'
          AND seeker.university = ANY(COALESCE(bp.universities, '{}'::text[]))
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_wanted_post_seeker(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_wanted_post_seeker(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "wanted_posts_select_scoped" ON public.wanted_posts;

CREATE POLICY "wanted_posts_select_scoped"
ON public.wanted_posts
FOR SELECT
USING (
  seeker_id = auth.uid()
  OR (
    status = 'active'
    AND (
      auth.uid() IS NULL
      OR public.can_view_wanted_post_seeker(seeker_id)
    )
  )
);
