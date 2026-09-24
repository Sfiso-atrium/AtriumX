import { Building2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { AccommodationListing, getAccommodationListings, AccommodationPlanKey } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import AccommodationCard from '../components/common/AccommodationCard'

// Same grouping the student-facing /accommodations marketplace uses — kept
// in this order so Premium and Featured properties always surface first.
const SECTION_ORDER: AccommodationPlanKey[] = ['accommodation_premium', 'accommodation_featured', 'accommodation_free']

// This used to be the accommodation account's own "your properties"
// dashboard (plan, listing count, add/view button). That management panel
// now lives on the Profile page instead — this is their home screen for
// browsing everyone ELSE'S accommodation, the same way Discover is a
// regular business's home screen. They can look, but chat stays
// student-only, so there's no way to message another accommodation account
// from here or from a listing's own page.
export default function AccommodationHome() {
  const navigate = useNavigate()
  const { currentUser, businessProfile, isLoadingAuth } = useApp()
  const [listings, setListings] = useState<AccommodationListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.id || !businessProfile?.is_accommodation) return
    getAccommodationListings(null).then(data => {
      setListings(data.filter(item => item.seller_id !== currentUser.id))
      setLoading(false)
    })
  }, [currentUser?.id, businessProfile?.is_accommodation])

  // This page previously just rendered nothing at all for anyone who wasn't
  // signed in as an accommodation account — a dead end for a student, a
  // regular business, or a signed-out visitor who ended up here (a stale
  // bookmark, browser history, or a link shared before an account changed
  // type). Send each to their own actual home instead.
  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { navigate('/', { replace: true }); return }
    if (currentUser.account_type === 'student') { navigate('/space', { replace: true }); return }
    if (currentUser.account_type === 'business' && !businessProfile?.is_accommodation) { navigate('/feed', { replace: true }) }
  }, [isLoadingAuth, currentUser, businessProfile?.is_accommodation, navigate])

  const grouped = useMemo(() => {
    const map = new Map<string, AccommodationListing[]>()
    listings.forEach(item => {
      const list = map.get(item.plan_tier) ?? []
      list.push(item)
      map.set(item.plan_tier, list)
    })
    return map
  }, [listings])

  // Whichever section actually has properties in it — used below to tell
  // whether "More accommodation" is the only thing on the page, in which
  // case its own heading would just be pointing at everything and is
  // dropped rather than shown.
  const sectionsWithItems = SECTION_ORDER.filter(plan => (grouped.get(plan) ?? []).length > 0)

  if (isLoadingAuth || !currentUser || !businessProfile?.is_accommodation) {
    return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-28">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-7">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Accommodation</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-cream">Other accommodation</h1>
            <p className="text-cream-muted text-sm mt-2">See what other student accommodation providers have listed on AtriumX.</p>
          </div>
          <Building2 className="hidden sm:block text-teal-light" size={30} />
        </div>

        {loading ? (
          <p className="text-cream-muted text-sm py-16 text-center">Loading accommodation...</p>
        ) : listings.length === 0 ? (
          <div className="bg-slate-card border border-slate-border rounded-3xl py-20 px-6 text-center">
            <Building2 size={36} className="mx-auto text-cream-muted mb-4" />
            <p className="text-cream font-semibold">No other accommodation is listed yet.</p>
            <p className="text-cream-muted text-sm mt-2">Check back as more properties join AtriumX.</p>
          </div>
        ) : (
          <div className="space-y-9">
            {SECTION_ORDER.map(plan => {
              const items = grouped.get(plan) ?? []
              if (items.length === 0) return null
              // "More accommodation" only needs a heading when it's sitting
              // alongside Premium and/or Featured properties. When it's the
              // only section on the page, a caption would just be
              // describing the entire page, so the listings are shown with
              // no caption at all rather than a redundant one.
              const isOnlySection = sectionsWithItems.length === 1 && sectionsWithItems[0] === plan
              const title = plan === 'accommodation_premium' ? 'Premium accommodation' : plan === 'accommodation_featured' ? 'Featured accommodation' : 'More accommodation'
              return (
                <section key={plan}>
                  {!isOnlySection && (
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-2xl sm:text-[26px] font-extrabold text-cream">{title}</h2>
                      <span className="text-cream-muted text-xs">{items.length} {items.length === 1 ? 'property' : 'properties'}</span>
                    </div>
                  )}
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x">
                    {items.map(item => <div key={item.id} className="snap-start"><AccommodationCard listing={item} /></div>)}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
