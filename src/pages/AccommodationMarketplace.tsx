import { Link } from 'react-router-dom'
import { SOUTH_AFRICAN_UNIVERSITIES } from '../data/universities'
import ResidenceDirectory from '../components/common/ResidenceDirectory'
import { useEffect, useMemo, useState } from 'react'
import { Building2, PenLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getAccommodationListings, AccommodationListing, ACCOMMODATION_PLANS, AccommodationPlanKey } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import AccommodationCard from '../components/common/AccommodationCard'

const SECTION_ORDER: AccommodationPlanKey[] = ['accommodation_premium', 'accommodation_featured', 'accommodation_free']

export default function AccommodationMarketplace() {
  const { currentUser, showToast } = useApp()
  const [listings, setListings] = useState<AccommodationListing[]>([])
  const [nearUniversity, setNearUniversity] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // A logged-in student is filtered to their own university automatically —
  // no selector needed. Guests (and a student with no university on their
  // profile) keep the manual picker below.
  useEffect(() => {
    if (currentUser?.account_type === 'student' && currentUser.university) {
      setNearUniversity(currentUser.university)
    }
  }, [currentUser?.account_type, currentUser?.university])

  useEffect(() => {
    if (currentUser?.account_type === 'business' || !nearUniversity) {
      setListings([])
      setLoading(false)
      setLoadError(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(false)

    getAccommodationListings(nearUniversity)
      .then(data => {
        if (!cancelled) setListings(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUser?.account_type, nearUniversity])

  const grouped = useMemo(() => {
    const map = new Map<string, AccommodationListing[]>()
    listings.forEach(item => {
      const list = map.get(item.plan_tier) ?? []
      list.push(item)
      map.set(item.plan_tier, list)
    })
    return map
  }, [listings])

  const sectionsWithItems = SECTION_ORDER.filter(plan => (grouped.get(plan) ?? []).length > 0)

  const handleShareAccommodationInvite = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/accommodation/post`
    const title = 'Put this accommodation where students can compare it'
    const text = 'Students are comparing accommodation on AtriumX. The property team can add the listing first and create their account at the end:'
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Accommodation link ready to send.', 'success')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      showToast('Could not prepare the link. Try again.', 'error')
    }
  }

  if (currentUser?.account_type === 'business') return null

  return (
    <div className="min-h-screen bg-slate-deep pb-28">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-border bg-slate-card px-5 py-6 sm:px-7 sm:py-7 lg:px-9 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)] lg:items-center">
            <div className="min-w-0">
              <p className="text-teal-light text-xs font-bold uppercase tracking-[0.18em] mb-2">Accommodation</p>
              <h1 className="font-serif text-4xl sm:text-5xl text-cream leading-tight">Find your place</h1>
              <p className="text-cream-muted text-sm sm:text-base mt-2 max-w-xl">Browse accommodation and read students' experiences.</p>

              {!(currentUser?.account_type === 'student' && currentUser.university) && (
                <label className="block text-cream text-sm font-semibold mt-7 max-w-md">
                  Accommodation near
                  <select
                    aria-label="Accommodation near"
                    value={nearUniversity}
                    onChange={e => setNearUniversity(e.target.value)}
                    className="block mt-2 w-full border border-slate-border rounded-xl bg-slate-deep text-cream px-4 py-3.5 outline-none focus:border-teal-light focus:ring-2 focus:ring-teal-faint"
                  >
                    <option value="" disabled>Select a university</option>
                    {SOUTH_AFRICAN_UNIVERSITIES.map(university => <option key={university} value={university}>{university}</option>)}
                  </select>
                </label>
              )}

              <div className="mt-4 sm:hidden">
                <Link to="/accommodations/review" className="inline-flex items-center gap-2 rounded-xl bg-teal-primary text-white px-4 py-3 text-sm font-bold">
                  <PenLine size={17} /> Write a review
                </Link>
              </div>
            </div>

            <div className="relative min-h-[170px] sm:min-h-[210px] lg:min-h-[245px] flex items-end justify-center lg:justify-end">
              <Link to="/accommodations/review" className="hidden sm:inline-flex absolute right-0 top-0 items-center gap-2 rounded-xl bg-teal-primary text-white px-5 py-3 text-sm font-bold shadow-sm z-10">
                <PenLine size={17} /> Write a review
              </Link>
              <img
                src="/atriumx-accommodation-hero-illustration.jpg"
                alt="Illustration of student accommodation buildings"
                className="w-full max-w-[470px] object-contain object-bottom"
              />
            </div>
          </div>

          {!nearUniversity ? (
            <div className="mt-5 rounded-2xl border border-slate-border bg-slate-deep px-5 py-9 sm:py-11 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-teal-faint text-teal-primary">
                <Building2 size={23} />
              </div>
              <p className="text-cream font-semibold">Which university do you want accommodation near?</p>
              <p className="text-cream-muted text-sm mt-2 max-w-lg mx-auto">Choose a university above and AtriumX will show accommodation available for that university only.</p>
            </div>
          ) : loading ? (
            <div className="mt-5 rounded-2xl border border-slate-border bg-slate-deep px-5 py-12 text-center">
              <p className="text-cream-muted text-sm">Loading accommodation near {nearUniversity}...</p>
            </div>
          ) : loadError ? (
            <div className="mt-5 rounded-2xl border border-slate-border bg-slate-deep px-5 py-10 text-center">
              <p role="alert" className="text-red-500 text-sm">Could not load accommodation near {nearUniversity}.</p>
              <button onClick={() => window.location.reload()} className="mt-3 text-teal-primary font-bold text-sm underline">Try again</button>
            </div>
          ) : sectionsWithItems.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-border bg-slate-deep px-6 py-10 sm:py-12 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-teal-faint text-teal-primary">
                <Building2 size={23} />
              </div>
              <p className="text-cream font-semibold">No accommodation matches this university yet.</p>
              <p className="text-cream-muted text-sm mt-2">{currentUser ? 'Check back as more properties join AtriumX.' : 'Know a residence or property students should be able to compare here?'}</p>
              {!currentUser && (
                <button type="button" onClick={handleShareAccommodationInvite} className="mt-5 rounded-xl border border-teal-light text-teal-primary px-5 py-3 text-sm font-bold hover:bg-teal-faint transition-colors">
                  Send the accommodation invite
                </button>
              )}
            </div>
          ) : null}
        </section>

        {nearUniversity && !loading && !loadError && sectionsWithItems.length > 0 && (
          <div className="mt-7 space-y-9">
            {!currentUser && (
              <div className="rounded-2xl border border-slate-border bg-slate-card px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-cream font-bold text-sm">Know an accommodation students should be comparing?</p>
                  <p className="text-cream-muted text-xs mt-1 leading-relaxed">Send the property team a direct link to add it, so students can see the details and compare it with the rest.</p>
                </div>
                <button type="button" onClick={handleShareAccommodationInvite} className="shrink-0 rounded-xl border border-teal-light text-teal-primary hover:bg-teal-faint font-bold text-xs px-4 py-2.5 transition-colors">
                  Send the accommodation invite
                </button>
              </div>
            )}

            {SECTION_ORDER.map(plan => {
              const items = grouped.get(plan) ?? []
              if (items.length === 0) return null
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

        {nearUniversity && <ResidenceDirectory university={nearUniversity} marketplaceLayout />}
      </main>
      <BottomNav />
    </div>
  )
}
