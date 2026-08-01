import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Listing, Profile } from '../../services/dataService'
import ListingCountdown from './ListingCountdown'
interface ListingCardProps {

  listing: Listing | any
  seller?: Profile | any
  isOwner?: boolean
}
function CalendarIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 110.01 122.88"
      className={className}
      fill="currentColor"
    >
      <path d="M1.87,14.69h22.66L24.5,14.3V4.13C24.5,1.86,26.86,0,29.76,0c2.89,0,5.26,1.87,5.26,4.13V14.3l-0.03,0.39h38.59l-0.03-0.39V4.13C73.55,1.86,75.91,0,78.8,0c2.89,0,5.26,1.87,5.26,4.13V14.3l-0.03,0.39h24.11c1.03,0,1.87,0.84,1.87,1.87v19.46c0,1.03-0.84,1.87-1.87,1.87H1.87C0.84,37.88,0,37.04,0,36.01V16.55C0,15.52,0.84,14.69,1.87,14.69Z"/>
    </svg>
  )
}

function InterestedIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 122.88 62.43"
      className={className}
      fill="currentColor"
    >
      <path d="M19.13,42.21...Z" />
    </svg>
  )
}

function LocationIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 92.26 122.88"
      className={className}
      fill="currentColor"
    >
      <path d="M47.49,116.85...Z" />
    </svg>
  )
}

function StarRating() {
  return (
    <div className="flex items-center gap-1 bg-teal-primary/20 border border-teal-primary/40 rounded-lg px-2 py-1">
      <span className="text-gold">★</span>
      <span className="text-cream font-semibold text-sm">5.0</span>
      <span className="text-cream-muted text-xs">(12 reviews)</span>
    </div>
  )
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

export default function ListingCard({ listing, seller, isOwner = false }: ListingCardProps) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const sellerData = seller || listing.seller


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
  {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full aspect-video object-cover"
          onError={() => setImgError(true)}
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

<div className="p-4 flex flex-col">

    {/* Badges */}
    <div className="flex items-center gap-2 flex-wrap mb-2">

        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-faint text-teal-light capitalize">
            {listing.custom_category || listing.category}
        </span>

        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-cream-muted">
            Ongoing
        </span>

        {listing.is_negotiable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
                Open to offers
            </span>
        )}
    </div>

    {/* Title */}
    <h3 className="text-cream font-bold text-3xl leading-tight">
        {listing.title}
    </h3>

    {/* Price */}
    <p className="text-gold font-bold text-4xl mb-2">
        {displayPrice}
    </p>

    {/* Stats */}
    <div className="flex items-center gap-4 text-xs text-cream-muted mb-3 flex-wrap">

        <div className="flex items-center gap-1">
            <CalendarIcon />
            <span>
                {listing.expires_at
                    ? <ListingCountdown expiresAt={listing.expires_at}/>
                    : "6 days left"}
            </span>
        </div>

        <div className="flex items-center gap-1">
            <InterestedIcon />
            <span>{contactCount} interested</span>
        </div>

        <div className="flex items-center gap-1">
            <LocationIcon />
            <span>{sellerData?.campus || "Campus Africa"}</span>
        </div>

    </div>

    {/* Divider */}
    <div className="border-t border-slate-border mb-3"/>

    {/* Description */}
    <p className="text-cream text-sm leading-6 line-clamp-2 mb-4">
        {listing.description}
    </p>

    {/* Divider */}
    <div className="border-t border-slate-border mb-3"/>

    {/* Seller */}
    <div className="flex justify-between items-center mb-4">

        <div className="flex items-center gap-3">

            <Avatar
                initials={sellerData.avatar_initials || sellerData.sellerInitials || '?'}
                color={sellerData.avatar_color || sellerData.sellerColor || '#1A5F7A'}
                size={34}
            />

            <div>
                <div className="text-cream font-semibold">
                    {sellerData.full_name || sellerData.sellerName}
                </div>

                <div className="text-xs text-cream-muted">
                    {sellerData.campus || "Campus Africa"}
                </div>
            </div>

        </div>

        <StarRating/>

    </div>

    {/* CTA */}
    <button
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-orange hover:bg-orange-600 text-white font-semibold rounded-xl py-3 transition"
    >
        I'm Interested — Message Seller
    </button>

</div>
        )}
      </div>
    </div>
  )
}
