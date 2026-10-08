export type BusinessReviewDraft = { stars: number; comment: string }
const prefix = 'atriumx:business-review:'
const lifetime = 24 * 60 * 60 * 1000
export const businessReviewPath = (businessId: string) => `/business/${encodeURIComponent(businessId)}/review`
export const businessReviewLink = (businessId: string) => `${window.location.origin}/#${businessReviewPath(businessId)}`

export function readReviewDraft(businessId: string): BusinessReviewDraft {
  const empty = { stars: 0, comment: '' }
  try {
    const raw = localStorage.getItem(prefix + businessId)
    if (!raw) return empty
    const draft = JSON.parse(raw)
    if (!Number.isFinite(draft.savedAt) || Date.now() - draft.savedAt > lifetime ||
        !Number.isInteger(draft.stars) || draft.stars < 0 || draft.stars > 5 || typeof draft.comment !== 'string') {
      localStorage.removeItem(prefix + businessId)
      return empty
    }
    return { stars: draft.stars, comment: draft.comment.slice(0, 5000) }
  } catch { return empty }
}

export function saveReviewDraft(businessId: string, draft: BusinessReviewDraft): boolean {
  try {
    localStorage.setItem(prefix + businessId, JSON.stringify({ ...draft, savedAt: Date.now() }))
    return true
  } catch { return false }
}
export function clearReviewDraft(businessId: string) {
  try { localStorage.removeItem(prefix + businessId) } catch { /* Storage may be disabled. */ }
}
