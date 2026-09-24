import { Building2, Globe, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AccommodationListing } from '../../services/dataService'

export default function AccommodationCard({ listing }: { listing: AccommodationListing }) {
  const navigate = useNavigate()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/accommodation/${listing.id}`)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/accommodation/${listing.id}`) } }}
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-cream font-bold text-[15px] leading-tight line-clamp-2">{listing.title}</h3>
          <span className="text-teal-light font-extrabold text-sm whitespace-nowrap">{listing.monthly_rent != null ? `R${listing.monthly_rent.toLocaleString()}/mo` : 'Pricing varies'}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-cream-muted text-xs">
          <MapPin size={13} />
          <span className="truncate">{listing.universities.join(' · ')}</span>
        </div>
        {listing.seller_website && (
          <a
            href={/^https?:\/\/i.test(listing.seller_website) ? listing.seller_website : `https://${listing.seller_website}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 mt-2 text-teal-light text-xs hover:underline truncate"
          >
            <Globe size={13} className="flex-shrink-0" />
            <span className="truncate">{listing.seller_website}</span>
          </a>
        )}
      </div>
    </div>
  )
}
