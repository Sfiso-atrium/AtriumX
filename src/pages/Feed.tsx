import { useState, useMemo, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Listing, getListings, getBusinessListings, getResidences } from '../services/dataService'
import { BUSINESS_TYPES } from './RetailerSignup'
import Navbar from '../components/common/Navbar'
import CategoryChips from '../components/common/CategoryChips'
import ListingCard from '../components/common/ListingCard'
import BottomNav from '../components/common/BottomNav'

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
const { activeCategory, showToast } = useApp()
  const navigate = useNavigate()
  const [feedTab, setFeedTab] = useState<'marketplace' | 'business'>('marketplace')
  const [localSearch, setLocalSearch] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [businessListings, setBusinessListings] = useState<Listing[]>([])
  const [businessLoading, setBusinessLoading] = useState(true)

  // Filters are hidden by default so the feed doesn't look cluttered — the
  // "Filters" link below the search bar reveals this row on demand.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [residenceOptions, setResidenceOptions] = useState<string[]>([])
  const [residenceFilter, setResidenceFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [negotiableOnly, setNegotiableOnly] = useState(false)

  // Businesses tab gets its own search/category/filters state — separate
  // from the marketplace tab's, since business listings have no residence
  // or negotiable flag, and their categories are business types, not the
  // student CATEGORIES list.
const [bizSearch, setBizSearch] = useState('')
  const [bizCategory, setBizCategory] = useState('all')
  const [bizFiltersOpen, setBizFiltersOpen] = useState(false)
  const [bizMinPrice, setBizMinPrice] = useState('')
  const [bizMaxPrice, setBizMaxPrice] = useState('')
  const [bizNegotiableOnly, setBizNegotiableOnly] = useState(false)

const [fetchError, setFetchError] = useState(false)
useEffect(() => {
    getListings()
      .then(data => {
        setListings(data)
        setDbLoading(false)
      })
      .catch(() => {
        setDbLoading(false)
        setFetchError(true)
      })
    getResidences().then(setResidenceOptions)
    getBusinessListings()
      .then(data => {
        setBusinessListings(data)
        setBusinessLoading(false)
      })
      .catch(() => setBusinessLoading(false))
  }, [])

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
  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />

        <div className="max-w-4xl mx-auto">
          <div className="px-4 pt-4 flex gap-2">
            <button
              onClick={() => setFeedTab('marketplace')}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                feedTab === 'marketplace'
                  ? 'bg-teal-primary border-teal-light text-cream'
                  : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setFeedTab('business')}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                feedTab === 'business'
                  ? 'bg-teal-primary border-teal-light text-cream'
                  : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
              }`}
            >
              Businesses
            </button>
          </div>

          {feedTab === 'marketplace' && (
          <>
          <div className="px-4 pt-4 pb-2 relative">
            <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-cream-muted" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search listings..."
              className="w-full bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-7 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <CategoryChips />

          <div className="px-4 pb-2">
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2 transition-colors"
            >
              {filtersOpen ? 'Hide filters' : 'Filters'}
            </button>
          </div>

          {filtersOpen && (
            <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
              <select
                value={residenceFilter}
                onChange={e => setResidenceFilter(e.target.value)}
                className="bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs focus:outline-none focus:border-teal-light"
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
                className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="Max R"
                className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
              />

              <button
                onClick={() => setNegotiableOnly(v => !v)}
                className={`text-xs px-3 py-2 rounded-xl border transition-colors ${
                  negotiableOnly
                    ? 'bg-gold/10 text-gold border-gold/40'
                    : 'bg-slate-card text-cream-muted border-slate-border hover:border-teal-light'
                }`}
              >
                Open to offers
              </button>
            </div>
          )}

          <div className="px-4 pb-2">
            <p className="text-cream-muted text-xs">
              {dbLoading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

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

{feedTab === 'business' && (
            <>
            <div className="px-4 pt-4 pb-2 relative">
              <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-cream-muted" />
              <input
                type="text"
                value={bizSearch}
                onChange={e => setBizSearch(e.target.value)}
                placeholder="Search businesses..."
                className="w-full bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
              />
              {bizSearch && (
                <button
                  onClick={() => setBizSearch('')}
                  className="absolute right-7 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <CategoryChips categories={BUSINESS_CATEGORIES} active={bizCategory} onSelect={setBizCategory} />

            <div className="px-4 pb-2">
              <button
                onClick={() => setBizFiltersOpen(o => !o)}
                className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2 transition-colors"
              >
                {bizFiltersOpen ? 'Hide filters' : 'Filters'}
              </button>
            </div>

            {bizFiltersOpen && (
              <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                <input
                  type="number" inputMode="numeric" min={0}
                  value={bizMinPrice} onChange={e => setBizMinPrice(e.target.value)}
                  placeholder="Min R"
                  className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
                />
             
<input
                  type="number" inputMode="numeric" min={0}
                  value={bizMaxPrice} onChange={e => setBizMaxPrice(e.target.value)}
                  placeholder="Max R"
                  className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
                />
                <button
                  onClick={() => setBizNegotiableOnly(v => !v)}
                  className={`text-xs px-3 py-2 rounded-xl border transition-colors ${
                    bizNegotiableOnly
                      ? 'bg-gold/10 text-gold border-gold/40'
                      : 'bg-slate-card text-cream-muted border-slate-border hover:border-teal-light'
                  }`}
                >
                  Open to offers
                </button>
              </div>
            )}
            <div className="px-4 pb-2">
              <p className="text-cream-muted text-xs">
                {businessLoading ? 'Loading...' : `${filteredBusiness.length} business${filteredBusiness.length !== 1 ? 'es' : ''} found`}
              </p>
            </div>

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
      <BottomNav />
    </>
  )
}
