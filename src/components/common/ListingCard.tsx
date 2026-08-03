import { useNavigate } from 'react-router-dom'
import { Star, Pencil } from 'lucide-react'
import { Listing, Profile, PLAN_TIERS, PlanKey } from '../../services/dataService'
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
  const isFeatured = listing.plan_tier === 'unmissable'

  return (
    <div
      onClick={() => listing.id && navigate(`/listing/${listing.id}`)}
      className={`relative bg-slate-card rounded-2xl overflow-hidden transition-colors cursor-pointer ${
        isFeatured
          ? 'border-2 border-gold hover:border-gold'
          : 'border border-slate-border hover:border-teal-primary'
      }`}
    >
      {isFeatured && (
        <div className="bg-gold text-slate-deep text-xs font-bold uppercase tracking-wide text-center py-1.5 flex items-center justify-center gap-1.5">
          <Star size={12} className="fill-slate-deep" />
          Featured
        </div>
      )}
<div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-cream font-bold text-base leading-snug break-words flex-1 min-w-0">
            {listing.title}
          </h3>
          {!isFeatured && badge && (
            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-deep/90 text-gold border border-gold/40">
              {badge}
            </span>
          )}
        </div>

        <p className="text-cream-muted text-xs">
          {sellerData?.full_name || sellerData?.sellerName || 'Unknown seller'}
        </p>

        {sellerData && (sellerData.total_ratings ?? 0) > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                className={i < Math.round(sellerData.avg_rating) ? 'fill-gold text-gold' : 'text-slate-border'}
              />
            ))}
            <span className="text-cream-muted text-xs ml-1">{sellerData.avg_rating.toFixed(1)}</span>
          </div>
        )}

        <p className="text-cream-muted text-xs">{listing.residence}</p>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-faint text-teal-light capitalize">
            {listing.custom_category || listing.category}
          </span>
          {listing.is_negotiable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
              Open to offers
            </span>
          )}
        </div>

{isOwner && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-border">
            <span className="text-cream-muted text-xs">{contactCount} interested</span>
            <div className="flex items-center gap-3">
              {listing.expires_at && <ListingCountdown expiresAt={listing.expires_at} />}
              {listing.status !== 'sold' && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    navigate('/post', { state: { plan: listing.plan_tier, editListing: listing } })
                  }}
                  className="flex items-center gap-1 text-cream-muted hover:text-gold text-xs font-medium transition-colors"
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
