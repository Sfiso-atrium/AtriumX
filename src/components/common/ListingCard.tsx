import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Star } from 'lucide-react'
import { Listing, Profile } from '../../services/dataService'
import ListingCountdown from './ListingCountdown'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function ListingCard({ listing, seller, isOwner }: { listing: Listing; seller?: Profile | null; isOwner?: boolean }) {
  const navigate = useNavigate()
  const firstImage = listing.image_urls?.[0] || '/images/placeholder-listing.png'

  return (
    <button
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="w-full text-left bg-slate-card border border-slate-border rounded-2xl overflow-hidden hover:border-teal-light/30 transition-colors group"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-deep">
        <img src={firstImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="bg-slate-deep/90 backdrop-blur text-cream text-[10px] font-bold px-2 py-1 rounded-full border border-slate-border">{listing.category}</span>
          {listing.is_negotiable && <span className="bg-gold text-slate-deep text-[10px] font-bold px-2 py-1 rounded-full">Negotiable</span>}
        </div>
        {listing.expires_at && <div className="absolute top-2 right-2"><ListingCountdown expiresAt={listing.expires_at} /></div>}
        {isOwner && <div className="absolute bottom-2 right-2 bg-ember text-white text-[10px] font-bold px-2 py-1 rounded-full">Your listing</div>}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-cream font-bold text-sm line-clamp-1 flex-1">{listing.title}</h3>
          <p className="text-cream font-bold text-sm flex-shrink-0">R{Number(listing.price).toFixed(0)}</p>
        </div>
        <p className="text-cream-muted text-xs line-clamp-2 mt-1 leading-relaxed">{listing.description}</p>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1 text-cream-muted text-[11px]"><MapPin size={11} /><span className="truncate max-w-[90px]">{listing.residence || 'Campus'}</span></div>
          <div className="flex items-center gap-1 text-cream-muted text-[11px]"><Clock size={11} />{timeAgo(listing.created_at)}</div>
        </div>
        {seller && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-border">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: seller.avatar_color }}>{seller.avatar_initials}</div>
            <div className="flex-1 min-w-0">
              <span className="text-cream text-xs font-medium truncate">{seller.full_name}</span>
              {seller.avg_rating > 0 ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={11} className="fill-gold text-gold" />
                  <span className="text-gold text-[11px] font-bold">{seller.avg_rating}</span>
                  <span className="text-cream-muted text-[11px]">· {seller.total_ratings} rating{seller.total_ratings !== 1 ? 's' : ''}</span>
                </div>
              ) : (
                <p className="text-cream-muted text-[11px] mt-0.5">New seller</p>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
