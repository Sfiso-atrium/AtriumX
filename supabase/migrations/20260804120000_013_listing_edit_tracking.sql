-- Tracks when a seller edits an already-live listing, so admins can review
-- what changed without the listing having to go offline while they do.
alter table listings
  add column has_pending_edit boolean not null default false,
  add column edited_at timestamptz;

comment on column listings.has_pending_edit is
  'True when the seller has edited this listing since an admin last reviewed it. The listing stays live regardless of this flag — purely informational, drives the admin panel "Edited" tab.';
comment on column listings.edited_at is
  'Timestamp of the seller''s most recent edit. Used to sort the admin "Edited" tab newest-first.';
