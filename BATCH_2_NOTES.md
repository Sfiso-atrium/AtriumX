# Batch 2 of 5 — Mark-Sold rating-invite flow

## Files in this batch
- `src/pages/ListingDetail.tsx` — replaces the old one
- `src/components/student/RatingModal.tsx` — replaces the old one
- `src/components/student/ChatWindow.tsx` — replaces the old one

## The flow, end to end
1. Seller taps **Mark as Sold** on their own listing.
2. If they've had any buyer conversations on *this listing* who haven't already rated it, a popup asks: **"Request a Rating?"** — Yes/No.
3. If yes, a second popup lists everyone who messaged about this listing (checkboxes, multi-select) so the seller can pick out who actually bought it.
4. Selected buyers each get sent a `rating_request` notification via the `send_rating_invite` RPC from Batch 1.
5. When a buyer opens that notification (Batch 3 wires this up), `RatingModal` now leads with its own ask step — **"Rate Your Experience?"** Yes/No — before ever showing the star form. Declining just closes it, no rating recorded.
6. If they say yes, they get the star + optional-comment form (fixed to the spec's 150-char limit — the old version allowed 300, which didn't match your build spec).
7. Submitted ratings always write to `ratings.seller_id`, so they aggregate on the seller's profile (avg_rating/total_ratings) — visible on every listing that seller has, not just the one that was rated. Batch 4's `Profile.tsx` will add a visible reviews list backed by this.

## Also fixed here
- The old code called `supabase.from('conversations').select(...)` directly inside `ListingDetail.tsx` to look up a buyer's conversation id before inviting them — that's a "no direct Supabase calls in components" violation per your hard rules. Replaced with the new `getConversationsForListing()` helper in `dataService.ts` (added in Batch 1).
- The negotiation badge on `ListingDetail` was rendering whenever `is_negotiable` was true regardless of plan tier — added the missing `tierConfig.canNegBadge` check per plan-enforcement rule #6.
- `RatingModal`'s comment field was `maxLength={300}`; spec 4.7 says 150. Fixed.

## Still coming
- Batch 3: `NotificationBell.tsx` (wires the buyer-side click → RatingModal), `AdminPanel.tsx`, `ChatPage.tsx`
- Batch 4: `Profile.tsx` reviews list, `EditProfile.tsx`, `Feed.tsx`, `PostListing.tsx`, `PlanSelect.tsx`, `Entrance.tsx`, `StudentAuth.tsx`
- Batch 5: Common components, `App.tsx`, final full project zip
