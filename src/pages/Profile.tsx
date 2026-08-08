import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Globe } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Profile as ProfileType, Listing, Rating, getUserById, getUserListings, getSellerRatings, logout,
  BusinessProfile, getBusinessProfile
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
    Promise.all([getUserById(userId), getUserListings(userId), getSellerRatings(userId)]).then(
      ([p, l, r]) => {
        setProfile(p)
        setListings(l)
        setRatings(r)
        setLoading(false)
        if (p?.account_type === 'business') getBusinessProfile(userId).then(setBusiness)
      }
    )
  }, [userId])

  if (loading) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted">Loading...</p>
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
          <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream">
            <ArrowLeft size={20} />
          </button>
          <span className="text-cream font-bold">{profile.full_name}</span>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ backgroundColor: profile.avatar_color }}
            >
              {profile.avatar_initials}
            </div>
            <div className="flex-1">
              <h1 className="text-cream font-bold text-xl">{profile.full_name}</h1>
              <p className="text-cream-muted text-sm">{profile.residence || 'Campus'}</p>
              {profile.avg_rating > 0 && (
                <button
                  onClick={() => setShowReviews(true)}
                  className="flex items-center gap-1 text-gold text-sm mt-1 hover:underline"
                >
                  <Star size={13} className="fill-gold" />
                  {profile.avg_rating} · {profile.total_ratings} rating{profile.total_ratings !== 1 ? 's' : ''}
                </button>
              )}
              <p className="text-cream-muted text-xs mt-1">
                {profile.total_listings} listings · Joined{' '}
                {new Date(profile.joined_date).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
              </p>
            </div>
</div>

          {profile.account_type === 'business' && (business?.physical_address || business?.website) && (
            <div className="flex flex-col gap-1.5 mb-6 text-sm">
              {business.physical_address && (
                <p className="text-cream-muted flex items-center gap-2">
                  <MapPin size={14} className="text-teal-light flex-shrink-0" />
                  {business.physical_address}
                </p>
              )}
              {business.website && (
                
                  href={/^https?:\/\//i.test(business.website) ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-light flex items-center gap-2 hover:underline w-fit"
                >
                  <Globe size={14} className="flex-shrink-0" />
                  {business.website}
                </a>
              )}
            </div>
          )}

          {isOwn && pendingListings.length > 0 && (
<p className="text-gold text-sm mb-4">
              {pendingListings.length} listing{pendingListings.length !== 1 ? 's' : ''} awaiting admin approval
            </p>
          )}
          {isOwn && (
            <div className="flex flex-col gap-2 mb-6">
              <button
                onClick={() => navigate('/profile/edit')}
                className="w-full border border-slate-border hover:border-teal-primary text-cream text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={async () => { await logout(); setCurrentUser(null); navigate('/') }}
                className="w-full border border-red-900 hover:border-red-500 text-red-400 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Log Out
              </button>
            </div>
          )}

          <h2 className="text-cream font-bold text-base mb-3">
            Active Listings ({activeListings.length})
          </h2>

          {activeListings.length === 0 ? (
            <p className="text-cream-muted text-sm mb-6">
              {isOwn && pendingListings.length > 0
                ? 'Your listings are awaiting approval and will appear here once approved.'
                : 'No active listings.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {activeListings.map(l => (
                <ListingCard key={l.id} listing={l} seller={profile} isOwner={isOwn} />
              ))}
            </div>
          )}

          {soldListings.length > 0 && (
            <>
              <button
                onClick={() => setShowSold(!showSold)}
                className="flex items-center gap-2 text-cream-muted text-sm mb-3 hover:text-cream transition-colors"
              >
                <span>{showSold ? '▲' : '▼'}</span>
                {soldListings.length} Sold Item{soldListings.length !== 1 ? 's' : ''}
              </button>
              {showSold && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60 mb-6">
                  {soldListings.map(l => (
                    <ListingCard key={l.id} listing={l} seller={profile} isOwner={isOwn} />
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
              <hr className="border-slate-border mb-4" />
              <button
                onClick={() => setShowReviews(!showReviews)}
                className="flex items-center gap-2 text-cream font-bold text-base mb-3 w-full"
              >
                <span className="text-cream-muted text-sm font-normal">{showReviews ? '▲' : '▼'}</span>
                Reviews ({ratings.length})
              </button>
              {showReviews && (
                <div className="flex flex-col gap-3">
                  {ratings.map(r => (
                    <div key={r.id} className="bg-slate-card border border-slate-border rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
style={{ backgroundColor: r.buyer?.avatar_color || '#0D9488' }}
                            >
                            {r.buyer?.avatar_initials || '?'}
                          </div>
                          <span className="text-cream text-sm font-medium truncate">
                            {r.buyer?.full_name || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              size={12}
                              className={n <= r.stars ? 'text-gold fill-gold' : 'text-slate-border'}
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
