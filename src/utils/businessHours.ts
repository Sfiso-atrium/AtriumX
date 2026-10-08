export type BusinessHours = Record<string, { open: string; close: string }>
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String(i % 4 * 15).padStart(2, '0')}`)
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
export function isValidHours(value: unknown): value is BusinessHours {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([day, hours]) => /^[0-6]$/.test(day) && hours && typeof hours === 'object' &&
    Object.keys(hours).length === 2 && ['open', 'close'].every(key => typeof hours[key] === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hours[key])) && hours.open !== hours.close)
}
export function isBusinessOpen(hours: BusinessHours | null, now = new Date()): boolean | null {
  if (!hours || !isValidHours(hours)) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Johannesburg', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  const day = DAYS.indexOf(part('weekday'))
  const current = Number(part('hour')) * 60 + Number(part('minute'))
  const today = hours[day]
  const previous = hours[(day + 6) % 7]
  if (previous && minutes(previous.close) < minutes(previous.open) && current < minutes(previous.close)) return true
  if (!today) return false
  const start = minutes(today.open), end = minutes(today.close)
  return end < start ? current >= start : current >= start && current < end
}
export function summarizeHours(hours: BusinessHours): string[] {
  const groups: { start: number; end: number; label: string }[] = []
  DAYS.forEach((_, day) => {
    const h = hours[day]
    const label = h ? `${h.open}–${h.close}${h.close < h.open ? ' (next day)' : ''}` : 'Closed'
    const last = groups[groups.length - 1]
    if (last?.label === label) last.end = day
    else groups.push({ start: day, end: day, label })
  })
  return groups.map(g => `${DAYS[g.start]}${g.end !== g.start ? `–${DAYS[g.end]}` : ''}: ${g.label}`)
}
