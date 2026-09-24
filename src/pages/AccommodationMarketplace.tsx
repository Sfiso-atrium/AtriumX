import { useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getAccommodationListings, AccommodationListing, ACCOMMODATION_PLANS, AccommodationPlanKey } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import AccommodationCard from '../components/common/AccommodationCard'

const SECTION_ORDER: AccommodationPlanKey[] = ['accommodation_premium', 'accommodation_featured', 'accommodation_free']

export default function AccommodationMarketplace() {
  const { currentUser } = useApp()
  const [listings, setListings] = useState<AccommodationListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser?.account_type === 'business') return
    getAccommodationListings(currentUser?.university ?? null).then(data => {
      setListings(data)
      setLoading(false)
    })
  }, [currentUser?.account_type, currentUser?.university])

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

  if (currentUser?.account_type === 'business') return null

  return (
    <div className="min-h-screen bg-slate-deep pb-28">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-7">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Accommodation</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-cream">Find your place</h1>
            <p className="text-cream-muted text-sm mt-2">Student accommodation for your university, kept separate from the Marketplace.</p>
          </div>
          <Building2 className="hidden sm:block text-teal-light" size={30} />
        </div>

        {loading ? (
          <p className="text-cream-muted text-sm py-16 text-center">Loading accommodation...</p>
        ) : listings.length === 0 ? (
          <div className="bg-slate-card border border-slate-border rounded-3xl py-20 px-6 text-center">
            <p className="text-cream font-semibold">No accommodation is listed for your university yet.</p>
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
              const title = ACCOMMODATION_PLANS[plan].label === 'Premium' ? 'Premium accommodation' : ACCOMMODATION_PLANS[plan].label === 'Featured' ? 'Featured accommodation' : 'More accommodation'
              return (
                <section key={plan}>
                  {!isOnlySection && (
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-2xl sm:text-[26px] font-extrabold text-cream">{title}</h2>
                      <span className="text-cream-muted text-xs">{items.length} {items.length === 1 ? 'property' : 'properties'}</span>
                    </div>
                  )}
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x">
                    {items.map(listing => <div key={listing.id} className="snap-start"><AccommodationCard listing={listing} /></div>)}
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
