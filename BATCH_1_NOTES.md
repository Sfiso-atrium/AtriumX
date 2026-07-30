# Batch 1 of 5 — Supabase backend + data layer

## Files in this batch
- `supabase/migrations/20260729090000_012_rating_invite_and_notification_fixes.sql` — **new migration, run it after your existing 11**
- `src/services/dataService.ts` — replaces the old one
- `src/services/supabaseClient.ts` — replaces the old one
- `.env.example` — copy to `.env` at project root, fill in your Supabase URL + anon key
- `.gitignore`

## What this migration does
Run it in the Supabase SQL editor (or via CLI) **after** your existing 11 migrations. It:
1. Drops the buggy triggers from migration 009 (`notify_on_message`, `notify_on_conversation`, `notify_on_listing_status`) — these were inserting notifications with types (`approved`, `rejected`, `interest`, `message`) that don't match your spec's fixed 3 types, and were firing *in addition to* the app-level notification inserts, which had started silently failing due to RLS.
2. Drops `notify_rating_request` from migration 010 — this auto-fired a rating invite on every conversation resolve, which is now instead an explicit, opt-in action.
3. Adds `get_recent_buyers()` — this was called from `dataService.ts` already but never existed in your SQL, so "Mark as Sold" → buyer picker was silently returning nothing.
4. Adds `send_rating_invite()`, `approve_listing()`, `reject_listing()`, `suspend_listing()` — SECURITY DEFINER RPCs that check authorization internally (caller is admin / caller is the listing's seller) and then write the notification, correctly typed. These replace direct client inserts that were being silently rejected by `notifications` RLS (which only ever allowed `auth.uid() = user_id`).

## Delete from your existing project
- `src/pages/.env.txt` — misplaced; Vite doesn't read `.env` files from inside `src/`. Use the `.env.example` in this batch instead (copy to project root as `.env`).
- `src/data/mockListings.ts` — dead file, not imported anywhere, and violates the spec's "no hardcoded/mock data" rule.

## What's coming in the next batches
- Batch 2: `ListingDetail.tsx` (mark-sold → rating invite popup), `ChatWindow.tsx`, `RatingModal.tsx`
- Batch 3: `NotificationBell.tsx`, `AdminPanel.tsx` (uses the new `suspendListingById` for the "All Listings" tab so suspend vs reject notifications behave correctly), `ChatPage.tsx`
- Batch 4: `Profile.tsx` (adds a Reviews list so ratings surface seller-wide, not per-listing), `EditProfile.tsx`, `Feed.tsx`, `PostListing.tsx`, `PlanSelect.tsx`, `Entrance.tsx`, `StudentAuth.tsx`
- Batch 5: Common components, `App.tsx`, final full project zip
