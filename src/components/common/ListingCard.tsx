import { useNavigate } from 'react-router-dom'
import { Listing, Profile } from '../../services/dataService'

interface ListingCardProps {
  listing: Listing | any
  seller?: Profile | any
}

function Avatar({ initials, color, size = 24 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

function formatPrice(price: number) {
  return `R ${price.toLocaleString('en-ZA')}`
}

function timeLeft(expiresAt: string | undefined) {
  if (!expiresAt) return { label: '', color: 'text-cream-muted' }
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { label: 'Expired', color: 'text-red-400' }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days >= 2) return { label: `${days}d left`, color: 'text-cream-muted' }
  if (days === 1) return { label: `${hours + 24}h left`, color: 'text-yellow-400' }
  return { label: `${hours}h left`, color: 'text-yellow-400' }
}

export default function ListingCard({ listing, seller }: ListingCardProps) {
  const navigate = useNavigate()
  const sellerData = seller || listing.seller
  const expiry = timeLeft(listing.expires_at)

  const contactCount = listing.contact_count ?? listing.contactCount ?? 0

  const imageUrl = listing.image_urls?.[0] || listing.imageUrl || null

  const lowestVariantPrice = listing.variants?.length
    ? Math.min(...listing.variants.map((v: any) => v.price))
    : null

  const displayPrice = lowestVariantPrice !== null
    ? `From ${formatPrice(lowestVariantPrice)}`
    : formatPrice(listing.price)

  return (
    <div
      onClick={() => listing.id && navigate(`/listing/${listing.id}`)}
      className="bg-slate-card border border-slate-border rounded-2xl overflow-hidden hover:border-teal-primary transition-colors cursor-pointer"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full aspect-video object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="w-full aspect-video bg-teal-faint flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="#1A5F7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-faint text-teal-light capitalize">
            {listing.custom_category || listing.category}
          </span>
          {listing.is_negotiable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
              Open to offers
            </span>
          )}
        </div>

        <h3 className="text-cream font-bold text-base leading-snug line-clamp-2">
          {listing.title}
        </h3>

        <p className="text-gold font-bold text-xl">{displayPrice}</p>

        <div className="flex items-center gap-2">
          {sellerData && (
            <>
              <Avatar
                initials={sellerData.avatar_initials || sellerData.sellerInitials || '?'}
                color={sellerData.avatar_color || sellerData.sellerColor || '#1A5F7A'}
                size={22}
              />
              <span className="text-cream-muted text-xs">
                {sellerData.full_name || sellerData.sellerName || ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-border">
          <span className="text-cream-muted text-xs">{contactCount} interested</span>
          <span className={`text-xs ${expiry.color}`}>{expiry.label}</span>
        </div>
      </div>
    </div>
  )
}
