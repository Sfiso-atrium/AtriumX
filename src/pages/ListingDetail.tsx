import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Listing, Profile } from '../../services/dataService'
import ListingCountdown from './ListingCountdown'

interface ListingCardProps {
  listing: Listing | any
  seller?: Profile | any
  isOwner?: boolean
}

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 110.01 122.88" className={className} fill="currentColor">
      <path d="M1.87,14.69h22.66L24.5,14.3V4.13C24.5,1.86,26.86,0,29.76,0c2.89,0,5.26,1.87,5.26,4.13V14.3l-0.03,0.39h38.59l-0.03-0.39V4.13C73.55,1.86,75.91,0,78.8,0c2.89,0,5.26,1.87,5.26,4.13V14.3l-0.03,0.39h24.11c1.03,0,1.87,0.84,1.87,1.87v19.46c0,1.03-0.84,1.87-1.87,1.87H1.87C0.84,37.88,0,37.04,0,36.01V16.55C0,15.52,0.84,14.69,1.87,14.69L1.87,14.69z M0.47,42.19h109.08c0.26,0,0.46,0.21,0.46,0.46l0,0v79.76c0,0.25-0.21,0.46-0.46,0.46l-109.08,0c-0.25,0-0.47-0.21-0.47-0.46V42.66C0,42.4,0.21,42.19,0.47,42.19L0.47,42.19L0.47,42.19z M97.27,52.76H83.57c-0.83,0-1.5,0.63-1.5,1.4V66.9c0,0.77,0.67,1.4,1.5,1.4h13.71c0.83,0,1.51-0.63,1.51-1.4V54.16C98.78,53.39,98.1,52.76,97.27,52.76L97.27,52.76z M12.24,74.93h13.7c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4H12.71c-0.83,0-1.5-0.63-1.5-1.4V75.87c0-0.77,0.68-1.4,1.5-1.4L12.24,74.93L12.24,74.93z M12.24,97.11h13.7c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4l-13.24,0c-0.83,0-1.5-0.63-1.5-1.4V98.51c0-0.77,0.68-1.4,1.5-1.4L12.24,97.11L12.24,97.11z M12.24,52.76h13.7c0.83,0,1.51,0.63,1.51,1.4V66.9c0,0.77-0.68,1.4-1.51,1.4l-13.24,0c-0.83,0-1.5-0.63-1.5-1.4V54.16c0-0.77,0.68-1.4,1.5-1.4L12.24,52.76L12.24,52.76z M36.02,52.76h13.71c0.83,0,1.5,0.63,1.5,1.4V66.9c0,0.77-0.68,1.4-1.5,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V54.16C34.51,53.39,35.19,52.76,36.02,52.76L36.02,52.76L36.02,52.76z M36.02,74.93h13.71c0.83,0,1.5,0.63,1.5,1.4v12.74c0,0.77-0.68,1.4-1.5,1.4H36.02c-0.83,0-1.51-0.63-1.51-1.4V75.87c0-0.77,0.68-1.4,1.51-1.4V74.93L36.02,74.93z M36.02,97.11h13.71c0.83,0,1.5,0.63,1.5,1.4v12.74c0,0.77-0.68,1.4-1.5,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V98.51C34.51,97.74,35.19,97.11,36.02,97.11L36.02,97.11L36.02,97.11z M59.79,52.76H73.5c0.83,0,1.51,0.63,1.51,1.4V66.9c0,0.77-0.68,1.4-1.51,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V54.16C58.29,53.39,58.96,52.76,59.79,52.76L59.79,52.76L59.79,52.76z M59.79,74.93H73.5c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4H59.79c-0.83,0-1.51-0.63-1.51-1.4V75.87c0-0.77,0.68-1.4,1.51-1.4V74.93L59.79,74.93z M97.27,74.93H83.57c-0.83,0-1.5,0.63-1.5,1.4v12.74c0,0.77,0.67,1.4,1.5,1.4h13.71c0.83,0,1.51-0.63,1.51-1.4l0-13.21c0-0.77-0.68-1.4-1.51-1.4L97.27,74.93L97.27,74.93z M97.27,97.11H83.57c-0.83,0-1.5,0.63-1.5,1.4v12.74c0,0.77,0.67,1.4,1.5,1.4h13.71c0.83,0,1.51-0.63,1.51-1.4l0-13.21c0-0.77-0.68-1.4-1.51-1.4L97.27,97.11L97.27,97.11z M59.79,97.11H73.5c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V98.51C58.29,97.74,58.96,97.11,59.79,97.11L59.79,97.11L59.79,97.11z M7.01,47.71h96.92c0.52,0,0.94,0.44,0.94,0.94v67.77c0,0.5-0.44,0.94-0.94,0.94H6.08c-0.5,0-0.94-0.42-0.94-0.94V49.58C5.14,48.55,5.98,47.71,7.01,47.71L7.01,47.71L7.01,47.71z M78.8,29.4c2.89,0,5.26-1.87,5.26-4.13V15.11l-0.03-0.41H73.58l-0.03,0.41v10.16C73.55,27.54,75.91,29.4,78.8,29.4L78.8,29.4L78.8,29.4z M29.76,29.4c2.89,0,5.26-1.87,5.26-4.13V15.11l-0.03-0.41H24.53l-0.03,0.41v10.16C24.5,27.54,26.86,29.4,29.76,29.4L29.76,29.4z"/>
    </svg>
  )
}

function PeopleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 229.02" className={className} fill="currentColor">
      <path d="M397.11 189.528c19.559 2.95 40.984-3.85 47.595-21.606C483.069 192.446 512 176.882 512 229.02H403.237c0-17.639-2.149-30.21-6.127-39.492zM128.795 229.02c4.755-61.58 28.363-38.802 81.188-71.854 16.315 34.041 82.624 36.515 96.221 0 45.588 29.143 79.968 9.897 79.968 71.854H128.795zm93.639-74.539c-.703-.913 1.842-7.183 2.445-8.197-6.902-6.141-12.356-12.337-13.518-25.088l-.74.016c-1.709-.023-3.357-.416-4.9-1.295-2.472-1.406-4.21-3.819-5.384-6.54-2.485-5.71-10.67-24.66 1.801-23.163-6.973-13.023 8.809-35.271-18.411-43.499 22.334-28.286 69.455-71.9 103.989-28.151 37.798 3.663 49.588 48.583 24.136 73.186 1.491.054 2.897.398 4.14 1.063 4.732 2.535 4.887 8.036 3.644 12.651-1.231 3.854-2.793 6.462-4.266 10.22-1.793 5.073-4.413 6.018-9.475 5.472-.256 12.544-6.054 18.701-13.855 26.071l2.135 7.232c-10.462 22.191-53.923 23.084-71.741.022zM0 229.02c4.001-51.821 23.868-33.285 68.323-61.098 8.21 17.13 31.463 24.757 51.28 21.553-3.838 8.657-6.369 20.49-7.728 37.307a17.382 17.382 0 00-.146 2.238H0zm78.8-63.358c-.592-.768 1.55-6.044 2.057-6.898-5.808-5.168-10.396-10.382-11.375-21.112l-.623.013c-1.438-.019-2.825-.35-4.123-1.09-2.08-1.183-3.543-3.214-4.531-5.503-2.091-4.805-8.98-20.753 1.516-19.493-5.869-10.959 7.413-29.681-15.494-36.606 18.795-23.803 58.449-60.505 87.51-23.689 31.808 3.083 41.73 40.884 20.311 61.587 1.255.046 2.438.336 3.485.896 3.981 2.133 4.112 6.762 3.065 10.645-1.035 3.243-2.35 5.439-3.59 8.601-1.508 4.269-3.713 5.065-7.973 4.605-.216 10.556-5.094 15.737-11.659 21.939l1.796 6.086a20.274 20.274 0 01-3.803 5.463c-2.181 1.346-4.203 2.84-6.075 4.545-14.605 7.944-38.947 4.957-50.494-9.989zm295.411 0c-.592-.768 1.55-6.044 2.057-6.898-5.808-5.168-10.397-10.382-11.376-21.112l-.622.013c-1.439-.019-2.825-.35-4.124-1.09-2.079-1.183-3.542-3.214-4.53-5.503-2.091-4.805-8.98-20.753 1.515-19.493-5.868-10.959 7.413-29.681-15.493-36.606 18.794-23.803 58.449-60.505 87.509-23.689 31.809 3.083 41.731 40.884 20.312 61.587 1.255.046 2.437.336 3.484.896 3.982 2.133 4.112 6.762 3.066 10.645-1.035 3.243-2.351 5.439-3.59 8.601-1.509 4.269-3.714 5.065-7.974 4.605-.215 10.556-5.094 15.737-11.659 21.939l1.796 6.086c-6.65 14.106-29.144 17.983-46.214 10.672-3.653-3.682-7.918-6.523-12.719-8.928a30.616 30.616 0 01-1.438-1.725z"/>
    </svg>
  )
}

function LocationIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 92.26 122.88" className={className} fill="currentColor">
      <path d="M47.49,116.85c6.31-4.01,11.98-8.87,16.92-14.29c10.73-11.75,17.97-26.11,20.87-40.2c2.88-13.91,1.52-27.54-4.85-38.06c-1.81-3.02-4.08-5.78-6.78-8.26c-7.74-7.05-16.6-10.41-25.52-10.5c-9.37-0.07-18.87,3.45-27.27,10.14c-3.58,2.86-6.53,6.15-8.82,9.78c-5.9,9.28-7.69,20.8-5.74,32.85c1.97,12.23,7.78,25.02,17.04,36.61c6.44,8.08,14.54,15.58,24.18,21.91L47.49,116.85L47.49,116.85z M46.13,21.16c7.05,0,13.45,2.86,18.06,7.49c4.63,4.63,7.49,11,7.49,18.06c0,7.05-2.86,13.45-7.49,18.06c-4.63,4.63-11,7.49-18.06,7.49c-7.05,0-13.45-2.86-18.06-7.49c-4.63-4.63-7.49-11-7.49-18.06c0-7.05,2.86-13.45,7.49-18.06C32.7,24.02,39.07,21.16,46.13,21.16L46.13,21.16z M60.51,32.33c-3.67-3.67-8.78-5.97-14.38-5.97c-5.63,0-10.71,2.27-14.38,5.97c-3.67,3.67-5.97,8.78-5.97,14.38c0,5.63,2.27,10.71,5.97,14.38c3.67,3.67,8.78,5.97,14.38,5.97c5.63,0,10.71-2.27,14.38-5.97c3.67-3.67,5.97-8.78,5.97-14.38C66.47,41.08,64.21,36,60.51,32.33L60.51,32.33z M68.52,106.27c-5.6,6.12-12.09,11.61-19.42,16.06c-0.88,0.66-2.13,0.75-3.13,0.11c-10.8-6.87-19.85-15.13-26.99-24.09C9.15,86.02,2.94,72.34,0.83,59.16c-2.15-13.36-0.14-26.2,6.51-36.68c2.63-4.13,5.97-7.89,10.07-11.14C26.78,3.88,37.51-0.07,48.17,0c10.28,0.09,20.42,3.9,29.22,11.93c3.09,2.81,5.67,5.99,7.78,9.48c7.15,11.77,8.69,26.81,5.56,42.01c-3.11,15.04-10.8,30.33-22.18,42.8L68.52,106.27L68.52,106.27z"/>
    </svg>
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

  const goToListing = () => listing.id && navigate(`/listing/${listing.id}`)

  return (
    <div
      onClick={goToListing}
      className="bg-slate-card border border-slate-border rounded-2xl overflow-hidden hover:border-teal-primary transition-colors cursor-pointer flex"
    >
      {/* Image */}
      <div className="w-2/5 flex-shrink-0">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-teal-faint flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#1A5F7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-faint text-teal-light capitalize">
            {listing.custom_category || listing.category}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-cream-muted capitalize">
            {listing.listing_type === 'single' ? 'Once-off' : 'Ongoing'}
          </span>
          {listing.is_negotiable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
              Open to offers
            </span>
          )}
        </div>

        <h3 className="text-cream font-bold text-2xl leading-tight line-clamp-1">
          {listing.title}
        </h3>

        <p className="text-gold font-bold text-2xl">{displayPrice}</p>

        <div className="flex items-center gap-3 text-xs text-cream-muted flex-wrap">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4 text-ember" />
            <span>
              {listing.expires_at ? <ListingCountdown expiresAt={listing.expires_at} /> : '6 days left'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PeopleIcon className="w-4 h-4 text-ember" />
            <span>{contactCount} interested</span>
          </div>
          <div className="flex items-center gap-1">
            <LocationIcon className="w-4 h-4 text-ember" />
            <span>{sellerData?.residence || sellerData?.campus || 'Campus Africa'}</span>
          </div>
        </div>

        <div className="border-t border-slate-border" />

        <p className="text-cream text-sm leading-6 line-clamp-2">
          {listing.description}
        </p>

        {sellerData && (
          <div className="flex items-center justify-between gap-3 bg-teal-faint border border-teal-primary/30 rounded-xl px-3 py-2 mt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ width: 32, height: 32, backgroundColor: sellerData.avatar_color || sellerData.sellerColor || '#1A5F7A', fontSize: 12 }}
              >
                {sellerData.avatar_initials || sellerData.sellerInitials || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-cream font-semibold text-sm truncate">
                  {sellerData.full_name || sellerData.sellerName}
                </div>
                <div className="text-cream-muted text-xs truncate">
                  {sellerData.residence || sellerData.campus || 'Campus Africa'}
                </div>
              </div>
            </div>

            {sellerData.avg_rating > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star size={14} className="text-gold fill-gold" />
                <span className="text-cream font-semibold text-sm">{sellerData.avg_rating}</span>
                <span className="text-cream-muted text-xs">({sellerData.total_ratings})</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); goToListing() }}
          className="w-full bg-ember hover:bg-ember-dark text-white font-semibold rounded-xl py-3 transition mt-1"
        >
          {isOwner ? 'View Listing' : "I'm Interested — Message Seller"}
        </button>
      </div>
    </div>
  )
}
