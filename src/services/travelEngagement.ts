import { supabase } from './supabaseClient'
import { readVisit, sendVisit } from './visitMonitor'

export type TravelEvent = 'route_search' | 'share_whatsapp' | 'share_copy' | 'company_click' | 'feature_sell' | 'feature_accommodation' | 'alert_request'
export async function recordTravelEvent(kind: TravelEvent, options: { listingId?: string; resultCount?: number; from?: string; to?: string } = {}): Promise<void> {
  try {
    const visit = readVisit()
    await sendVisit('/travel', false)
    await supabase.rpc('record_travel_event', {
      p_id: crypto.randomUUID(), p_visit_id: visit.id, p_token: visit.token, p_kind: kind,
      p_listing_id: options.listingId || null, p_result_count: options.resultCount ?? null,
      p_from: options.from || null, p_to: options.to || null,
    })
  } catch { /* Tracking never blocks a search, navigation, booking link or share. */ }
}

export async function requestTravelAlert(email: string, from: string, to: string, date: string): Promise<{ delivery_ready: boolean }> {
  const visit = readVisit()
  await sendVisit('/travel', false)
  const { data, error } = await supabase.rpc('request_travel_alert', {
    p_visit_id: visit.id, p_token: visit.token, p_email: email.trim(), p_from: from.trim(), p_to: to.trim(), p_date: date || null, p_consent: true,
  })
  if (error) throw error
  return data as { delivery_ready: boolean }
}

export async function manageTravelAlert(action: 'confirm' | 'unsubscribe', token: string): Promise<void> {
  const { error } = await supabase.rpc('manage_travel_alert', { p_action: action, p_token: token })
  if (error) throw error
}

export interface TravelEngagementReport {
  counts: Record<TravelEvent, number>
  visits: number
  active_seconds: number
  companies: { company: string; clicks: number }[]
  routes: { from: string | null; to: string | null; searches: number }[]
  subscriptions: { pending: number; active: number; unsubscribed: number }
  requests: { id: string; email: string; from_place: string; to_place: string; travel_date: string | null; status: string; created_at: string }[]
  delivery: { ready: boolean; last_run: string | null; sent: number; pending: number; failed: number }
}
export async function getTravelEngagement(days: number): Promise<TravelEngagementReport> {
  const { data, error } = await supabase.rpc('get_travel_engagement_report', { p_days: days })
  if (error) throw error
  return data as TravelEngagementReport
}
