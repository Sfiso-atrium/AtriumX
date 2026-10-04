import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ImagePlus, Plus, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  ACCOMMODATION_PLANS,
  AccommodationListing,
  AccommodationPlanKey,
  AccommodationRoomPricing,
  getAccommodationListingById,
  roomTypeLabel,
  updateAccommodationListing,
  uploadAccommodationImage,
  uploadAccommodationVideo,
} from '../services/dataService'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'
import Navbar from '../components/common/Navbar'
import AddressAutocomplete from '../components/common/AddressAutocomplete'

const AMENITY_OPTIONS = [
  'Gym', '24hr study room', 'Wi-Fi', 'Laundry', 'Security', 'CCTV', 'Parking', 'Pool', 'Backup power', 'Common area', 'Cleaning service', 'Shuttle'
]

type RoomDraft = { id: number; sharing: string; bursary: number | null; nsfas: number | null; self_funded: number | null }

function sharingFromRoomType(roomType: string) {
  if (roomType === 'single') return '1'
  const value = Number(roomType.replace('shared_', ''))
  return Number.isSafeInteger(value) && value > 0 ? String(value) : '2'
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const a = [...left].sort()
  const b = [...right].sort()
  return a.every((value, index) => value === b[index])
}

export default function AccommodationEditListing() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, businessProfile, isLoadingAuth, isLoadingBusinessProfile, showToast } = useApp()
  const [listing, setListing] = useState<AccommodationListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [buildingCount, setBuildingCount] = useState('1')
  const [roomPricing, setRoomPricing] = useState<RoomDraft[]>([])
  const [buildingAddresses, setBuildingAddresses] = useState<string[]>([])
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [otherAmenities, setOtherAmenities] = useState('')
  const [universitySearch, setUniversitySearch] = useState('')
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const originalUniversities = useRef<string[]>([])
  const originalImageUrls = useRef<string[]>([])

  const plan = (businessProfile?.accommodation_plan ?? 'accommodation_free') as AccommodationPlanKey
  const maxPhotos = plan === 'accommodation_free' ? 3 : plan === 'accommodation_featured' ? 12 : 30
  const maxUniversities = plan === 'accommodation_free' ? 1 : plan === 'accommodation_featured' ? 2 : 3
  const universityQuery = universitySearch.trim().toLowerCase()
  const availableUniversities = useMemo(() => SOUTH_AFRICAN_UNIVERSITIES.filter(u =>
    !universityQuery || u.toLowerCase().includes(universityQuery) || (UNIVERSITY_ALIASES[u] ?? []).some(a => a.toLowerCase().startsWith(universityQuery))
  ), [universityQuery])

  useEffect(() => {
    if (isLoadingAuth || isLoadingBusinessProfile) return
    if (!currentUser) {
      navigate('/retailer/signup?mode=login&accommodation=1', { replace: true })
      return
    }
    if (currentUser.account_type !== 'business' || !businessProfile?.is_accommodation) {
      navigate('/accommodation', { replace: true })
      return
    }
    if (!id) {
      navigate(`/profile/${currentUser.id}`, { replace: true })
      return
    }

    setLoading(true)
    getAccommodationListingById(id, currentUser.id)
      .then(item => {
        if (!item || item.seller_id !== currentUser.id || item.guest_submission) {
          setError('You can only edit an accommodation listing linked to your account.')
          return
        }

        setListing(item)
        setTitle(item.title)
        setBuildingCount(String(item.building_count || 1))
        setBuildingAddresses(item.building_addresses || [])
        setAddress(item.address || '')
        setDescription(item.description || '')
        const knownAmenities = new Set(AMENITY_OPTIONS)
        const amenities = item.amenities || []
        setSelectedAmenities(amenities.filter(value => knownAmenities.has(value)))
        setOtherAmenities(amenities.filter(value => !knownAmenities.has(value)).join(', '))
        setSelectedUniversities(item.universities || [])
        setImages(item.image_urls || [])
        setVideoUrl(item.video_url || null)
        setRoomPricing((item.room_pricing || []).map((room, index) => ({
          id: index + 1,
          sharing: sharingFromRoomType(room.room_type),
          bursary: room.bursary,
          nsfas: room.nsfas,
          self_funded: room.self_funded,
        })))
        originalUniversities.current = [...(item.universities || [])]
        originalImageUrls.current = [...(item.image_urls || [])]
      })
      .catch(() => setError('Could not load this accommodation listing. Please try again.'))
      .finally(() => setLoading(false))
  }, [id, currentUser?.id, currentUser?.account_type, businessProfile?.is_accommodation, isLoadingAuth, isLoadingBusinessProfile, navigate])

  const toggleAmenity = (amenity: string) => setSelectedAmenities(previous => previous.includes(amenity)
    ? previous.filter(item => item !== amenity)
    : [...previous, amenity])

  const toggleUniversity = (university: string) => {
    setError('')
    setSelectedUniversities(previous => previous.includes(university)
      ? previous.filter(item => item !== university)
      : previous.length < maxUniversities ? [...previous, university] : previous)
  }

  const addRoomType = () => {
    setRoomPricing(previous => {
      const used = new Set(previous.map(room => Number(room.sharing)))
      let next = 1
      while (used.has(next)) next += 1
      return [...previous, { id: previous.reduce((max, room) => Math.max(max, room.id), 0) + 1, sharing: String(next), bursary: null, nsfas: null, self_funded: null }]
    })
  }

  const updateRoomSharing = (roomId: number, value: string) => {
    setRoomPricing(previous => previous.map(room => room.id === roomId ? { ...room, sharing: value.replace(/[^0-9]/g, '') } : room))
  }

  const updateRoomPricing = (roomId: number, key: 'bursary' | 'nsfas' | 'self_funded', value: string) => {
    const amount = value.replace(/[^0-9]/g, '')
    setRoomPricing(previous => previous.map(room => room.id === roomId ? { ...room, [key]: amount ? Number(amount) : null } : room))
  }

  const updateBuildingAddress = (index: number, value: string) => {
    setBuildingAddresses(previous => {
      const next = [...previous]
      while (next.length <= index) next.push('')
      next[index] = value
      return next
    })
  }

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || !currentUser || uploadingImages) return
    const original = new Set(originalImageUrls.current)
    const retainedOriginal = images.filter(url => original.has(url)).length
    const alreadyAdded = images.filter(url => !original.has(url)).length
    const availableSlots = Math.max(0, maxPhotos - Math.min(retainedOriginal, maxPhotos) - alreadyAdded)
    if (availableSlots === 0) {
      setError(`Your ${ACCOMMODATION_PLANS[plan].label} plan currently allows up to ${maxPhotos} public photos. Existing saved photos are preserved, but add-ons require room within the current plan.`)
      return
    }

    setUploadingImages(true)
    setError('')
    try {
      for (const file of Array.from(files).slice(0, availableSlots)) {
        const upload = await uploadAccommodationImage(file, currentUser.id)
        if (upload.error || !upload.url) {
          setError(upload.error || 'Could not upload a property photo.')
          break
        }
        setImages(previous => [...previous, upload.url!])
      }
    } finally {
      setUploadingImages(false)
    }
  }

  const handleVideoFile = async (file: File | undefined) => {
    if (!file || !currentUser || plan !== 'accommodation_premium') return
    setUploadingVideo(true)
    setError('')
    const upload = await uploadAccommodationVideo(file, currentUser.id)
    setUploadingVideo(false)
    if (upload.error || !upload.url) {
      setError(upload.error || 'Could not upload the property video.')
      return
    }
    setVideoUrl(upload.url)
  }

  const handleSave = async () => {
    if (!listing || !currentUser || busy || uploadingImages || uploadingVideo) return
    setError('')

    const buildings = Number(buildingCount)
    const amenities = [...selectedAmenities, ...otherAmenities.split(',').map(item => item.trim()).filter(Boolean)]
    const universitiesChanged = !sameStringSet(originalUniversities.current, selectedUniversities)
    const universitiesToSave = universitiesChanged ? selectedUniversities : originalUniversities.current

    if (!title.trim()) return setError('Property name is required.')
    if (!Number.isInteger(buildings) || buildings < 1 || buildings > 100) return setError('Enter a valid number of buildings.')
    if (!address.trim()) return setError('Property address is required.')
    if (!description.trim()) return setError('Description is required.')
    if (selectedUniversities.length === 0) return setError('Choose at least one university.')
    if (universitiesChanged && selectedUniversities.length > maxUniversities) return setError(`Your current plan allows up to ${maxUniversities} universities when changing university reach.`)

    const original = new Set(originalImageUrls.current)
    const newlyAddedPhotos = images.filter(url => !original.has(url)).length
    const retainedOriginalPhotos = images.filter(url => original.has(url)).length
    const availableNewPhotoSlots = Math.max(0, maxPhotos - Math.min(retainedOriginalPhotos, maxPhotos))
    if (newlyAddedPhotos > availableNewPhotoSlots) return setError(`Your current plan allows up to ${maxPhotos} public photos.`)

    const rooms: AccommodationRoomPricing[] = []
    for (const room of roomPricing) {
      const sharing = Number(room.sharing)
      if (!Number.isSafeInteger(sharing) || sharing < 1) return setError('Enter how many students share each room type.')
      rooms.push({
        room_type: sharing === 1 ? 'single' : `shared_${sharing}`,
        bursary: room.bursary,
        nsfas: room.nsfas,
        self_funded: room.self_funded,
      })
    }
    if (new Set(rooms.map(room => room.room_type)).size !== rooms.length) return setError('Each room type can only be added once.')

    const extraAddresses = (plan === 'accommodation_free' ? listing.building_addresses : buildingAddresses)
      .slice(0, Math.max(buildings - 1, 0))
      .map(item => item.trim())

    setBusy(true)
    try {
      const result = await updateAccommodationListing({
        listingId: listing.id,
        sellerId: currentUser.id,
        title: title.trim(),
        buildingCount: buildings,
        address: address.trim(),
        description: description.trim(),
        amenities,
        imageUrls: images,
        universities: universitiesToSave,
        roomPricing: rooms,
        videoUrl,
        buildingAddresses: extraAddresses,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      showToast('Accommodation listing updated.', 'success')
      navigate(`/accommodation/${listing.id}`, { replace: true })
    } catch {
      setError('Could not update your listing. Your changes are still on this page; please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (isLoadingAuth || isLoadingBusinessProfile || loading) {
    return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-red-400 text-sm">{error || 'Accommodation listing not found.'}</p>
          <button onClick={() => navigate(currentUser ? `/profile/${currentUser.id}` : '/accommodation')} className="mt-4 text-teal-light underline">Back to accommodation</button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-7">
        <button onClick={() => navigate(`/accommodation/${listing.id}`)} className="text-cream-muted hover:text-cream text-sm flex items-center gap-2 mb-5"><ArrowLeft size={17} /> Back to listing</button>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Accommodation management</p>
            <h1 className="font-serif text-3xl text-cream">Edit your listing</h1>
            <p className="text-cream-muted text-sm mt-2">Update the property students see. Existing content above a downgraded plan limit is preserved unless you remove it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-cream font-bold text-sm bg-slate-card border border-slate-border px-3 py-2 rounded-xl">{ACCOMMODATION_PLANS[plan].label}</span>
            {plan !== 'accommodation_premium' && (
              <button type="button" onClick={() => navigate('/accommodation/plan-select')} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm">
                Upgrade plan
              </button>
            )}
          </div>
        </div>

        {listing.report_required_field && listing.report_edit_deadline_at && (
          <div className="mb-5 bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <p className="text-red-300 text-sm font-bold">Admin correction still required</p>
            <p className="text-cream-muted text-xs mt-1">The correction deadline only clears when the field requested by admin is actually changed. You can still edit the rest of the listing here.</p>
          </div>
        )}

        <div className="space-y-5">
          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <h2 className="text-cream font-bold text-base mb-4">Property details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Accommodation name" className="w-full sm:col-span-2 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              <div>
                <label className="block text-cream-muted text-xs font-semibold mb-1.5">Number of buildings</label>
                <input value={buildingCount} onChange={event => setBuildingCount(event.target.value.replace(/[^0-9]/g, ''))} min="1" type="number" inputMode="numeric" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm focus:outline-none focus:border-teal-light" />
              </div>
              <AddressAutocomplete value={address} onChange={setAddress} placeholder="Property address" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light self-end" />
              {plan !== 'accommodation_free' && Number(buildingCount) > 1 && (
                <div className="sm:col-span-2 space-y-3">
                  <p className="text-cream-muted text-xs">Optional additional building addresses. The main address above counts as building 1.</p>
                  {Array.from({ length: Math.max(Number(buildingCount) - 1, 0) }, (_, index) => (
                    <AddressAutocomplete key={index} value={buildingAddresses[index] ?? ''} onChange={value => updateBuildingAddress(index, value)} placeholder={`Building ${index + 2} address (optional)`} />
                  ))}
                </div>
              )}
              {plan === 'accommodation_free' && listing.building_addresses.length > 0 && (
                <p className="sm:col-span-2 text-cream-muted text-xs">Saved additional building addresses are preserved on the Free plan. Upgrade to edit or add them.</p>
              )}
              <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the property for students" rows={5} className="w-full sm:col-span-2 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-y" />
            </div>
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h2 className="text-cream font-bold text-base">Room pricing</h2><p className="text-cream-muted text-xs mt-1">Keep, add or remove the room types and funding prices students see.</p></div>
              <button type="button" onClick={addRoomType} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold"><Plus size={14} /> Add room type</button>
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
                          <label className="text-xs text-cream-muted">How many share<input value={room.sharing} onChange={event => updateRoomSharing(room.id, event.target.value)} inputMode="numeric" className="mt-1.5 w-24 block bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-teal-light" /></label>
                          <p className="text-cream font-bold text-sm pb-2.5">{label}</p>
                        </div>
                        <button type="button" onClick={() => setRoomPricing(previous => previous.filter(item => item.id !== room.id))} className="text-cream-muted hover:text-cream pb-2.5" aria-label={`Remove ${label} pricing`}><X size={16} /></button>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <label className="text-xs text-cream-muted">Bursary<input value={room.bursary ?? ''} onChange={event => updateRoomPricing(room.id, 'bursary', event.target.value)} placeholder="Optional" inputMode="numeric" className="mt-1.5 w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" /></label>
                        <label className="text-xs text-cream-muted">NSFAS<input value={room.nsfas ?? ''} onChange={event => updateRoomPricing(room.id, 'nsfas', event.target.value)} placeholder="Optional" inputMode="numeric" className="mt-1.5 w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" /></label>
                        <label className="text-xs text-cream-muted">Self-funded<input value={room.self_funded ?? ''} onChange={event => updateRoomPricing(room.id, 'self_funded', event.target.value)} placeholder="Optional" inputMode="numeric" className="mt-1.5 w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" /></label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-cream font-bold text-base">Universities</h2><span className="text-cream-muted text-xs">Current plan: up to {maxUniversities}</span></div>
            {originalUniversities.current.length > maxUniversities && sameStringSet(originalUniversities.current, selectedUniversities) && <p className="text-cream-muted text-xs mb-3">Your previously saved university reach is preserved. If you change it, the new selection must fit the current plan.</p>}
            <input value={universitySearch} onChange={event => setUniversitySearch(event.target.value)} placeholder="Search for a university" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light mb-3" />
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableUniversities.map(university => {
                const selected = selectedUniversities.includes(university)
                const disabled = !selected && selectedUniversities.length >= maxUniversities
                return <button key={university} onClick={() => toggleUniversity(university)} disabled={disabled} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${selected ? 'bg-teal-faint border-teal-light text-teal-light' : 'bg-slate-deep border-slate-border text-cream-muted hover:text-cream'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>{selected && <Check size={12} className="inline mr-1" />}{university}</button>
              })}
            </div>
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <h2 className="text-cream font-bold text-base mb-1">What does it offer?</h2>
            <p className="text-cream-muted text-xs mb-4">Update the amenities shown to students.</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {AMENITY_OPTIONS.map(amenity => <button key={amenity} onClick={() => toggleAmenity(amenity)} className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold ${selectedAmenities.includes(amenity) ? 'bg-teal-faint border-teal-light text-teal-light' : 'bg-slate-deep border-slate-border text-cream-muted'}`}>{selectedAmenities.includes(amenity) ? '✓ ' : ''}{amenity}</button>)}
            </div>
            <input value={otherAmenities} onChange={event => setOtherAmenities(event.target.value)} placeholder="Other amenities, separated by commas" className="mt-3 w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h2 className="text-cream font-bold text-base">Property video</h2><p className="text-cream-muted text-xs mt-1">Premium accounts can replace or remove the property video.</p></div>
              {plan === 'accommodation_premium' && <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold">Replace video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={event => handleVideoFile(event.target.files?.[0])} disabled={uploadingVideo} className="hidden" /></label>}
            </div>
            {plan !== 'accommodation_premium' ? (
              <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-6 px-4 text-center">{videoUrl ? 'Your saved video is preserved but hidden on the current plan.' : 'Video is available on the Premium accommodation plan.'}</p>
            ) : videoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-border bg-black"><video src={videoUrl} controls className="w-full max-h-80 object-contain" /><button type="button" onClick={() => setVideoUrl(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center" aria-label="Remove property video"><X size={15} /></button></div>
            ) : (
              <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-6 px-4 text-center">No video added. This is optional.</p>
            )}
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4"><div><h2 className="text-cream font-bold text-base">Property photos</h2><p className="text-cream-muted text-xs mt-1">Your current plan displays up to {maxPhotos} photos. Saved extras from an earlier plan stay preserved.</p></div><label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold"><ImagePlus size={15} /> Add photos<input type="file" accept="image/*" multiple onChange={event => handleImageFiles(event.target.files)} disabled={uploadingImages || busy} className="hidden" /></label></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map(url => <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-deep"><img src={url} alt="" className="w-full h-full object-cover" /><button type="button" onClick={() => setImages(previous => previous.filter(item => item !== url))} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Remove property photo"><X size={14} /></button></div>)}
              {images.length === 0 && <div className="col-span-full py-10 text-center text-cream-muted text-xs border border-dashed border-slate-border rounded-xl">No photos added yet.</div>}
            </div>
          </section>

          {(uploadingImages || uploadingVideo) && <p className="text-cream-muted text-sm">Uploading media...</p>}
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleSave} disabled={busy || uploadingImages || uploadingVideo} className="flex-1 bg-teal-primary hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl">{busy ? 'Saving changes...' : 'Save changes'}</button>
            <button onClick={() => navigate(`/accommodation/${listing.id}`)} disabled={busy} className="sm:w-40 border border-slate-border text-cream font-bold py-3.5 rounded-xl">Cancel</button>
          </div>
        </div>
      </main>
    </div>
  )
}
