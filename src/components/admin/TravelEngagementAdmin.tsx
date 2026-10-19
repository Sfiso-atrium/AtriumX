import { useEffect, useState } from 'react'
import { getTravelEngagement, type TravelEngagementReport, type TravelEvent } from '../../services/travelEngagement'

const labels: Record<TravelEvent, string> = {
  route_search: 'Route searches', company_click: 'Bus website clicks', share_whatsapp: 'WhatsApp opens', share_copy: 'Links copied',
  feature_sell: 'Marketplace link clicks', feature_accommodation: 'Accommodation link clicks', alert_request: 'Update requests submitted',
}
export default function TravelEngagementAdmin() {
  const [report, setReport] = useState<TravelEngagementReport | null>(null)
  const [days, setDays] = useState(30), [attempt, setAttempt] = useState(0), [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    const load = () => getTravelEngagement(days).then(data => { if (alive) { setReport(data); setError('') } })
      .catch(() => { if (alive) setError('Could not load travel activity. Please try again.') })
    void load()
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 30000)
    return () => { alive = false; clearInterval(interval) }
  }, [days, attempt])
  return <details className="rounded-2xl border border-slate-border bg-slate-card p-4 sm:p-5">
    <summary className="font-semibold text-cream cursor-pointer">Travel activity and email update requests</summary>
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-3 text-sm items-center"><label className="text-cream">Period <select value={days} onChange={event => setDays(Number(event.target.value))} className="ml-2 bg-slate-deep text-cream border border-slate-border rounded-lg px-2 py-2"><option value={1}>24 hours</option><option value={7}>7 days</option><option value={30}>30 days</option></select></label><button onClick={() => setAttempt(value => value + 1)} className="text-teal-light underline">Refresh travel activity</button></div>
      {error && <p role="alert" className="text-sm text-cream">{error}</p>}
      {!report && !error && <p className="text-sm text-cream-muted">Loading travel activity…</p>}
      {report && <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Object.entries({ 'Travel visits': report.visits, ...Object.fromEntries(Object.entries(labels).map(([kind, label]) => [label, report.counts[kind as TravelEvent] || 0])) }).map(([label, count]) => <div key={label} className="bg-slate-deep border border-slate-border rounded-xl p-3"><p className="text-xs text-cream-muted">{label}</p><p className="text-lg font-bold text-cream mt-1">{count}</p></div>)}</div>
        <p className="text-xs text-cream-muted">Browser visits and interactions, including guests. WhatsApp opens do not confirm a message was sent; bus website clicks do not confirm bookings. Admin visits are excluded. Raw search text and email addresses are not stored in activity events.</p>
        {!!report.companies.length && <div><h3 className="text-sm font-bold text-cream">Visitors sent to bus companies</h3><ul className="mt-2 space-y-1 text-sm text-cream-muted">{report.companies.map(company => <li key={company.company}>{company.company}: {company.clicks} website clicks</li>)}</ul></div>}
        {!!report.routes.length && <div><h3 className="text-sm font-bold text-cream">Most searched supplied routes</h3><ul className="mt-2 space-y-1 text-sm text-cream-muted">{report.routes.map((route, index) => <li key={index}>{route.from || 'Any / unlisted departure'} → {route.to || 'Any / unlisted destination'}: {route.searches}</li>)}</ul></div>}
        <div className="border-t border-slate-border pt-4"><h3 className="text-sm font-bold text-cream">Route update requests</h3><p className="text-xs text-cream-muted mt-2">{report.subscriptions.pending} awaiting confirmation · {report.subscriptions.active} confirmed · {report.subscriptions.unsubscribed} unsubscribed</p>
          <p className="text-xs text-cream-muted mt-2">{report.delivery.ready ? 'Email sender configured.' : 'Email delivery awaits sender setup. Requests are saved; no subscription becomes active until the recipient confirms.'} {report.delivery.sent} messages accepted by sender · {report.delivery.pending} queued · {report.delivery.failed} failed after retries.</p>
          {!report.delivery.ready && <p className="text-xs text-cream-muted mt-2">Sender setup uses server-only TRAVEL_RESEND_API_KEY and TRAVEL_MAIL_FROM settings. No sender credentials are stored in the website.</p>}
          {!!report.requests.length ? <div className="mt-3 space-y-2">{report.requests.map(request => <div key={request.id} className="rounded-xl border border-slate-border p-3 text-xs text-cream-muted"><p className="font-semibold text-cream break-all">{request.email}</p><p className="mt-1">{request.from_place} → {request.to_place}{request.travel_date ? ` · ${request.travel_date}` : ''}</p><p className="mt-1 capitalize">{request.status}</p></div>)}</div> : <p className="text-sm text-cream-muted mt-3">No route update requests yet.</p>}
        </div>
      </>}
    </div>
  </details>
}
