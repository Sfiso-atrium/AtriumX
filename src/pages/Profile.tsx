import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Profile as ProfileType, Listing, getUserById, getUserListings } from '../services/dataService'
import ListingCard from '../components/common/ListingCard'
import BottomNav from '../components/common/BottomNav'
export default function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [showSold, setShowSold] = useState(false)

  useEffect(() => {
    if (!userId) return
    Promise.all([getUserById(userId), getUserListings(userId)]).then(([p, l]) => {
      setProfile(p)
      setListings(l)
      setLoading(false)
    })
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
                <p className="text-gold text-sm mt-1">
                  ★ {profile.avg_rating} · {profile.total_ratings} rating{profile.total_ratings !== 1 ? 's' : ''}
                </p>
              )}
              <p className="text-cream-muted text-xs mt-1">
                {profile.total_listings} listings · Joined{' '}
                {new Date(profile.joined_date).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
{isOwn && pendingListings.length > 0 && (
            <p className="text-amber-400 text-sm mb-4">
              {pendingListings.length} listing{pendingListings.length !== 1 ? 's' : ''} awaiting admin approval
            </p>
          )}
          {isOwn && (
            <button
              onClick={() => navigate('/profile/edit')}
              className="w-full border border-slate-border hover:border-teal-primary text-cream text-sm font-medium py-2.5 rounded-xl transition-colors mb-6"
            >
              Edit Profile
            </button>
          )}

          <h2 className="text-cream font-bold text-base mb-3">
            Active Listings ({activeListings.length})
          </h2>

          {activeListings.length === 0 ? (
            <p className="text-cream-muted text-sm mb-6">No active listings.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {activeListings.map(l => (
                <ListingCard key={l.id} listing={l} seller={profile} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60">
                  {soldListings.map(l => (
                    <ListingCard key={l.id} listing={l} seller={profile} />
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
