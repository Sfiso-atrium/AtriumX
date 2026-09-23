import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ImagePlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ACCOMMODATION_PLANS, AccommodationPlanKey, createAccommodationListing, getAccommodationListings, getBusinessProfile, uploadAccommodationImage } from '../services/dataService'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'
import Navbar from '../components/common/Navbar'

const AMENITY_OPTIONS = [
  'Gym', '24hr study room', 'Wi-Fi', 'Laundry', 'Security', 'CCTV', 'Parking', 'Pool', 'Backup power', 'Common area', 'Cleaning service', 'Shuttle'
]

export default function AccommodationPostListing() {
  const navigate = useNavigate()
  const { currentUser, businessProfile, showToast } = useApp()
  const [title, setTitle] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [address, setAddress] = useState(businessProfile?.physical_address || '')
  const [description, setDescription] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [otherAmenities, setOtherAmenities] = useState('')
  const [universitySearch, setUniversitySearch] = useState('')
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(businessProfile?.universities?.slice(0, 1) ?? [])
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [existingListings, setExistingListings] = useState<any[]>([])

  const plan = (businessProfile?.accommodation_plan ?? 'accommodation_free') as AccommodationPlanKey
  const maxPhotos = plan === 'accommodation_free' ? 8 : plan === 'accommodation_featured' ? 20 : 40
  const maxUniversities = plan === 'accommodation_free' ? 1 : plan === 'accommodation_featured' ? 2 : 3
  const maxPlanForExisting = existingListings.reduce((max, item) => Math.max(max, item.plan_tier === 'accommodation_premium' ? 3 : item.plan_tier === 'accommodation_featured' ? 2 : 1), 0)
  const canExpandUniversities = existingListings.length === 0 || maxUniversities > maxPlanForExisting
  const universityLocked = existingListings.length > 0 && !canExpandUniversities
  const universityQuery = universitySearch.trim().toLowerCase()
  const availableUniversities = useMemo(() => SOUTH_AFRICAN_UNIVERSITIES.filter(u =>
    !universityQuery || u.toLowerCase().includes(universityQuery) || (UNIVERSITY_ALIASES[u] ?? []).some(a => a.toLowerCase().startsWith(universityQuery))
  ), [universityQuery])

  useEffect(() => {
    if (!currentUser || !businessProfile?.is_accommodation) return
    getAccommodationListings(null).then(items => setExistingListings(items.filter(item => item.seller_id === currentUser.id)))
  }, [currentUser?.id, businessProfile?.is_accommodation])

  if (!currentUser || currentUser.account_type !== 'business' || !businessProfile?.is_accommodation) return null

  const toggleAmenity = (amenity: string) => setSelectedAmenities(prev => prev.includes(amenity) ? prev.filter(item => item !== amenity) : [...prev, amenity])

  const toggleUniversity = (university: string) => {
    setError('')
    if (universityLocked && !selectedUniversities.includes(university)) return
    setSelectedUniversities(prev => prev.includes(university)
      ? prev.filter(item => item !== university)
      : prev.length < maxUniversities ? [...prev, university] : prev
    )
  }

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || !currentUser) return
    const picked = Array.from(files).slice(0, Math.max(0, maxPhotos - images.length))
    for (const file of picked) {
      const { url, error: uploadError } = await uploadAccommodationImage(file, currentUser.id)
      if (uploadError || !url) { showToast(uploadError || 'Could not upload image.', 'error'); continue }
      setImages(prev => [...prev, url])
    }
  }

  const handleSubmit = async () => {
    setError('')
    const rent = Number(monthlyRent)
    const amenities = [...selectedAmenities, ...otherAmenities.split(',').map(s => s.trim()).filter(Boolean)]
    if (!title.trim()) return setError('Property name is required.')
    if (!Number.isFinite(rent) || rent <= 0) return setError('Enter a valid monthly rent.')
    if (!address.trim()) return setError('Property address is required.')
    if (!description.trim()) return setError('Description is required.')
    if (selectedUniversities.length === 0) return setError('Choose at least one university.')
    if (selectedUniversities.length > maxUniversities) return setError(`Your plan allows up to ${maxUniversities} universities.`)
    if (images.length > maxPhotos) return setError(`Your plan allows up to ${maxPhotos} photos.`)

    setBusy(true)
    const { id, error: createError } = await createAccommodationListing({
      sellerId: currentUser.id,
      title: title.trim(),
      monthlyRent: rent,
      address: address.trim(),
      description: description.trim(),
      amenities,
      imageUrls: images,
      universities: selectedUniversities,
      planTier: plan,
    })
    setBusy(false)
    if (createError) { setError(createError); return }
    if (id) {
      await getBusinessProfile(currentUser.id)
      showToast('Accommodation listed.', 'success')
      navigate(`/accommodation/${id}`, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-7">
        <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream text-sm flex items-center gap-2 mb-5"><ArrowLeft size={17} /> Back</button>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div><p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Accommodation listing</p><h1 className="font-serif text-3xl text-cream">Add your property</h1><p className="text-cream-muted text-sm mt-2">One listing represents the whole property. Rent is shown monthly.</p></div>
          <span className="text-cream font-bold text-sm bg-slate-card border border-slate-border px-3 py-2 rounded-xl">{ACCOMMODATION_PLANS[plan].label}</span>
        </div>

        <div className="space-y-5">
          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <h2 className="text-cream font-bold text-base mb-4">Property details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Property name" className="w-full sm:col-span-2 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              <input value={monthlyRent} onChange={e => setMonthlyRent(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Monthly rent (R)" inputMode="numeric" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Property address" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the property for students" rows={5} className="w-full sm:col-span-2 bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-y" />
            </div>
          </section>

          <section className="bg-slate-card border border-slate-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-cream font-bold text-base">Universities</h2><span className="text-cream-muted text-xs">Up to {maxUniversities}</span></div>
            <input value={universitySearch} onChange={e => setUniversitySearch(e.target.value)} placeholder="Search for a university" className="w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light mb-3" />
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableUniversities.map(u => {
                const selected = selectedUniversities.includes(u)
                const disabled = (!selected && selectedUniversities.length >= maxUniversities) || (universityLocked && !selected)
                return <button key={u} onClick={() => toggleUniversity(u)} disabled={disabled} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${selected ? 'bg-teal-faint border-teal-light text-teal-light' : 'bg-slate-deep border-slate-border text-cream-muted hover:text-cream'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>{selected && <Check size={12} className="inline mr-1" />}{u}</button>
              })}
            </div>
            {universityLocked && <p className="text-cream-muted text-xs mt-3">After your first property is posted, later properties can only use the university set established on that first property. Upgrade your plan to expand the maximum.</p>}
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
            <div className="flex items-center justify-between mb-4"><div><h2 className="text-cream font-bold text-base">Property photos</h2><p className="text-cream-muted text-xs mt-1">Up to {maxPhotos} photos on your plan.</p></div><label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold"><ImagePlus size={15} /> Add photos<input type="file" accept="image/*" multiple onChange={e => handleImageFiles(e.target.files)} className="hidden" /></label></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map(url => <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-deep"><img src={url} alt="" className="w-full h-full object-cover" /><button onClick={() => setImages(prev => prev.filter(item => item !== url))} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={14} /></button></div>)}
              {images.length === 0 && <div className="col-span-full py-10 text-center text-cream-muted text-xs border border-dashed border-slate-border rounded-xl">No photos added yet.</div>}
            </div>
          </section>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleSubmit} disabled={busy} className="w-full bg-teal-primary hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl">{busy ? 'Publishing...' : 'Publish accommodation'}</button>
        </div>
      </main>
    </div>
  )
}
