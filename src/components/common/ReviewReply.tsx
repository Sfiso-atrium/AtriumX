import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { replyToBusinessReview, replyToAccommodationReview } from '../../services/dataService'

// Visibility is independent of entitlement; the database remains authoritative.
export default function ReviewReply({ reviewId, accommodation = false, allowed, existingReply, onSaved }: {
  reviewId: string; accommodation?: boolean; allowed: boolean; existingReply?: string | null; onSaved: () => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (open && !allowed) dialog.current?.showModal() }, [open, allowed])
  const close = () => { dialog.current?.close(); setOpen(false) }
  async function save() {
    if (!draft.trim() || saving || !allowed) return
    setSaving(true); setError('')
    try {
      const result = await (accommodation ? replyToAccommodationReview : replyToBusinessReview)(reviewId, draft)
      if (result.error) { setError(result.error); return }
      setOpen(false); setDraft(''); onSaved()
    } catch { setError('Could not save your reply. Please try again.') }
    finally { setSaving(false) }
  }
  return <div className="mt-3">
    <button type="button" onClick={() => { setDraft(existingReply || ''); setError(''); setOpen(true) }} className="inline-flex items-center gap-2 border border-slate-border rounded-lg px-3 py-2 text-cream text-sm font-semibold hover:border-teal-light"><MessageCircle size={16} />{existingReply ? 'Edit reply' : 'Reply'}</button>
    {open && allowed && <div className="mt-3 space-y-2">
      <textarea aria-label="Your review reply" autoFocus value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={3} className="w-full rounded-xl border border-slate-border bg-slate-deep p-3 text-cream text-sm" />
      {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3"><button type="button" onClick={save} disabled={saving || !draft.trim()} className="bg-teal-primary text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save reply'}</button><button type="button" onClick={close} disabled={saving} className="text-cream-muted text-sm">Cancel</button></div>
    </div>}
    <dialog ref={dialog} onCancel={close} onClose={() => setOpen(false)} aria-labelledby={`reply-title-${reviewId}`} className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-slate-card text-cream border border-slate-border p-6 backdrop:bg-black/60">
      <button type="button" aria-label="Close reply upgrade" onClick={close} className="float-right p-1"><X size={20} /></button>
      <h3 id={`reply-title-${reviewId}`} className="font-bold text-lg pr-6">Reply to student reviews</h3>
      <p className="text-sm text-cream-muted my-4">{accommodation ? 'Replies are included with Featured and Premium accommodation plans.' : 'Replies are included with the Campus Partner plan.'} Your current plan does not include replies. Reviews remain visible on every plan.</p>
      <button type="button" onClick={() => { close(); navigate(accommodation ? '/accommodation/plan-select' : '/business/plan-select', { state: { forcePlans: true } }) }} className="bg-teal-primary text-white rounded-xl px-4 py-2.5 font-semibold text-sm">View plans</button>
    </dialog>
  </div>
}
