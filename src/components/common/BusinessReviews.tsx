import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { BusinessReview, getBusinessReviews, getEffectiveBusinessPlan } from '../../services/dataService'
import ReviewReply from './ReviewReply'

export default function BusinessReviews({ businessId, hideEmpty = false }: { businessId: string; hideEmpty?: boolean }) {
  const { currentUser } = useApp()
  const [reviews, setReviews] = useState<BusinessReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    getBusinessReviews(businessId, true).then(data => { if (active) setReviews(data) })
      .catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [businessId, revision])
  if (hideEmpty && !loading && !error && !reviews.length) return null
  return <section aria-label="Business reviews" className="bg-slate-card border border-slate-border rounded-2xl p-5">
    <h2 className="text-cream font-bold text-lg">Student reviews</h2>
    {loading ? <p className="text-cream-muted text-sm mt-3">Loading reviews…</p> : error ? <p role="alert" className="text-cream-muted mt-3">Could not load reviews. <button className="underline" onClick={() => setRevision(n => n + 1)}>Try again</button></p> : !reviews.length ? <p className="text-cream-muted text-sm mt-3">No student reviews yet.</p> : <>
      <p className="text-cream-muted text-sm mt-1">{(reviews.reduce((n, r) => n + r.stars, 0) / reviews.length).toFixed(1)} / 5 · {reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
      {reviews.map(r => <article key={r.id} className="border-t border-slate-border mt-4 pt-4">
        <div className="flex justify-between gap-3"><h3 className="font-semibold text-cream text-sm">{r.student?.full_name || 'Student'}</h3><span className="text-xs text-cream-muted">{new Date(r.created_at).toLocaleDateString('en-ZA')}</span></div>
        <div className="flex gap-1 mt-2 text-cream" aria-label={`${r.stars} out of 5 stars`}>{[1,2,3,4,5].map(n => <Star key={n} size={14} className={n <= r.stars ? 'fill-current' : ''} />)}</div>
        <p className="text-sm text-cream-muted mt-2 whitespace-pre-wrap">{r.comment || 'No written comment.'}</p>
        {r.reply && <div className="border-l-2 border-teal-primary pl-3 mt-3"><p className="text-xs font-semibold text-cream">Business reply</p><p className="text-sm text-cream-muted whitespace-pre-wrap mt-1">{r.reply}</p></div>}
        {currentUser?.id === businessId && <ReviewReply reviewId={r.id} existingReply={r.reply} allowed={getEffectiveBusinessPlan(currentUser) === 'campus_partner'} onSaved={() => setRevision(n => n + 1)} />}
      </article>)}
    </>}
  </section>
}
