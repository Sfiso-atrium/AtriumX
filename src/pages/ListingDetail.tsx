import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Tag, Share2, Heart, MessageCircle, Star, Shield, Package } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getListingById, Listing, Profile, getPublicProfile } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import ListingCountdown from '../components/common/ListingCountdown'

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [listing, setListing] = useState<Listing | null>(null)
  const [seller, setSeller] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (!id) return
    getListingById(id).then(l => {
      setListing(l)
      if (l?.user_id) getPublicProfile(l.user_id).then(setSeller)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="min-h-screen bg-slate-deep flex items-center justify-center"><p className="text-cream-muted">Loading...</p></div>
  if (!listing) return <div className="min-h-screen bg-slate-deep flex items-center justify-center"><p className="text-cream-muted">Listing not found.</p></div>

  const images = listing.image_urls?.length ? listing.image_urls : ['/images/placeholder-listing.png']
  const isOwn = currentUser?.id === listing.user_id

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-6xl mx-auto md:ml-64 md:max-w-[calc(100%-16rem)] lg:max-w-5xl">
          {/* Back bar like reference image 5 */}
          <div className="sticky top-14 z-20 bg-slate-deep/95 backdrop-blur border-b border-slate-border h-12 flex items-center px-4 gap-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-slate-card border border-slate-border flex items-center justify-center text-cream-muted hover:text-cream"><ArrowLeft size={16} /></button>
            <span className="text-cream font-medium text-sm truncate flex-1">{listing.title}</span>
            <button className="w-8 h-8 rounded-full bg-slate-card border border-slate-border flex items-center justify-center text-cream-muted hover:text-cream"><Share2 size={16} /></button>
            <button className="w-8 h-8 rounded-full bg-slate-card border border-slate-border flex items-center justify-center text-cream-muted hover:text-cream"><Heart size={16} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-0 lg:gap-6 px-0 lg:px-4 pt-0 lg:pt-6 pb-24">
            {/* Left: Gallery */}
            <div className="bg-slate-card lg:bg-transparent lg:border-0 border-b border-slate-border lg:rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-slate-deep relative">
                <img src={images[activeImage]} alt={listing.title} className="w-full h-full object-contain" />
                {listing.expires_at && <div className="absolute top-3 left-3"><ListingCountdown expiresAt={listing.expires_at} /></div>}
                <div className="absolute bottom-3 right-3 bg-slate-deep/90 backdrop-blur text-cream text-xs px-2 py-1 rounded-full border border-slate-border">{activeImage + 1} / {images.length}</div>
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-slate-card">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImage(i)} className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 ${activeImage === i ? 'border-[#2563EB]' : 'border-transparent'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info - matches reference 5 */}
            <div className="px-4 lg:px-0 py-4 flex flex-col gap-4">
              <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h1 className="text-cream font-bold text-xl leading-tight flex-1">{listing.title}</h1>
                  <p className="text-cream font-bold text-xl flex-shrink-0">R{Number(listing.price).toFixed(0)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-slate-deep border border-slate-border text-cream-muted text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><Tag size={12} />{listing.category}</span>
                  {listing.is_negotiable && <span className="bg-gold/10 border border-gold/30 text-gold text-xs px-2.5 py-1 rounded-full font-bold">Negotiable</span>}
                  <span className="bg-slate-deep border border-slate-border text-cream-muted text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><Package size={12} />{listing.condition || 'Used'}</span>
                  <span className="bg-slate-deep border border-slate-border text-cream-muted text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><MapPin size={12} />{listing.residence || 'Campus'}</span>
                </div>
                <p className="text-cream-muted text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
                <div className="flex items-center gap-2 mt-4 text-cream-muted text-xs"><Clock size={12} /> Posted {new Date(listing.created_at).toLocaleDateString('en-ZA')} • {listing.views || 0} views</div>
              </div>

              {/* Seller card like reference */}
              {seller && (
                <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: seller.avatar_color }}>{seller.avatar_initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-cream font-bold text-sm truncate">{seller.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {seller.avg_rating > 0 ? <span className="flex items-center gap-1 text-gold text-xs"><Star size={12} className="fill-gold" />{seller.avg_rating} • {seller.total_ratings} ratings</span> : <span className="text-cream-muted text-xs">New seller</span>}
                        <span className="text-cream-muted text-xs">• {seller.residence || 'Campus'}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/profile/${seller.id}`)} className="text-xs font-bold text-[#2563EB] border border-[#2563EB]/30 px-3 py-1.5 rounded-full hover:bg-[#2563EB]/10">View</button>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-[11px] text-cream-muted"><Shield size={12} className="text-teal-light" />Meet on campus, check item before paying</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {isOwn ? (
                  <button onClick={() => navigate(`/profile/${currentUser?.id}`)} className="flex-1 bg-slate-card border border-slate-border text-cream font-bold py-3 rounded-xl">Manage listing</button>
                ) : (
                  <>
                    <button onClick={() => navigate(`/chat`)} className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><MessageCircle size={16} />Chat with seller</button>
                    <button className="w-12 h-12 rounded-xl bg-slate-card border border-slate-border flex items-center justify-center text-cream-muted hover:text-cream"><Heart size={18} /></button>
                  </>
                )}
              </div>

              <div className="bg-slate-deep border border-dashed border-slate-border rounded-2xl p-3">
                <p className="text-cream-muted text-[11px] leading-relaxed">AtriumX is a student-to-student marketplace. We don't handle payments. Always meet in public places on campus and verify the item.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
