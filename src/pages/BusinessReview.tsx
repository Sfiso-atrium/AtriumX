import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getPublicBusinessProfile, submitBusinessReview, type PublicBusinessProfile } from '../services/dataService'
import { businessReviewPath, clearReviewDraft, readReviewDraft, saveReviewDraft } from '../utils/businessReviewDraft'
import Navbar from '../components/common/Navbar'
import ReviewDialog from '../components/common/ReviewDialog'

export default function BusinessReviewPage() {
  const { businessId = '' } = useParams()
  // Remount when following another business's invitation: drafts must never cross businesses.
  return <BusinessReviewForm key={businessId} businessId={businessId} />
}

function BusinessReviewForm({ businessId }: { businessId: string }) {
  const { currentUser, isLoadingAuth, setRedirectAfterLogin } = useApp()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<PublicBusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [draft, setDraft] = useState(() => readReviewDraft(businessId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const sending = useRef(false)
  const [authPrompt, setAuthPrompt] = useState(false)
  const [published, setPublished] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId)
    ;(valid ? getPublicBusinessProfile(businessId) : Promise.resolve(null))
      .then(data => { if (active) setBusiness(data) })
      .catch(() => { if (active) setBusiness(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [businessId, revision])

  useEffect(() => {
    if (!published) setStorageAvailable(saveReviewDraft(businessId, draft))
  }, [businessId, draft, published])

  async function publish(event: FormEvent) {
    event.preventDefault()
    if (sending.current || isLoadingAuth || !business || published) return
    setError('')
    if (!draft.stars || !draft.comment.trim()) return setError('Choose a rating and tell us about your experience.')
    if (!currentUser) {
      setStorageAvailable(saveReviewDraft(businessId, draft))
      setAuthPrompt(true)
      return
    }
    if (currentUser.account_type !== 'student' || currentUser.is_blocked) {
      setError('Only active student accounts can publish reviews. Please sign in with your student account.')
      return
    }
    sending.current = true
    setSaving(true)
    try {
      const result = await submitBusinessReview(businessId, currentUser.id, draft.stars, draft.comment)
      if (result.error) { setError(result.error); return }
      clearReviewDraft(businessId)
      setPublished(true)
      setShowSuccess(true)
    } catch {
      setError('We could not confirm publication. Your draft is still here. Check your connection and try again.')
    } finally {
      sending.current = false
      setSaving(false)
    }
  }

  function authenticate(mode: 'login' | 'register') {
    if (!saveReviewDraft(businessId, draft)) { setStorageAvailable(false); return }
    const next = businessReviewPath(businessId)
    setRedirectAfterLogin(next)
    navigate(`/student?mode=${mode}&studentOnly=1&next=${encodeURIComponent(next)}`)
  }

  const primary = 'block w-full rounded-xl bg-gold px-4 py-3 font-bold text-black text-center disabled:opacity-50'
  const secondary = 'block w-full rounded-xl border border-slate-border px-4 py-3 font-semibold text-cream text-center'
  return <div className="min-h-screen bg-slate-deep text-cream">
    <Navbar />
    <main className="max-w-xl mx-auto px-4 py-8">
      {loading ? <p role="status">Loading business…</p> : !business ? <div>
        <h1 className="text-2xl font-bold">We couldn’t load this business</h1>
        <p className="mt-3 text-cream-muted">Check the invitation link or try again.</p>
        <button onClick={() => setRevision(n => n + 1)} className={`${primary} mt-4`}>Try again</button>
        <Link to="/feed" className={`${secondary} mt-3`}>Explore AtriumX</Link>
      </div> : <>
        <p className="text-sm text-cream-muted">Student reviews</p>
        <h1 className="mt-2 text-2xl font-bold">Review {business.business_name}</h1>
        <p className="mt-2 text-cream-muted">Help another student choose with confidence. Share your honest experience.</p>
        <div className="my-6 rounded-xl border border-slate-border p-4" aria-label="Selected business">
          <p className="font-bold">{business.business_name}</p>
          <p className="mt-1 text-sm text-cream-muted">{business.custom_business_type || business.business_type}</p>
          {business.physical_address && <p className="mt-1 text-sm text-cream-muted">{business.physical_address}</p>}
          <Link to={`/profile/${businessId}`} className="inline-block mt-2 text-sm underline">View business profile</Link>
        </div>
        {published ? <div>
          <h2 className="text-xl font-bold">Your review is live. Thank you!</h2>
          <Link to={`/profile/${businessId}`} className={`${secondary} mt-4`}>View your review</Link>
          <button onClick={() => setShowSuccess(true)} className={`${primary} mt-3`}>What’s next?</button>
        </div> : <form onSubmit={publish}>
          <fieldset disabled={saving}>
            <legend className="font-semibold">Your rating</legend>
            <div className="flex gap-2 mt-3" role="radiogroup" aria-label="Rating">
              {[1,2,3,4,5].map(stars => <label key={stars} className="cursor-pointer rounded-lg p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold">
                <input className="sr-only" type="radio" name="rating" value={stars} required checked={draft.stars === stars} onChange={() => setDraft(d => ({ ...d, stars }))} />
                <Star aria-hidden="true" size={28} className={stars <= draft.stars ? 'fill-gold text-gold' : 'text-cream-muted'} />
                <span className="sr-only">{stars} star{stars === 1 ? '' : 's'}</span>
              </label>)}
            </div>
            <label htmlFor="review-comment" className="block font-semibold mt-6">Your experience</label>
            <p id="review-guidance" className="mt-1 text-sm text-cream-muted">What did you use them for? What went well, and what could be better? Don’t include private contact details.</p>
            <textarea id="review-comment" required maxLength={5000} rows={7} value={draft.comment} aria-describedby="review-guidance"
              onChange={e => setDraft(d => ({ ...d, comment: e.target.value }))}
              className="mt-3 w-full rounded-xl bg-slate-card border border-slate-border p-4 text-cream focus:outline-none focus:ring-2 focus:ring-gold" />
          </fieldset>
          <p className="mt-2 text-sm text-cream-muted">Your name will appear with your review. One review per student for each business.</p>
          {!storageAvailable && <p role="alert" className="mt-3 text-amber-300 text-sm">Your browser cannot save this draft. Copy your review before leaving or enable site storage to continue to sign in.</p>}
          {error && <p role="alert" className="mt-3 text-red-400">{error}</p>}
          {currentUser && currentUser.account_type !== 'student' && <button type="button" onClick={() => authenticate('login')} className={`${secondary} mt-3`}>Sign in with a student account</button>}
          <button type="submit" disabled={saving || isLoadingAuth} className={`${primary} mt-6`}>{saving ? 'Publishing…' : 'Publish review'}</button>
        </form>}
      </>}
    </main>
    {authPrompt && <ReviewDialog title="Your voice needs a name" onClose={() => setAuthPrompt(false)}>
      <p className="my-4 text-sm text-cream-muted">Create a free student account or sign in to publish your review. Your draft will be waiting when you return.</p>
      {!storageAvailable && <p role="alert" className="mb-3 text-sm text-amber-300">Enable site storage first so your review is not lost. You can close this popup to copy your text.</p>}
      <button onClick={() => authenticate('register')} className={primary}>Create student account</button>
      <button onClick={() => authenticate('login')} className={`${secondary} mt-3`}>Sign in</button>
    </ReviewDialog>}
    {showSuccess && <ReviewDialog title="Your review’s live. What’s next?" onClose={() => setShowSuccess(false)}>
      <p className="my-4 text-sm text-cream-muted">You’ve helped a student choose. Discover campus life—or give your residence a voice.</p>
      <Link to="/feed" className={primary}>Explore the student feed</Link>
      <Link to="/accommodations/review" className={`${secondary} mt-3`}>Review my residence</Link>
    </ReviewDialog>}
  </div>
}
