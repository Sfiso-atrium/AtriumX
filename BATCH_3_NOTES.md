# Batch 3 of 5 — Notifications, Admin, Chat list

## Files in this batch
- `src/components/common/NotificationBell.tsx` — replaces the old one
- `src/pages/AdminPanel.tsx` — replaces the old one
- `src/pages/ChatPage.tsx` — replaces the old one

## Bugs fixed here
1. **`NotificationBell.tsx`** checked for a `'listing_expired'` notification type that isn't one of your 3 fixed types (`listing_approved`, `listing_rejected`, `rating_request`) and could never actually occur — dead/confusing branch, removed. The `rating_request` click still opens `RatingModal` directly (no extra navigation), which now leads with its own ask step from Batch 2.
2. **`AdminPanel.tsx`**: the "Suspend" button on an already-active listing (All Listings tab) was calling `rejectListingById()`, which — per Batch 1's fix — now correctly sends a `listing_rejected` notification. But spec 4.10 says suspending should **not** notify the seller (only rejecting a pending listing should). Switched it to the new `suspendListingById()`.
3. **`ChatPage.tsx`**: its protected `useEffect` checked `currentUser` and redirected to `/student` without waiting on `isLoadingAuth` — a straight violation of your hard rule ("isLoadingAuth in every protected useEffect"). In practice this meant refreshing the page while on `/chat` could bounce a logged-in user out before their session finished restoring. Fixed, and also added a loading guard so the page doesn't flash Messages before auth resolves. Also swapped the one-time `window.innerWidth` check for a small resize-aware hook so the mobile/desktop split layout actually responds if the window is resized instead of only being calculated once on first render.

## Still coming
- Batch 4: `Profile.tsx` (adds a Reviews list so ratings surface seller-wide), `EditProfile.tsx`, `Feed.tsx`, `PostListing.tsx`, `PlanSelect.tsx`, `Entrance.tsx`, `StudentAuth.tsx`
- Batch 5: Common components, `App.tsx`, config cleanup, final full project zip
