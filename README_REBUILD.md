# AtriumX — Rebuilt

This is your original project with the rating-invite feature completed and
five real bugs fixed. Full detail on each is in `BATCH_1_NOTES.md` through
`BATCH_4_NOTES.md` at the project root (kept for reference).

## Setup
1. `cp .env.example .env` and fill in your Supabase project's URL + anon key.
2. Run all migrations in `supabase/migrations/` **in order** if this is a
   fresh database. If you already ran migrations 001–011, you only need to
   run the new `012_rating_invite_and_notification_fixes.sql`.
3. `npm install`
4. `npm run dev`

## The rating feature, as built
1. Seller marks a listing **Sold**.
2. Popup: *"Request a Rating?"* — Yes / No.
3. If yes: checklist of everyone who messaged about that specific listing.
4. Seller picks who to invite → each gets a `rating_request` notification.
5. Buyer opens the notification → asked *"Rate Your Experience?"* — Yes / No.
6. If yes: star rating (1–5) + optional 150-char comment.
7. Rating is stored against the **seller**, so it shows on their profile's
   Reviews section and folds into their `avg_rating`/`total_ratings` shown
   on every listing they have — not just the one that was rated.

A seller can also trigger the same invite from the **Resolve** button inside
an individual chat, for cases where a conversation wraps up without going
through the sold flow.

## Bugs fixed (see batch notes for full detail)
- `get_recent_buyers()` RPC was called from the frontend but never existed — added.
- `notifications` RLS silently rejected every cross-user insert (admin
  approving/rejecting, seller inviting a buyer) — replaced with SECURITY
  DEFINER RPCs that check authorization internally.
- Old triggers inserted notifications with types that didn't match your
  fixed 3-type list, and duplicated the app-level inserts — removed.
- `ChatPage.tsx` and `PostListing.tsx` had protected redirects that didn't
  wait on `isLoadingAuth`, which could bounce a logged-in user out on a page
  refresh — fixed in both.
- `AdminPanel.tsx`'s "Suspend" action was incorrectly sending a rejection
  notification — now uses a dedicated `suspend_listing` RPC that doesn't notify.
- Dead `src/data/mockListings.ts` (unused, violated the "no mock data" rule)
  and a misplaced `src/pages/.env.txt` (Vite never reads `.env` from inside
  `src/`) — both removed; use `.env.example` at the project root instead.
