import { useEffect, useRef, useState } from 'react'
import { ExternalLink, PencilLine, Plus } from 'lucide-react'
import { busError, getBusListings, saveBusListing } from '../../services/busTravel'
import { formatBusPrice, isBusOutdated, operatingDays, safeBusWebsite, type BusListing, type BusListingInput } from '../../utils/busTravel'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-border bg-slate-deep px-3 py-2.5 text-base text-cream focus:outline-none focus:ring-2 focus:ring-teal-light'
const newDraft = () => ({
  company_name: '', website_url: '', origin: '', destination: '',
  origin_aliases: '', destination_aliases: '', boarding_points: '', dropoff_points: '',
  price: '', price_type: 'fixed' as BusListingInput['price_type'],
  journey_type: 'unknown' as BusListingInput['journey_type'],
  connection_type: 'unknown' as BusListingInput['connection_type'], connection_details: '',
  departure_time: '', arrival_time: '', duration_minutes: '', operating_days: [] as number[],
  travel_date: '', valid_from: '', valid_until: '', information_date: '',
  student_discount: '', baggage_allowance: '', notes: '', is_outdated: false,
})
type Draft = ReturnType<typeof newDraft>
type TextKey = { [K in keyof Draft]: Draft[K] extends string ? K : never }[keyof Draft]
const lines = (value: string) => [...new Set(value.split('\n').map(item => item.trim()).filter(Boolean))]
const nullable = (value: string) => value.trim() || null

export default function BusListingsAdmin() {
  const [listings, setListings] = useState<BusListing[]>([])
  const [draft, setDraft] = useState(newDraft)
  const [editing, setEditing] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    getBusListings().then(data => { if (!cancelled) setListings(data) })
      .catch(error => { if (!cancelled) setError(`Could not load bus listings. ${busError(error)}`) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])

  function edit(listing: BusListing) {
    setEditing(listing.id)
    setDraft({
      company_name: listing.company_name, website_url: listing.website_url,
      origin: listing.origin || '', destination: listing.destination || '',
      origin_aliases: listing.origin_aliases.join('\n'), destination_aliases: listing.destination_aliases.join('\n'),
      boarding_points: listing.boarding_points.join('\n'), dropoff_points: listing.dropoff_points.join('\n'),
      price: listing.price == null ? '' : String(listing.price), price_type: listing.price_type,
      journey_type: listing.journey_type, connection_type: listing.connection_type, connection_details: listing.connection_details || '',
      departure_time: listing.departure_time?.slice(0, 5) || '', arrival_time: listing.arrival_time?.slice(0, 5) || '',
      duration_minutes: listing.duration_minutes == null ? '' : String(listing.duration_minutes), operating_days: listing.operating_days,
      travel_date: listing.travel_date || '', valid_from: listing.valid_from || '', valid_until: listing.valid_until || '',
      information_date: listing.information_date || '', student_discount: listing.student_discount || '', baggage_allowance: listing.baggage_allowance || '',
      notes: listing.notes || '', is_outdated: listing.is_outdated,
    })
    setError(''); setStatus(''); setFormOpen(true)
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  function reset() { setEditing(null); setDraft(newDraft()); setFormOpen(false) }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setStatus('')
    try {
      if (draft.valid_from && draft.valid_until && draft.valid_from > draft.valid_until) throw new Error('The validity end date must be on or after the start date.')
      const website = safeBusWebsite(draft.website_url.trim())
      if (!website) throw new Error('Enter a complete http:// or https:// company website address.')
      const input: BusListingInput = {
        ...draft, company_name: draft.company_name.trim(), website_url: website,
        origin: nullable(draft.origin), destination: nullable(draft.destination),
        origin_aliases: lines(draft.origin_aliases), destination_aliases: lines(draft.destination_aliases),
        boarding_points: lines(draft.boarding_points), dropoff_points: lines(draft.dropoff_points),
        price: draft.price === '' ? null : Number(draft.price), duration_minutes: draft.duration_minutes === '' ? null : Number(draft.duration_minutes),
        departure_time: nullable(draft.departure_time), arrival_time: nullable(draft.arrival_time),
        travel_date: nullable(draft.travel_date), valid_from: nullable(draft.valid_from), valid_until: nullable(draft.valid_until), information_date: nullable(draft.information_date),
        connection_details: nullable(draft.connection_details), baggage_allowance: nullable(draft.baggage_allowance),
        student_discount: nullable(draft.student_discount), notes: nullable(draft.notes),
      }
      const saved = await saveBusListing(input, editing || undefined)
      setListings(previous => [saved, ...previous.filter(listing => listing.id !== saved.id)])
      reset(); setStatus('Bus listing saved. It is available on the public travel page.')
    } catch (error) { setError(busError(error)) }
    finally { setBusy(false) }
  }
  function field(label: string, key: TextKey, type = 'text', required = false) {
    return <label className="block text-sm text-cream" key={key}>{label}{required ? ' *' : ' (optional)'}
      <input type={type} required={required} maxLength={key === 'website_url' ? 2048 : 160}
        min={type === 'number' ? '0' : undefined} step={key === 'price' ? '0.01' : type === 'number' ? '1' : undefined}
        value={draft[key]} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} className={inputClass} />
    </label>
  }
  function area(label: string, key: TextKey, hint?: string) {
    return <label className="block text-sm text-cream" key={key}>{label} (optional)
      <textarea rows={3} maxLength={4000} value={draft[key]} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} className={inputClass} />
      {hint && <span className="block text-xs text-cream-muted mt-1">{hint}</span>}
    </label>
  }
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="text-xl font-serif text-cream">Bus travel listings</h2><a href="/#/travel" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-light underline">Public travel page <ExternalLink size={14} /></a></div>
    <p className="text-sm text-cream-muted">Enter information supplied by bus companies. Only the company name and website are required. Add separate listings for different routes, fares or departure dates when supplied. Listings are free and visible without sign-in.</p>
    {error && <div role="alert" className="rounded-xl border border-red-500/40 p-3 text-sm text-cream">{error}{!formOpen && <button onClick={() => setAttempt(value => value + 1)} className="ml-3 underline text-teal-light">Try again</button>}</div>}
    {status && <p role="status" className="text-sm text-teal-light">{status}</p>}
    {!formOpen && <button disabled={busy} onClick={() => { reset(); setError(''); setStatus(''); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-teal-primary text-white px-4 py-3 text-sm font-bold"><Plus size={16} /> Add bus listing</button>}
    {formOpen && <form ref={formRef} onSubmit={save} className="scroll-mt-8 rounded-2xl border border-slate-border bg-slate-card p-4 sm:p-5 space-y-5">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <legend className="font-bold text-lg text-cream mb-4">{editing ? 'Edit bus listing' : 'New bus listing'}</legend>
        <div className="grid sm:grid-cols-2 gap-4">{field('Bus company', 'company_name', 'text', true)}{field('Company website', 'website_url', 'url', true)}{field('From / departure town', 'origin')}{field('To / destination town', 'destination')}</div>
        <details className="border-t border-slate-border pt-4"><summary className="font-semibold text-sm text-cream cursor-pointer">Fare and journey details</summary><div className="grid sm:grid-cols-2 gap-4 mt-4">
          {field('Fare in rand', 'price', 'number')}
          <label className="text-sm text-cream">Price description<select value={draft.price_type} onChange={event => setDraft(previous => ({ ...previous, price_type: event.target.value as Draft['price_type'] }))} className={inputClass}><option value="fixed">Listed amount</option><option value="from">Starting from this amount</option></select></label>
          <label className="text-sm text-cream">Fare basis<select value={draft.journey_type} onChange={event => setDraft(previous => ({ ...previous, journey_type: event.target.value as Draft['journey_type'] }))} className={inputClass}><option value="unknown">Not supplied</option><option value="one_way">One-way</option><option value="return">Return</option></select></label>
          <label className="text-sm text-cream">Service type<select value={draft.connection_type} onChange={event => setDraft(previous => ({ ...previous, connection_type: event.target.value as Draft['connection_type'] }))} className={inputClass}><option value="unknown">Not supplied</option><option value="direct">Direct</option><option value="connecting">Connecting service</option></select></label>
          {area('Connection / transfer details', 'connection_details')}{area('Student discount details', 'student_discount', 'Leave blank if not supplied. Enter the offer and any conditions.')}{area('Baggage allowance', 'baggage_allowance')}
        </div></details>
        <details className="border-t border-slate-border pt-4"><summary className="font-semibold text-sm text-cream cursor-pointer">Stops and other place names</summary><p className="text-xs text-cream-muted mt-2">These are searchable. Add only confirmed boarding and drop-off points for this service; listing a stop does not confirm that every possible stop pair can be booked.</p><div className="grid sm:grid-cols-2 gap-4 mt-4">{area('Boarding points', 'boarding_points', 'One place per line. Include its town if supplied.')}{area('Drop-off points', 'dropoff_points', 'One place per line. Include its town if supplied.')}{area('Other names for departure place', 'origin_aliases', 'One name per line, such as company-supplied abbreviations.')}{area('Other names for destination place', 'destination_aliases', 'One name per line.')}</div></details>
        <details className="border-t border-slate-border pt-4"><summary className="font-semibold text-sm text-cream cursor-pointer">Dates and timetable</summary><div className="grid sm:grid-cols-2 gap-4 mt-4">{field('Departure time', 'departure_time', 'time')}{field('Arrival time', 'arrival_time', 'time')}{field('Duration in minutes', 'duration_minutes', 'number')}{field('Specific travel date', 'travel_date', 'date')}</div>
          <fieldset className="mt-4"><legend className="text-sm text-cream">Operating days (leave all unchecked if not supplied)</legend><div className="flex flex-wrap gap-3 mt-2">{[1, 2, 3, 4, 5, 6, 0].map(day => <label key={day} className="text-sm text-cream flex items-center gap-1.5"><input type="checkbox" checked={draft.operating_days.includes(day)} onChange={event => { const checked = event.target.checked; setDraft(previous => ({ ...previous, operating_days: checked ? [...previous.operating_days, day] : previous.operating_days.filter(value => value !== day) })) }} className="accent-teal-primary w-4 h-4" />{operatingDays[day].slice(0, 3)}</label>)}</div></fieldset>
        </details>
        <details open className="border-t border-slate-border pt-4"><summary className="font-semibold text-sm text-cream cursor-pointer">Information freshness and notes</summary><div className="grid sm:grid-cols-2 gap-4 mt-4">{field('Information as of', 'information_date', 'date')}{field('Information valid from', 'valid_from', 'date')}{field('Information valid through', 'valid_until', 'date')}{area('Additional information / conditions', 'notes')}</div>
          <label className="mt-4 flex items-center gap-2 text-sm text-cream"><input type="checkbox" checked={draft.is_outdated} onChange={event => setDraft(previous => ({ ...previous, is_outdated: event.target.checked }))} className="accent-teal-primary w-4 h-4" /> Mark information as outdated</label><p className="text-xs text-cream-muted mt-2">An elapsed validity end date or specific travel date also adds the outdated notice automatically. The listing stays visible and directs students to the company website. Updating a listing does not automatically confirm its information is current.</p>
        </details>
        <div className="flex gap-3"><button className="rounded-xl bg-teal-primary text-white px-5 py-3 text-sm font-bold">{busy ? 'Saving…' : 'Save listing'}</button><button type="button" onClick={reset} className="rounded-xl border border-slate-border text-cream px-4 py-3 text-sm">Cancel</button></div>
      </fieldset>
    </form>}
    {loading ? <p className="text-sm text-cream-muted">Loading bus listings…</p> : !listings.length ? <p className="text-sm text-cream-muted">No bus listings yet. Add the first company when its information arrives.</p> : <div className="space-y-3">{listings.map(listing => <article key={listing.id} className="rounded-xl border border-slate-border bg-slate-card p-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-cream break-words">{listing.company_name}</h3><p className="text-sm text-cream-muted mt-1 break-words">{listing.origin || 'From not supplied'} → {listing.destination || 'To not supplied'}</p><p className="text-sm text-cream mt-1">{formatBusPrice(listing)}</p>{isBusOutdated(listing) && <p className="text-xs text-cream-muted mt-1">Outdated notice shown</p>}</div><button disabled={busy} onClick={() => edit(listing)} aria-label={`Edit ${listing.company_name}${listing.origin ? ` from ${listing.origin}` : ''}${listing.destination ? ` to ${listing.destination}` : ''}`} className="inline-flex items-center gap-1 text-sm text-teal-light shrink-0 px-2 py-2"><PencilLine size={16} /> Edit</button></article>)}</div>}
  </section>
}
