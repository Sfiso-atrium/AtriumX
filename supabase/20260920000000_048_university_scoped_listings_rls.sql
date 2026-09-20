-- Listings were only ever scoped to the viewer's university at the app
-- query level (getListings in dataService.ts adds .eq('seller.university',
-- currentUser.university)). The row-level security policy itself,
-- listings_select_active, never checked university -- it only checked
-- status = 'active'. That means the normal website always filtered
-- correctly, but anyone querying the Supabase REST API directly (e.g.
-- with the public anon key, which ships in the client bundle) could read
-- every active listing across every university, bypassing the app
-- entirely.
--
-- This tightens listings_select_active so the database itself enforces
-- the boundary: a logged-in student can only ever see active listings
-- whose seller shares their university. Logged-out/anon visitors keep
-- seeing every active listing (no university to scope by), matching
-- existing anon behaviour elsewhere in this schema.

drop policy if exists "listings_select_active" on listings;

create policy "listings_select_active" on listings for select using (
  status = 'active'
  and (
    -- Not logged in: unchanged, still publicly browsable.
    auth.uid() is null
    -- Logged in: only if the listing's seller shares your university,
    -- or your own profile has no university set yet (fail-open rather
    -- than fail-closed for an incomplete profile, matching how the app
    -- query already behaves when currentUser.university is falsy).
    or exists (
      select 1 from profiles me
      where me.id = auth.uid()
        and (
          me.university is null
          or exists (
            select 1 from profiles seller
            where seller.id = listings.seller_id
              and seller.university = me.university
          )
        )
    )
  )
);
