# Accommodation reviews and public browsing

The provider form previously refused entry to a signed-in student or ordinary business. Such visitors now use the same moderated public intake as guests, while existing accommodation accounts retain their listing-management flow. No sign-out or account-type change is needed to submit.

Public accommodation browsing defaults to all universities. The university dropdown filters property cards and the residence review directory. Existing signed-in student listing scope remains unchanged.

Students can choose a suggested residence or add its name and nearby university. Reviews display the name from their authenticated student profile. Guests can see the review action and read reviews, but must sign in to write. Businesses and blocked students cannot write reviews. Review authors, text and stars cannot be changed by property owners; the existing paid reply entitlement remains in place.

Residence records are independent of provider advertisements. Existing reviews are backfilled without changing their content. Approved guest submissions and new active listings connect by normalized name plus university; the directory persists if an advertisement is removed. Matching spelling and university is important: different names require administrative reconciliation rather than uncertain automatic merging.

Validation: `npx tsc --noEmit`, `npm run build`, `npm run test:residence-reviews` (19 checks). Production transactional test confirmed student submission and account-derived author name; test data rolled back.

Supabase migration applied as `20260930191614_accommodation_residence_reviews.sql`. Historical migration files were not replayed. The existing intake Edge Function requires no change.
