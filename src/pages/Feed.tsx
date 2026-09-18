import { useState, useMemo, useEffect } from 'react'
import { Search, X, Tag, HandHelping, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Listing, getListings, getBusinessListings, getResidences, getLookingFor, LookingForEntry } from '../services/dataService'
import { BUSINESS_TYPES } from './RetailerSignup'
import Navbar from '../components/common/Navbar'
import CategoryChips from '../components/common/CategoryChips'
import ListingCard from '../components/common/ListingCard'
import BottomNav from '../components/common/BottomNav'
import LegalFooter from '../components/common/LegalFooter'
const APPLICATION_LINK = 'https://atriumx.co.za/retailer'
const BUSINESS_CATEGORIES = [
  { id: 'all', label: 'All' },
  ...BUSINESS_TYPES.map(t => ({ id: t, label: t })),
]
function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      </div>
      <p className="text-cream-muted text-sm mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-ember hover:bg-ember-dark text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default function Feed() {
const { activeCategory, showToast, currentUser } = useApp()
  const navigate = useNavigate()
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
useEffect(() => {
    getListings({ currentUser })
      .then(data => {
        setListings(data)
        setDbLoading(false)
      })
      .catch(() => {
        setDbLoading(false)
        setFetchError(true)
      })
    getResidences().then(setResidenceOptions)
    getLookingFor()
      .then(data => { setLookingFor(data); setLookingForLoading(false) })
      .catch(() => setLookingForLoading(false))
    getBusinessListings()
      .then(data => {
        setBusinessListings(data)
        setBusinessLoading(false)
      })
      .catch(() => setBusinessLoading(false))
  }, [currentUser])

  const filtered = useMemo(() => {
    return listings.filter(listing => {
      const matchCat = activeCategory === 'all' || listing.category === activeCategory
      const q = localSearch.trim().toLowerCase()
      const matchSearch = !q ||
        listing.title.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q)
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
      const matchSearch = !q ||
        listing.title.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q)
      const min = bizMinPrice ? Number(bizMinPrice) : null
      const max = bizMaxPrice ? Number(bizMaxPrice) : null
      const matchPrice = listing.is_negotiable ||
        ((min === null || listing.price >= min) && (max === null || listing.price <= max))
      const matchNegotiable = !bizNegotiableOnly || listing.is_negotiable
      return matchCat && matchSearch && matchPrice && matchNegotiable
    })
  }, [businessListings, bizCategory, bizSearch, bizMinPrice, bizMaxPrice, bizNegotiableOnly])

  const handleCopyApplicationLink = () => {
    navigator.clipboard.writeText(APPLICATION_LINK)
      .then(() => showToast('Application link copied — send it their way.', 'success'))
      .catch(() => showToast('Could not copy the link. Try again.', 'error'))
  }

  // unified search value for top bar - switches based on feedTab but keeps same UI size
  const topSearchValue = feedTab === 'marketplace' ? localSearch : bizSearch
  const setTopSearch = (v: string) => {
    if (feedTab === 'marketplace') setLocalSearch(v)
    else setBizSearch(v)
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />

        <div className="max-w-4xl mx-auto">
          <div className="px-4 pt-4 pb-2">
            <h1 className="font-serif text-2xl text-cream">Discover</h1>
            <p className="text-cream-muted text-sm mt-1">Explore the existing marketplace and events.</p>
          </div>

          {/* TOP NAVIGATION - Marketplace / Events toggle + Search (matches Panel 3) */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Marketplace - Events toggle - fixed height to prevent layout shift */}
              <div className="flex bg-slate-card border border-slate-border rounded-xl p-1 h-10 flex-shrink-0">
                <button
                  type="button"
                  className="min-w-[110px] bg-teal-primary border border-teal-light text-cream rounded-lg text-sm font-bold flex items-center justify-center"
                >
                  Marketplace
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="min-w-[90px] text-cream-muted hover:text-cream rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                >
                  Events
                </button>
              </div>

              {/* Unified search - searches listings and events - same line as toggle */}
              <div className="flex-1 relative h-10">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
                <input
                  type="text"
                  value={topSearchValue}
                  onChange={e => setTopSearch(e.target.value)}
                  placeholder="Search listings and events..."
                  className="w-full h-10 bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
                />
                {topSearchValue && (
                  <button
                    onClick={() => setTopSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECOND ROW - For Students / For Business dropdown + Category chips (no size change on toggle) */}
          <div className="px-4 pt-3 pb-2 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Fixed-width dropdown to prevent layout shift */}
            <div className="relative flex-shrink-0 w-full sm:w-[160px] h-9">
              <select
                value={feedTab}
                onChange={e => setFeedTab(e.target.value as 'marketplace' | 'business')}
                className="w-full h-9 appearance-none bg-slate-card border border-slate-border rounded-xl px-3 pr-8 text-cream text-xs font-medium focus:outline-none focus:border-teal-light cursor-pointer"
              >
                <option value="marketplace">For Students</option>
                <option value="business">For Business</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted pointer-events-none" />
            </div>

            {/* Category chips - same container height regardless of tab */}
            <div className="flex-1 min-w-0 h-9 flex items-center overflow-x-auto scrollbar-hide">
              {feedTab === 'marketplace' ? (
                <CategoryChips />
              ) : (
                <CategoryChips categories={BUSINESS_CATEGORIES} active={bizCategory} onSelect={setBizCategory} />
              )}
            </div>
          </div>

          {feedTab === 'marketplace' && (
          <>
          <div className="px-4 pt-3">
            <div className="flex bg-slate-card border border-slate-border rounded-xl p-1 h-9">
              <button
                onClick={() => setMarketMode('selling')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
                  marketMode === 'selling' ? 'bg-teal-primary text-cream' : 'text-cream-muted'
                }`}
              >
                <Tag size={13} /> For sale
              </button>
              <button
                onClick={() => setMarketMode('wanted')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
                  marketMode === 'wanted' ? 'bg-teal-primary text-cream' : 'text-cream-muted'
                }`}
              >
                <HandHelping size={13} /> Looking for
              </button>
            </div>
          </div>

          {marketMode === 'wanted' ? (
            <div className="px-4 pt-4">
              <p className="text-cream-muted text-xs mb-4">
                What students here are hoping someone lists. Got one? Post it.
              </p>
              {lookingForLoading ? (
                <p className="text-cream-muted text-sm">Loading…</p>
              ) : lookingFor.length === 0 ? (
                <div className="text-center py-14">
                  <HandHelping size={30} className="text-cream-muted mx-auto mb-3 opacity-50" />
                  <p className="text-cream font-bold text-sm mb-1">Nothing on the wanted board yet</p>
                  <p className="text-cream-muted text-xs">
                    Add something to your watchlist in My Space and it shows up here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {lookingFor.map(w => (
                    <div key={w.id} className="bg-slate-card border border-slate-border rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-cream font-bold text-sm truncate">
                            {w.keyword || w.category || 'Anything good'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {w.category && (
                              <span className="text-[10px] font-bold text-cream-muted border border-slate-border rounded-full px-2 py-0.5">
                                {w.category}
                              </span>
                            )}
                            {w.max_price != null && (
                              <span className="text-[11px] text-cream-muted">
                                up to R{Number(w.max_price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-cream-muted text-[11px] flex-shrink-0">
                          {w.seeker?.full_name ?? 'A student'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <>

          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2 transition-colors"
            >
              {filtersOpen ? 'Hide filters' : 'Filters'}
            </button>
            <p className="text-cream-muted text-xs">
              {dbLoading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {filtersOpen && (
            <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
              <select
                value={residenceFilter}
                onChange={e => setResidenceFilter(e.target.value)}
                className="bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs focus:outline-none focus:border-teal-light h-9"
              >
                <option value="all">All residences</option>
                {residenceOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                placeholder="Min R"
                className="w-20 h-9 bg-slate-card border border-slate-border rounded-xl px-3 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="Max R"
                className="w-20 h-9 bg-slate-card border border-slate-border rounded-xl px-3 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
              />

              <button
                onClick={() => setNegotiableOnly(v => !v)}
                className={`h-9 text-xs px-3 rounded-xl border transition-colors ${
                  negotiableOnly
                    ? 'bg-gold/10 text-gold border-gold/40'
                    : 'bg-slate-card text-cream-muted border-slate-border hover:border-teal-light'
                }`}
              >
                Open to offers
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
         <EmptyState
              message={
                fetchError
                  ? 'Could not load listings. Check your connection and try again.'
                  : dbLoading
                  ? 'Loading listings...'
                  : 'Nothing here yet. Be the first to post.'
              }
              actionLabel={dbLoading || fetchError ? undefined : 'Post a Listing'}
              onAction={() => navigate('/plan-select')}
            />
          ) : (
            <div className="px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
          </>
          )}
          </>
          )}

{feedTab === 'business' && (
            <>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <button
                onClick={() => setBizFiltersOpen(o => !o)}
                className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2 transition-colors"
              >
                {bizFiltersOpen ? 'Hide filters' : 'Filters'}
              </button>
              <p className="text-cream-muted text-xs">
                {businessLoading ? 'Loading...' : `${filteredBusiness.length} business${filteredBusiness.length !== 1 ? 'es' : ''} found`}
              </p>
            </div>

            {bizFiltersOpen && (
              <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                <input
                  type="number" inputMode="numeric" min={0}
                  value={bizMinPrice} onChange={e => setBizMinPrice(e.target.value)}
                  placeholder="Min R"
                  className="w-20 h-9 bg-slate-card border border-slate-border rounded-xl px-3 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
                />
             <input
                  type="number" inputMode="numeric" min={0}
                  value={bizMaxPrice} onChange={e => setBizMaxPrice(e.target.value)}
                  placeholder="Max R"
                  className="w-20 h-9 bg-slate-card border border-slate-border rounded-xl px-3 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
                />
                <button
                  onClick={() => setBizNegotiableOnly(v => !v)}
                  className={`h-9 text-xs px-3 rounded-xl border transition-colors ${
                    bizNegotiableOnly
                      ? 'bg-gold/10 text-gold border-gold/40'
                      : 'bg-slate-card text-cream-muted border-slate-border hover:border-teal-light'
                  }`}
                >
                  Open to offers
                </button>
              </div>
            )}

            {filteredBusiness.length === 0 ? (
              <EmptyState
                message={
                  businessLoading
                    ? 'Loading businesses...'
                    : businessListings.length === 0
                    ? 'No businesses listed yet. Know one that should be here?'
                    : 'No businesses match your search.'
                }
                actionLabel={businessLoading || businessListings.length > 0 ? undefined : 'Copy Application Link'}
                onAction={handleCopyApplicationLink}
              />
            ) : (
              <div className="px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredBusiness.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
            </>
          )}
        </div>
    </div>
      <LegalFooter />
      <BottomNav />
    </>
  )
}
