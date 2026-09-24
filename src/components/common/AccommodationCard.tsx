import { Building2, ExternalLink, Globe, MapPin, Star, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { AccommodationListing } from '../../services/dataService'

export default function AccommodationCard({ listing }: { listing: AccommodationListing }) {
  const navigate = useNavigate()
  const [showNoWebsite, setShowNoWebsite] = useState(false)

  const websiteHref = listing.seller_website
    ? (/^https?:\/\//i.test(listing.seller_website) ? listing.seller_website : `https://${listing.seller_website}`)
    : null

  const handleCardClick = () => navigate(`/accommodation/${listing.id}`)

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  return (
    <>
      <article
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
        className="group text-left flex-shrink-0 w-[300px] bg-slate-card border border-slate-border rounded-2xl overflow-hidden hover:border-teal-light hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      >
        <div className="h-44 bg-slate-deep overflow-hidden">
          {listing.video_url ? (
            <video src={listing.video_url} muted loop autoPlay playsInline poster={listing.image_urls?.[0] || undefined} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          ) : listing.image_urls?.[0] ? (
            <img src={listing.image_urls[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cream-muted">
              <Building2 size={34} />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-cream font-bold text-[15px] leading-tight line-clamp-2">{listing.title}</h3>
            <span className="text-teal-light font-extrabold text-sm whitespace-nowrap">{listing.monthly_rent != null ? `From R${listing.monthly_rent.toLocaleString()}/mo` : 'Pricing varies'}</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-cream-muted text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin size={13} className="flex-shrink-0" />
              <span className="truncate">{listing.address}</span>
            </div>
            {listing.avg_rating > 0 ? (
              <span className="flex items-center gap-1 flex-shrink-0 text-amber-400">
                <Star size={13} className="fill-current" />
                {listing.avg_rating.toFixed(1)}{listing.total_reviews > 0 ? ` (${listing.total_reviews})` : ''}
              </span>
            ) : null}
          </div>

          {listing.universities.length > 0 && (
            <div className="text-cream-muted text-xs">
              <span className="font-semibold text-cream">For:</span> {listing.universities.join(' · ')}
            </div>
          )}

          {listing.building_count > 1 && (
            <div className="text-cream-muted text-xs">
              {listing.building_count} buildings
            </div>
          )}

          {listing.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.amenities.slice(0, 4).map((amenity) => (
                <span key={amenity} className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] leading-none">
                  {amenity}
                </span>
              ))}
              {listing.amenities.length > 4 && (
                <span className="px-2 py-1 rounded-full bg-slate-deep text-cream-muted text-[11px] leading-none">
                  +{listing.amenities.length - 4} more
                </span>
              )}
            </div>
          )}

          {listing.description && (
            <p className="text-cream-muted text-xs leading-relaxed line-clamp-2">
              {listing.description}
            </p>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                if (websiteHref) {
                  window.open(websiteHref, '_blank', 'noopener,noreferrer')
                } else {
                  setShowNoWebsite(true)
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-border bg-slate-deep px-3 py-2 text-xs font-semibold text-cream hover:border-teal-light hover:text-teal-light transition-colors"
            >
              {websiteHref ? <ExternalLink size={14} /> : <Globe size={14} />}
              {websiteHref ? 'Visit website' : 'Residence website'}
            </button>
          </div>
        </div>
      </article>

      {showNoWebsite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={() => setShowNoWebsite(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`no-website-${listing.id}`}
            className="w-full max-w-sm rounded-2xl border border-slate-border bg-slate-card p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 id={`no-website-${listing.id}`} className="text-cream font-bold text-base">No website provided</h4>
                <p className="mt-2 text-cream-muted text-sm leading-relaxed">This accommodation has not provided a residence website.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNoWebsite(false)}
                className="text-cream-muted hover:text-cream"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowNoWebsite(false)}
              className="mt-4 w-full rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
