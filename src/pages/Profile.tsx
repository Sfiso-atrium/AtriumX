import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Globe, Building2, Plus, ArrowRight, PencilLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Profile as ProfileType, Listing, Rating, BusinessProfile, PublicBusinessProfile, AccommodationListing, AccommodationPlanKey,
  ACCOMMODATION_PLANS, getPublicProfile, getUserListings, getSellerRatings, getBusinessProfile, getPublicBusinessProfile,
  getAccommodationListingsBySeller, selectPlanListings, logout,
} from '../services/dataService'
import ListingCard from '../components/common/ListingCard'
import AccommodationCard from '../components/common/AccommodationCard'
import BottomNav from '../components/common/BottomNav'
import BusinessReviews from '../components/common/BusinessReviews'

export default function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { currentUser, setCurrentUser, showToast } = useApp()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [business, setBusiness] = useState<PublicBusinessProfile | null>(null)
  const [ownBusiness, setOwnBusiness] = useState<BusinessProfile | null>(null)
  const [loadingOwnBusiness, setLoadingOwnBusiness] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  // The accommodation account's own property — shown only to them, on their
  // own profile. This is the management panel that used to live on the
  // /accommodation home screen; that screen now shows OTHER accommodation
  // instead (see AccommodationHome.tsx).
  const [accommodationListings, setAccommodationListings] = useState<AccommodationListing[]>([])
  const [loading, setLoading] = useState(true)
  const [showSold, setShowSold] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [selectedPlanListings, setSelectedPlanListings] = useState<string[]>([])
  const [savingPlanSelection, setSavingPlanSelection] = useState(false)

  useEffect(() => {
    if (!userId) return
    setOwnBusiness(null)
    setBusiness(null)
    setAccommodationListings([])
    setLoadingOwnBusiness(currentUser?.id === userId)
  Promise.all([getPublicProfile(userId), getUserListings(userId), getSellerRatings(userId)]).then(
    ([p, l, r]) => {
        setProfile(p)
        setListings(l)
        const enabled = l.filter(item => (item.status === 'active' || item.status === 'pending') && item.plan_enabled !== false)
        setSelectedPlanListings(enabled.length <= (enabled[0]?.current_max_listings ?? 1) ? enabled.map(item => item.id) : [])
        setRatings(r)
        setLoading(false)
        if (p?.account_type === 'business') {
          getPublicBusinessProfile(userId).then(setBusiness)
          if (currentUser?.id === userId) {
            getBusinessProfile(userId).then(b => {
              setOwnBusiness(b)
              if (b?.is_accommodation) {
                getAccommodationListingsBySeller(userId).then(setAccommodationListings)
              }
            }).finally(() => setLoadingOwnBusiness(false))
          }
        }
      }
    )
  }, [userId, currentUser?.id])

  if (loading) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted animate-pulse">Loading...</p>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted">Profile not found.</p>
    </div>
  )

  const activeListings = listings.filter(l => l.status === 'active')
  const soldListings = listings.filter(l => l.status === 'sold')
  const isOwn = currentUser?.id === userId
  const selectableListings = listings.filter(l => l.status === 'active' || l.status === 'pending')
  const maxListingSlots = selectableListings[0]?.current_max_listings ?? 1
  const needsPlanSelection = isOwn && (selectableListings.length > maxListingSlots || selectableListings.some(l => l.plan_enabled === false))

  const savePlanSelection = async () => {
    if (!userId || savingPlanSelection) return
    setSavingPlanSelection(true)
    try {
      const { error } = await selectPlanListings(selectedPlanListings)
      if (error) { showToast(error, 'error'); return }
      setListings(await getUserListings(userId))
      showToast('Listing selection saved.', 'success')
    } catch {
      showToast('Could not save your selection. Please try again.', 'error')
    } finally {
      setSavingPlanSelection(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3">
          <button onClick={() => navigate(-1)} className="group text-cream-muted hover:text-cream transition-all duration-200 hover:-translate-x-0.5 active:scale-90">
            <ArrowLeft size={20} className="transition-transform duration-200 group-hover:scale-110" />
          </button>
          <span className="text-cream font-bold">{profile.full_name}</span>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
          {/* Enhanced profile card - moves on hover */}
          <div className="group/card bg-slate-card border border-slate-border rounded-2xl p-5 mb-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)] will-change-transform">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/card:scale-110 group-hover/card:rotate-3 hover:scale-110 hover:rotate-6 cursor-default will-change-transform"
              style={{ backgroundColor: profile.avatar_color }}
            >
              {profile.avatar_initials}
            </div>
            <div className="flex-1">
              <h1 className="text-cream font-bold text-xl transition-transform duration-300 group-hover/card:translate-x-0.5">{profile.full_name}</h1>
              <p className="text-cream-muted text-sm">
                {profile.account_type === 'business' && isOwn
                  ? (ownBusiness ? (ownBusiness.universities.length ? ownBusiness.universities.join(', ') : 'No university selected') : loadingOwnBusiness ? 'Loading university access...' : 'Business account details unavailable')
                  : profile.residence || 'Campus'}
              </p>
              {profile.avg_rating > 0 && (
                <button
                  onClick={() => setShowReviews(true)}
                  className="group/star flex items-center gap-1 text-gold text-sm mt-1 hover:underline transition-all duration-200 hover:translate-x-0.5"
                >
                  <Star size={13} className="fill-amber-400 text-amber-400 transition-all duration-300 group-hover/star:rotate-12 group-hover/star:scale-125" />
                  {profile.avg_rating} · {profile.total_ratings} rating{profile.total_ratings !== 1 ? 's' : ''}
                </button>
              )}
              <p className="text-cream-muted text-xs mt-1">
                {profile.total_listings} listings · Joined{' '}
                {new Date(profile.joined_date).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Stats placeholders - each moves on hover */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-border">
            <div className="group/stat rounded-xl bg-slate-deep/40 px-3 py-2.5 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-md cursor-default will-change-transform">
              <p className="text-cream font-bold text-sm transition-transform duration-300 group-hover/stat:scale-110">{profile.total_listings}</p>
              <p className="text-cream-muted text-[11px]">Listings</p>
            </div>
            <div className="group/stat rounded-xl bg-slate-deep/40 px-3 py-2.5 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-md cursor-default will-change-transform delay-75">
              <p className="text-cream font-bold text-sm transition-transform duration-300 group-hover/stat:scale-110">{profile.avg_rating > 0 ? profile.avg_rating : '—'}</p>
              <p className="text-cream-muted text-[11px]">Rating</p>
            </div>
            <div className="group/stat rounded-xl bg-slate-deep/40 px-3 py-2.5 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-md cursor-default will-change-transform delay-100">
              <p className="text-cream font-bold text-sm transition-transform duration-300 group-hover/stat:scale-110">{new Date(profile.joined_date).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}</p>
              <p className="text-cream-muted text-[11px]">Joined</p>
            </div>
          </div>
          </div>

          {profile.account_type === 'business' && (business?.physical_address || business?.website) && (
            <div className="flex flex-col gap-1.5 mb-6 text-sm">
              {business.physical_address && (
                <p className="group/addr text-cream-muted flex items-center gap-2 transition-all duration-200 hover:translate-x-1 cursor-default">
                  <MapPin size={14} className="text-teal-light flex-shrink-0 transition-transform duration-300 group-hover/addr:scale-125 group-hover/addr:rotate-6" />
                  <span className="transition-transform duration-200 group-hover/addr:translate-x-0.5">{business.physical_address}</span>
                </p>
              )}
              {business.website && (
                <a
                  href={/^https?:\/\//i.test(business.website) ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/web text-teal-light flex items-center gap-2 hover:underline w-fit transition-all duration-200 hover:translate-x-1"
                >
                  <Globe size={14} className="flex-shrink-0 transition-transform duration-300 group-hover/web:rotate-12 group-hover/web:scale-110" />
                  {business.website}
                </a>
              )}
            </div>
          )}

          {isOwn && ownBusiness?.is_accommodation && (() => {
            const plan = ownBusiness.accommodation_plan as AccommodationPlanKey
            const maxProperties = 1
            const maxUniversities = plan === 'accommodation_free' ? 1 : plan === 'accommodation_featured' ? 2 : 3
            const atLimit = accommodationListings.length >= maxProperties
            return (
              <div className="bg-slate-card border border-slate-border rounded-3xl p-5 sm:p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-1">Accommodation</p>
                    <h2 className="font-serif text-xl text-cream">Your accommodation listing</h2>
                  </div>
                  {accommodationListings.length === 0 ? (
                    <button onClick={() => navigate('/accommodation/plan-select')} className="inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-4 py-2.5 rounded-xl text-sm">
                      <Plus size={16} /> Add accommodation
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => navigate('/accommodation/plan-select', { state: { managePlan: true } })} className="inline-flex items-center gap-2 border border-slate-border text-cream font-bold px-4 py-2.5 rounded-xl text-sm hover:border-teal-light">
                        Manage plan
                      </button>
                      <button onClick={() => navigate(`/accommodation/${accommodationListings[0].id}/edit`)} className="inline-flex items-center gap-2 border border-teal-primary text-teal-light font-bold px-4 py-2.5 rounded-xl text-sm">
                        <PencilLine size={16} /> Edit listing
                      </button>
                      <button onClick={() => navigate(`/accommodation/${accommodationListings[0].id}`)} className="inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-4 py-2.5 rounded-xl text-sm">
                        View accommodation
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  <div className="bg-slate-deep rounded-2xl p-4"><p className="text-cream-muted text-xs">Current plan</p><p className="text-cream font-bold mt-1">{ACCOMMODATION_PLANS[plan].label}</p></div>
                  <div className="bg-slate-deep rounded-2xl p-4"><p className="text-cream-muted text-xs">Accommodation listings</p><p className="text-cream font-bold mt-1">{Math.min(accommodationListings.length, maxProperties)} / {maxProperties}</p></div>
                  <div className="bg-slate-deep rounded-2xl p-4"><p className="text-cream-muted text-xs">Active universities</p><p className="text-cream font-bold mt-1">{accommodationListings[0]?.active_universities?.length ?? 0} / {maxUniversities}</p></div>
                </div>
                {atLimit && <p className="text-cream-muted text-xs mt-4">Your accommodation account uses one listing for the whole provider. Add all buildings and room pricing to that listing.</p>}
                {accommodationListings.some(listing => listing.reach_paused) && <p className="text-cream-muted text-sm mt-3">Your listing is paused because its saved university reach exceeds your current plan. Open it to choose which universities remain active.</p>}
                {accommodationListings.length === 0 && (
                  <div className="border border-dashed border-slate-border rounded-2xl py-10 text-center mt-5">
                    <Building2 size={30} className="mx-auto text-cream-muted mb-3" />
                    <p className="text-cream font-semibold text-sm">You have no accommodation listing yet.</p>
                    <p className="text-cream-muted text-xs mt-1.5">Start with your property details, monthly rent and what you offer.</p>
                    <button onClick={() => navigate('/accommodation/plan-select')} className="mt-4 inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-4 py-2 rounded-xl text-xs">
                      Create listing <ArrowRight size={13} />
                    </button>
                  </div>
                )}
                {accommodationListings.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-1 mt-5">
                    {accommodationListings.map(item => <AccommodationCard key={item.id} listing={item} />)}
                  </div>
                )}
              </div>
            )
          })()}

          {isOwn && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={() => navigate('/profile/edit')}
                className="group/btn w-full border border-slate-border hover:border-teal-primary text-cream text-sm font-medium py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
              >
                <span className="inline-block transition-transform duration-200 group-hover/btn:scale-105">Edit Profile</span>
              </button>
              <button
                onClick={async () => { await logout(); setCurrentUser(null); navigate('/') }}
                className="group/btn w-full border border-red-900 hover:border-red-500 text-red-400 text-sm font-medium py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
              >
                <span className="inline-block transition-transform duration-200 group-hover/btn:scale-105">Log Out</span>
              </button>
            </div>
          )}

          {!ownBusiness?.is_accommodation && (
            <>
          {needsPlanSelection && (
            <div className="bg-slate-card border border-slate-border rounded-2xl p-4 mb-5">
              <h3 className="text-cream font-bold">Choose which listings to show</h3>
              <p className="text-cream-muted text-sm mt-2 mb-3">Your current plan allows up to {maxListingSlots} active listing{maxListingSlots === 1 ? '' : 's'}. If your selection exceeds this limit after expiry, your listings are paused until you choose. All listing content is kept.</p>
              <div className="flex flex-col gap-2">
                {selectableListings.map(item => (
                  <label key={item.id} className="flex items-center gap-3 text-cream text-sm">
                    <input type="checkbox" checked={selectedPlanListings.includes(item.id)}
                      disabled={savingPlanSelection || (!selectedPlanListings.includes(item.id) && selectedPlanListings.length >= maxListingSlots)}
                      onChange={e => setSelectedPlanListings(previous => e.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />
                    {item.title}
                  </label>
                ))}
              </div>
              <button type="button" onClick={savePlanSelection} disabled={savingPlanSelection}
                className="mt-4 bg-teal-primary text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-40">
                {savingPlanSelection ? 'Saving...' : 'Save selection'}
              </button>
            </div>
          )}
          <div className="group/section flex items-end justify-between gap-3 mb-3 transition-all duration-200 hover:translate-x-0.5">
            <div>
              <p className="text-cream-muted text-xs uppercase tracking-wide">Your AtriumX</p>
              <h2 className="text-cream font-bold text-lg">My Listings</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cream-muted text-xs transition-transform duration-300 group-hover/section:scale-110">{activeListings.filter(l => l.plan_visible !== false).length} active</span>
              {isOwn && currentUser && (
                <button
                  type="button"
                  onClick={() => navigate(currentUser.account_type === 'business' ? '/business/plan-select' : '/plan-select', { state: { forcePlans: true, managePlan: true } })}
                  className="rounded-lg border border-slate-border px-2.5 py-1.5 text-[11px] font-bold text-teal-light hover:border-teal-light"
                >
                  Manage plan
                </button>
              )}
            </div>
          </div>

          {activeListings.length === 0 ? (
            <p className="group/empty text-cream-muted text-sm mb-6 transition-all duration-300 hover:translate-x-1 hover:text-cream cursor-default">
              <span className="inline-block transition-transform duration-300 group-hover/empty:translate-x-0.5">
                No active listings.
              </span>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {activeListings.map(l => (
                <div key={l.id} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg will-change-transform">
                  {isOwn && l.plan_visible === false && <p className="text-cream-muted text-xs mb-2">Paused under your current plan. Use the selection above to show this listing.</p>}
                  {isOwn && (l.hidden_photo_count ?? 0) > 0 && <p className="text-cream-muted text-xs mb-2">Owner view: {l.hidden_photo_count} saved photo{l.hidden_photo_count === 1 ? ' is' : 's are'} hidden from other users under your current plan.</p>}
                  <ListingCard listing={l} seller={profile} isOwner={isOwn} />
                </div>
              ))}
            </div>
          )}

          {soldListings.length > 0 && (
            <>
              <button
                onClick={() => setShowSold(!showSold)}
                className="group/sold w-full flex items-center justify-between gap-3 text-cream-muted text-sm mb-4 px-4 py-3 border border-slate-border rounded-xl hover:text-cream hover:border-teal-primary transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs inline-block transition-transform duration-300 group-hover/sold:rotate-12">{showSold ? '▲' : '▼'}</span>
                  <span className="transition-transform duration-200 group-hover/sold:translate-x-0.5">Sold Listings</span>
                </span>
                <span className="transition-transform duration-300 group-hover/sold:scale-110">{soldListings.length}</span>
              </button>
              {showSold && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60 mb-6">
                  {soldListings.map(l => (
                    <div key={l.id} className="transition-all duration-300 hover:-translate-y-1 hover:opacity-100 hover:shadow-lg">
                      <ListingCard listing={l} seller={profile} isOwner={isOwn} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Reviews are attached to the seller, not to any single listing —
              a rating left after one sale shows up here regardless of which
              of the seller's listings it came from. */}
          {ratings.length > 0 && (
            <>
              <hr className="border-slate-border my-6" />
              <button
                onClick={() => setShowReviews(!showReviews)}
                className="group/rev w-full flex items-center justify-between gap-3 text-cream font-bold text-base mb-3 px-4 py-3 border border-slate-border rounded-xl hover:border-teal-primary transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
              >
                <span className="transition-transform duration-200 group-hover/rev:translate-x-0.5">Reviews</span>
                <span className="text-cream-muted text-xs font-normal transition-transform duration-300 group-hover/rev:scale-105">
                  {ratings.length} · {showReviews ? 'Hide' : 'View'}
                </span>
              </button>
              {showReviews && (
                <div className="flex flex-col gap-3">
                  {ratings.map(r => (
                    <div key={r.id} className="group/rat bg-slate-card border border-slate-border rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:scale-[1.01] will-change-transform">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 transition-all duration-300 group-hover/rat:scale-110 group-hover/rat:rotate-3"
                            style={{ backgroundColor: r.buyer?.avatar_color || '#0D9488' }}
                          >
                            {r.buyer?.avatar_initials || '?'}
                          </div>
                          <span className="text-cream text-sm font-medium truncate transition-transform duration-200 group-hover/rat:translate-x-0.5">
                            {r.buyer?.full_name || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              size={12}
                              className={`${n <= r.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-border'} transition-transform duration-200 hover:scale-125`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-cream-muted text-xs leading-relaxed mb-1.5">{r.comment}</p>
                      )}
                      {r.listing?.title && (
                        <p className="text-cream-muted text-[11px]">For: {r.listing.title}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
            </>
          )}
          {profile.account_type === 'business' && !ownBusiness?.is_accommodation && <BusinessReviews businessId={profile.id} hideEmpty />}
        </div>
      </div>
      <BottomNav />
    </>
  )
}
