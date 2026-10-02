import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ImagePlus, Plus, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ACCOMMODATION_PLANS, AccommodationPlanKey, AccommodationRoomPricing, completeBusinessProfileForCurrentUser, createAccommodationListing, getAccommodationListingsBySeller, getBusinessProfile, roomTypeLabel, startAccommodationPlanPayment, uploadAccommodationImage, uploadAccommodationVideo } from '../services/dataService'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'
import Navbar from '../components/common/Navbar'
import AddressAutocomplete from '../components/common/AddressAutocomplete'
import { compressImageForUpload, fileToBase64 } from '../services/imageCache'
import { getSubmissionReceipt, saveSubmissionReceipt, intakeRequest } from '../services/accommodationIntake'

const AMENITY_OPTIONS = [
  'Gym', '24hr study room', 'Wi-Fi', 'Laundry', 'Security', 'CCTV', 'Parking', 'Pool', 'Backup power', 'Common area', 'Cleaning service', 'Shuttle'
]

type RoomDraft = { id: number; sharing: string; bursary: number | null; nsfas: number | null; self_funded: number | null }

export default function AccommodationPostListing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, businessProfile, showToast, isLoadingAuth, isLoadingBusinessProfile, refreshBusinessProfile } = useApp()
  const [title, setTitle] = useState('')
  const [buildingCount, setBuildingCount] = useState('1')
  const [roomPricing, setRoomPricing] = useState<RoomDraft[]>([])
  const [buildingAddresses, setBuildingAddresses] = useState<string[]>([])
  const [address, setAddress] = useState(businessProfile?.physical_address || '')
  const [description, setDescription] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [otherAmenities, setOtherAmenities] = useState('')
  const [universitySearch, setUniversitySearch] = useState('')
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(businessProfile?.universities?.slice(0, 1) ?? [])
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [existingListings, setExistingListings] = useState<any[]>([])

  const [receipt] = useState(getSubmissionReceipt)
  const [submittedId, setSubmittedId] = useState<string | null>(receipt.id ?? null)
  const [showAccountPopup, setShowAccountPopup] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const requestedPlanParam = searchParams.get('plan')
  const requestedPlan: AccommodationPlanKey = requestedPlanParam === 'accommodation_featured' || requestedPlanParam === 'accommodation_premium' ? requestedPlanParam : 'accommodation_free'
  const isGuestSubmission = currentUser?.account_type !== 'business'
  const isSetupFlow = currentUser?.account_type === 'business' && searchParams.get('setup') === '1'
  const isSetupAccount = isSetupFlow && !businessProfile
  const isAccommodationAccount = currentUser?.account_type === 'business' && !!businessProfile?.is_accommodation
  const isLocalImageMode = isGuestSubmission || isSetupFlow
  const plan = (isSetupFlow ? requestedPlan : isGuestSubmission ? 'accommodation_free' : (businessProfile?.accommodation_plan ?? 'accommodation_free')) as AccommodationPlanKey
  const maxPhotos = plan === 'accommodation_free' ? 3 : plan === 'accommodation_featured' ? 12 : 30
  const maxUniversities = plan === 'accommodation_free' ? 1 : plan === 'accommodation_featured' ? 2 : 3
  const hasExistingListing = existingListings.length > 0
  const universityQuery = universitySearch.trim().toLowerCase()
  const availableUniversities = useMemo(() => SOUTH_AFRICAN_UNIVERSITIES.filter(u =>
    !universityQuery || u.toLowerCase().includes(universityQuery) || (UNIVERSITY_ALIASES[u] ?? []).some(a => a.toLowerCase().startsWith(universityQuery))
  ), [universityQuery])

  useEffect(() => {
    if (!currentUser || !businessProfile?.is_accommodation) return
    getAccommodationListingsBySeller(currentUser.id).then(setExistingListings).catch(() => setError('Could not check your existing property. Please refresh before submitting.'))
  }, [currentUser?.id, businessProfile?.is_accommodation])

  useEffect(() => {
    if (currentUser?.account_type === 'business' && businessProfile && !businessProfile.is_accommodation) navigate('/feed', { replace: true })
  }, [currentUser?.account_type, businessProfile, navigate])

  useEffect(() => {
    if (isSetupFlow && currentUser?.email) setEmail(currentUser.email)
  }, [isSetupFlow, currentUser?.email])

  useEffect(() => {
    if (searchParams.get('resume') !== '1' || !isAccommodationAccount) return
    try {
      const raw = sessionStorage.getItem('atriumx_pending_accommodation_draft')
      if (!raw) return
      const draft = JSON.parse(raw)
      setTitle(draft.title ?? '')
      setBuildingCount(String(draft.buildingCount ?? 1))
      setRoomPricing(draft.roomPricing ?? [])
      setBuildingAddresses(draft.buildingAddresses ?? [])
      setAddress(draft.address ?? '')
      setDescription(draft.description ?? '')
      const knownAmenities = new Set(AMENITY_OPTIONS)
      const allAmenities: string[] = Array.isArray(draft.amenities) ? draft.amenities : []
      setSelectedAmenities(allAmenities.filter(item => knownAmenities.has(item)))
      setOtherAmenities(allAmenities.filter(item => !knownAmenities.has(item)).join(', '))
      setSelectedUniversities(draft.universities ?? [])
      setImages(draft.imageUrls ?? [])
      setVideoUrl(draft.videoUrl ?? null)
    } catch {
      sessionStorage.removeItem('atriumx_pending_accommodation_draft')
    }
  }, [searchParams, isAccommodationAccount])

  if (isLoadingAuth || (currentUser?.account_type === 'business' && isLoadingBusinessProfile)) return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>

  const toggleAmenity = (amenity: string) => setSelectedAmenities(prev => prev.includes(amenity) ? prev.filter(item => item !== amenity) : [...prev, amenity])

  const toggleUniversity = (university: string) => {
    setError('')
    setSelectedUniversities(prev => prev.includes(university)
      ? prev.filter(item => item !== university)
      : prev.length < maxUniversities ? [...prev, university] : prev
    )
  }

  const addRoomType = () => {
    setRoomPricing(prev => {
      const used = new Set(prev.map(room => Number(room.sharing)))
      let next = 1
      while (used.has(next)) next += 1
      return [...prev, { id: prev.reduce((max, room) => Math.max(max, room.id), 0) + 1, sharing: String(next), bursary: null, nsfas: null, self_funded: null }]
    })
  }

  const updateRoomSharing = (id: number, value: string) => {
    setRoomPricing(prev => prev.map(room => room.id === id ? { ...room, sharing: value.replace(/[^0-9]/g, '') } : room))
  }

  const updateRoomPricing = (id: number, key: 'bursary' | 'nsfas' | 'self_funded', value: string) => {
    const amount = value.replace(/[^0-9]/g, '')
    setRoomPricing(prev => prev.map(room => room.id === id ? { ...room, [key]: amount ? Number(amount) : null } : room))
  }

  const removeRoomType = (id: number) => {
    setRoomPricing(prev => prev.filter(room => room.id !== id))
  }

  const updateBuildingAddress = (index: number, value: string) => {
    setBuildingAddresses(prev => {
      const next = [...prev]
      while (next.length <= index) next.push('')
      next[index] = value
      return next
    })
  }

  const handleVideoFile = async (file: File | undefined) => {
    if (!file || !currentUser || plan !== 'accommodation_premium') return
    setUploadingVideo(true)
    const { url, error: uploadError } = await uploadAccommodationVideo(file, currentUser.id)
    setUploadingVideo(false)
    if (uploadError || !url) { showToast(uploadError || 'Could not upload video.', 'error'); return }
    setVideoUrl(url)
  }

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || uploadingImages) return
    setUploadingImages(true)
    try {
      const picked = Array.from(files).slice(0, Math.max(0, maxPhotos - images.length))
      for (const file of picked) {
        if (isLocalImageMode) {
          const compressed = await compressImageForUpload(file)
          if (compressed.size > 512000 || !['image/jpeg','image/png','image/webp'].includes(compressed.type)) {
            setError('Use a smaller JPG, PNG or WebP photo (under 500 KB after compression).'); continue
          }
          const base64 = await fileToBase64(compressed)
          setImages(prev => [...prev, `data:${compressed.type};base64,${base64}`])
        } else if (currentUser) {
          const { url, error: uploadError } = await uploadAccommodationImage(file, currentUser.id)
          if (uploadError || !url) { showToast(uploadError || 'Could not upload image.', 'error'); continue }
          setImages(prev => [...prev, url])
        }
      }
    } catch { setError('Could not read this photo. Please try another image.') }
    finally { setUploadingImages(false) }
  }

  const handleSubmit = async () => {
    if (busy || uploadingImages) return
    setError('')
    const buildings = Number(buildingCount)
    const amenities = [...selectedAmenities, ...otherAmenities.split(',').map(s => s.trim()).filter(Boolean)]
    if (hasExistingListing) return setError('Your accommodation account already has a listing. Add all buildings to that listing instead of creating another one.')
    if (isGuestSubmission && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.')
    if ((isGuestSubmission || isSetupFlow) && !phone.trim()) return setError('Contact number is required.')
    if (isGuestSubmission && !consent) return setError('Please confirm you are authorised to submit these details.')
    if (!title.trim()) return setError('Property name is required.')
    if (!Number.isInteger(buildings) || buildings < 1 || buildings > 100) return setError('Enter a valid number of buildings.')
    if (!address.trim()) return setError('Property address is required.')
    if (!description.trim()) return setError('Description is required.')
    if (selectedUniversities.length === 0) return setError('Choose at least one university.')
    if (selectedUniversities.length > maxUniversities) return setError(`Your plan allows up to ${maxUniversities} universities.`)
    if (images.length > maxPhotos) return setError(`Your plan allows up to ${maxPhotos} photos.`)
    const rooms: AccommodationRoomPricing[] = []
    for (const room of roomPricing) {
      const sharing = Number(room.sharing)
      if (!Number.isSafeInteger(sharing) || sharing < 1) return setError('Enter how many students share each room type.')
      rooms.push({ room_type: sharing === 1 ? 'single' : `shared_${sharing}`, bursary: room.bursary, nsfas: room.nsfas, self_funded: room.self_funded })
    }
    if (new Set(rooms.map(room => room.room_type)).size !== rooms.length) return setError('Each room type can only be added once.')
    const extraAddresses = plan === 'accommodation_free' ? [] : buildingAddresses.slice(0, Math.max(buildings - 1, 0)).map(item => item.trim())

    setBusy(true)
    try {
      if (isGuestSubmission) {
        const result = await intakeRequest({action:'submit',receipt:receipt.receipt,email:email.trim(),phone:phone.trim(),website:website.trim(),consent,honeypot,
          property:{title:title.trim(),building_count:buildings,address:address.trim(),description:description.trim(),amenities,universities:selectedUniversities,room_pricing:rooms},
          photos:images.map(image=>({base64:image.split(',')[1]}))})
        if (result.error) { setError(result.error); return }
        if (!result.id) { setError('Could not confirm your submission. Please try again.'); return }
        saveSubmissionReceipt({receipt:receipt.receipt,id:result.id})
        setSubmittedId(result.id);setShowAccountPopup(true);return
      }
      if (!currentUser) return

      let publishedImages = images
      if (isSetupFlow) {
        if (isSetupAccount) {
          const { error: profileError } = await completeBusinessProfileForCurrentUser({
          userId: currentUser.id,
          businessName: title.trim(),
          businessType: 'Other',
          customBusinessType: 'Student accommodation',
          contactNumber: phone.trim(),
          physicalAddress: address.trim(),
          website: website.trim() || undefined,
          university: selectedUniversities[0],
            isAccommodation: true,
          })
          if (profileError) { setError(profileError); return }
          await refreshBusinessProfile()
        }

        const uploaded: string[] = []
        for (let index = 0; index < images.length; index += 1) {
          const image = images[index]
          if (!image.startsWith('data:')) { uploaded.push(image); continue }
          const blob = await fetch(image).then(response => response.blob())
          const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
          const file = new File([blob], `accommodation-${index + 1}.${extension}`, { type: blob.type || 'image/jpeg' })
          const { url, error: uploadError } = await uploadAccommodationImage(file, currentUser.id)
          if (uploadError || !url) { setError(uploadError || 'Could not upload a property photo.'); return }
          uploaded.push(url)
        }
        publishedImages = uploaded
        setImages(uploaded)

        if (plan !== 'accommodation_free') {
          sessionStorage.setItem('atriumx_pending_accommodation_draft', JSON.stringify({
            plan,
            title: title.trim(),
            buildingCount: buildings,
            roomPricing,
            buildingAddresses: extraAddresses,
            address: address.trim(),
            description: description.trim(),
            amenities,
            universities: selectedUniversities,
            imageUrls: publishedImages,
            videoUrl,
          }))
          const { error: paymentError } = await startAccommodationPlanPayment(plan)
          if (paymentError) {
            showToast(paymentError, 'error')
            navigate('/accommodation/plan-select', { replace: true })
          }
          return
        }
      }

      const { id, error: createError } = await createAccommodationListing({
        sellerId: currentUser.id,
        title: title.trim(),
        buildingCount: buildings,
        address: address.trim(),
        description: description.trim(),
        amenities,
        imageUrls: publishedImages,
        universities: selectedUniversities,
        planTier: plan,
        roomPricing: rooms,
        buildingAddresses: extraAddresses,
        videoUrl,
      })
      if (createError) { setError(createError); return }
      if (id) {
        sessionStorage.removeItem('atriumx_pending_accommodation_draft')
        await getBusinessProfile(currentUser.id)
        showToast('Accommodation listed.', 'success')
        navigate(`/accommodation/${id}`, { replace: true })
      }
    } catch { setError('Could not save your listing. Your form is kept; please try again.') }
    finally { setBusy(false) }
  }

  if (isGuestSubmission && submittedId) return <div className="min-h-screen bg-slate-deep"><Navbar /><main className="max-w-lg mx-auto px-4 py-12 text-cream space-y-5">
    <h1 className="font-serif text-3xl">Submission received</h1><p className="text-cream-muted">Your accommodation details are saved for review. Your listing will appear after approval. An account and payment are optional.</p>
    <p className="text-cream-muted text-xs">Reference: {submittedId}</p>
    <button onClick={() => navigate('/accommodation/claim')} className="bg-teal-primary text-white px-4 py-3 rounded-xl">Manage this submission</button>
    <button onClick={() => navigate('/')} className="block text-teal-light underline">Return home</button>
    {showAccountPopup && <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="submission-account-title" className="bg-slate-card border border-slate-border rounded-2xl p-6 max-w-md space-y-4">
      <h2 id="submission-account-title" className="text-cream text-xl font-bold">Manage your listing later?</h2><p className="text-cream-muted text-sm">Your submission is already saved. You can optionally create an accommodation account with the same email address, then link your listing after approval.</p>
      <button onClick={() => navigate('/retailer/signup?accommodation=1&submission=1')} className="w-full bg-teal-primary text-white font-bold py-3 rounded-xl">Create account</button>
      <button onClick={() => setShowAccountPopup(false)} className="w-full text-cream-muted py-2">Not now</button>
    </section></div>}
  </main></div>

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-7">
        <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream text-sm flex items-center gap-2 mb-5"><ArrowLeft size={17} /> Back</button>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div><p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Accommodation listing</p><h1 className="font-serif text-3xl text-cream">Add your property</h1><p className="text-cream-muted text-sm mt-2">One listing represents all of your buildings. Room pricing is optional and can be shown by room type.</p></div>
          <button type="button" onClick={() => navigate('/accommodation/plan-select')} className="text-teal-light text-sm underline">Upgrade (optional)</button>
          <span className="text-cream font-bold text-sm bg-slate-card border border-slate-border px-3 py-2 rounded-xl">{ACCOMMODATION_PLANS[plan].label}</span>
        </div>

        <div className="space-y-5">
          {(isGuestSubmission || isSetupFlow) && <section className="bg-slate-card border border-slate-border rounded-2xl p-5 space-y-4"><h2 className="text-cream font-bold">Provider contact details</h2><p className="text-cream-muted text-sm">{isSetupFlow ? 'Your login is ready. Finish these listing details and they will become your accommodation account details.' : 'Submit free without an account. We review the property before publishing it.'}</p>
            <label className="block text-cream-muted text-sm">Email address (private)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} readOnly={isSetupFlow} maxLength={254} className="block w-full mt-1 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream disabled:opacity-70" /></label>
            <label className="block text-cream-muted text-sm">Contact number (shown after approval)<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} className="block w-full mt-1 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream" /></label>
            <label className="block text-cream-muted text-sm">Website (optional)<input value={website} onChange={e=>setWebsite(e.target.value)} maxLength={500} placeholder="https://" className="block w-full mt-1 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream" /></label>
            {isGuestSubmission && <input value={honeypot} onChange={e=>setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />}
          </section>}

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <h2 className="text-cream font-bold text-base mb-4">Property details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Accommodation name" className="w-full sm:col-span-2 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              <div>
                <label className="block text-cream-muted text-xs font-semibold mb-1.5">Number of buildings</label>
                <input value={buildingCount} onChange={e => setBuildingCount(e.target.value.replace(/[^0-9]/g, ''))} min="1" type="number" inputMode="numeric" placeholder="e.g. 3" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              </div>
              <AddressAutocomplete value={address} onChange={setAddress} placeholder="Property address" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light self-end" />
              {plan !== 'accommodation_free' && Number(buildingCount) > 1 && (
                <div className="sm:col-span-2 space-y-3">
                  <p className="text-cream-muted text-xs">Optional. Add an address for each additional building. The address above counts as building 1.</p>
                  {Array.from({ length: Number(buildingCount) - 1 }, (_, i) => (
                    <AddressAutocomplete key={i} value={buildingAddresses[i] ?? ''} onChange={value => updateBuildingAddress(i, value)} placeholder={`Building ${i + 2} address (optional)`} />
                  ))}
                </div>
              )}
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the property for students" rows={5} className="w-full sm:col-span-2 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-y" />
            </div>
            {hasExistingListing && <p className="text-amber-300 text-xs mt-4">You already have an accommodation listing. Your provider is limited to one listing so all of your buildings belong in that listing.</p>}
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h2 className="text-cream font-bold text-base">Room pricing</h2><p className="text-cream-muted text-xs mt-1">Optional. Add only the room types and funding prices you want students to see.</p></div>
              <button type="button" onClick={addRoomType} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold disabled:opacity-40"><Plus size={14} /> Add room type</button>
            </div>
            {roomPricing.length === 0 ? (
              <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-8 text-center">No room pricing added. This section is optional.</p>
            ) : (
              <div className="space-y-4">
                {roomPricing.map(room => {
                  const label = room.sharing ? roomTypeLabel(Number(room.sharing) === 1 ? 'single' : `shared_${Number(room.sharing)}`) : 'Room type'
                  return (
                    <div key={room.id} className="border border-slate-border rounded-2xl p-4">
                      <div className="flex items-end justify-between gap-3 mb-3">
                        <div className="flex items-end gap-3">
                          <label className="text-xs text-cream-muted">How many share<input value={room.sharing} onChange={e => updateRoomSharing(room.id, e.target.value)} placeholder="e.g. 4" inputMode="numeric" className="mt-1.5 w-24 block bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" /></label>
                          <p className="text-cream font-bold text-sm pb-2.5">{label}</p>
                        </div>
                        <button type="button" onClick={() => removeRoomType(room.id)} className="text-cream-muted hover:text-cream pb-2.5" aria-label={`Remove ${label} pricing`}><X size={16} /></button>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <label className="text-xs text-cream-muted">Bursary<input value={room.bursary ?? ''} onChange={e => updateRoomPricing(room.id, 'bursary', e.target.value)} placeholder="Optional" inputMode="numeric" className="mt-1.5 w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" /></label>
                        <label className="text-xs text-cream-muted">NSFAS<input value={room.nsfas ?? ''} onChange={e => updateRoomPricing(room.id, 'nsfas', e.target.value)} placeholder="Optional" inputMode="numeric" className="mt-1.5 w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" /></label>
                        <label className="text-xs text-cream-muted">Self-funded<input value={room.self_funded ?? ''} onChange={e => updateRoomPricing(room.id, 'self_funded', e.target.value)} placeholder="Optional" inputMode="numeric" className="mt-1.5 w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" /></label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-cream font-bold text-base">Universities</h2><span className="text-cream-muted text-xs">Up to {maxUniversities}</span></div>
            <input value={universitySearch} onChange={e => setUniversitySearch(e.target.value)} placeholder="Search for a university" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light mb-3" />
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableUniversities.map(u => {
                const selected = selectedUniversities.includes(u)
                const disabled = !selected && selectedUniversities.length >= maxUniversities
                return <button key={u} onClick={() => toggleUniversity(u)} disabled={disabled} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${selected ? 'bg-teal-faint border-teal-light text-teal-light' : 'bg-slate-deep border-slate-border text-cream-muted hover:text-cream'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>{selected && <Check size={12} className="inline mr-1" />}{u}</button>
              })}
            </div>
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <h2 className="text-cream font-bold text-base mb-1">What does it offer?</h2>
            <p className="text-cream-muted text-xs mb-4">Choose what students can expect at the property.</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {AMENITY_OPTIONS.map(amenity => <button key={amenity} onClick={() => toggleAmenity(amenity)} className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold ${selectedAmenities.includes(amenity) ? 'bg-teal-faint border-teal-light text-teal-light' : 'bg-slate-deep border-slate-border text-cream-muted'}`}>{selectedAmenities.includes(amenity) ? '✓ ' : ''}{amenity}</button>)}
            </div>
            <input value={otherAmenities} onChange={e => setOtherAmenities(e.target.value)} placeholder="Other amenities, separated by commas" className="mt-3 w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          </section>


          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h2 className="text-cream font-bold text-base">Property video</h2><p className="text-cream-muted text-xs mt-1">Optional. A video can be added on the Premium plan and will be kept with your accommodation listing.</p></div>
              {plan === 'accommodation_premium' ? (
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold">Add video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => handleVideoFile(e.target.files?.[0])} disabled={uploadingVideo} className="hidden" /></label>
              ) : <span className="text-cream-muted text-xs bg-slate-deep border border-slate-border px-3 py-2 rounded-xl">Premium only</span>}
            </div>
            {plan !== 'accommodation_premium' ? (
              <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-6 px-4 text-center">Video uploads are available on the Premium accommodation plan. This is optional.</p>
            ) : videoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-border bg-black">
                <video src={videoUrl} controls className="w-full max-h-80 object-contain" />
                <button type="button" onClick={() => setVideoUrl(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center" aria-label="Remove property video"><X size={15} /></button>
              </div>
            ) : (
              <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-6 px-4 text-center">No video added. This is optional.</p>
            )}
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4"><div><h2 className="text-cream font-bold text-base">Property photos</h2><p className="text-cream-muted text-xs mt-1">Up to {maxPhotos} photos on your plan.</p></div><label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold"><ImagePlus size={15} /> Add photos<input type="file" accept="image/*" multiple onChange={e => handleImageFiles(e.target.files)} disabled={uploadingImages || busy} className="hidden" /></label></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map(url => <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-deep"><img src={url} alt="" className="w-full h-full object-cover" /><button onClick={() => setImages(prev => prev.filter(item => item !== url))} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={14} /></button></div>)}
              {images.length === 0 && <div className="col-span-full py-10 text-center text-cream-muted text-xs border border-dashed border-slate-border rounded-xl">No photos added yet.</div>}
            </div>
          </section>

          {isGuestSubmission && <label className="flex gap-3 text-cream-muted text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1"/><span>I am authorised to submit this property, and agree to have its details, photos and contact number published after review. My email stays private.</span></label>}
          {uploadingImages && <p className="text-cream-muted text-sm">Preparing photos...</p>}
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleSubmit} disabled={busy || uploadingImages || uploadingVideo || hasExistingListing} className="w-full bg-teal-primary hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl">{busy ? 'Saving...' : hasExistingListing ? 'Accommodation listing already created' : isGuestSubmission ? 'Submit for review — free' : isSetupFlow && plan !== 'accommodation_free' ? 'Continue to payment' : 'Publish accommodation'}</button>
        </div>
      </main>
    </div>
  )
}
