import { useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { recordTravelEvent } from '../../services/travelEngagement'
import { travelShareLink, travelShareText } from '../../utils/travelLinks'
import type { BusFilters, BusListing } from '../../utils/busTravel'

export default function TravelShare({ filters, listing, track = true }: { filters: BusFilters; listing?: BusListing; track?: boolean }) {
  const [status, setStatus] = useState('')
  const [manual, setManual] = useState(false)
  const url = travelShareLink(filters, listing, window.location.origin)
  const text = travelShareText(filters, listing)
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(url)
      setStatus('Link copied'); setManual(false)
      if (track) void recordTravelEvent('share_copy', { listingId: listing?.id })
    } catch { setStatus('Copy this link to share it.'); setManual(true) }
  }
  return <div className="mt-3">
    <div className="flex flex-wrap gap-3 text-xs font-semibold text-teal-light">
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer"
        onClick={() => { if (track) void recordTravelEvent('share_whatsapp', { listingId: listing?.id }) }} className="inline-flex items-center gap-1.5 py-1.5"><MessageCircle size={15} /> Share {listing ? 'bus' : 'search'} on WhatsApp</a>
      <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 py-1.5"><Copy size={14} /> Copy {listing ? 'bus' : 'search'} link</button>
    </div>
    {status && <p role="status" className="text-xs text-cream-muted mt-1">{status}</p>}
    {manual && <input aria-label="Travel link to copy" readOnly value={url} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-slate-border bg-slate-deep text-cream p-2 text-sm" />}
  </div>
}
