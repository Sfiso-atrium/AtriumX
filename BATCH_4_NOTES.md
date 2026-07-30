# Batch 4 of 5 — Profile reviews + a lingering auth-guard bug

## Files in this batch
- `src/pages/Profile.tsx` — replaces the old one
- `src/pages/PostListing.tsx` — targeted fix, rest of the file untouched

## Reviewed and left as-is (no bugs found)
`Feed.tsx`, `EditProfile.tsx`, `PlanSelect.tsx`, `StudentAuth.tsx`, `Entrance.tsx` — all matched spec and had no functional issues, so per your preference for targeted changes I'm not re-shipping identical files just to pad the batch.

## What's new in Profile.tsx
Added a **Reviews** section, collapsible, sitting below the listings grid. This is the piece that makes "rating is always on the seller's profile, across all their listings" actually visible: it pulls every rating tied to `seller_id` via `getSellerRatings()` (added in Batch 1), regardless of which specific listing each one was left for — each review shows which listing it was for, but they're all listed together under the one seller. The average/count badge next to the seller's name now also links straight down to this section.

## The other bug found: PostListing.tsx
Same class of bug as `ChatPage.tsx` in Batch 3 — the effect that redirects to `/student` when there's no `currentUser` wasn't waiting on `isLoadingAuth`. Minimal patch:
- destructured `isLoadingAuth` from `useApp()`
- effect returns early while `isLoadingAuth` is true
- render guard also waits on it before showing `null`

## Still coming
- Batch 5 (final): common components (`Navbar`, `BottomNav`, `AuthPromptModal`, `Toast`), `App.tsx`, config cleanup (removing the dead `mockListings.ts` and misplaced `.env.txt`), and the complete project as one zip.
