import { useState } from 'react'
import { Copy } from 'lucide-react'
import { accommodationReviewLink } from '../../utils/accommodationReviewDraft'

export default function AccommodationReviewLink({ listingId, title, showTitle = false }: { listingId: string; title: string; showTitle?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [manualLink, setManualLink] = useState('')
  async function copy() {
    const link = accommodationReviewLink(listingId)
    try { await navigator.clipboard.writeText(link); setCopied(true); setManualLink('') }
    catch { setManualLink(link); setCopied(false) }
  }
  return <div className="mt-3">
    {showTitle && <p className="text-cream text-sm font-semibold mb-2">{title}</p>}
    <button type="button" onClick={copy} aria-label={`Copy review link for ${title}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-border px-3 py-2 text-sm font-semibold text-cream"><Copy size={16} aria-hidden="true" />Copy review link</button>
    {copied && <p role="status" className="mt-2 text-sm text-cream-muted">Copied! Share this link with your students.</p>}
    {manualLink && <label className="block mt-2 text-sm text-cream-muted">Copy this review link:
      <input readOnly value={manualLink} onFocus={e => e.target.select()} className="mt-1 w-full bg-slate-deep border border-slate-border rounded-lg p-2 text-cream" />
    </label>}
  </div>
}
