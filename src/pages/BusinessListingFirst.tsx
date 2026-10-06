import { useMemo, useRef, useState } from 'react'
import { ImagePlus, Video, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  createListing,
  PLAN_TIERS,
  registerBusinessWithEmail,
  startPlanPayment,
  uploadListingImage,
  uploadBusinessVideo,
} from '../services/dataService'
import type { Profile } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import ImageCropModal from '../components/common/ImageCropModal'
import AddressAutocomplete from '../components/common/AddressAutocomplete'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'
import { BUSINESS_TYPES } from './RetailerSignup'

type BusinessPlanKey = 'noticeboard' | 'featured' | 'campus_partner'

const isBusinessPlan = (value: string | null): value is BusinessPlanKey =>
  value === 'noticeboard' || value === 'featured' || value === 'campus_partner'

export default function BusinessListingFirst() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setCurrentUser, showToast } = useApp()
  const initialPlan = isBusinessPlan(searchParams.get('plan')) ? searchParams.get('plan') as BusinessPlanKey : 'noticeboard'

  const [plan, setPlan] = useState<BusinessPlanKey>(initialPlan)
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [customType, setCustomType] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [universitySearch, setUniversitySearch] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [createdUser, setCreatedUser] = useState<Profile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const tier = PLAN_TIERS[plan]
  const maxUniversities = tier.maxUniversities
  const maxPhotos = tier.maxPhotos
  const universityQuery = universitySearch.trim().toLowerCase()
  const universityOptions = useMemo(() => SOUTH_AFRICAN_UNIVERSITIES.filter(university =>
    !universityQuery ||
    university.toLowerCase().includes(universityQuery) ||
    (UNIVERSITY_ALIASES[university] ?? []).some(alias => alias.toLowerCase().startsWith(universityQuery))
  ), [universityQuery])
  const inputClass = 'w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors'

  const choosePlan = (nextPlan: BusinessPlanKey) => {
    setPlan(nextPlan)
    setError('')
    const nextTier = PLAN_TIERS[nextPlan]
    setSelectedUniversities(previous => previous.slice(0, nextTier.maxUniversities))
    setImages(previous => previous.slice(0, nextTier.maxPhotos))
    if (nextPlan !== 'campus_partner') {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      setVideoFile(null)
      setVideoPreview(null)
      setVideoUrl(null)
    }
  }

  const toggleUniversity = (university: string) => {
    setError('')
    if (selectedUniversities.includes(university)) {
      setSelectedUniversities(previous => previous.filter(item => item !== university))
      return
    }
    if (selectedUniversities.length >= maxUniversities) {
      setError(`${tier.label} allows up to ${maxUniversities} universit${maxUniversities === 1 ? 'y' : 'ies'}.`)
      return
    }
    setSelectedUniversities(previous => [...previous, university])
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || images.length >= maxPhotos) return
    setCropSrc(URL.createObjectURL(file))
  }

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleCropConfirm = (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (fileRef.current) fileRef.current.value = ''
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setImages(previous => [...previous, reader.result as string].slice(0, maxPhotos))
    }
    reader.readAsDataURL(blob)
  }

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || plan !== 'campus_partner') return
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setVideoUrl(null)
  }

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview(null)
    setVideoUrl(null)
  }

  const validateListing = () => {
    if (!businessName.trim()) return 'Business name is required.'
    if (!businessType) return 'Select a business type.'
    if (businessType === 'Other' && !customType.trim()) return 'Please specify your business type.'
    if (!contactNumber.trim()) return 'Contact number is required.'
    if (!physicalAddress.trim() && !website.trim()) return 'Add a physical address or website so students can find your business outside AtriumX.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.'
    if (!title.trim()) return 'Give your listing a name.'
    if (description.trim().length < 20) return 'Description needs at least 20 characters.'
    if (selectedUniversities.length === 0) return 'Choose at least one university.'
    if (selectedUniversities.length > maxUniversities) return `${tier.label} allows up to ${maxUniversities} universit${maxUniversities === 1 ? 'y' : 'ies'}.`
    if (images.length > maxPhotos) return `${tier.label} allows up to ${maxPhotos} photo${Number(maxPhotos) === 1 ? '' : 's'}.`
    return null
  }

  const continueToPassword = () => {
    setError('')
    const validationError = validateListing()
    if (validationError) return setError(validationError)
    setShowPassword(true)
  }

  const finishAccountAndListing = async () => {
    setError('')
    const validationError = validateListing()
    if (validationError) return setError(validationError)
    if (password.length < 8) return setError('Password must be at least 8 characters.')

    setBusy(true)
    try {
      let user = createdUser
      if (!user) {
        const { user: registeredUser, error: registrationError } = await registerBusinessWithEmail(
          email.trim(),
          password,
          businessName.trim(),
          businessType,
          businessType === 'Other' ? customType.trim() : undefined,
          contactNumber.trim(),
          physicalAddress.trim() || undefined,
          website.trim() || undefined,
          selectedUniversities[0],
          false
        )
        if (registrationError || !registeredUser) { setError(registrationError || 'Could not create your account.'); return }
        user = registeredUser
        setCreatedUser(registeredUser)
      }

      const uploadedImages: string[] = []
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index]
        if (!image.startsWith('data:')) { uploadedImages.push(image); continue }
        const blob = await fetch(image).then(response => response.blob())
        const file = new File([blob], `business-listing-${index + 1}.jpg`, { type: blob.type || 'image/jpeg' })
        const { url, error: uploadError } = await uploadListingImage(file, user.id)
        if (uploadError || !url) { setError(uploadError || 'Could not upload a listing photo.'); return }
        uploadedImages.push(url)
      }
      setImages(uploadedImages)

      let uploadedVideoUrl = videoUrl
      if (plan === 'campus_partner' && videoFile && !uploadedVideoUrl) {
        const { url, error: videoError } = await uploadBusinessVideo(videoFile, user.id)
        if (videoError || !url) { setError(videoError || 'Could not upload the listing video.'); return }
        uploadedVideoUrl = url
        setVideoUrl(url)
      }

      const draft = {
        plan,
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        isNegotiable,
        imageUrls: uploadedImages,
        videoUrl: uploadedVideoUrl,
        universities: selectedUniversities,
      }

      if (plan !== 'noticeboard') {
        sessionStorage.setItem('atriumx_pending_business_draft', JSON.stringify(draft))
        const { error: paymentError } = await startPlanPayment(plan)
        if (paymentError) {
          setCurrentUser(user)
          showToast(paymentError, 'error')
          navigate('/business/plan-select', { state: { forcePlans: true }, replace: true })
        }
        return
      }

      const { id, error: listingError } = await createListing({
        sellerId: user.id,
        title: draft.title,
        description: draft.description,
        price: draft.price,
        category: businessType,
        customCategory: businessType === 'Other' ? customType.trim() : undefined,
        imageUrls: uploadedImages,
        videoUrl: uploadedVideoUrl || undefined,
        residence: '',
        listingType: 'ongoing',
        isNegotiable,
        planTier: 'noticeboard',
        variants: [],
        universities: selectedUniversities,
      })
      if (listingError) { setError(listingError); return }
      sessionStorage.removeItem('atriumx_pending_business_draft')
      setCurrentUser(user)
      navigate(id ? `/listing/${id}` : '/feed', { replace: true })
    } catch {
      setError('Could not finish your account and listing. Your form is still here, so please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-6 pb-28">
          <h1 className="font-serif text-3xl text-cream mb-2">Create your business listing</h1>
          <p className="text-cream-muted text-sm mb-6">Add the business and listing details first. When you are done, create one password to manage everything later.</p>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5 mb-5">
            <h2 className="text-cream font-bold mb-3">Choose how your listing appears</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              {(['noticeboard', 'featured', 'campus_partner'] as BusinessPlanKey[]).map(key => (
                <button key={key} type="button" onClick={() => choosePlan(key)} className={`rounded-xl border p-3 text-left ${plan === key ? 'border-teal-light bg-teal-faint' : 'border-slate-border bg-slate-deep'}`}>
                  <span className="block text-cream text-sm font-bold">{PLAN_TIERS[key].label}</span>
                  <span className="block text-cream-muted text-xs mt-1">{PLAN_TIERS[key].price}{key === 'noticeboard' ? ' / 7 days' : ' / 30 days'}</span>
                </button>
              ))}
            </div>
            <p className="text-cream-muted text-xs mt-3">{tier.label}: up to {maxUniversities} universit{maxUniversities === 1 ? 'y' : 'ies'}, {maxPhotos} photos{plan === 'campus_partner' ? ', and 1 optional video' : ''}.</p>
          </section>

          <div className="space-y-5">
            <section className="bg-slate-card border border-slate-border rounded-2xl p-5 space-y-4">
              <h2 className="text-cream font-bold">Business details</h2>
              <input value={businessName} onChange={event => setBusinessName(event.target.value)} placeholder="Business name" className={inputClass} />
              <select value={businessType} onChange={event => setBusinessType(event.target.value)} className={inputClass}>
                <option value="" disabled>Select business type</option>
                {BUSINESS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              {businessType === 'Other' && <input value={customType} onChange={event => setCustomType(event.target.value)} placeholder="Specify business type" className={inputClass} />}
              <input type="tel" value={contactNumber} onChange={event => setContactNumber(event.target.value)} placeholder="Contact number" className={inputClass} />
              <AddressAutocomplete value={physicalAddress} onChange={setPhysicalAddress} placeholder="Physical address" />
              <input value={website} onChange={event => setWebsite(event.target.value)} placeholder="Website (optional)" className={inputClass} />
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" className={inputClass} />
            </section>

            <section className="bg-slate-card border border-slate-border rounded-2xl p-5 space-y-4">
              <h2 className="text-cream font-bold">Listing details</h2>
              <div>
                <div className="flex justify-between items-center mb-2"><span className="text-cream-muted text-xs font-bold uppercase tracking-wide">Photos</span><span className="text-cream-muted text-xs">{images.length}/{maxPhotos}</span></div>
                <div className="flex gap-2 flex-wrap">
                  {images.map((image, index) => <div key={`${index}-${image.slice(-12)}`} className="relative w-20 h-20 rounded-xl overflow-hidden"><img src={image} alt="" className="w-full h-full object-cover" /><button type="button" onClick={() => setImages(previous => previous.filter((_, itemIndex) => itemIndex !== index))} className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"><X size={12} /></button></div>)}
                  {images.length < maxPhotos && <button type="button" onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-xl border border-dashed border-slate-border text-cream-muted flex items-center justify-center"><ImagePlus size={20} /></button>}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>
              </div>

              {plan === 'campus_partner' && (
                <div className="border-t border-slate-border pt-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <span className="text-cream-muted text-xs font-bold uppercase tracking-wide">Video</span>
                      <p className="text-cream-muted text-xs mt-1">Campus Partner includes one optional listing video.</p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold">
                      <Video size={15} /> {videoFile || videoUrl ? 'Replace video' : 'Add video'}
                      <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoSelect} className="hidden" />
                    </label>
                  </div>
                  {videoPreview || videoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-border bg-black">
                      <video src={videoPreview || videoUrl || undefined} controls className="w-full max-h-52 object-contain" />
                      <button type="button" onClick={removeVideo} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center" aria-label="Remove listing video"><X size={15} /></button>
                    </div>
                  ) : (
                    <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-4 px-4 text-center">No video added. This is optional.</p>
                  )}
                </div>
              )}
              <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Listing name" className={inputClass} />
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-muted text-sm font-bold">R</span><input type="number" min="0" value={price} onChange={event => setPrice(event.target.value)} placeholder="Starting price (optional)" className={`${inputClass} pl-8`} /></div>
              <button type="button" onClick={() => setIsNegotiable(value => !value)} className={`w-fit text-xs px-3 py-2 rounded-xl border ${isNegotiable ? 'bg-gold/10 text-gold border-gold/40' : 'text-cream-muted border-slate-border'}`}>{isNegotiable ? '✓ Open to offers' : 'Mark as open to offers'}</button>
              <textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={500} rows={4} placeholder="What are you offering? Include anything students should know." className={`${inputClass} resize-none`} />

              <div>
                <div className="flex justify-between mb-2"><span className="text-cream-muted text-xs font-bold uppercase tracking-wide">Universities</span><span className="text-cream-muted text-xs">Up to {maxUniversities}</span></div>
                <input value={universitySearch} onChange={event => setUniversitySearch(event.target.value)} placeholder="Search for a university" className={inputClass} />
                <div className="mt-2 flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {universityOptions.map(university => {
                    const selected = selectedUniversities.includes(university)
                    const disabled = !selected && selectedUniversities.length >= maxUniversities
                    return <button key={university} type="button" disabled={disabled} onClick={() => toggleUniversity(university)} className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${selected ? 'border-teal-light bg-teal-faint text-cream' : 'border-slate-border bg-slate-deep text-cream'} ${disabled ? 'opacity-40' : ''}`}>{selected ? '✓ ' : ''}{university}</button>
                  })}
                </div>
              </div>
            </section>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="button" onClick={continueToPassword} className="w-full bg-ember hover:bg-ember-dark text-white font-bold py-3.5 rounded-xl">Finish listing</button>
          </div>
        </main>
      </div>

      {showPassword && <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
        <section role="dialog" aria-modal="true" className="w-full max-w-md bg-slate-card border border-slate-border rounded-2xl p-6">
          <h2 className="text-cream text-xl font-bold">Create your password</h2>
          <p className="text-cream-muted text-sm mt-2 mb-5">Your business and listing details are ready. Create one password so you can sign in and update them later.</p>
          <p className="text-cream-muted text-xs mb-2">Account email: {email.trim()}</p>
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" className={inputClass} />
          <p className="text-cream-muted text-xs mt-2">Use at least 8 characters.</p>
          {plan !== 'noticeboard' && <p className="text-cream-muted text-xs mt-3">After the account is created, you will continue to secure payment for the {tier.label} plan. Your listing draft will be kept.</p>}
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => setShowPassword(false)} disabled={busy} className="flex-1 border border-slate-border text-cream py-3 rounded-xl">Back</button>
            <button type="button" onClick={finishAccountAndListing} disabled={busy} className="flex-1 bg-ember text-white font-bold py-3 rounded-xl disabled:opacity-50">{busy ? 'Creating...' : plan === 'noticeboard' ? 'Create account & publish' : 'Create account & continue'}</button>
          </div>
        </section>
      </div>}

      {cropSrc && <ImageCropModal imageSrc={cropSrc} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />}
    </>
  )
}
