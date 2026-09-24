import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Globe } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Profile as ProfileType, Listing, Rating, BusinessProfile,
  getPublicProfile, getUserListings, getSellerRatings, getBusinessProfile, logout,
} from '../services/dataService'
import ListingCard from '../components/common/ListingCard'
import BottomNav from '../components/common/BottomNav'

export default function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { currentUser, setCurrentUser } = useApp()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [showSold, setShowSold] = useState(false)
  const [showReviews, setShowReviews] = useState(false)

  useEffect(() => {
    if (!userId) return
  Promise.all([getPublicProfile(userId), getUserListings(userId), getSellerRatings(userId)]).then(
    ([p, l, r]) => {
        setProfile(p)
        setListings(l)
        setRatings(r)
        setLoading(false)
        if (p?.account_type === 'business') {
          getBusinessProfile(userId).then(setBusiness)
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
  const pendingListings = listings.filter(l => l.status === 'pending')
  const isOwn = currentUser?.id === userId

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
              <p className="text-cream-muted text-sm">{profile.residence || 'Campus'}</p>
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

          {isOwn && pendingListings.length > 0 && (
            <p className="text-gold text-sm mb-4 transition-all duration-300 hover:translate-x-1 hover:scale-[1.01]">
              {pendingListings.length} listing{pendingListings.length !== 1 ? 's' : ''} awaiting admin approval
            </p>
          )}
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

          {!(isOwn && business?.is_accommodation) && (
            <>
          <div className="group/section flex items-end justify-between gap-3 mb-3 transition-all duration-200 hover:translate-x-0.5">
            <div>
              <p className="text-cream-muted text-xs uppercase tracking-wide">Your AtriumX</p>
              <h2 className="text-cream font-bold text-lg">My Listings</h2>
            </div>
            <span className="text-cream-muted text-xs transition-transform duration-300 group-hover/section:scale-110">{activeListings.length} active</span>
          </div>

          {activeListings.length === 0 ? (
            <p className="group/empty text-cream-muted text-sm mb-6 transition-all duration-300 hover:translate-x-1 hover:text-cream cursor-default">
              <span className="inline-block transition-transform duration-300 group-hover/empty:translate-x-0.5">
                {isOwn && pendingListings.length > 0
                  ? 'Your listings are awaiting approval and will appear here once approved.'
                  : 'No active listings.'}
              </span>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {activeListings.map(l => (
                <div key={l.id} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg will-change-transform">
                  <ListingCard listing={l} seller={profile} isOwner={isOwn} />
                </div>
              ))}
            </div>
          )}

            </>
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
        </div>
      </div>
      <BottomNav />
    </>
  )
}
