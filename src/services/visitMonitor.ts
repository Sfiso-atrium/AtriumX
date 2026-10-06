import { supabase } from './supabaseClient'
const KEY = 'atriumx-visit-monitor-v1'
const PENDING = 'atriumx-visit-conversions-v1'
type Visit = { id: string; token: string; created: number; seen: number; sequence: number; active: number; form: number; source: string; campaign: string }
let current: Visit | null = null
let flushCurrent: (() => Promise<void>) | null = null
const safeTag = (value: string | null) => (value || '').replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 80)
export function readVisit(): Visit {
  if (current && Date.now() - current.created < 86400000 && Date.now() - current.seen < 30 * 60000) return current
  current = null
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    if (saved && typeof saved.id === 'string' && typeof saved.token === 'string' && Date.now() - saved.seen < 30 * 60000 && Date.now() - saved.created < 86400000) current = saved
  } catch { /* storage is optional */ }
  if (!current) {
    const outer = new URLSearchParams(location.search)
    const inner = new URLSearchParams(location.hash.split('?')[1] || '')
    current = { id: crypto.randomUUID(), token: crypto.randomUUID(), created: Date.now(), seen: Date.now(), sequence: 0, active: 0, form: 0,
      source: safeTag(inner.get('utm_source') || outer.get('utm_source')),
      campaign: safeTag(inner.get('utm_campaign') || outer.get('utm_campaign')) }
  }
  return current
}
export function saveVisit() { if (current) { current.seen = Date.now(); try { sessionStorage.setItem(KEY, JSON.stringify(current)) } catch { /* optional */ } } }
export function bindVisitFlush(fn: (() => Promise<void>) | null) { flushCurrent = fn }
export const isListingForm = (path: string) => ['/accommodation/post', '/business/post', '/post'].includes(path)
export const isTrackedPath = (path: string) => ['/', '/retailer', '/accommodations', '/accommodations/review', '/accommodation/post', '/business/post', '/post', '/feed', '/events'].includes(path) || /^\/(listing|accommodation|accommodations\/residence)\/[0-9a-f-]{36}$/.test(path)
export function sendVisit(path: string, started: boolean, left = false, keepalive = false): Promise<void> {
  const v = readVisit()
  const body = { p_id: v.id, p_token: v.token, p_path: path, p_source: v.source, p_campaign: v.campaign,
    p_device: /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android/i.test(navigator.userAgent) ? 'phone' : 'desktop',
    p_sequence: v.sequence = (v.sequence || 0) + 1, p_active: Math.floor(v.active), p_form: Math.floor(v.form), p_started: started, p_left: left }
  saveVisit()
  if (keepalive) {
    return fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/record_admin_visit`, { method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify(body) }).then(() => undefined).catch(() => undefined)
  }
  return Promise.resolve(supabase.rpc('record_admin_visit', body)).then(() => undefined).catch(() => undefined)
}
type Pending = { visit: Visit; kind: string; id: string; receipt?: string; at: number }
export async function retryVisitConversions() {
  let pending: Pending[] = []
  try { pending = JSON.parse(sessionStorage.getItem(PENDING) || '[]') } catch { return }
  for (const item of pending) {
    if (Date.now() - item.at > 86400000) continue
    const { error } = await supabase.rpc('record_admin_visit_conversion', { p_id: item.visit.id, p_token: item.visit.token, p_kind: item.kind, p_listing_id: item.id, p_receipt: item.receipt || null })
    if (!error) {
      try { const latest: Pending[] = JSON.parse(sessionStorage.getItem(PENDING) || '[]'); sessionStorage.setItem(PENDING, JSON.stringify(latest.filter(x => !(x.kind === item.kind && x.id === item.id)))) } catch { /* optional */ }
    }
  }
}
// Conversion logging never changes whether the actual listing succeeds.
export async function recordVisitSubmission(kind: 'listing' | 'accommodation' | 'submission', id: string, receipt?: string) {
  try {
    const visit = readVisit()
    const pending: Pending[] = JSON.parse(sessionStorage.getItem(PENDING) || '[]')
    if (!pending.some(x => x.kind === kind && x.id === id)) pending.push({ visit, kind, id, receipt, at: Date.now() })
    sessionStorage.setItem(PENDING, JSON.stringify(pending.filter(x => Date.now() - x.at < 86400000).slice(-10)))
    await flushCurrent?.()
    await retryVisitConversions()
  } catch { /* the submitted listing remains successful even when analytics is unavailable */ }
}
