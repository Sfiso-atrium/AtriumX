import { useEffect, useState } from 'react'
import { getBusinessHours } from '../../services/businessHours'
import { isBusinessOpen, summarizeHours, type BusinessHours } from '../../utils/businessHours'
export default function BusinessHoursDisplay({ businessId, compact = false }: { businessId: string; compact?: boolean }) {
  const [hours, setHours] = useState<BusinessHours | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let active = true
    setHours(null)
    const refresh = () => { void getBusinessHours(businessId).then(value => { if (active) setHours(value) }).catch(() => { if (active) setHours(null) }) }
    const changed = (event: Event) => { if ((event as CustomEvent).detail === businessId) refresh() }
    refresh()
    const timer = window.setInterval(() => { setNow(new Date()); refresh() }, 60000)
    const focus = () => { setNow(new Date()); refresh() }
    window.addEventListener('focus', focus)
    window.addEventListener('business-hours-updated', changed)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focus); window.removeEventListener('business-hours-updated', changed) }
  }, [businessId])
  const open = isBusinessOpen(hours, now)
  if (compact) return open === null ? null : <span className="text-xs font-medium text-slate-600" aria-label={`Business ${open ? 'open' : 'closed'}`}>{open ? 'Open' : 'Closed'}</span>
  return <details className="rounded-xl border border-slate-border p-3 text-sm text-cream">
    <summary className="cursor-pointer font-medium">Operating hours{open !== null ? ` · ${open ? 'Open' : 'Closed'}` : ''}</summary>
    <div className="mt-2 space-y-1 text-cream-muted">{hours === null ? <p>Hours not provided.</p> : summarizeHours(hours).map(line => <p key={line}>{line}</p>)}<p className="pt-1 text-xs">South African time</p></div>
  </details>
}
