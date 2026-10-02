// src/pages/PostEvent.tsx
//
// Event creation. Deliberately has no plan/payment step — events are free
// to post for now, per the "forget about the plans for those" call. If
// that changes later it slots in the same place the listing flow has it.

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createEvent, uploadEventPoster, EVENT_CATEGORIES, getBusinessProfile } from '../services/dataService'
import { PostTypeSwitcher } from '../components/common/PostTypeChooser'
import ImageCropModal from '../components/common/ImageCropModal'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

const input =
  'w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light'

export default function PostEvent() {
  const navigate = useNavigate()
  const { currentUser, showToast } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(EVENT_CATEGORIES[0])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [isFree, setIsFree] = useState(true)
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [businessUniversities, setBusinessUniversities] = useState<string[]>([])
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [loadingBusinessUniversities, setLoadingBusinessUniversities] = useState(false)

  useEffect(() => {
    if (currentUser?.account_type !== 'business') {
      setBusinessUniversities([])
      setSelectedUniversities(currentUser?.university ? [currentUser.university] : [])
      setLoadingBusinessUniversities(false)
      return
    }

    let mounted = true
    setLoadingBusinessUniversities(true)
    getBusinessProfile(currentUser.id)
      .then(profile => {
        if (!mounted) return
        const universities = profile?.universities ?? []
        setBusinessUniversities(universities)
        const requestedUniversity = new URLSearchParams(window.location.search).get('university')
        const initial = requestedUniversity && universities.includes(requestedUniversity)
          ? requestedUniversity
          : universities[0]
        setSelectedUniversities(initial ? [initial] : [])
        setLoadingBusinessUniversities(false)
      })
      .catch(() => {
        if (!mounted) return
        setBusinessUniversities([])
        setSelectedUniversities([])
        setLoadingBusinessUniversities(false)
      })

    return () => { mounted = false }
  }, [currentUser])

  // Same crop pipeline as listing photos (ImageCropModal, react-easy-crop
  // underneath) — cropSrc holds the picked file as an object URL while
  // the modal is open, posterUrl holds the final uploaded image.
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [uploadingPoster, setUploadingPoster] = useState(false)

  const handlePosterSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
  }

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (fileRef.current) fileRef.current.value = ''
    if (!currentUser) return

    const croppedFile = new File([blob], 'event-poster.jpg', { type: 'image/jpeg' })
    setUploadingPoster(true)
    const { url, error } = await uploadEventPoster(croppedFile, currentUser.id)
    setUploadingPoster(false)
    if (error) { showToast(error, 'error'); return }
    setPosterUrl(url)
  }

  const handleSubmit = async () => {
    if (!currentUser) return
    if (!title.trim()) return showToast('Give your event a title.', 'error')
    if (!date || !time) return showToast('Set a date and start time.', 'error')
    if (!location.trim()) return showToast('Where is it happening?', 'error')

    // Built from the local date/time inputs, so what the host typed is
    // what they meant in their own timezone.
    const startsAt = new Date(`${date}T${time}`)
    if (Number.isNaN(startsAt.getTime())) return showToast('That date and time do not look right.', 'error')
    if (startsAt.getTime() < Date.now()) return showToast("That's in the past — pick a future date.", 'error')

    const priceNum = isFree ? null : parseFloat(price)
    if (!isFree && (Number.isNaN(priceNum!) || priceNum! < 0)) {
      return showToast('Enter a valid ticket price, or mark it free.', 'error')
    }

    const eventUniversities = currentUser.account_type === 'business'
      ? selectedUniversities
      : (currentUser.university ? [currentUser.university] : [])

    if (eventUniversities.length === 0) return showToast(
      currentUser.account_type === 'business'
        ? 'Choose at least one university for this event.'
        : 'Your account does not have a university set.',
      'error'
    )

    setSaving(true)

    const { id: createdId, error } = await createEvent({
      hostId: currentUser.id,
      title: title.trim(),
      description: description.trim(),
      category,
      startsAt: startsAt.toISOString(),
      location: location.trim(),
      price: priceNum,
      imageUrl: posterUrl,
      universities: eventUniversities,
    })
    setSaving(false)

    if (error) return showToast(error, 'error')
    showToast('Event posted.', 'success')
    navigate(createdId ? `/event/${createdId}` : '/events')
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-deep flex items-center justify-center">
        <p className="text-cream-muted text-sm">Sign in to post an event.</p>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-36">
          <PostTypeSwitcher current="event" />

          <div className="mb-4">
            <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Event listing</p>
            <h1 className="font-serif text-3xl text-cream">Post an Event</h1>
            <p className="text-cream-muted text-sm mt-2">
              {currentUser.account_type === 'business'
                ? 'Add your event details in one page and choose which universities your business can reach.'
                : 'Add your event details in one page. Students at your university will see it on the Events board.'}
            </p>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] gap-4 md:gap-5 items-start">
            <div className="space-y-4">
              <section className="bg-slate-card border border-slate-border rounded-2xl p-4 sm:p-5">
                <div className="mb-3">
                  <h2 className="text-cream font-bold text-base">Event details</h2>
                  <p className="text-cream-muted text-xs mt-1">The information students need to understand the event.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Event title</label>
                    <input className={input} placeholder="Event title" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Category</label>
                    <select className={input} value={category} onChange={e => setCategory(e.target.value)}>
                      {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Description</label>
                    <textarea
                      className={`${input} resize-y`}
                      rows={3}
                      placeholder="What's happening? Any details people should know."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="bg-slate-card border border-slate-border rounded-2xl p-4 sm:p-5">
                <div className="mb-3">
                  <h2 className="text-cream font-bold text-base">Date, place & ticketing</h2>
                  <p className="text-cream-muted text-xs mt-1">Keep the practical event information together.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Date</label>
                    <input className={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Start time</label>
                    <input className={input} type="time" value={time} onChange={e => setTime(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Location</label>
                    <input className={input} placeholder="Where? (e.g. Great Hall)" value={location} onChange={e => setLocation(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Entry</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setIsFree(f => !f)}
                        className={`px-4 py-3 rounded-xl text-xs font-bold border transition-colors ${
                          isFree ? 'bg-teal-primary border-teal-light text-cream' : 'bg-slate-deep border-slate-border text-cream-muted'
                        }`}
                      >
                        Free entry
                      </button>
                      {!isFree ? (
                        <input
                          className={input}
                          type="number"
                          min="0"
                          placeholder="Ticket price (R)"
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center text-cream-muted text-xs px-1">Tap “Free entry” to add a ticket price instead.</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {currentUser.account_type === 'business' && (
                <details className="bg-slate-card border border-slate-border rounded-2xl">
                  <summary className="list-none cursor-pointer p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-cream font-bold text-base">Universities this event will reach <span className="text-red-400">*</span></h2>
                      <p className="text-cream-muted text-xs mt-1">{selectedUniversities.length ? selectedUniversities.join(' · ') : 'Choose from this business account’s university access.'}</p>
                    </div>
                    <span className="text-teal-light text-xs font-bold whitespace-nowrap">{selectedUniversities.length} selected ▾</span>
                  </summary>
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-border pt-4">
                    {loadingBusinessUniversities ? (
                      <p className="text-cream-muted text-sm py-2">Loading your university access...</p>
                    ) : businessUniversities.length === 0 ? (
                      <p className="text-red-400 text-sm py-2">Your business account has no university access configured.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                        {businessUniversities.map(university => {
                          const selected = selectedUniversities.includes(university)
                          return (
                            <button key={university} type="button" onClick={() => setSelectedUniversities(prev => selected ? prev.filter(u => u !== university) : [...prev, university])} className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs transition-colors ${selected ? 'border-teal-light bg-teal-faint text-cream' : 'border-slate-border bg-slate-deep text-cream hover:border-teal-light'}`}>
                              <span className="flex-1 min-w-0">{university}</span>
                              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'border-teal-light bg-teal-light' : 'border-slate-border'}`}>{selected && <span className="w-2 h-2 rounded-sm bg-slate-deep" />}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            <aside className="md:sticky md:top-20 space-y-3">
              <section className="bg-slate-card border border-slate-border rounded-2xl overflow-hidden">
                <div className="relative h-36 sm:h-40 bg-slate-deep border-b border-slate-border">
                  {posterUrl ? (
                    <>
                      <img src={posterUrl} alt="Event preview" className="w-full h-full object-contain" />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button type="button" onClick={() => fileRef.current?.click()} className="bg-black/65 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg">Replace</button>
                        <button type="button" onClick={() => setPosterUrl(null)} className="bg-black/65 text-white rounded-lg p-1.5" aria-label="Remove poster"><X size={14} /></button>
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingPoster} className="w-full h-full flex flex-col items-center justify-center text-cream-muted gap-2 hover:text-cream transition-colors disabled:opacity-60">
                      <ImagePlus size={22} />
                      <span className="text-xs font-bold">{uploadingPoster ? 'Uploading…' : 'Add optional event poster'}</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePosterSelect} />
                </div>
                <div className="p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-teal-light font-bold mb-2">Your event preview</p>
                  <h2 className="text-cream font-bold text-lg leading-tight">{title.trim() || 'Your event title'}</h2>
                  <p className="text-cream-muted text-xs mt-1">{category}{location.trim() ? ` · ${location.trim()}` : ''}</p>
                  <div className="mt-4 pt-4 border-t border-slate-border space-y-2 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-cream-muted">Date</span><span className="text-cream">{date || 'Not set'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-cream-muted">Time</span><span className="text-cream">{time || 'Not set'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-cream-muted">Entry</span><span className="text-gold font-bold">{isFree ? 'Free' : price ? `R${price}` : 'Price not set'}</span></div>
                  </div>
                  {description.trim() && <p className="text-cream-muted text-xs mt-3 line-clamp-3">{description.trim()}</p>}
                  {selectedUniversities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {selectedUniversities.map(university => (
                        <span key={university} className="text-[10px] text-cream-muted bg-slate-deep border border-slate-border rounded-lg px-2 py-1">{university}</span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-slate-card border border-slate-border rounded-2xl p-4">
                <p className="text-cream font-bold text-sm">Events are free to post</p>
                <p className="text-cream-muted text-xs mt-1">There is no event plan or upgrade step. This keeps the existing event flow unchanged.</p>
              </section>

              <button
                onClick={handleSubmit}
                disabled={saving || loadingBusinessUniversities}
                className="w-full bg-gold hover:bg-gold/90 disabled:opacity-60 text-slate-deep font-bold py-3.5 rounded-xl text-sm transition-colors"
              >
                {saving ? 'Posting…' : 'Post event'}
              </button>
              <p className="text-cream-muted text-xs text-center">After posting, you will be taken to the event details page.</p>
            </aside>
          </div>
        </main>
      </div>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={3 / 4}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
      <BottomNav />
    </>
  )
}
