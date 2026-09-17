// src/pages/PostEvent.tsx
//
// Event creation. Deliberately has no plan/payment step — events are free
// to post for now, per the "forget about the plans for those" call. If
// that changes later it slots in the same place the listing flow has it.

import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createEvent, uploadEventPoster, EVENT_CATEGORIES } from '../services/dataService'
import { PostTypeSwitcher } from '../components/common/PostTypeChooser'
import ImageCropModal from '../components/common/ImageCropModal'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

const input =
  'w-full bg-slate-card border border-slate-border rounded-xl px-3 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light'

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

    setSaving(true)
    const { error } = await createEvent({
      hostId: currentUser.id,
      title: title.trim(),
      description: description.trim(),
      category,
      startsAt: startsAt.toISOString(),
      location: location.trim(),
      price: priceNum,
      imageUrl: posterUrl,
    })
    setSaving(false)

    if (error) return showToast(error, 'error')
    showToast('Event posted.', 'success')
    navigate('/events')
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
        <div className="max-w-lg mx-auto px-4 pt-20 pb-28">
          {/* Lets someone who tapped the wrong thing swap without going back. */}
          <PostTypeSwitcher current="event" />

          <h1 className="font-serif text-2xl text-cream mb-1">Post an Event</h1>
          <p className="text-cream-muted text-sm mb-6">
            Anyone at your university will see it on the Events board.
          </p>

          <div className="flex flex-col gap-3">
            <input className={input} placeholder="Event title" value={title} onChange={e => setTitle(e.target.value)} />

            {/* Poster upload — same crop flow as listing photos. Defaults
                to Portrait since a poster/flyer is normally taller than
                wide, but the modal's own Landscape/Square/Portrait toggle
                still lets the host pick a different shape if theirs is. */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Poster (optional)
              </label>
              {posterUrl ? (
                <div className="relative w-full aspect-[3/4] max-w-[220px] rounded-xl overflow-hidden border border-slate-border">
                  <img src={posterUrl} alt="Event poster" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPosterUrl(null)}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                    aria-label="Remove poster"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingPoster}
                  className="w-full aspect-[3/4] max-w-[220px] rounded-xl border border-dashed border-slate-border flex flex-col items-center justify-center gap-1.5 text-cream-muted hover:border-teal-light transition-colors disabled:opacity-60"
                >
                  <ImagePlus size={20} />
                  <span className="text-xs font-bold">{uploadingPoster ? 'Uploading…' : 'Add a poster'}</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePosterSelect} />
            </div>

            <select className={input} value={category} onChange={e => setCategory(e.target.value)}>
              {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="flex gap-3">
              <input className={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
              <input className={input} type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>

            <input className={input} placeholder="Where? (e.g. Great Hall)" value={location} onChange={e => setLocation(e.target.value)} />

            <textarea
              className={`${input} resize-none`} rows={4}
              placeholder="What's happening? Any details people should know."
              value={description} onChange={e => setDescription(e.target.value)}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFree(f => !f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isFree ? 'bg-teal-primary border-teal-light text-cream' : 'bg-slate-card border-slate-border text-cream-muted'
                }`}
              >
                Free entry
              </button>
              {!isFree && (
                <input
                  className={input} type="number" min="0" placeholder="Ticket price (R)"
                  value={price} onChange={e => setPrice(e.target.value)}
                />
              )}
              {isFree && <span className="text-cream-muted text-xs">Tap to add a ticket price instead</span>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-gold hover:bg-gold/90 disabled:opacity-60 text-slate-deep font-bold py-3 rounded-xl text-sm transition-colors mt-2"
            >
              {saving ? 'Posting…' : 'Post event'}
            </button>
          </div>
        </div>
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
