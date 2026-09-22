import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Pencil, Heart, Image as ImageIcon } from 'lucide-react'
import {
  Listing,
  Profile,
  PLAN_TIERS,
  PlanKey,
  BUSINESS_PLAN_ORDER,
  incrementListingLikes,
  decrementListingLikes,
} from '../../services/dataService'
import ListingCountdown from './ListingCountdown'
interface ListingCardProps {
  listing: Listing | any
  seller?: Profile | any
  isOwner?: boolean
}


function formatPrice(price: number) {
  return `R ${price.toLocaleString('en-ZA')}`
}

export default function ListingCard({ listing, seller, isOwner = false }: ListingCardProps) {
const navigate = useNavigate()
  const sellerData = seller || listing.seller

  const contactCount = listing.contact_count ?? listing.contactCount ?? 0

  const badge = PLAN_TIERS[listing.plan_tier as PlanKey]?.badge ?? null
  const isCampusPartner = listing.plan_tier === 'campus_partner'
  const isFeatured = listing.plan_tier === 'unmissable' || isCampusPartner
  const imageUrl = listing.image_urls?.[0]
  const likedStorageKey = 'atriumx-liked-listings'
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(listing.like_count ?? 0)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(likedStorageKey) || '[]')
      setLiked(Array.isArray(stored) && stored.includes(listing.id))
    } catch {
      setLiked(false)
    }
  }, [listing.id])

  useEffect(() => {
    setLikeCount(listing.like_count ?? 0)
  }, [listing.like_count])

  const toggleLike = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setLiked(current => {
      const next = !current
      try {
        const stored = JSON.parse(localStorage.getItem(likedStorageKey) || '[]')
        const currentIds = Array.isArray(stored) ? stored : []
        const updated = next
          ? Array.from(new Set([...currentIds, listing.id]))
          : currentIds.filter((id: string) => id !== listing.id)
        localStorage.setItem(likedStorageKey, JSON.stringify(updated))
      } catch {
        // Keep the visual like state even if localStorage is unavailable.
      }

      setLikeCount((count: number) => Math.max(0, count + (next ? 1 : -1)))
      if (listing.id) {
        if (next) incrementListingLikes(listing.id)
        else decrementListingLikes(listing.id)
      }

      return next
    })
  }

  return (
    <div
      onClick={() => listing.id && navigate(`/listing/${listing.id}`)}
      className="group relative bg-white border border-[#e5ebf3] rounded-2xl overflow-hidden transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1.5 hover:border-[#d7e1ee] hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)]"
    >
      <div className="relative aspect-[4/3] bg-[#f5f8fc] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title || 'Listing image'}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:text-slate-400">
            <ImageIcon size={30} strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {likeCount > 0 && (
            <span className="bg-white/95 backdrop-blur-sm border border-white/80 text-slate-600 text-[11px] font-bold px-2 py-1 rounded-full shadow-sm">
              {likeCount}
            </span>
          )}
          <button
            type="button"
            aria-label={liked ? 'Unlike listing' : 'Like listing'}
            aria-pressed={liked}
            onClick={toggleLike}
            className={`w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-white/80 flex items-center justify-center shadow-sm transition-all hover:scale-105 ${
              liked ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            <Heart size={18} className={liked ? 'fill-current' : ''} />
          </button>
        </div>

        {isFeatured && (
          <div className="absolute top-3 left-3 bg-white/95 text-blue-600 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm border border-white">
            <span className="inline-flex items-center gap-1">
              <Star size={11} className="fill-current" />
              {isCampusPartner ? 'Campus Partner' : 'Featured'}
            </span>
          </div>
        )}
      </div>

<div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-slate-900 font-bold text-base leading-snug break-words flex-1 min-w-0">
            {listing.title}
          </h3>
            {!isFeatured && badge && (
            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
              {badge}
            </span>
          )}
        </div>

        <p className="text-slate-500 text-xs">
          {sellerData?.full_name || sellerData?.sellerName || 'Unknown seller'}
        </p>

        {sellerData && (sellerData.total_ratings ?? 0) > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                className={i < Math.round(sellerData.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
              />
            ))}
            <span className="text-slate-500 text-xs ml-1">{sellerData.avg_rating.toFixed(1)}</span>
          </div>
        )}

{listing.residence ? (
          <p className="text-slate-500 text-xs">{listing.residence}</p>
        ) : (listing.business_address || listing.business_website) ? (
          <p className="text-slate-500 text-xs truncate">
            {listing.business_address || listing.business_website}
          </p>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
            {listing.custom_category || listing.category}
          </span>
          {listing.is_negotiable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Open to offers
            </span>
          )}
        </div>

{isOwner && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 text-xs">{contactCount} interested</span>
            <div className="flex items-center gap-3">
              {listing.expires_at && <ListingCountdown expiresAt={listing.expires_at} />}
 {listing.status !== 'sold' && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    const editPath = BUSINESS_PLAN_ORDER.includes(listing.plan_tier as PlanKey) ? '/business/post' : '/post'
                    navigate(editPath, { state: { plan: listing.plan_tier, editListing: listing } })
                  }}
                  className="flex items-center gap-1 text-slate-500 hover:text-blue-600 text-xs font-medium transition-colors"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
