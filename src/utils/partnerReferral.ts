const KEY = 'atriumx:partner-referral'
const MAX_AGE = 30 * 86400000
type Referral = { code: string; expiresAt: number }
let memory: Referral | null = null

// First link wins for 30 days. Storage failures still allow same-tab attribution.
export function capturePartnerReferral(search = window.location.hash.split('?')[1] || ''): string | undefined {
  let saved = memory
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null') || memory } catch {}
  if (saved && /^[A-Za-z0-9_-]{1,64}$/.test(saved.code) && saved.expiresAt > Date.now()) {
    memory = saved
    return saved.code
  }
  memory = null
  try { localStorage.removeItem(KEY) } catch {}
  const code = new URLSearchParams(search).get('ref')
  if (!code || !/^[A-Za-z0-9_-]{1,64}$/.test(code)) return undefined
  memory = { code, expiresAt: Date.now() + MAX_AGE }
  try { localStorage.setItem(KEY, JSON.stringify(memory)) } catch {}
  return code
}

export function clearPartnerReferral() {
  memory = null
  try { localStorage.removeItem(KEY) } catch {}
}

export const PARTNER_DESTINATIONS = [
  { label: 'Business listing', path: '/business/post', params: { plan: 'noticeboard' } },
  { label: 'Accommodation listing', path: '/accommodation/post' },
  { label: 'Student marketplace listing', path: '/post' },
  { label: 'Wanted post', path: '/post-wanted' },
  { label: 'Event listing', path: '/post-event' },
  { label: 'Student account', path: '/student', params: { mode: 'register' } },
  { label: 'Business account', path: '/retailer/signup' },
] as const

export function partnerLinks(code: string, origin = window.location.origin + window.location.pathname) {
  return PARTNER_DESTINATIONS.map(destination => ({
    label: destination.label,
    url: `${origin}#${destination.path}?${new URLSearchParams({ ...('params' in destination ? destination.params : {}), ref: code })}`,
  }))
}
