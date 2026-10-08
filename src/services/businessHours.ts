import { supabase } from './supabaseClient'
import { isValidHours, type BusinessHours } from '../utils/businessHours'
const pending = new Map<string, Promise<BusinessHours | null>>()
export function getBusinessHours(id: string): Promise<BusinessHours | null> {
  const existing = pending.get(id)
  if (existing) return existing
  const request = (async () => {
    const { data, error } = await supabase.from('business_operating_hours').select('schedule').eq('business_id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return isValidHours(data?.schedule) ? data.schedule : null
  })()
  pending.set(id, request)
  void request.finally(() => { if (pending.get(id) === request) pending.delete(id) }).catch(() => {})
  return request
}
export async function saveBusinessHours(id: string, hours: BusinessHours | null): Promise<string | null> {
  if (hours !== null && !isValidHours(hours)) return 'Choose different opening and closing times for each day.'
  try {
    const result = hours === null
      ? await supabase.from('business_operating_hours').delete().eq('business_id', id)
      : await supabase.from('business_operating_hours').upsert({ business_id: id, schedule: hours }, { onConflict: 'business_id' }).select('business_id').single()
    if (result.error) return result.error.message
    window.dispatchEvent(new CustomEvent('business-hours-updated', { detail: id }))
    return null
  } catch { return 'Could not save operating hours. Please try again.' }
}
