import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { busError } from '../../services/busTravel'
import { recordTravelEvent, requestTravelAlert } from '../../services/travelEngagement'
import { southAfricanToday } from '../../utils/busTravel'

export default function TravelAlerts({ from, to, date, track = true }: { from: string; to: string; date: string; track?: boolean }) {
  const [email, setEmail] = useState(''), [origin, setOrigin] = useState(from), [destination, setDestination] = useState(to)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState(''), [website, setWebsite] = useState('')
  const [travelDate, setTravelDate] = useState(date)
  useEffect(() => { setOrigin(from); setDestination(to); setTravelDate(date) }, [from, to, date])
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return
    setError(''); setStatus(''); setBusy(true)
    try {
      if (website) { setStatus('Your request has been received.'); return }
      const result = await requestTravelAlert(email, origin, destination, travelDate)
      setEmail('')
      setStatus(result.delivery_ready ? 'Request saved. Please confirm using the email we send you. Updates start after confirmation.'
        : 'Your request is saved. Email delivery is being set up; please check this page for updates in the meantime.')
      if (track) void recordTravelEvent('alert_request')
    } catch (error) { setError(`Could not save your request. ${busError(error)}`) }
    finally { setBusy(false) }
  }
  const input = 'mt-1.5 w-full rounded-xl border border-slate-border bg-slate-deep px-3 py-2.5 text-base text-cream focus:outline-none focus:ring-2 focus:ring-teal-light'
  return <details className="rounded-2xl border border-slate-border bg-slate-card p-5">
    <summary className="cursor-pointer text-cream font-semibold"><span className="inline-flex gap-2 items-center"><Bell size={17} className="text-teal-light" /> Get updates for your route</span></summary>
    <p className="text-sm text-cream-muted mt-3">Request an email when matching bus information is added or updated. Optional, free and no account needed.</p>
    <form onSubmit={submit} className="mt-4 space-y-4">
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm text-cream">From<input required maxLength={120} value={origin} onChange={event => setOrigin(event.target.value)} className={input} autoComplete="off" /></label>
        <label className="text-sm text-cream">To<input required maxLength={120} value={destination} onChange={event => setDestination(event.target.value)} className={input} autoComplete="off" /></label>
        <label className="text-sm text-cream">Email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={input} /></label>
        <label className="text-sm text-cream">Travel date (optional)<input type="date" min={southAfricanToday()} value={travelDate} onChange={event => setTravelDate(event.target.value)} className={input} /></label>
        <label aria-hidden="true" className="absolute -left-[10000px]">Leave this empty<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
        <label className="text-xs text-cream-muted sm:col-span-2 flex items-start gap-2"><input required type="checkbox" className="accent-teal-primary mt-0.5" /> I agree to receive route update emails. I can unsubscribe using a link in each email. <a href="/Privacy.html" target="_blank" rel="noopener noreferrer" className="text-teal-light underline">Privacy</a></label>
        <button className="rounded-xl bg-teal-primary text-white text-sm font-bold px-5 py-3 justify-self-start">{busy ? 'Saving…' : 'Request route updates'}</button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-cream">{error}</p>}{status && <p role="status" className="text-sm text-cream-muted">{status}</p>}
    </form>
  </details>
}
