import { useState, useMemo, useEffect } from 'react'
import { Search, X, HandHelping, MessageCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Listing, getListings, getBusinessListings, getBusinessProfile, getResidences, getWantedPosts, startWantedConversation, WantedPost, PLAN_ORDER, BUSINESS_PLAN_ORDER, PlanKey } from '../services/dataService'
import { BUSINESS_TYPES } from './RetailerSignup'
import Navbar from '../components/common/Navbar'
import CategoryChips, { STUDENT_CATEGORIES } from '../components/common/CategoryChips'
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
stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-primary">          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
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
const { activeCategory, setActiveCategory, showToast, currentUser, setAuthPromptOpen, setRedirectAfterLogin } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedUniversity = new URLSearchParams(location.search).get('university')
  const [feedTab, setFeedTab] = useState<'marketplace' | 'business'>(() => {
    const saved = localStorage.getItem('feed_last_tab')
    return saved === 'business' ? 'business' : 'marketplace'
  })
  useEffect(() => { localStorage.setItem('feed_last_tab', feedTab) }, [feedTab])
  useEffect(() => {
    if (currentUser?.account_type === 'business') setFeedTab('marketplace')
  }, [currentUser?.account_type])
  const [localSearch, setLocalSearch] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [businessListings, setBusinessListings] = useState<Listing[]>([])
  const [businessLoading, setBusinessLoading] = useState(true)
  const [businessUniversities, setBusinessUniversities] = useState<string[]>([])
  const [businessUniversitiesLoading, setBusinessUniversitiesLoading] = useState(false)

  // Filters are hidden by default so the feed doesn't look cluttered â€” the
  // "Filters" link below the search bar reveals this row on demand.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [residenceOptions, setResidenceOptions] = useState<string[]>([])
  const [residenceFilter, setResidenceFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [negotiableOnly, setNegotiableOnly] = useState(false)

  // Businesses tab gets its own search/category/filters state â€” separate
  // from the marketplace tab's, since business listings have no residence
  // or negotiable flag, and their categories are business types, not the
  // student CATEGORIES list.
const [bizSearch, setBizSearch] = useState('')
  const [bizCategory, setBizCategory] = useState('all')
  const [bizFiltersOpen, setBizFiltersOpen] = useState(false)
  const [bizMinPrice, setBizMinPrice] = useState('')
  const [bizMaxPrice, setBizMaxPrice] = useState('')
  const [bizNegotiableOnly, setBizNegotiableOnly] = useState(false)

  const [wantedPosts, setWantedPosts] = useState<WantedPost[]>([])
  const [wantedPostsLoading, setWantedPostsLoading] = useState(true)

const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    if (currentUser?.account_type !== 'business') {
      setBusinessUniversities([])
      setBusinessUniversitiesLoading(false)
      return
    }

    let mounted = true
    setBusinessUniversitiesLoading(true)
    getBusinessProfile(currentUser.id)
      .then(profile => {
        if (!mounted) return
        setBusinessUniversities(profile?.universities ?? [])
        setBusinessUniversitiesLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setBusinessUniversities([])
        setBusinessUniversitiesLoading(false)
      })

    return () => { mounted = false }
  }, [currentUser])

  const marketplaceUniversity = currentUser?.account_type === 'business'
    ? (requestedUniversity && businessUniversities.includes(requestedUniversity)
        ? requestedUniversity
        : businessUniversities[0] ?? null)
    : currentUser?.university ?? null

  useEffect(() => {
    if (currentUser?.account_type === 'business' && businessUniversitiesLoading) return

    setDbLoading(true)
    setBusinessLoading(true)
    setFetchError(false)

    getListings({ currentUser, university: marketplaceUniversity })
      .then(data => {
        setListings(data)
        setDbLoading(false)
      })
      .catch(() => {
        setDbLoading(false)
        setFetchError(true)
      })

    getResidences().then(setResidenceOptions)
    setWantedPostsLoading(true)
    getWantedPosts()
      .then(data => { setWantedPosts(data); setWantedPostsLoading(false) })
      .catch(() => setWantedPostsLoading(false))
    getBusinessListings(currentUser, marketplaceUniversity)
      .then(data => {
        setBusinessListings(data)
        setBusinessLoading(false)
      })
      .catch(() => setBusinessLoading(false))
  }, [currentUser, marketplaceUniversity, businessUniversitiesLoading])

  const sortByPlanPriority = (items: Listing[], business = false) => {
    const order = business ? BUSINESS_PLAN_ORDER : PLAN_ORDER
    const rank = new Map(order.map((plan, index) => [plan, index]))
    return [...items].sort((a, b) => {
      const aRank = rank.get(a.plan_tier as PlanKey) ?? -1
      const bRank = rank.get(b.plan_tier as PlanKey) ?? -1
      if (aRank !== bRank) return bRank - aRank
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  const marketplaceListings = useMemo(() =>
    currentUser?.account_type === 'business'
      ? [...listings, ...businessListings]
      : listings,
    [currentUser, listings, businessListings]
  )

  const filtered = useMemo(() => {
    const matches = marketplaceListings.filter(listing => {
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
    return sortByPlanPriority(matches)
  }, [marketplaceListings, activeCategory, localSearch, residenceFilter, minPrice, maxPrice, negotiableOnly])

const filteredBusiness = useMemo(() => {
    const matches = businessListings.filter(listing => {
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
    return sortByPlanPriority(matches, true)
  }, [businessListings, bizCategory, bizSearch, bizMinPrice, bizMaxPrice, bizNegotiableOnly])

  const featuredListings = useMemo(() =>
    filtered.filter(listing => listing.plan_tier === 'unmissable' || listing.plan_tier === 'campus_partner'),
    [filtered]
  )

  const verifiedListings = useMemo(() =>
    filtered.filter(listing => listing.plan_tier === 'loud'),
    [filtered]
  )

  const spottedListings = useMemo(() =>
    filtered.filter(listing => listing.plan_tier === 'visible'),
    [filtered]
  )

  // Ghost listings (and anything without a recognised paid tier) stay in
  // here, pinned to the very bottom of the marketplace.
  const otherListings = useMemo(() =>
    filtered.filter(listing => !['unmissable', 'campus_partner', 'loud', 'visible'].includes(listing.plan_tier)),
    [filtered]
  )

  const handleCopyApplicationLink = () => {
    navigator.clipboard.writeText(APPLICATION_LINK)
      .then(() => showToast('Application link copied â€” send it their way.', 'success'))
      .catch(() => showToast('Could not copy the link. Try again.', 'error'))
  }
  const handleWantedPostChat = async (post: WantedPost) => {
    if (!currentUser) {
      setRedirectAfterLogin('/feed')
      setAuthPromptOpen(true)
      return
    }
    if (post.seeker_id === currentUser.id) return

    const { convId, error } = await startWantedConversation(post.id, currentUser.id, post.seeker_id)
    if (error) {
      showToast(error, 'error')
      return
    }
    if (convId) navigate(`/chat/${convId}`)
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

          <div className="px-4 pt-2 pb-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1.7fr)_minmax(220px,1fr)] gap-2 items-stretch border-b border-[#e8eef6]">
            <div className="flex h-12 bg-white border border-slate-border rounded-xl p-1">
              <button
                type="button"
                className="flex-1 h-full bg-blue-50 text-blue-600 border-b-2 border-blue-600 rounded-lg text-sm font-bold transition-colors"
              >
                Marketplace
              </button>
              <button
                type="button"
                onClick={() => navigate(currentUser?.account_type === 'business' && requestedUniversity ? `/events?university=${encodeURIComponent(requestedUniversity)}` : '/events')}
                className="flex-1 h-full text-cream-muted hover:text-blue-600 hover:bg-blue-50/60 rounded-lg text-sm font-medium transition-colors"
              >
                Events
              </button>
            </div>

            <div className="relative h-12">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
              <input
                type="text"
                value={feedTab === 'marketplace' ? localSearch : bizSearch}
                onChange={e => feedTab === 'marketplace' ? setLocalSearch(e.target.value) : setBizSearch(e.target.value)}
                placeholder={feedTab === 'marketplace' ? 'Search listings...' : 'Search businesses...'}
                className="w-full h-full bg-slate-card border border-slate-border rounded-lg pl-9 pr-9 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
              />
              {(feedTab === 'marketplace' ? localSearch : bizSearch) && (
                <button
                  type="button"
                  onClick={() => feedTab === 'marketplace' ? setLocalSearch('') : setBizSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pt-2 pb-1 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 bg-slate-card border border-slate-border rounded-lg px-3 py-2 text-sm font-medium text-cream whitespace-nowrap">
              <span className="text-cream-muted">For:</span>
              <select
                value={feedTab}
                onChange={e => setFeedTab(e.target.value as 'marketplace' | 'business')}
                className="bg-transparent text-cream focus:outline-none cursor-pointer"
              >
                <option value="marketplace">{currentUser?.account_type === 'business' ? 'All listings' : 'Students'}</option>
                <option value="business">Businesses</option>
              </select>
            </label>

            <div className="min-w-0 flex-1">
              {feedTab === 'marketplace' ? (
                <CategoryChips categories={STUDENT_CATEGORIES} active={activeCategory} onSelect={setActiveCategory} />
              ) : (
                <CategoryChips categories={BUSINESS_CATEGORIES} active={bizCategory} onSelect={setBizCategory} />
              )}
            </div>
          </div>

          {feedTab === 'marketplace' && (
          <>
          <div className="px-4 pt-2 pb-2">
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="text-blue-600 hover:text-blue-700 text-xs underline underline-offset-2 transition-colors"
            >
              {filtersOpen ? 'Hide filters' : 'Filters'}
            </button>
          </div>

          {filtersOpen && (
            <div className="px-4 py-3 flex flex-wrap items-center gap-2">
              <select value={residenceFilter} onChange={e => setResidenceFilter(e.target.value)} className="bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs focus:outline-none focus:border-teal-light">
                <option value="all">All residences</option>
                {residenceOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input type="number" inputMode="numeric" min={0} value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min R" className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              <input type="number" inputMode="numeric" min={0} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max R" className="w-20 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-xs placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              <button
                onClick={() => setNegotiableOnly(v => !v)}
                className={`text-xs px-3 py-2 rounded-xl border transition-colors ${negotiableOnly ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-card text-cream-muted border-slate-border hover:border-teal-light'}`}
              >
                Open to offers
              </button>
            </div>
          )}

          <div className="px-4 pt-3 pb-2">
            <p className="text-cream-muted text-xs">{dbLoading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} found`}</p>
          </div>

          {featuredListings.length > 0 && (
            <section className="pb-5">
              <div className="px-4 pb-2 flex items-center justify-between">
                <h2 className="text-cream font-extrabold text-2xl sm:text-[26px]">Featured listings</h2>
                <span className="text-cream-muted text-[11px]">Scroll</span>
              </div>
              <div className="px-4 flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                {featuredListings.map(listing => (
                  <div key={listing.id} className="w-[285px] sm:w-[315px] flex-shrink-0 snap-start"><ListingCard listing={listing} /></div>
                ))}
              </div>
            </section>
          )}

          {!wantedPostsLoading && wantedPosts.length > 0 && (
            <section className="pb-5">
              <div className="px-4 pb-2 flex items-center justify-between">
                <h2 className="text-cream font-extrabold text-2xl sm:text-[26px]">People are looking for</h2>
                <HandHelping size={17} className="text-blue-600" />
              </div>
              <div className="px-4 flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                {wantedPosts.map(post => {
                  const isOwnPost = post.seeker_id === currentUser?.id
                  return (
                    <div
                      key={post.id}
                      className="relative min-w-[250px] max-w-[290px] min-h-[360px] flex-shrink-0 snap-start bg-slate-card border border-slate-border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ease-out cursor-default hover:-translate-y-1.5 hover:border-teal-light/60 hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
                    >
                      <div className="flex flex-col gap-4">
                        <p className="text-cream font-bold text-xl leading-snug break-words">
                          {post.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {post.category && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 capitalize">
                              {post.category}
                            </span>
                          )}
                          {post.max_price != null && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-deep text-cream-muted">
                              up to R{Number(post.max_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isOwnPost && (
                        <button
                          type="button"
                          aria-label={`Chat with ${post.seeker?.full_name ?? 'this student'} about ${post.title}`}
                          onClick={() => handleWantedPostChat(post)}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <MessageCircle size={20} />
                        </button>
                      )}

                      <p className="text-cream-muted text-sm font-medium pt-4 mt-4 border-t border-slate-border">
                        {post.seeker?.full_name ?? 'A student'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {verifiedListings.length > 0 && (
            <section className={spottedListings.length === 0 && otherListings.length === 0 ? 'pb-24' : 'pb-5'}>
              <div className="px-4 pb-2 flex items-center justify-between">
                <h2 className="text-cream font-extrabold text-2xl sm:text-[26px]">Verified listings</h2>
                <span className="text-cream-muted text-[11px]">Scroll</span>
              </div>
              <div className="px-4 flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                {verifiedListings.map(listing => (
                  <div key={listing.id} className="w-[285px] sm:w-[315px] flex-shrink-0 snap-start"><ListingCard listing={listing} /></div>
                ))}
              </div>
            </section>
          )}

          {spottedListings.length > 0 && (
            <section className={otherListings.length === 0 ? 'pb-24' : 'pb-5'}>
              <div className="px-4 pb-2 flex items-center justify-between">
                <h2 className="text-cream font-extrabold text-2xl sm:text-[26px]">Spotted listings</h2>
                <span className="text-cream-muted text-[11px]">Scroll</span>
              </div>
              <div className="px-4 flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                {spottedListings.map(listing => (
                  <div key={listing.id} className="w-[285px] sm:w-[315px] flex-shrink-0 snap-start"><ListingCard listing={listing} /></div>
                ))}
              </div>
            </section>
          )}

          {otherListings.length === 0 ? (
            featuredListings.length === 0 && verifiedListings.length === 0 && spottedListings.length === 0 && (
              <EmptyState
                message={fetchError ? 'Could not load listings. Check your connection and try again.' : dbLoading ? 'Loading listings...' : 'Nothing here yet. Be the first to post.'}
                actionLabel={dbLoading || fetchError ? undefined : 'Post a Listing'}
                onAction={() => navigate('/plan-select')}
              />
            )
          ) : (
            <section className="pb-24">
              <div className="px-4 pb-2">
                <h2 className="text-cream font-extrabold text-2xl sm:text-[26px]">
                  {featuredListings.length === 0 && verifiedListings.length === 0 && spottedListings.length === 0 ? 'Listings' : 'More listings'}
                </h2>
              </div>
              <div className="px-4 flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                {otherListings.map(listing => (
                  <div key={listing.id} className="w-[285px] sm:w-[315px] flex-shrink-0 snap-start"><ListingCard listing={listing} /></div>
                ))}
              </div>
            </section>
          )}
          </>
          )}

{feedTab === 'business' && (
            <>
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
              <div className="px-4 pb-24 flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                {filteredBusiness.map(listing => (
                  <div key={listing.id} className="w-[285px] sm:w-[315px] flex-shrink-0 snap-start"><ListingCard listing={listing} /></div>
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
