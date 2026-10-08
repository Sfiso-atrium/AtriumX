export type AccommodationReviewDraft = { residenceId: string | null; name: string; university: string; stars: number; comment: string }
const prefix = 'atriumx:accommodation-review:'
export const accommodationReviewPath = (listingId: string) => `/accommodations/review?listing=${encodeURIComponent(listingId)}`
export const accommodationReviewLink = (listingId: string) => `${window.location.origin}/#${accommodationReviewPath(listingId)}`
export function readAccommodationDraft(key: string): AccommodationReviewDraft {
  const empty = { residenceId: null, name: '', university: '', stars: 0, comment: '' }
  try {
    const raw = localStorage.getItem(prefix + key)
    if (!raw) return empty
    const d = JSON.parse(raw)
    if (!Number.isFinite(d.savedAt) || Date.now() - d.savedAt > 86400000 ||
        !Number.isInteger(d.stars) || d.stars < 0 || d.stars > 5 || typeof d.comment !== 'string' ||
        typeof d.name !== 'string' || typeof d.university !== 'string' || !(d.residenceId === null || typeof d.residenceId === 'string')) {
      localStorage.removeItem(prefix + key)
      return empty
    }
    return { residenceId: d.residenceId, name: d.name.slice(0,150), university: d.university, stars: d.stars, comment: d.comment.slice(0,3000) }
  } catch { return empty }
}
export function saveAccommodationDraft(key: string, draft: AccommodationReviewDraft): boolean {
  try { localStorage.setItem(prefix + key, JSON.stringify({ ...draft, savedAt: Date.now() })); return true }
  catch { return false }
}
export function clearAccommodationDraft(key: string) {
  try { localStorage.removeItem(prefix + key) } catch { /* Storage may be disabled. */ }
}
