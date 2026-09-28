-- Admin listing read access is needed for moderation, but the ordinary
-- marketplace must still follow the account's normal role and campus scope.
CREATE FUNCTION public.get_normal_marketplace_listing_ids(p_listing_ids uuid[])
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(l.id), '{}'::uuid[])
  FROM public.listings l
  WHERE l.id = ANY(COALESCE(p_listing_ids, '{}'::uuid[]))
    AND l.status = 'active'
    AND auth.uid() IS NOT NULL
    AND public.can_view_listing_scope(auth.uid(), l.seller_id, l.universities);
$$;

REVOKE ALL ON FUNCTION public.get_normal_marketplace_listing_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_normal_marketplace_listing_ids(uuid[]) TO authenticated;
