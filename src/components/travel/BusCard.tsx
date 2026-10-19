import { AlertTriangle, ArrowRight, Bus, ExternalLink } from 'lucide-react'
import { formatBusPrice, formatTravelDate, isBusOutdated, operatingDays, safeBusWebsite, type BusListing } from '../../utils/busTravel'

export default function BusCard({ listing }: { listing: BusListing }) {
  const outdated = isBusOutdated(listing)
  const website = safeBusWebsite(listing.website_url)
  const details: [string, string | null][] = [
    ['Boards at', listing.boarding_points.join(' · ') || null],
    ['Drops off at', listing.dropoff_points.join(' · ') || null],
    ['Departure', listing.departure_time?.slice(0, 5) || null],
    ['Arrival', listing.arrival_time?.slice(0, 5) || null],
    ['Duration', listing.duration_minutes == null ? null : `${Math.floor(listing.duration_minutes / 60)}h ${listing.duration_minutes % 60}m`],
    ['Travel date', listing.travel_date ? formatTravelDate(listing.travel_date) : null],
    ['Operating days', listing.operating_days.length ? listing.operating_days.map(day => operatingDays[day]).join(', ') : null],
    ['Connections', listing.connection_details],
    ['Baggage', listing.baggage_allowance],
    ['Student discount', listing.student_discount],
    ['Information valid from', listing.valid_from ? formatTravelDate(listing.valid_from) : null],
    ['Information valid through', listing.valid_until ? formatTravelDate(listing.valid_until) : null],
  ]
  return <article className="rounded-2xl border border-slate-border bg-slate-card p-5 sm:p-6 flex flex-col min-w-0">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-teal-faint p-2.5 text-teal-light shrink-0"><Bus size={22} aria-hidden="true" /></div>
      <div className="min-w-0"><h2 className="font-bold text-cream text-lg break-words">{listing.company_name}</h2>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-cream-muted mt-1">
          <span>{listing.origin || 'Departure details on website'}</span><ArrowRight size={14} aria-label="to" /><span>{listing.destination || 'Destinations on website'}</span>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap gap-2 mt-4 text-xs">
      {listing.journey_type !== 'unknown' && <span className="rounded-full bg-slate-deep border border-slate-border px-2.5 py-1 text-cream-muted">{listing.journey_type === 'return' ? 'Return fare' : 'One-way fare'}</span>}
      {listing.connection_type !== 'unknown' && <span className="rounded-full bg-slate-deep border border-slate-border px-2.5 py-1 text-cream-muted">{listing.connection_type === 'direct' ? 'Direct' : 'Connecting service'}</span>}
      {listing.student_discount && <span className="rounded-full bg-teal-faint px-2.5 py-1 text-teal-light">Student discount</span>}
    </div>
    <p className="text-xl font-bold text-cream mt-3">{formatBusPrice(listing)}</p>
    {listing.price != null && <p className="text-xs text-cream-muted mt-1">{listing.journey_type === 'unknown' ? 'Fare basis: confirm with company.' : 'Company-supplied fare.'} {listing.price_type === 'from' && 'Starting price; your fare may be higher.'}</p>}
    {outdated && <div role="note" className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-cream">
      <p className="font-bold flex items-center gap-2"><AlertTriangle size={16} aria-hidden="true" /> Outdated information</p>
      <p className="mt-1">This information is outdated. {website ? <a href={website} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Visit the company website</a> : 'Contact the company'} for the latest fares and timetable.</p>
    </div>}
    <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 text-sm">
      {details.filter(([, value]) => value).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-cream-muted text-xs">{label}</dt><dd className="text-cream mt-0.5 whitespace-pre-line break-words">{value}</dd></div>)}
    </dl>
    {!listing.travel_date && !listing.operating_days.length && <p className="text-xs text-cream-muted mt-4">Confirm travel dates with the company.</p>}
    {listing.notes && <p className="text-sm text-cream-muted whitespace-pre-line break-words mt-4">{listing.notes}</p>}
    <div className="mt-auto pt-5">
      {listing.information_date && <p className="text-xs text-cream-muted mb-3">Information as of {formatTravelDate(listing.information_date)}</p>}
      {website && <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full rounded-xl bg-teal-primary text-white px-4 py-3 font-bold text-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-light">Visit bus website <ExternalLink size={16} aria-hidden="true" /></a>}
    </div>
  </article>
}
