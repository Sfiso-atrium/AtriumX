import BusinessHoursEditor from '../components/business/BusinessHoursEditor'
import { getBusinessHours, saveBusinessHours } from '../services/businessHours'
import { isValidHours, type BusinessHours } from '../utils/businessHours'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ImagePlus, Video, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  createListing, updateListing, uploadListingImage, uploadBusinessVideo, getUserListings, getBusinessProfile,
  getEffectiveBusinessPlan, PLAN_TIERS, PlanKey, BusinessProfile, Listing
} from '../services/dataService'
import Navbar from '../components/common/Navbar'
import useEditSection from '../hooks/useEditSection'
import BottomNav from '../components/common/BottomNav'
import ImageCropModal from '../components/common/ImageCropModal'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'
import BusinessListingFirst from './BusinessListingFirst'

export default function BusinessPostListing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
const { currentUser, isLoadingAuth, showToast, refreshBusinessProfile } = useApp()
  const { plan: statePlan, editListing } = (location.state as { plan?: PlanKey; editListing?: Listing } | null) || {}
  const plan = statePlan || (currentUser?.account_type === 'business' ? getEffectiveBusinessPlan(currentUser) : undefined)
  const [hours, setHours] = useState<BusinessHours | null>(null)
  const [hoursChanged, setHoursChanged] = useState(false)
  const [hoursLoaded, setHoursLoaded] = useState(false)
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [checkingBusiness, setCheckingBusiness] = useState(true)
  const [atLimit, setAtLimit] = useState(false)
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [universitySearch, setUniversitySearch] = useState('')

const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
const [imageUrls, setImageUrls] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

useEffect(() => {
    if (!editListing) return
    setTitle(editListing.title)
    setDescription(editListing.description)
    setPrice(String(editListing.price))
    setIsNegotiable(editListing.is_negotiable)
    setImageUrls(editListing.image_urls || [])
    setVideoUrl(editListing.video_url || null)
  }, [editListing])
  useEffect(() => {
    if (searchParams.get('resume') !== '1' || !currentUser || currentUser.account_type !== 'business') return
    try {
      const raw = sessionStorage.getItem('atriumx_pending_business_draft')
      if (!raw) return
      const draft = JSON.parse(raw)
      setTitle(draft.title ?? '')
      setDescription(draft.description ?? '')
      setPrice(String(draft.price ?? ''))
      setIsNegotiable(Boolean(draft.isNegotiable))
      setImageUrls(Array.isArray(draft.imageUrls) ? draft.imageUrls : [])
      setVideoUrl(plan === 'campus_partner' && typeof draft.videoUrl === 'string' ? draft.videoUrl : null)
      setSelectedUniversities(Array.isArray(draft.universities) ? draft.universities : [])
    } catch {
      sessionStorage.removeItem('atriumx_pending_business_draft')
    }
  }, [searchParams, currentUser?.id, currentUser?.account_type, plan])
  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { setCheckingBusiness(false); return }
    if (currentUser.account_type !== 'business') { navigate('/plan-select'); return }
    if (!plan) { navigate('/business/plan-select'); return }

    Promise.all([getBusinessProfile(currentUser.id), getUserListings(currentUser.id)]).then(([biz, listings]) => {
      setBusiness(biz)
      const universityLimit = 'maxUniversities' in PLAN_TIERS[plan] && typeof PLAN_TIERS[plan].maxUniversities === 'number' ? PLAN_TIERS[plan].maxUniversities : 1
      const savedUniversities = biz?.universities ?? []
      const resumingDraft = searchParams.get('resume') === '1' && !!sessionStorage.getItem('atriumx_pending_business_draft')
      if (!resumingDraft) {
        if (savedUniversities.length > universityLimit) {
          // A paid plan has expired or been reduced. Do not guess which
          // universities the business wants to keep; make them choose.
          setSelectedUniversities([])
        } else if (editListing) {
          setSelectedUniversities(editListing.universities?.length ? editListing.universities : savedUniversities)
        } else if (savedUniversities.length) {
          setSelectedUniversities([savedUniversities[0]])
        }
      }
      setCheckingBusiness(false)

      // Editing doesn't add a new listing, so it shouldn't be blocked by
      // (or count toward) the active-listing limit — same reasoning as
      // the student PostListing flow.
      if (!editListing) {
        const active = listings.filter(l => l.plan_enabled !== false && (l.status === 'active' || l.status === 'pending')).length
        const max = PLAN_TIERS[plan].maxListings
        if (active >= max) setAtLimit(true)
      }
    })
  }, [currentUser, isLoadingAuth, navigate, plan, editListing, searchParams])

  useEffect(() => {
    if (!currentUser || currentUser.account_type !== 'business') return
    let active = true
    setHoursLoaded(false)
    getBusinessHours(currentUser.id).then(value => {
      if (active) { setHours(value); setHoursLoaded(true); setHoursChanged(false) }
    }).catch(() => { if (active) setError('Operating hours could not be loaded. Reload to edit them.') })
    return () => { active = false }
  }, [currentUser?.id])

  useEditSection(!isLoadingAuth && !checkingBusiness && !!currentUser && !!plan && !atLimit && !submitted)

  if (!isLoadingAuth && !currentUser) return <BusinessListingFirst />
  if (isLoadingAuth || checkingBusiness || !currentUser || !plan) return null

  const resultListingId = editListing?.id || submittedId

if (submitted) return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <span className="text-3xl">✓</span>
      </div>
      <h2 className="text-cream font-bold text-2xl mb-2">
        {editListing ? 'Listing Updated' : 'Listing Posted'}
      </h2>
      <p className="text-cream-muted text-sm max-w-sm mb-6">
        {editListing
          ? 'Your changes are live now. Our team may still review them, but your listing was never taken down while that happens.'
          : 'Your listing is live now on the Business marketplace for the universities you selected.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {resultListingId && (
          <button
            onClick={() => navigate(`/listing/${resultListingId}`)}
            className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            View Listing
          </button>
        )}
        <button
          onClick={() => navigate(editListing ? `/profile/${currentUser.id}` : '/feed')}
          className="border border-slate-border text-cream font-bold py-3 px-8 rounded-xl transition-colors hover:border-teal-light"
        >
          {editListing ? 'Back to My Listings' : 'Back to Feed'}
        </button>
      </div>
    </div>
  )
  if (atLimit) return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center">
      <p className="text-cream font-bold text-xl mb-2">Listing Limit Reached</p>
      {plan === 'campus_partner' ? (
        <>
          <p className="text-cream-muted text-sm mb-6 max-w-sm">
            You're already on our top plan, Campus Partner, which allows up to {PLAN_TIERS.campus_partner.maxListings} active
            listings — and you've used all of them. To post something new, mark one of your current listings as sold first.
          </p>
          <button
            onClick={() => navigate(`/profile/${currentUser.id}`)}
            className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Go to My Listings
          </button>
        </>
      ) : (
        <>
          <p className="text-cream-muted text-sm mb-6">
            Your {PLAN_TIERS[plan].label} plan allows {PLAN_TIERS[plan].maxListings} active listing{PLAN_TIERS[plan].maxListings !== 1 ? 's' : ''}.
            Upgrade to post more at the same time.
          </p>
          <button
            onClick={() => navigate('/business/plan-select', { state: { forcePlans: true } })}
            className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Upgrade Plan
          </button>
        </>
      )}
    </div>
  )

  const tierConfig = PLAN_TIERS[plan]
  const maxPhotos = tierConfig.maxPhotos
  const canUploadPhoto = maxPhotos > 0
  const canUploadVideo = plan === 'campus_partner'

const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrls.length >= maxPhotos) return
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

    const croppedFile = new File([blob], 'listing-photo.jpg', { type: 'image/jpeg' })
    setUploading(true)
    const { url, error: uploadError } = await uploadListingImage(croppedFile, currentUser.id)
    setUploading(false)
    if (uploadError) { showToast(uploadError, 'error'); return }
    if (url) setImageUrls(prev => [...prev, url])
  }

  const removeImage = (idx: number) => setImageUrls(prev => prev.filter((_, i) => i !== idx))

  const handleVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !canUploadVideo) return

    setUploadingVideo(true)
    const { url, error: uploadError } = await uploadBusinessVideo(file, currentUser.id)
    setUploadingVideo(false)
    if (uploadError || !url) {
      showToast(uploadError || 'Could not upload the listing video.', 'error')
      return
    }
    setVideoUrl(url)
  }

  const maxUniversities = 'maxUniversities' in PLAN_TIERS[plan] && typeof PLAN_TIERS[plan].maxUniversities === 'number' ? PLAN_TIERS[plan].maxUniversities : 1
  const accountUniversities = business?.universities ?? []
  const needsUniversityReduction = accountUniversities.length > maxUniversities
  const canAddUniversity = accountUniversities.length < maxUniversities
  const universityQuery = universitySearch.trim().toLowerCase()
  const universityPool = canAddUniversity ? SOUTH_AFRICAN_UNIVERSITIES : accountUniversities
  const universityOptions = universityPool.filter(u =>
    !universityQuery ||
    u.toLowerCase().includes(universityQuery) ||
    (UNIVERSITY_ALIASES[u] ?? []).some(a => a.toLowerCase().startsWith(universityQuery))
  )

  const toggleUniversity = (university: string) => {
    setError('')
    if (selectedUniversities.includes(university)) {
      setSelectedUniversities(prev => prev.filter(u => u !== university))
      return
    }

    if (selectedUniversities.length >= maxUniversities) {
      setError(`Your ${PLAN_TIERS[plan].label} plan allows up to ${maxUniversities} universities per listing.`)
      return
    }

    const isNewAccountUniversity = !accountUniversities.includes(university)
    const newAccountUniversitiesSelected = selectedUniversities.filter(u => !accountUniversities.includes(u)).length + (isNewAccountUniversity ? 1 : 0)
    const remainingAccountSlots = maxUniversities - accountUniversities.length
    if (isNewAccountUniversity && newAccountUniversitiesSelected > remainingAccountSlots) {
      setError(`Your ${PLAN_TIERS[plan].label} plan allows ${maxUniversities} university access${maxUniversities === 1 ? '' : 'es'}. Upgrade to reach another university.`)
      return
    }

    setSelectedUniversities(prev => [...prev, university])
  }

  const handleSubmit = async () => {
    setError('')
    if (hoursChanged && hours !== null && !isValidHours(hours)) return setError('Choose different opening and closing times.')
    if (!title.trim()) return setError('Give your listing a name.')
    if (description.trim().length < 20) return setError('Description needs at least 20 characters.')

setLoading(true)
if (hoursChanged) {
  const hoursError = await saveBusinessHours(currentUser.id, hours)
  if (hoursError) { setLoading(false); setError(hoursError); return }
}
const sharedFields = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price) || 0,
      category: editListing?.category || business?.business_type || 'other',
      customCategory: editListing?.custom_category || business?.custom_business_type || undefined,
      imageUrls,
      videoUrl: (canUploadVideo || !!editListing?.video_url) ? (videoUrl || undefined) : undefined,
      residence: '',
      listingType: 'ongoing' as const,
      isNegotiable,
      variants: [],
      universities: selectedUniversities,
    }

    if (editListing) {
      const { error: err } = await updateListing(editListing.id, sharedFields)
      if (err) { setLoading(false); setError(err); return }
      await refreshBusinessProfile()
      setLoading(false)
      setSubmitted(true)
      return
    }

    const { id: createdId, error: err } = await createListing({
      sellerId: currentUser.id,
      ...sharedFields,
      planTier: plan,
    })
    if (err) { setLoading(false); setError(err); return }
    setSubmittedId(createdId)
    sessionStorage.removeItem('atriumx_pending_business_draft')
    await refreshBusinessProfile()
    setLoading(false)
    setSubmitted(true)
  }

  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-36">
          <div className="mb-4">
            <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Business listing</p>
            <h1 className="font-serif text-3xl text-cream">{editListing ? 'Edit Listing' : 'New Business Listing'}</h1>
            <p className="text-cream-muted text-sm mt-2">
              Keep everything in one place. Your current {tierConfig.label} plan allows up to {maxPhotos} photo{maxPhotos !== 1 ? 's' : ''}{canUploadVideo ? ' and one optional video' : ''}.
            </p>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] gap-4 md:gap-5 items-start">
            <div className="space-y-4">
              <section id="edit-details" tabIndex={-1} className="scroll-mt-24 bg-slate-card border border-slate-border rounded-2xl p-4 sm:p-5">
                <div className="mb-3">
                  <h2 className="text-cream font-bold text-base">Listing details</h2>
                  <p className="text-cream-muted text-xs mt-1">The main information students will see first.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                      Listing Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20% off haircuts for students"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                      Starting Price — optional
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-muted text-sm font-bold">R</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className={inputClass + ' pl-8'}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNegotiable(v => !v)}
                      className={`mt-2 text-xs px-3 py-2 rounded-xl border transition-colors ${
                        isNegotiable
                          ? 'bg-gold/10 text-gold border-gold/40'
                          : 'bg-slate-deep text-cream-muted border-slate-border hover:border-teal-light'
                      }`}
                    >
                      {isNegotiable ? '✓ Open to offers' : 'Mark as open to offers'}
                    </button>
                  </div>

                  <BusinessHoursEditor value={hours} onChange={value => { setHours(value); setHoursChanged(true) }} disabled={!hoursLoaded || loading} />
                  <div className="sm:col-span-2">
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      placeholder="What are you offering? Include anything students should know."
                      maxLength={500}
                      rows={3}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className={inputClass + ' resize-y'}
                    />
                    <div className="flex justify-between mt-1">
                      {description.length < 20 && description.length > 0 && (
                        <p className="text-red-400 text-xs">Minimum 20 characters</p>
                      )}
                      <p className="text-cream-muted text-xs text-right ml-auto">{description.length}/500</p>
                    </div>
                  </div>
                </div>
              </section>

              <details className="bg-slate-card border border-slate-border rounded-2xl">
                <summary className="list-none cursor-pointer p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-cream font-bold text-base">Universities <span className="text-red-400">*</span></h2>
                    <p className={needsUniversityReduction ? "text-red-400 text-xs mt-1" : "text-cream-muted text-xs mt-1"}>
                      {selectedUniversities.length ? selectedUniversities.join(' · ') : needsUniversityReduction ? `Choose the ${maxUniversities} university access${maxUniversities === 1 ? '' : 'es'} you want to keep.` : `Choose up to ${maxUniversities} universit${maxUniversities === 1 ? 'y' : 'ies'}.`}
                    </p>
                  </div>
                  <span className="text-teal-light text-xs font-bold whitespace-nowrap">{selectedUniversities.length}/{maxUniversities} ▾</span>
                </summary>
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-border pt-4">
                  <input type="text" placeholder="Search for a university..." value={universitySearch} onChange={e => setUniversitySearch(e.target.value)} className={inputClass + ' py-2.5'} />
                  <div className="mt-3 grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {universityOptions.map(university => {
                      const selected = selectedUniversities.includes(university)
                      const isAccountUniversity = accountUniversities.includes(university)
                      return (
                        <button key={university} type="button" onClick={() => toggleUniversity(university)} className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs transition-colors ${selected ? 'border-teal-light bg-teal-faint text-cream' : 'border-slate-border bg-slate-deep text-cream hover:border-teal-light'}`}>
                          <span className="flex-1 min-w-0">{university}</span>
                          {isAccountUniversity && <span className="text-[10px] text-cream-muted">Account</span>}
                          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'border-teal-light bg-teal-light' : 'border-slate-border'}`}>{selected && <span className="w-2 h-2 rounded-sm bg-slate-deep" />}</span>
                        </button>
                      )
                    })}
                    {universityOptions.length === 0 && <p className="text-cream-muted text-sm text-center py-4 sm:col-span-2">No universities match your search.</p>}
                  </div>
                </div>
              </details>

              <section id="edit-photos" tabIndex={-1} className="scroll-mt-24 bg-slate-card border border-slate-border rounded-2xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-cream font-bold text-base">Media</h2>
                    <p className="text-cream-muted text-xs mt-1">
                      {canUploadPhoto ? `Add up to ${maxPhotos} photo${maxPhotos !== 1 ? 's' : ''} to show students what you offer.` : 'Your current plan is text only.'}
                    </p>
                  </div>
                  {canUploadPhoto && (
                    <span className="text-cream-muted text-xs bg-slate-deep border border-slate-border rounded-xl px-3 py-2">
                      {imageUrls.length}/{maxPhotos}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-deep border border-slate-border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 bg-slate-deep/80 rounded-full flex items-center justify-center text-cream"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {imageUrls.length < maxPhotos && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square rounded-xl border border-dashed border-slate-border flex flex-col items-center justify-center gap-1.5 text-cream-muted hover:border-teal-light transition-colors disabled:opacity-40"
                    >
                      <ImagePlus size={20} />
                      <span className="text-xs">{uploading ? 'Uploading...' : 'Add photo'}</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>

                {canUploadVideo && (
                  <div className="mt-4 pt-4 border-t border-slate-border">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-cream font-bold text-sm">Listing video</h3>
                        <p className="text-cream-muted text-xs mt-1">Campus Partner includes one optional video.</p>
                      </div>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold">
                        <Video size={15} />
                        {videoUrl ? 'Replace video' : 'Add video'}
                        <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoSelect} disabled={uploadingVideo} className="hidden" />
                      </label>
                    </div>
                    {videoUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-border bg-black">
                        <video src={videoUrl} controls className="w-full max-h-52 object-contain" />
                        <button type="button" onClick={() => setVideoUrl(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center" aria-label="Remove listing video">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-4 px-4 text-center">{uploadingVideo ? 'Uploading video...' : 'No video added. This is optional.'}</p>
                    )}
                  </div>
                )}
              </section>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <aside className="md:sticky md:top-20 space-y-3">
              <section className="bg-slate-card border border-slate-border rounded-2xl overflow-hidden">
                <div className="h-32 sm:h-36 bg-slate-deep border-b border-slate-border">
                  {videoUrl ? (
                    <video src={videoUrl} muted playsInline controls className="w-full h-full object-cover bg-black" />
                  ) : imageUrls[0] ? (
                    <img src={imageUrls[0]} alt="Listing preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-cream-muted gap-2">
                      <ImagePlus size={24} />
                      <span className="text-xs">Your first photo will appear here</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-teal-light font-bold mb-2">Your listing preview</p>
                  <h2 className="text-cream font-bold text-lg leading-tight">{title.trim() || 'Your business listing'}</h2>
                  <p className="text-cream-muted text-xs mt-1">{business?.business_name || 'Business'}{business?.physical_address ? ` · ${business.physical_address}` : ''}</p>
                  <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-border">
                    <span className="text-gold font-bold">{price ? `R${price}` : 'Price not added'}</span>
                    {isNegotiable && <span className="text-gold text-xs">Open to offers</span>}
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-cream-muted text-xs">Current plan</p>
                    <h3 className="text-cream font-bold mt-1">{tierConfig.label}</h3>
                  </div>
                  <span className="text-gold font-bold text-sm">{tierConfig.price}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-cream-muted">
                  <div className="bg-slate-deep border border-slate-border rounded-xl p-3"><span className="block text-cream font-bold">{tierConfig.maxListings}</span> active listing{tierConfig.maxListings !== 1 ? 's' : ''}</div>
                  <div className="bg-slate-deep border border-slate-border rounded-xl p-3"><span className="block text-cream font-bold">{maxPhotos}</span> photo{maxPhotos !== 1 ? 's' : ''}</div>
                </div>
                {canUploadVideo && <p className="text-cream-muted text-xs mt-3">Includes one optional listing video.</p>}
                {plan !== 'campus_partner' && (
                  <button
                    type="button"
                    onClick={() => navigate('/business/plan-select', { state: { forcePlans: true } })}
                    className="w-full border border-gold text-gold hover:bg-gold/10 font-bold py-2.5 rounded-xl transition-colors mt-3"
                  >
                    View upgrade options
                  </button>
                )}
              </section>

              <button
                onClick={handleSubmit}
                disabled={loading || uploading || uploadingVideo || !title || description.length < 20 || selectedUniversities.length === 0}
                className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {loading ? (editListing ? 'Saving...' : 'Submitting...') : (editListing ? 'Save Changes' : 'Post Listing')}
              </button>
              <p className="text-cream-muted text-xs text-center">You can review the details above before publishing.</p>
            </aside>
          </div>
        </main>
      </div>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
      <BottomNav />
    </>
  )
}
