import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flag, Globe, MapPin, MessageCircle, Plus, Send, Star, Tag } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { AccommodationListing, AccommodationReportField, AccommodationReview, getAccommodationListingById, getAccommodationReviews, startAccommodationConversation, submitAccommodationReview, replyToAccommodationReview, roomTypeLabel } from '../services/dataService'
import AccommodationReportModal from '../components/student/AccommodationReportModal'
import AccommodationReportEditModal from '../components/student/AccommodationReportEditModal'

export default function AccommodationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, showToast, setAuthPromptOpen, setRedirectAfterLogin, businessProfile } = useApp()
  const [listing, setListing] = useState<AccommodationListing | null>(null)
  const [reviews, setReviews] = useState<AccommodationReview[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [reviewStars, setReviewStars] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showReportEditModal, setShowReportEditModal] = useState(false)

  useEffect(() => {
    if (!id) return
    getAccommodationListingById(id, currentUser?.id).then(data => { setListing(data); setLoading(false) })
  }, [id, currentUser?.id])

  useEffect(() => {
    if (!id) return
    getAccommodationReviews(id).then(setReviews)
  }, [id])

  const isOwner = currentUser?.id === listing?.seller_id
  const canReply = isOwner && businessProfile?.is_accommodation && businessProfile.accommodation_plan !== 'accommodation_free'
  const reportedField = listing.report_required_field as AccommodationReportField | null | undefined
  const hasActiveReportDeadline = Boolean(isOwner && reportedField && listing.report_edit_deadline_at)
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : 0, [reviews])

  if (loading) return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>
  if (!listing) return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Accommodation not found.</div>

  const handleReportClick = () => {
    if (!currentUser) { setAuthPromptOpen(true); return }
    setShowReportModal(true)
  }

  const handleChat = async () => {
    if (!currentUser) { setRedirectAfterLogin(`/accommodation/${listing.id}`); setAuthPromptOpen(true); return }
    if (currentUser.account_type !== 'student') { showToast('Accommodation chat is available to students.', 'info'); return }
    const { convId, error } = await startAccommodationConversation(listing.id, currentUser.id, listing.seller_id)
    if (error) { showToast(error, 'error'); return }
    if (convId) navigate(`/chat/${convId}`)
  }

  const handleReview = async () => {
    if (!currentUser) { setAuthPromptOpen(true); return }
    if (currentUser.account_type !== 'student') { showToast('Only students can review accommodation.', 'info'); return }
    if (!reviewComment.trim()) { showToast('Write a short review first.', 'info'); return }
    setSaving(true)
    const { error } = await submitAccommodationReview(listing.id, currentUser.id, reviewStars, reviewComment)
    setSaving(false)
    if (error) { showToast(error, 'error'); return }
    setShowReviewForm(false)
    setReviewComment('')
    setReviewStars(0)
    getAccommodationReviews(listing.id).then(setReviews)
    showToast('Review posted.', 'success')
  }

  const handleReply = async (reviewId: string) => {
    const reply = (replyDrafts[reviewId] || '').trim()
    if (!reply) return
    setSaving(true)
    const { error } = await replyToAccommodationReview(reviewId, reply)
    setSaving(false)
    if (error) { showToast(error, 'error'); return }
    setReplyDrafts(prev => ({ ...prev, [reviewId]: '' }))
    getAccommodationReviews(listing.id).then(setReviews)
    showToast('Reply posted.', 'success')
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream"><ArrowLeft size={20} /></button>
        {!isOwner && <button onClick={handleReportClick} className="text-cream-muted hover:text-red-400 text-sm flex items-center gap-1.5"><Flag size={14} /> Report</button>}
      </div>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {hasActiveReportDeadline && (
          <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-red-300 text-sm font-bold">Action required on this listing</p>
                <p className="text-cream-muted text-xs leading-relaxed mt-1">Edit the reported {reportedField === 'image_urls' ? 'photos' : reportedField === 'monthly_rent' ? 'monthly rent' : reportedField === 'building_count' ? 'building count' : reportedField === 'building_addresses' ? 'building addresses' : reportedField} before {new Date(listing.report_edit_deadline_at!).toLocaleString()} or the listing will be removed from the accommodation feed.</p>
              </div>
              <button onClick={() => setShowReportEditModal(true)} className="flex-shrink-0 bg-teal-primary hover:bg-teal-light text-white text-xs font-bold px-3 py-2 rounded-xl">Edit now</button>
            </div>
          </div>
        )}

        <div className="bg-slate-card border border-slate-border rounded-3xl overflow-hidden">
          <div className="md:flex md:gap-6 md:items-stretch">
            <div className="relative w-full aspect-video md:w-[420px] md:aspect-video md:flex-shrink-0 bg-slate-deep overflow-hidden">
              {listing.video_url ? (
                <video src={listing.video_url} controls poster={listing.image_urls?.[0] || undefined} className="w-full h-full object-cover bg-black" />
              ) : listing.image_urls?.length ? <img src={listing.image_urls[activeImage]} alt={listing.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-cream-muted">No photo</div>}
              {average > 0 && (
                <span className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-deep/90 border border-gold/40 text-gold text-xs font-bold px-2.5 py-1 rounded-full">
                  <Star size={13} className="fill-amber-400 text-amber-400" /> {average.toFixed(1)} ({reviews.length})
                </span>
              )}
              {!listing.video_url && listing.image_urls.length > 1 && <><button onClick={() => setActiveImage(i => (i - 1 + listing.image_urls.length) % listing.image_urls.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"><ChevronLeft size={18} /></button><button onClick={() => setActiveImage(i => (i + 1) % listing.image_urls.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"><ChevronRight size={18} /></button></>}
            </div>
            <div className="p-5 md:p-7 md:flex-1 md:min-w-0 flex flex-col justify-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl text-cream">{listing.title}</h1>
                <span className="px-2.5 py-1 rounded-full bg-teal-faint text-teal-light text-xs font-bold">Accommodation</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-deep text-cream-muted text-xs font-bold">{listing.plan_tier === 'accommodation_premium' ? 'Premium' : listing.plan_tier === 'accommodation_featured' ? 'Featured' : 'Free'}</span>
              </div>
              {listing.monthly_rent != null ? <p className="text-teal-light font-extrabold text-xl">From R{listing.monthly_rent.toLocaleString('en-ZA')} <span className="text-cream-muted text-sm font-semibold">/ month</span></p> : <p className="text-cream-muted text-sm font-semibold">Pricing available by room type</p>}
              <p className="text-cream-muted text-sm flex items-center gap-1.5"><MapPin size={15} className="flex-shrink-0" /> {listing.address}</p>
              {listing.building_addresses?.map((addr, i) => addr ? <p key={i} className="text-cream-muted text-sm flex items-center gap-1.5"><MapPin size={15} className="flex-shrink-0" /> <span><span className="font-semibold text-cream">Building {i + 2}:</span> {addr}</span></p> : null)}
              <p className="text-cream-muted text-sm"><span className="font-semibold text-cream">Buildings:</span> {listing.building_count}</p>
              {listing.seller_website && <a href={/^https?:\/\//i.test(listing.seller_website) ? listing.seller_website : `https://${listing.seller_website}`} target="_blank" rel="noopener noreferrer" className="text-teal-light text-sm flex items-center gap-1.5 hover:underline w-fit break-all"><Globe size={15} className="flex-shrink-0" /> {listing.seller_website}</a>}
              {listing.description && <p className="text-cream-muted text-sm leading-relaxed whitespace-pre-wrap mt-1">{listing.description}</p>}
            </div>
          </div>
        </div>

        {listing.room_pricing?.length > 0 && (
          <div className="mt-4 w-full bg-slate-card border border-slate-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowPricing(!showPricing)}
              className="w-full flex items-center gap-3 p-4 text-left"
              aria-expanded={showPricing}
            >
              <Tag size={22} className="text-gold flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-gold font-bold text-sm">Pricing Options</p>
                <p className="text-cream-muted text-xs">See room types and available funding prices.</p>
              </div>
              {showPricing ? <ChevronUp size={18} className="text-cream-muted flex-shrink-0" /> : <ChevronDown size={18} className="text-cream-muted flex-shrink-0" />}
            </button>
            {showPricing && (
              <div className="px-4 pb-4 space-y-3">
                {listing.room_pricing.map(room => {
                  const label = roomTypeLabel(room.room_type)
                  const prices = [
                    ['Bursary', room.bursary],
                    ['NSFAS', room.nsfas],
                    ['Self-funded', room.self_funded],
                  ] as const
                  return (
                    <div key={room.room_type} className="border border-slate-border rounded-2xl p-4">
                      <p className="text-cream font-bold text-sm mb-3">{label}</p>
                      <div className="grid grid-cols-3 gap-3">
                        {prices.map(([name, amount]) => <div key={name}><p className="text-cream-muted text-[10px] font-bold uppercase tracking-wide">{name}</p><p className="text-gold font-bold text-sm mt-1">{amount != null ? `R ${amount.toLocaleString('en-ZA')}` : 'Not provided'}</p></div>)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {listing.amenities.length > 0 && (
          <div className="mt-4 bg-slate-card border border-slate-border rounded-xl p-4">
            <h2 className="text-cream font-bold text-sm mb-2">What it offers</h2>
            <div className="flex flex-wrap gap-2">{listing.amenities.map(item => <span key={item} className="px-3 py-1.5 rounded-full bg-teal-faint text-teal-light text-xs font-semibold">{item}</span>)}</div>
          </div>
        )}

        {!isOwner && currentUser?.account_type !== 'business' && <button onClick={handleChat} className="mt-4 w-full bg-teal-primary hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><MessageCircle size={17} /> Message accommodation</button>}

        <section className="mt-6 bg-slate-card border border-slate-border rounded-3xl p-5 sm:p-7">
          <div className="flex items-end justify-between gap-4 mb-5"><div><p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Reviews</p><h2 className="text-2xl font-extrabold text-cream">What students say</h2></div><div className="flex items-center gap-3"><div className="text-gold flex items-center gap-1 text-sm"><Star size={16} className="fill-amber-400 text-amber-400" /> {average ? average.toFixed(1) : '—'}</div>{!isOwner && (!currentUser || (currentUser.account_type === 'student' && !reviews.some(r => r.student_id === currentUser.id))) && <button onClick={() => { if (!currentUser) { setAuthPromptOpen(true); return } setShowReviewForm(v => !v) }} aria-label="Write a review" className="w-8 h-8 rounded-full bg-gold hover:bg-gold/90 text-slate-deep flex items-center justify-center transition-colors flex-shrink-0"><Plus size={16} strokeWidth={2.5} /></button>}</div></div>
          {showReviewForm && !isOwner && currentUser?.account_type === 'student' && <div className="border border-slate-border rounded-2xl p-4 mb-5"><div className="flex items-center gap-1 mb-3">{[1,2,3,4,5].map(s => <button key={s} onClick={() => setReviewStars(s)} className={s <= reviewStars ? 'text-amber-400' : 'text-slate-border'}><Star size={19} className={s <= reviewStars ? 'fill-current' : ''} /></button>)}</div><textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} placeholder="Share your experience" className="w-full bg-slate-deep border border-slate-border rounded-xl p-3 text-cream text-sm placeholder:text-cream-muted resize-none" /><button onClick={handleReview} disabled={saving} className="mt-3 inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-4 py-2.5 rounded-xl text-sm"><Send size={14} /> Post review</button></div>}
          <div className="space-y-4">
            {reviews.length === 0 ? <p className="text-cream-muted text-sm">No reviews yet.</p> : reviews.map(review => <div key={review.id} className="border-t border-slate-border pt-4"><div className="flex items-start justify-between gap-3"><div><p className="text-cream font-semibold text-sm">{review.student?.full_name || 'Student'}</p><div className="flex items-center gap-0.5 text-amber-400 mt-1">{[1,2,3,4,5].map(s => <Star key={s} size={13} className={s <= review.stars ? 'fill-current' : ''} />)}</div></div><span className="text-cream-muted text-xs">{new Date(review.created_at).toLocaleDateString()}</span></div><p className="text-cream-muted text-sm leading-relaxed mt-2">{review.comment || 'No comment.'}</p>{review.reply && <div className="mt-3 ml-4 border-l-2 border-teal-light pl-3"><p className="text-teal-light text-xs font-bold">Accommodation reply</p><p className="text-cream-muted text-sm mt-1">{review.reply}</p></div>}{isOwner && !review.reply && (canReply ? <div className="mt-3 flex gap-2"><input value={replyDrafts[review.id] || ''} onChange={e => setReplyDrafts(prev => ({ ...prev, [review.id]: e.target.value }))} placeholder="Reply to this review" className="flex-1 bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted" /><button onClick={() => handleReply(review.id)} disabled={saving} className="px-3 rounded-xl bg-teal-primary text-white"><Send size={15} /></button></div> : <p className="mt-3 text-cream-muted text-xs">Upgrade to Featured (R199) or Premium (R399) to reply to reviews.</p>)}</div>)}
          </div>
        </section>
      </main>
      {showReportModal && (
        <AccommodationReportModal
          accommodationListingId={listing.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
      {showReportEditModal && reportedField && (
        <AccommodationReportEditModal
          listing={listing}
          field={reportedField}
          onClose={() => setShowReportEditModal(false)}
          onSaved={next => {
            setListing(next)
            setShowReportEditModal(false)
            showToast('Correction saved. The 3-day warning has been cleared.', 'success')
          }}
        />
      )}
    </div>
  )
}
