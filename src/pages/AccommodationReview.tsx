import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Navbar from '../components/common/Navbar'
import ReviewDialog from '../components/common/ReviewDialog'
import { SOUTH_AFRICAN_UNIVERSITIES } from '../data/universities'
import { getResidences, getResidence, getResidenceForListing, postResidenceReview, type Residence } from '../services/residenceReviews'
import { readAccommodationDraft, saveAccommodationDraft, clearAccommodationDraft } from '../utils/accommodationReviewDraft'

export default function AccommodationReviewPage() {
  const [params] = useSearchParams()
  const listingId = params.get('listing')
  const residenceId = params.get('residence')
  const draftKey = listingId ? `listing:${listingId}` : residenceId ? `residence:${residenceId}` : 'new'
  return <AccommodationReviewForm key={draftKey} draftKey={draftKey} listingId={listingId} residenceId={residenceId} />
}

function AccommodationReviewForm({ draftKey, listingId, residenceId }: { draftKey: string; listingId: string | null; residenceId: string | null }) {
  const { currentUser, isLoadingAuth, setRedirectAfterLogin } = useApp()
  const navigate = useNavigate()
  const [residences, setResidences] = useState<Residence[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<Residence | null>(null)
  const [draft, setDraft] = useState(() => {
    const saved = readAccommodationDraft(draftKey)
    return { ...saved, university: saved.university || currentUser?.university || '' }
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const [revision, setRevision] = useState(0)
  const [authPrompt, setAuthPrompt] = useState(false)
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const invited = !!(listingId || residenceId)
  const initialResidenceId = useRef(draft.residenceId)
  const next = `/accommodations/review${listingId ? `?listing=${encodeURIComponent(listingId)}` : residenceId ? `?residence=${encodeURIComponent(residenceId)}` : ''}`

  useEffect(() => {
    let active = true
    setLoaded(false); setError('')
    async function load() {
      try {
        const id = listingId || residenceId
        if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('This review link is invalid. Please ask for a new link.')
        if (invited) {
          const found = listingId ? await getResidenceForListing(listingId) : await getResidence(residenceId!)
          if (!found) throw new Error('We couldn’t find this accommodation. Check the invitation link or try again.')
          if (!active) return
          setSelected(found)
          setDraft(d => ({ ...d, residenceId: found.id, name: found.name, university: found.university }))
        } else {
          const rows = await getResidences()
          if (!active) return
          setResidences(rows)
          const found = rows.find(r => r.id === initialResidenceId.current)
          if (found) {
            setSelected(found)
            setDraft(d => ({ ...d, residenceId: found.id, name: found.name, university: found.university }))
          } else if (initialResidenceId.current) {
            throw new Error('Your selected residence is no longer available. Open a new review link to continue.')
          }
        }
        setLoaded(true)
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Could not load residence names. Please try again.') }
    }
    void load()
    return () => { active = false }
  }, [listingId, residenceId, invited, revision])

  useEffect(() => {
    if (currentUser?.university && !invited) setDraft(d => d.university ? d : { ...d, university: currentUser.university! })
  }, [currentUser?.university, invited])
  useEffect(() => {
    if (!publishedId) setStorageAvailable(saveAccommodationDraft(draftKey, draft))
  }, [draftKey, draft, publishedId])

  const matches = useMemo(() => residences.filter(r => (!draft.university || r.university === draft.university || r.listing?.universities.includes(draft.university)) && r.name.toLowerCase().includes(draft.name.trim().toLowerCase())).slice(0,8), [draft.name, draft.university, residences])
  function authenticate(mode: 'login' | 'register') {
    if (!saveAccommodationDraft(draftKey, draft)) { setStorageAvailable(false); return }
    setRedirectAfterLogin(next)
    navigate(`/student?mode=${mode}&studentOnly=1&next=${encodeURIComponent(next)}`)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending.current || !loaded || isLoadingAuth || publishedId) return
    setError('')
    if (!selected && (draft.name.trim().length < 2 || !draft.university)) return setError('Choose a residence or enter its name and nearby university.')
    if (!draft.stars || !draft.comment.trim()) return setError('Choose a star rating and write your review.')
    if (!currentUser) {
      setStorageAvailable(saveAccommodationDraft(draftKey, draft)); setAuthPrompt(true); return
    }
    if (currentUser.account_type !== 'student' || currentUser.is_blocked) return setError('Only active student accounts can publish reviews. Please sign in with your student account.')
    sending.current = true; setBusy(true)
    try {
      const id = await postResidenceReview({ residenceId: selected?.id ?? null, name: draft.name, university: draft.university, stars: draft.stars, comment: draft.comment })
      if (!id) throw new Error('We could not confirm publication. Your draft is still here. Please try again.')
      clearAccommodationDraft(draftKey)
      setPublishedId(id); setShowSuccess(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your review. Your draft is still here.') }
    finally { sending.current = false; setBusy(false) }
  }

  const field = 'w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream mt-2'
  const primary = 'block w-full bg-teal-primary text-white font-bold rounded-xl px-5 py-3 text-center disabled:opacity-50'
  const secondary = 'block w-full border border-slate-border text-cream font-semibold rounded-xl px-5 py-3 text-center'
  return <div className="min-h-screen bg-slate-deep pb-20"><Navbar /><main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
    <Link to="/accommodations" className="text-teal-light underline text-sm">Back to accommodation</Link>
    <h1 className="font-serif text-3xl text-cream">{invited && selected ? `Review ${selected.name}` : 'Review your accommodation'}</h1>
    {publishedId ? <div className="space-y-3"><h2 className="text-cream text-xl font-bold">Your review is live. Thank you!</h2><Link to={`/accommodations/residence/${publishedId}`} className={secondary}>View your review</Link><button onClick={() => setShowSuccess(true)} className={primary}>What’s next?</button></div> : !loaded ? <>
      {!error && <p role="status" className="text-cream-muted">Loading accommodation…</p>}
    </> : <form onSubmit={submit} className="space-y-5">
      <p className="text-cream-muted text-sm">Share your honest experience. Your name will appear with your review. Avoid sharing anyone’s private contact details.</p>
      <fieldset disabled={busy} className="space-y-5">
        {invited && selected ? <div className="border border-slate-border rounded-xl p-4" aria-label="Selected accommodation"><p className="text-cream font-semibold">{selected.name}</p><p className="text-cream-muted text-sm mt-1">{selected.university}</p></div> : <>
          <label className="block text-cream text-sm">Accommodation near<select className={field} value={draft.university} onChange={e => { setDraft(d => ({ ...d, university: e.target.value, residenceId: null })); setSelected(null) }}><option value="">Choose university</option>{SOUTH_AFRICAN_UNIVERSITIES.map(u => <option key={u}>{u}</option>)}</select></label>
          <label className="block text-cream text-sm">Residence / accommodation name<input className={field} value={draft.name} maxLength={150} onChange={e => { setDraft(d => ({ ...d, name: e.target.value, residenceId: null })); setSelected(null) }} placeholder="Start typing your residence name" autoComplete="off" /></label>
          {!selected && draft.name.trim() && <div className="border border-slate-border rounded-xl overflow-hidden">{matches.map(r => <button type="button" key={r.id} onClick={() => { setSelected(r); setDraft(d => ({ ...d, residenceId: r.id, name: r.name, university: r.university })) }} className="block w-full text-left p-3 bg-slate-card hover:bg-slate-deep text-cream border-b border-slate-border"><span className="font-semibold">{r.name}</span><span className="block text-xs text-cream-muted">{r.university}</span></button>)}<p className="p-3 text-cream-muted text-sm">{matches.length ? 'Choose the correct match above. If yours is different,' : 'No matching residence yet.'} Submitting a new name adds a residence review page.</p></div>}
          {selected && <p className="text-teal-light text-sm">Reviewing: {selected.name} — {selected.university}</p>}
        </>}
        <div><p className="text-cream text-sm mb-2">Your rating</p><div className="flex gap-2">{[1,2,3,4,5].map(n => <button type="button" key={n} aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} aria-pressed={draft.stars === n} onClick={() => setDraft(d => ({ ...d, stars: n }))} className="p-2 text-amber-500"><Star size={26} className={n <= draft.stars ? 'fill-current' : ''} /></button>)}</div></div>
        <label className="block text-cream text-sm">Your experience<textarea required value={draft.comment} onChange={e => setDraft(d => ({ ...d, comment: e.target.value }))} maxLength={3000} rows={5} className={field} placeholder="What should other students know?" /></label>
      </fieldset>
      {!storageAvailable && <p role="alert" className="text-amber-300 text-sm">Your browser cannot save this draft. Copy your review before leaving or enable site storage to continue to sign in.</p>}
      {currentUser && currentUser.account_type !== 'student' && <button type="button" onClick={() => authenticate('login')} className={secondary}>Sign in with a student account</button>}
      <button type="submit" disabled={busy || isLoadingAuth} className={primary}>{busy ? 'Publishing…' : 'Publish review'}</button>
    </form>}
    {error && <p role="alert" className="text-red-400">{error} {!loaded && <button onClick={() => setRevision(n => n + 1)} className="underline">Retry</button>}</p>}
  </main>
    {authPrompt && <ReviewDialog title="Your voice needs a name" onClose={() => setAuthPrompt(false)}>
      <p className="my-4 text-sm text-cream-muted">Create a free student account or sign in to publish your review. Your draft will be waiting when you return.</p>
      {!storageAvailable && <p role="alert" className="mb-3 text-sm text-amber-300">Enable site storage first so your review is not lost. You can close this popup to copy your text.</p>}
      <button onClick={() => authenticate('register')} className={primary}>Create student account</button>
      <button onClick={() => authenticate('login')} className={`${secondary} mt-3`}>Sign in</button>
    </ReviewDialog>}
    {showSuccess && <ReviewDialog title="Your review’s live. Keep campus talking." onClose={() => setShowSuccess(false)}>
      <p className="my-4 text-sm text-cream-muted">You’ve helped someone find a home. Discover campus life—or share a local business experience.</p>
      <Link to="/feed" className={primary}>Explore the student feed</Link>
      <Link to="/businesses/review" className={`${secondary} mt-3`}>Review nearby businesses</Link>
    </ReviewDialog>}
  </div>
}
