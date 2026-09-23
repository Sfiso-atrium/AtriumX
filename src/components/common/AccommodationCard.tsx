import { Building2, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AccommodationListing } from '../../services/dataService'

export default function AccommodationCard({ listing }: { listing: AccommodationListing }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/accommodation/${listing.id}`)}
      className="group text-left flex-shrink-0 w-[300px] bg-slate-card border border-slate-border rounded-2xl overflow-hidden hover:border-teal-light hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="h-44 bg-slate-deep overflow-hidden">
        {listing.image_urls?.[0] ? (
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
          <span className="text-teal-light font-extrabold text-sm whitespace-nowrap">R{listing.monthly_rent.toLocaleString()}/mo</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-cream-muted text-xs">
          <MapPin size={13} />
          <span className="truncate">{listing.universities.join(' · ')}</span>
        </div>
      </div>
    </button>
  )
}
