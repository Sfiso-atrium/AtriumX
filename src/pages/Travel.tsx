import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Bus, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import BusCard from '../components/travel/BusCard'
import PlaceSearch from '../components/travel/PlaceSearch'
import { useApp } from '../context/AppContext'
import { getBusListings } from '../services/busTravel'
import { emptyBusFilters, filterBusListings, normalisePlace, placeOptions, southAfricanToday, type BusFilters, type BusListing, type BusSort } from '../utils/busTravel'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-border bg-slate-deep px-3 py-2.5 text-base text-cream focus:outline-none focus:ring-2 focus:ring-teal-light'

export default function Travel() {
  const { currentUser } = useApp()
  const [listings, setListings] = useState<BusListing[]>([])
  const [filters, setFilters] = useState<BusFilters>({ ...emptyBusFilters })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const resultsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(false)
    getBusListings().then(data => { if (!cancelled) setListings(data) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])
  const origins = useMemo(() => placeOptions(listings, 'from'), [listings])
  const destinations = useMemo(() => placeOptions(listings, 'to'), [listings])
  const companies = useMemo(() => [...new Set(listings.map(listing => listing.company_name))].sort(), [listings])
  const results = useMemo(() => filterBusListings(listings, filters), [listings, filters])
  const matchedFrom = useMemo(() => filters.from.trim() ? placeOptions(results, 'from', filters.from) : [], [results, filters.from])
  const matchedTo = useMemo(() => filters.to.trim() ? placeOptions(results, 'to', filters.to) : [], [results, filters.to])
  const set = <K extends keyof BusFilters>(key: K, value: BusFilters[K]) => setFilters(previous => ({ ...previous, [key]: value }))
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== 'sort' && !!value)
  const correction = (label: string, query: string, places: string[]) => query && places.length && !places.some(place => normalisePlace(place) === normalisePlace(query))
    ? <p className="text-sm text-cream-muted">{label} matched: <span className="text-cream font-medium">{places.slice(0, 3).join(' · ')}{places.length > 3 ? ' …' : ''}</span></p> : null
  return <div className="min-h-screen bg-slate-deep">
    <Navbar />
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-10 pb-16">
      <header className="max-w-2xl mb-7">
        <p className="text-teal-light text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2"><Bus size={16} aria-hidden="true" /> AtriumX Travel</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-cream mt-3">Find a bus home.</h1>
        <p className="text-cream-muted text-sm sm:text-base leading-relaxed mt-3">Explore bus routes and fares shared by bus companies. Free to browse, with no account needed.</p>
        {currentUser?.is_admin && <Link to="/admin?tab=travel" className="inline-block text-sm font-semibold text-teal-light underline mt-3">Manage bus listings</Link>}
      </header>

      <form className="rounded-2xl border border-slate-border bg-slate-card p-4 sm:p-6" onSubmit={event => { event.preventDefault(); resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-3 sm:items-end">
          <PlaceSearch label="From" value={filters.from} options={origins} onChange={value => set('from', value)} />
          <button type="button" onClick={() => setFilters(previous => ({ ...previous, from: previous.to, to: previous.from }))} aria-label="Swap departure and destination" className="rounded-xl border border-slate-border text-teal-light h-12 w-12 flex items-center justify-center justify-self-center"><ArrowLeftRight size={18} /></button>
          <PlaceSearch label="To" value={filters.to} options={destinations} onChange={value => set('to', value)} />
          <button type="submit" className="h-12 rounded-xl bg-teal-primary text-white px-5 text-sm font-bold">Find buses</button>
        </div>
        <p className="text-xs text-cream-muted mt-3">Choose a listed place or type to search. Small spelling mistakes are supported.</p>

        <details className="mt-5 border-t border-slate-border pt-4">
          <summary className="text-sm text-cream font-semibold cursor-pointer"><span className="inline-flex items-center gap-2"><SlidersHorizontal size={16} /> More filters</span></summary>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 text-sm text-cream">
            <label>Bus company<select value={filters.company} onChange={event => set('company', event.target.value)} className={inputClass}><option value="">All companies</option>{companies.map(company => <option key={company} value={company}>{company}</option>)}</select></label>
            <label>Maximum listed fare (R)<input type="number" min="0" step="0.01" value={filters.maxPrice} placeholder="Any price" onChange={event => set('maxPrice', event.target.value)} className={inputClass} /></label>
            <label>Travel date<input type="date" min={southAfricanToday()} value={filters.date} onChange={event => set('date', event.target.value)} className={inputClass} /></label>
            <label>Departure time<select value={filters.departure} onChange={event => set('departure', event.target.value)} className={inputClass}><option value="">Any time</option><option value="overnight">00:00–05:59</option><option value="morning">06:00–11:59</option><option value="afternoon">12:00–17:59</option><option value="evening">18:00–23:59</option></select></label>
            <label>Fare basis<select value={filters.journey} onChange={event => set('journey', event.target.value)} className={inputClass}><option value="">One-way and return</option><option value="one_way">One-way</option><option value="return">Return</option></select></label>
            <label>Service<select value={filters.connection} onChange={event => set('connection', event.target.value)} className={inputClass}><option value="">All services</option><option value="direct">Direct only</option><option value="connecting">Connecting services</option></select></label>
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm text-cream"><input type="checkbox" checked={filters.studentDiscount} onChange={event => set('studentDiscount', event.target.checked)} className="accent-teal-primary w-4 h-4" /> Student discount listed</label>
          <p className="text-xs text-cream-muted mt-3">Filters use supplied details. A missing detail does not mean a company cannot offer it. Routes with unspecified dates still appear; confirm dates on the company website.</p>
        </details>
      </form>

      <section ref={resultsRef} className="mt-7 scroll-mt-20" aria-label="Bus listings" aria-busy={loading}>
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex items-center gap-3"><p role="status" className="font-semibold text-sm text-cream">{loading ? 'Loading buses…' : error ? 'Bus listings unavailable' : `${results.length} ${results.length === 1 ? 'listing' : 'listings'}`}</p>{hasFilters && <button type="button" onClick={() => setFilters({ ...emptyBusFilters })} className="text-teal-light text-sm underline">Clear filters</button>}</div>
          <label className="flex flex-wrap items-center gap-2 text-sm text-cream-muted">Sort by<select aria-label="Sort bus listings" value={filters.sort} onChange={event => set('sort', event.target.value as BusSort)} className="rounded-xl border border-slate-border bg-slate-card px-3 py-2 text-sm text-cream"><option value="price_low">Lowest price</option><option value="price_high">Highest price</option><option value="duration">Shortest duration</option><option value="departure">Earliest departure</option><option value="updated">Recently updated</option></select></label>
        </div>
        {correction('From', filters.from, matchedFrom)}{correction('To', filters.to, matchedTo)}
        <p className="text-xs text-cream-muted mb-5 mt-2 leading-relaxed">Fares and timetables are company-supplied, not live availability. Confirm the latest price, travel date and seats on the company website. Unlisted prices appear last when sorting by price.</p>
        {error ? <div className="text-center rounded-2xl border border-slate-border p-8"><p role="alert" className="text-cream">We could not load the bus listings. Please try again.</p><button onClick={() => setAttempt(value => value + 1)} className="rounded-xl bg-teal-primary text-white px-5 py-3 mt-4 text-sm font-bold">Try again</button></div>
          : loading ? <div className="grid md:grid-cols-2 gap-4" aria-hidden="true">{[0, 1].map(index => <div key={index} className="h-52 rounded-2xl border border-slate-border bg-slate-card animate-pulse" />)}</div>
          : results.length ? <div className="grid md:grid-cols-2 gap-4 items-stretch">{results.map(listing => <BusCard key={listing.id} listing={listing} />)}</div>
          : <div className="rounded-2xl border border-slate-border bg-slate-card p-8 sm:p-12 text-center"><Bus size={32} aria-hidden="true" className="text-teal-light mx-auto mb-4" /><h2 className="text-lg font-bold text-cream">{listings.length ? 'No listed routes match these filters' : 'Bus routes are on their way'}</h2><p className="text-sm text-cream-muted mt-2 max-w-md mx-auto">{listings.length ? 'Try another town, a boarding point, or fewer filters. We can only show information companies have supplied.' : 'Routes and fares will appear here as bus companies share their information with AtriumX.'}</p>{hasFilters && <button onClick={() => setFilters({ ...emptyBusFilters })} className="rounded-xl bg-teal-primary text-white px-5 py-3 mt-5 text-sm font-bold">Show all listings</button>}</div>}
      </section>
    </main>
  </div>
}
