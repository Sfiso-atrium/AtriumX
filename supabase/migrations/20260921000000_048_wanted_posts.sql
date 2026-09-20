-- "Wanted" posts: a student directly posts what they're looking for,
-- instead of it being inferred from their private watchlist (which was
-- always meant for personal price alerts in My Space, not public asks).
-- Same shape of RLS as listings: viewable within your own university,
-- plus you can always see your own regardless of status.

create table wanted_posts (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  max_price numeric,
  price_flexible boolean not null default false,
  residence text,
  urgency text not null default 'no_rush' check (urgency in ('no_rush', 'this_week', 'urgent')),
  status text not null default 'active' check (status in ('active', 'fulfilled', 'expired')),
  created_at timestamptz not null default now()
);

create index wanted_posts_seeker_id_idx on wanted_posts(seeker_id);
create index wanted_posts_category_idx on wanted_posts(category);
create index wanted_posts_created_at_idx on wanted_posts(created_at desc);

alter table wanted_posts enable row level security;

-- Same university-scoping shape as listings_select_active (migration 048
-- on the listings table): logged-out sees everything active, logged-in
-- sees active posts from their own university (or everything if their
-- own profile has no university set yet), and a seeker can always see
-- their own post regardless of status.
create policy "wanted_posts_select_scoped" on wanted_posts for select using (
  seeker_id = auth.uid()
  or (
    status = 'active'
    and (
      auth.uid() is null
      or exists (
        select 1 from profiles me
        where me.id = auth.uid()
          and (
            me.university is null
            or exists (
              select 1 from profiles seeker
              where seeker.id = wanted_posts.seeker_id
                and seeker.university = me.university
            )
          )
      )
    )
  )
);

create policy "wanted_posts_insert_own" on wanted_posts for insert to authenticated
  with check (auth.uid() = seeker_id);
create policy "wanted_posts_update_own" on wanted_posts for update to authenticated
  using (auth.uid() = seeker_id) with check (auth.uid() = seeker_id);
create policy "wanted_posts_delete_own" on wanted_posts for delete to authenticated
  using (auth.uid() = seeker_id);

comment on table wanted_posts is
  'A student directly posting what they''re looking for, so other students can reach out. Distinct from watchlists (private price alerts in My Space) -- this is the public, intentional version.';

-- ── Let a conversation be tied to a wanted post instead of a listing ───────
--
-- conversations.listing_id was NOT NULL -- every chat had to be about a
-- listing. Wanted-post chats need a different anchor, so listing_id
-- becomes optional and wanted_post_id is added alongside it, with a check
-- ensuring exactly one of the two is ever set.
--
-- This is also what keeps the ratings flow out of wanted-post chats
-- without any extra flag: ratings.listing_id is NOT NULL and references
-- listings(id), so a rating can never be attached to a conversation that
-- has no listing_id in the first place.

alter table conversations alter column listing_id drop not null;
alter table conversations add column wanted_post_id uuid references wanted_posts(id) on delete cascade;

alter table conversations add constraint conversations_exactly_one_subject check (
  (listing_id is not null and wanted_post_id is null)
  or (listing_id is null and wanted_post_id is not null)
);

-- The old UNIQUE (listing_id, buyer_id) can't be reused as-is now that
-- listing_id is nullable (NULLs never conflict with each other in a
-- unique constraint, so it'd allow duplicate wanted-post threads).
-- Replaced with two partial unique indexes, one per subject type.
alter table conversations drop constraint conversations_listing_id_buyer_id_key;
create unique index conversations_listing_buyer_unique on conversations(listing_id, buyer_id) where listing_id is not null;
create unique index conversations_wanted_post_buyer_unique on conversations(wanted_post_id, buyer_id) where wanted_post_id is not null;

comment on column conversations.wanted_post_id is
  'Set instead of listing_id when this conversation is someone replying to a wanted post rather than asking about a listing. Exactly one of the two is always set.';
