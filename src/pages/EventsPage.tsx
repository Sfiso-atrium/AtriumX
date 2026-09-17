import { useState, useMemo, useEffect } from 'react'
import { Search, X, Tag, HandHelping, CalendarDays, MapPin, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Listing, getListings, getBusinessListings, getResidences, getLookingFor, LookingForEntry, getEvents, CampusEvent, EVENT_CATEGORIES } from '../services/dataService'
import { BUSINESS_TYPES } from './RetailerSignup'
import Navbar from '../components/common/Navbar'
import CategoryChips, { CategoryOption } from '../components/common/CategoryChips'
import ListingCard from '../components/common/ListingCard'
import BottomNav from '../components/common/BottomNav'
import LegalFooter from '../components/common/LegalFooter'

const APPLICATION_LINK = 'https://atriumx.co.za/retailer'
const BUSINESS_CATEGORIES = [
  { id: 'all', label: 'All' },
  ...BUSINESS_TYPES.map(t => ({ id: t, label: t })),
]
const EVENT_FILTER_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'All' },
  ...EVENT_CATEGORIES.map(c => ({ id: c, label: c })),
]

function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      </div>
      <p className="text-cream-muted text-sm mb-4">{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="bg-ember hover:bg-ember-dark text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">{actionLabel}</button>
      )}
    </div>
  )
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86400000)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  if (sameDay(d, today)) return `Today, ${time}`
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`
  return `${d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}

export default function Feed() {
  const { activeCategory, showToast, currentUser } = useApp()
  const navigate = useNavigate()

  // --- Discover top-level: Marketplace vs Events ---
  const [discoverTab, setDiscoverTab] = useState<'marketplace' | 'events'>(() => {
    const saved = localStorage.getItem('discover_last_tab')
    return saved === 'events' ? 'events' : 'marketplace'
  })
  useEffect(() => { localStorage.setItem('discover_last_tab', discoverTab) }, [discoverTab])

  // Marketplace internal tabs (students vs businesses) - preserved from original
  const [feedTab, setFeedTab] = useState<'marketplace' | 'business'>(() => {
    const saved = localStorage.getItem('feed_last_tab')
    return saved === 'business' ? 'business' : 'marketplace'
  })
  useEffect(() => { localStorage.setItem('feed_last_tab', feedTab) }, [feedTab])

  const [localSearch, setLocalSearch] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [businessListings, setBusinessListings] = useState<Listing[]>([])
  const [businessLoading, setBusinessLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [residenceOptions, setResidenceOptions] = useState<string[]>([])
  const [residenceFilter, setResidenceFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [negotiableOnly, setNegotiableOnly] = useState(false)

  const [bizSearch, setBizSearch] = useState('')
  const [bizCategory, setBizCategory] = useState('all')
  const [bizFiltersOpen, setBizFiltersOpen] = useState(false)
  const [bizMinPrice, setBizMinPrice] = useState('')
  const [bizMaxPrice, setBizMaxPrice] = useState('')
  const [bizNegotiableOnly, setBizNegotiableOnly] = useState(false)

  const [marketMode, setMarketMode] = useState<'selling' | 'wanted'>('selling')
  const [lookingFor, setLookingFor] = useState<LookingForEntry[]>([])
  const [lookingForLoading, setLookingForLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  // Events state - now inside Discover
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [eventTimeFilter, setEventTimeFilter] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    getListings({ currentUser }).then(data => { setListings(data); setDbLoading(false) }).catch(() => { setDbLoading(false); setFetchError(true) })
    getResidences().then(setResidenceOptions)
    getLookingFor().then(data => { setLookingFor(data); setLookingForLoading(false) }).catch(() => setLookingForLoading(false))
    getBusinessListings().then(data => { setBusinessListings(data); setBusinessLoading(false) }).catch(() => setBusinessLoading(false))
    getEvents().then(data => { setEvents(data); setEventsLoading(false) }).catch(() => setEventsLoading(false))
  }, [currentUser])

  const filtered = useMemo(() => {
    return listings.filter(listing => {
      const matchCat = activeCategory === 'all' || listing.category === activeCategory
      const q = localSearch.trim().toLowerCase()
      const matchSearch = !q || listing.title.toLowerCase().includes(q) || listing.description.toLowerCase().includes(q)
      const matchResidence = residenceFilter === 'all' || listing.residence === residenceFilter
      const min = minPrice ? Number(minPrice) : null
      const max = maxPrice ? Number(maxPrice) : null
      const matchPrice = (min === null || listing.price >= min) && (max === null || listing.price <= max)
      const matchNegotiable = !negotiableOnly || listing.is_negotiable
      return matchCat && matchSearch && matchResidence && matchPrice && matchNegotiable
    })
  }, [listings, activeCategory, localSearch, residenceFilter, minPrice, maxPrice, negotiableOnly])

  const filteredBusiness = useMemo(() => {
    return businessListings.filter(listing => {
      const matchCat = bizCategory === 'all' || listing.category === bizCategory
      const q = bizSearch.trim().toLowerCase()
      const matchSearch = !q || listing.title.toLowerCase().includes(q) || listing.description.toLowerCase().includes(q)
      const min = bizMinPrice ? Number(bizMinPrice) : null
      const max = bizMaxPrice ? Number(bizMaxPrice) : null
      const matchPrice = listing.is_negotiable || ((min === null || listing.price >= min) && (max === null || listing.price <= max))
      const matchNegotiable = !bizNegotiableOnly || listing.is_negotiable
      return matchCat && matchSearch && matchPrice && matchNegotiable
    })
  }, [businessListings, bizCategory, bizSearch, bizMinPrice, bizMaxPrice, bizNegotiableOnly])

  const filteredLookingFor = useMemo(() => {
    return lookingFor.filter(entry => {
      const matchCat = activeCategory === 'all' || entry.category === activeCategory
      const q = localSearch.trim().toLowerCase()
      const matchSearch = !q || entry.title.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [lookingFor, activeCategory, localSearch])

  const visibleEvents = useMemo(() => {
    const now = new Date()
    return events.filter(e => {
      const matchCat = eventFilter === 'all' || e.category === eventFilter
      const d = new Date(e.starts_at)
      const matchTime = eventTimeFilter === 'upcoming' ? d >= now : d < now
      const q = localSearch.trim().toLowerCase()
      const matchSearch = !q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)
      return matchCat && matchTime && matchSearch
    }).sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }, [events, eventFilter, eventTimeFilter, localSearch])

  const handleCopyApplicationLink = () => {
    navigator.clipboard.writeText(APPLICATION_LINK)
    showToast('Application link copied!', 'success')
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-28 md:ml-64 md:max-w-[calc(100%-16rem)] lg:max-w-5xl">
          {/* Discover header like reference image 3 */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-serif text-2xl text-cream">Discover</h1>
            <button onClick={() => navigate('/post')} className="hidden md:flex bg-gold text-slate-deep font-bold text-xs px-4 py-2 rounded-xl">Post</button>
          </div>

          {/* Marketplace | Events pills */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setDiscoverTab('marketplace')}
              className={`px-5 py-2 rounded-full text-sm font-bold border transition-colors ${discoverTab === 'marketplace' ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-slate-card border-slate-border text-cream-muted hover:text-cream'}`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setDiscoverTab('events')}
              className={`px-5 py-2 rounded-full text-sm font-bold border transition-colors ${discoverTab === 'events' ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-slate-card border-slate-border text-cream-muted hover:text-cream'}`}
            >
              Events
            </button>
          </div>

          {/* Search - shared for both tabs, like reference "Search listings and events..." */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder={discoverTab === 'marketplace' ? 'Search listings...' : 'Search events...'}
              className="w-full bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
            />
            {localSearch && (
              <button onClick={() => setLocalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"><X size={14} /></button>
            )}
          </div>

          {discoverTab === 'marketplace' ? (
            <>
              {/* Students vs Businesses - kept from original but now as secondary row */}
              <div className="flex gap-2 mb-3">
                <button onClick={() => setFeedTab('marketplace')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${feedTab === 'marketplace' ? 'bg-slate-card border-slate-border text-cream' : 'border-transparent text-cream-muted'}`}>For Students</button>
                <button onClick={() => setFeedTab('business')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${feedTab === 'business' ? 'bg-slate-card border-slate-border text-cream' : 'border-transparent text-cream-muted'}`}>Businesses</button>
                <div className="flex-1" />
                <button onClick={() => setMarketMode(m => m === 'selling' ? 'wanted' : 'selling')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${marketMode === 'wanted' ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-slate-card border-slate-border text-cream-muted'}`}><HandHelping size={12} />{marketMode === 'selling' ? 'Looking For' : 'For Sale'}</button>
              </div>

              {feedTab === 'marketplace' && marketMode === 'selling' && (
                <>
                  <CategoryChips categories={[{ id: 'all', label: 'All' }, { id: 'electronics', label: 'Electronics' }, { id: 'clothing', label: 'Clothing' }, { id: 'books', label: 'Books' }, { id: 'services', label: 'Services' }, { id: 'furniture', label: 'Furniture' }, { id: 'other', label: 'More' }]} active={activeCategory} onSelect={(id) => (window as any).setActiveCategory?.(id) || undefined} />
                  {/* Fallback to original CategoryChips using context activeCategory */}
                  <div className="-mx-4"><CategoryChips categories={[{ id: 'all', label: 'All' }, { id: 'electronics', label: 'Electronics' }, { id: 'clothing', label: 'Clothing' }, { id: 'books', label: 'Books' }, { id: 'services', label: 'Services' }]} active={activeCategory} onSelect={() => {}} /></div>
                  <div className="px-1 pb-2 flex items-center justify-between">
                    <button onClick={() => setFiltersOpen(o => !o)} className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2">{filtersOpen ? 'Hide filters' : 'Filters'}</button>
                    <p className="text-cream-muted text-xs">{dbLoading ? 'Loading...' : `${filtered.length} listings`}</p>
                  </div>
                  {filtersOpen && (
                    <div className="px-1 pb-3 flex flex-wrap items-center gap-2">
                      <select value={residenceFilter} onChange={e => setResidenceFilter(e.target.value)} className="bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs focus:outline-none focus:border-teal-light"><option value="all">All Residences</option>{residenceOptions.map(r => <option key={r} value={r}>{r}</option>)}</select>
                      <input type="number" min={0} value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min R" className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs" />
                      <input type="number" min={0} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max R" className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs" />
                      <button onClick={() => setNegotiableOnly(v => !v)} className={`text-xs px-3 py-2 rounded-xl border ${negotiableOnly ? 'bg-gold/10 text-gold border-gold/40' : 'bg-slate-card text-cream-muted border-slate-border'}`}>Open to offers</button>
                    </div>
                  )}
                  {filtered.length === 0 ? <EmptyState message={fetchError ? 'Could not load listings.' : dbLoading ? 'Loading...' : 'Nothing here yet.'} actionLabel={dbLoading || fetchError ? undefined : 'Post a Listing'} onAction={() => navigate('/plan-select')} /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map(listing => <ListingCard key={listing.id} listing={listing} />)}
                    </div>
                  )}
                </>
              )}

              {feedTab === 'marketplace' && marketMode === 'wanted' && (
                <>
                  <div className="px-1 pb-2"><p className="text-cream-muted text-xs">{lookingForLoading ? 'Loading...' : `${filteredLookingFor.length} requests`}</p></div>
                  {filteredLookingFor.length === 0 ? <EmptyState message={lookingForLoading ? 'Loading...' : 'No requests yet.'} /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredLookingFor.map(entry => (
                        <div key={entry.id} className="bg-slate-card border border-slate-border rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-3 mb-2"><p className="text-cream font-bold text-sm">{entry.title}</p><span className="text-[10px] font-bold text-cream-muted border border-slate-border rounded-full px-2 py-0.5">{entry.category}</span></div>
                          <p className="text-cream-muted text-xs mb-2">{entry.description}</p>
                          <p className="text-cream-muted text-[11px]">by {entry.user?.full_name ?? 'a student'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {feedTab === 'business' && (
                <>
                  <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
                    <input type="text" value={bizSearch} onChange={e => setBizSearch(e.target.value)} placeholder="Search businesses..." className="w-full bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 py-2.5 text-cream text-sm" />
                    {bizSearch && <button onClick={() => setBizSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted"><X size={14} /></button>}
                  </div>
                  <CategoryChips categories={BUSINESS_CATEGORIES} active={bizCategory} onSelect={setBizCategory} />
                  <div className="px-1 pb-2 flex items-center justify-between"><button onClick={() => setBizFiltersOpen(o => !o)} className="text-blue-400 text-xs underline">{bizFiltersOpen ? 'Hide filters' : 'Filters'}</button><p className="text-cream-muted text-xs">{businessLoading ? 'Loading...' : `${filteredBusiness.length} businesses`}</p></div>
                  {filteredBusiness.length === 0 ? <EmptyState message={businessLoading ? 'Loading...' : 'No businesses.'} actionLabel={businessLoading ? undefined : 'Copy Application Link'} onAction={handleCopyApplicationLink} /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{filteredBusiness.map(listing => <ListingCard key={listing.id} listing={listing} />)}</div>
                  )}
                </>
              )}
            </>
          ) : (
            // Events tab inside Discover - vertical list like reference image 4
            <>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setEventTimeFilter('upcoming')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${eventTimeFilter === 'upcoming' ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-slate-card border-slate-border text-cream-muted'}`}>Upcoming</button>
                <button onClick={() => setEventTimeFilter('past')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${eventTimeFilter === 'past' ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-slate-card border-slate-border text-cream-muted'}`}>Past</button>
              </div>
              <div className="-mx-4"><CategoryChips categories={EVENT_FILTER_OPTIONS} active={eventFilter} onSelect={setEventFilter} /></div>
              {eventsLoading ? <p className="text-cream-muted text-sm mt-4">Loading events...</p> : visibleEvents.length === 0 ? (
                <div className="text-center py-16"><CalendarDays size={32} className="text-cream-muted mx-auto mb-3 opacity-50" /><p className="text-cream font-bold text-sm mb-1">Nothing coming up yet</p><p className="text-cream-muted text-xs mb-5">Be the first to put something on the board.</p><button onClick={() => navigate('/post-event')} className="bg-gold text-slate-deep font-bold text-xs px-5 py-2.5 rounded-xl">Post an event</button></div>
              ) : (
                <div className="flex flex-col gap-3 mt-2">
                  {visibleEvents.map(ev => {
                    const d = new Date(ev.starts_at)
                    return (
                      <div key={ev.id} className="bg-slate-card border border-slate-border rounded-2xl p-3 flex gap-3 hover:border-slate-border/80 transition-colors">
                        <div className="w-14 h-14 rounded-xl bg-slate-deep border border-slate-border flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-cream font-bold text-sm">{d.getDate()}</span>
                          <span className="text-cream-muted text-[10px] font-bold uppercase">{d.toLocaleDateString('en-ZA', { month: 'short' })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-cream font-bold text-sm truncate">{ev.title}</p>
                              <p className="text-gold text-xs font-bold mt-0.5 flex items-center gap-1"><Clock size={10} />{formatWhen(ev.starts_at)}</p>
                            </div>
                            <span className="flex-shrink-0 text-[10px] font-bold text-cream-muted border border-slate-border rounded-full px-2 py-0.5">{ev.category}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-cream-muted text-xs mt-1.5"><MapPin size={12} /><span className="truncate">{ev.location}</span></div>
                          {ev.description && <p className="text-cream-muted text-xs leading-relaxed mt-1.5 line-clamp-2">{ev.description}</p>}
                          <div className="flex items-center justify-between mt-2"><span className="text-cream text-xs font-bold">{ev.price == null ? 'Free entry' : `R${Number(ev.price).toFixed(2)}`}</span><span className="text-cream-muted text-[11px]">by {ev.host?.full_name ?? 'a student'}</span></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <LegalFooter />
      </div>
      <BottomNav />
    </>
  )
}
