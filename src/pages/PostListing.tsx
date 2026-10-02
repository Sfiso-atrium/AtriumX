import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  createListing, updateListing, uploadListingImage, getUserById,
  getUserListings, getResidences, PLAN_TIERS, PlanKey, Listing
} from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import ImageCropModal from '../components/common/ImageCropModal'
import { PostTypeSwitcher } from '../components/common/PostTypeChooser'

const CATEGORIES_LIST = [
  { id: 'textbooks', label: 'Textbooks' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'food', label: 'Food' },
  { id: 'services', label: 'Services' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'other', label: 'Other' },
]

export default function PostListing() {
  const navigate = useNavigate()
  const location = useLocation()
const { currentUser, setCurrentUser, showToast, isLoadingAuth } = useApp()
  const { plan: statePlan, editListing } = (location.state as { plan?: PlanKey; editListing?: Listing }) || {}
  const plan = (editListing?.plan_tier as PlanKey | undefined) || statePlan

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [residence, setResidence] = useState(currentUser?.residence || '')
  const [listingType, setListingType] = useState<'single' | 'ongoing'>('single')
  const [isNegotiable, setIsNegotiable] = useState(false)
const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [variants, setVariants] = useState<{ name: string; price: string }[]>([])
const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [atLimit, setAtLimit] = useState(false)
  const [residenceOptions, setResidenceOptions] = useState<string[]>([])
  const [posterMode, setPosterMode] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
useEffect(() => {
    if (isLoadingAuth) return
    if (!plan) navigate('/plan-select')
    else if (!currentUser) navigate('/student')
    else {
      // Editing doesn't add a new listing, so it shouldn't be blocked by
      // (or count toward) the active-listing limit.
      if (!editListing) {
        getUserListings(currentUser.id).then(listings => {
          const active = listings.filter(l => l.plan_enabled !== false && (l.status === 'active' || l.status === 'pending')).length
          const max = PLAN_TIERS[plan].maxListings
          if (active >= max) setAtLimit(true)
        })
      }
      getResidences().then(setResidenceOptions)
    }
  }, [plan, currentUser, navigate, isLoadingAuth, editListing])

  useEffect(() => {
    if (!editListing) return
    setTitle(editListing.title)
    setCategory(editListing.category)
    setCustomCategory(editListing.custom_category || '')
    setPrice(String(editListing.price))
    setDescription(editListing.description)
    setResidence(editListing.residence)
    setListingType(editListing.listing_type)
    setIsNegotiable(editListing.is_negotiable)
    setImageUrls(editListing.image_urls || [])
    setVariants((editListing.variants || []).map(v => ({ name: v.name, price: String(v.price) })))
  }, [editListing])

if (isLoadingAuth || !plan || !currentUser) return null

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
          : 'Your listing is live now and can appear in the marketplace for students at your university.'}
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
      {plan === 'unmissable' ? (
        <>
          <p className="text-cream-muted text-sm mb-6">
            You're already on our top plan, Unmissable, which allows up to {PLAN_TIERS.unmissable.maxListings} active
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
            onClick={() => navigate('/plan-select')}
            className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Upgrade Plan
          </button>
        </>
      )}
    </div>
  )
const tierConfig = PLAN_TIERS[plan]
  const canUploadPhoto = tierConfig.maxPhotos > 0
  const maxPhotos = tierConfig.maxPhotos
  const effectiveMaxPhotos = posterMode ? Math.min(1, maxPhotos) : maxPhotos
  const maxVariants = tierConfig.maxVariants

const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrls.length >= effectiveMaxPhotos) return
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
  const removeImage = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx))
  }

  const addVariant = () => {
    if (variants.length >= maxVariants) return
    setVariants(prev => [...prev, { name: '', price: '' }])
  }

  const updateVariant = (idx: number, field: 'name' | 'price', val: string) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val } : v))
  }

  const removeVariant = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    setError('')
if (!title.trim()) return setError('Title is required.')
    if (posterMode) {
      if (imageUrls.length === 0) return setError('Upload a poster image first.')
      if (!residence.trim()) return setError('Residence is required.')
    } else {
      if (!category) return setError('Category is required.')
      if (category === 'other' && !customCategory.trim()) return setError('Please specify the category.')
      if (!price || Number(price) < 0) return setError('Enter a valid price.')
      if (description.length < 20) return setError('Description must be at least 20 characters.')
      if (!residence.trim()) return setError('Residence is required.')
    }
setLoading(true)

    const sharedFields = {
      title: title.trim(),
      description: posterMode ? '' : description.trim(),
      price: posterMode ? 0 : Number(price),
      category: posterMode ? 'other' : category,
      customCategory: category === 'other' ? customCategory.trim() : undefined,
      imageUrls,
      residence: residence.trim(),
      listingType,
      isNegotiable: tierConfig.canNegBadge ? isNegotiable : false,
      variants: variants
        .filter(v => v.name.trim() && v.price)
        .map(v => ({ name: v.name.trim(), price: Number(v.price) })),
    }

    if (editListing) {
      const { error: updateError } = await updateListing(editListing.id, sharedFields)
      setLoading(false)
      if (updateError) return setError(updateError)
      setSubmitted(true)
      return
    }

    const { id: createdId, error: createError } = await createListing({
      sellerId: currentUser.id,
      ...sharedFields,
      planTier: plan,
    })
    setLoading(false)
    if (createError) return setError(createError)
    setSubmittedId(createdId)

    // createListing may have just rolled the account onto a new plan —
    // currentUser in context is still whatever it was at login, so without
    // this it would keep reading as the old plan for the rest of the session.
    const refreshed = await getUserById(currentUser.id)
    if (refreshed) setCurrentUser(refreshed)

    setSubmitted(true)
  }
  const inputClass = "w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-36">
          {!editListing && <PostTypeSwitcher current="listing" />}

          <div className="mb-6">
            <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Student marketplace listing</p>
            <h1 className="font-serif text-3xl text-cream">{editListing ? 'Edit Listing' : 'New Listing'}</h1>
            <p className="text-cream-muted text-sm mt-2">
              Add the details in one page, then review exactly what students will see before you publish.
            </p>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            <div className="space-y-5">
              <section className="bg-slate-card border border-slate-border rounded-2xl p-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-cream font-bold text-base">Listing details</h2>
                  <p className="text-cream-muted text-xs mt-1">Tell students what you are selling or offering.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="What are you selling?"
                      maxLength={80}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className={inputClass}
                    />
                    <p className="text-cream-muted text-xs text-right mt-1">{title.length}/80</p>
                  </div>

                  <div>
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                      <option value="" disabled>Select a category</option>
                      {CATEGORIES_LIST.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    {category === 'other' && (
                      <input
                        type="text"
                        placeholder="Specify category"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        className={inputClass + ' mt-2'}
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Listing Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['single', 'ongoing'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setListingType(type)}
                          className={`py-3 rounded-xl text-sm font-medium border transition-colors capitalize ${
                            listingType === type
                              ? 'bg-teal-primary border-teal-light text-cream'
                              : 'bg-slate-deep border-slate-border text-cream-muted'
                          }`}
                        >
                          {type === 'single' ? 'Once-off' : 'Ongoing'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!posterMode && (
                    <div className="sm:col-span-2">
                      <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        placeholder="Describe your item — condition, what is included, where to collect."
                        maxLength={500}
                        rows={5}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className={inputClass + ' resize-y'}
                      />
                      <div className="flex justify-between mt-1">
                        {description.length < 20 && description.length > 0 && <p className="text-red-400 text-xs">Minimum 20 characters</p>}
                        <p className="text-cream-muted text-xs text-right ml-auto">{description.length}/500</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-slate-card border border-slate-border rounded-2xl p-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-cream font-bold text-base">Price & options</h2>
                  <p className="text-cream-muted text-xs mt-1">Keep pricing and variations together so students can understand the offer quickly.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                      Price <span className="text-red-400">*</span>
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
                    {tierConfig.canNegBadge && (
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isNegotiable}
                          onChange={e => setIsNegotiable(e.target.checked)}
                          className="accent-teal-primary"
                        />
                        <span className="text-cream-muted text-xs">I am open to price negotiation</span>
                      </label>
                    )}
                  </div>

                  {maxVariants > 0 && (
                    <div className="sm:col-span-2 border-t border-slate-border pt-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-cream text-sm font-bold">Variants — optional</p>
                          <p className="text-cream-muted text-xs mt-1">Use this for multiple sizes, flavours, or types.</p>
                        </div>
                        <span className="text-cream-muted text-xs">{variants.length}/{maxVariants}</span>
                      </div>
                      <div className="space-y-2">
                        {variants.map((v, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Variant name (e.g. 50ml)"
                              value={v.name}
                              onChange={e => updateVariant(idx, 'name', e.target.value)}
                              className={inputClass + ' flex-1'}
                            />
                            <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted text-sm">R</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={v.price}
                                onChange={e => updateVariant(idx, 'price', e.target.value)}
                                className={inputClass + ' pl-7'}
                              />
                            </div>
                            <button type="button" onClick={() => removeVariant(idx)} className="text-red-400 hover:text-red-300 px-2">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {variants.length < maxVariants && (
                          <button type="button" onClick={addVariant} className="flex items-center gap-2 text-teal-light text-sm hover:text-cream transition-colors pt-1">
                            <Plus size={14} /> Add variant
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-slate-card border border-slate-border rounded-2xl p-5 sm:p-6">
                <div className="mb-4">
                  <h2 className="text-cream font-bold text-base">Location</h2>
                  <p className="text-cream-muted text-xs mt-1">Tell students where the item or service is available.</p>
                </div>
                <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                  Residence <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dalrymple House"
                  value={residence}
                  onChange={e => setResidence(e.target.value)}
                  list="residence-options"
                  className={inputClass}
                />
                <datalist id="residence-options">
                  {residenceOptions.map(r => <option key={r} value={r} />)}
                </datalist>
              </section>

              <section className="bg-slate-card border border-slate-border rounded-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-cream font-bold text-base">Media</h2>
                    <p className="text-cream-muted text-xs mt-1">Add photos, or use one image as a poster where your plan allows it.</p>
                  </div>
                  {canUploadPhoto && <span className="text-cream-muted text-xs">{imageUrls.length}/{effectiveMaxPhotos}</span>}
                </div>

                {tierConfig.maxPhotos > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setPosterMode(false)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        !posterMode ? 'bg-teal-primary border-teal-light text-cream' : 'bg-slate-deep border-slate-border text-cream-muted'
                      }`}
                    >
                      Fill in manually
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPosterMode(true)
                        setImageUrls(prev => prev.slice(0, 1))
                      }}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        posterMode ? 'bg-teal-primary border-teal-light text-cream' : 'bg-slate-deep border-slate-border text-cream-muted'
                      }`}
                    >
                      Upload a poster
                    </button>
                  </div>
                )}

                {canUploadPhoto ? (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-deep border border-slate-border">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1">
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                      {imageUrls.length < effectiveMaxPhotos && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="aspect-square border border-dashed border-slate-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-cream-muted hover:border-teal-primary transition-colors"
                        >
                          <ImagePlus size={20} />
                          <span className="text-xs">{uploading ? 'Uploading...' : 'Add photo'}</span>
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    {posterMode && imageUrls.length > 0 && (
                      <p className="text-teal-light text-xs mt-3">
                        Poster uploaded — it'll be shown as-is, buyers will read the details straight off it. Just add a title above.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="bg-slate-deep border border-slate-border rounded-xl px-4 py-4 flex items-center gap-3">
                    <ImagePlus size={18} className="text-cream-muted" />
                    <div>
                      <p className="text-cream-muted text-sm">Photo upload not available on Ghost plan</p>
                      <button type="button" onClick={() => navigate('/plan-select', { state: { forcePlans: true } })} className="text-teal-light text-xs underline mt-1">
                        Upgrade to add photos
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <aside className="lg:sticky lg:top-20 space-y-4">
              <section className="bg-slate-card border border-slate-border rounded-2xl overflow-hidden">
                <div className="aspect-[16/9] bg-slate-deep border-b border-slate-border">
                  {imageUrls[0] ? (
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
                  <h2 className="text-cream font-bold text-lg leading-tight">{title.trim() || 'Your listing title'}</h2>
                  <p className="text-cream-muted text-xs mt-1">
                    {category ? (CATEGORIES_LIST.find(item => item.id === category)?.label || customCategory || 'Other') : 'Category'}{residence.trim() ? ` · ${residence.trim()}` : ''}
                  </p>
                  <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-border">
                    <span className="text-gold font-bold">{posterMode ? 'Poster listing' : price ? `R${price}` : 'Price not added'}</span>
                    {isNegotiable && !posterMode && <span className="text-gold text-xs">Negotiable</span>}
                  </div>
                  {!posterMode && description.trim() && <p className="text-cream-muted text-xs mt-3 line-clamp-3">{description.trim()}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[10px] text-cream-muted bg-slate-deep border border-slate-border rounded-lg px-2 py-1">{listingType === 'single' ? 'Once-off' : 'Ongoing'}</span>
                    {variants.length > 0 && <span className="text-[10px] text-cream-muted bg-slate-deep border border-slate-border rounded-lg px-2 py-1">{variants.length} variant{variants.length !== 1 ? 's' : ''}</span>}
                  </div>
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
                  <div className="bg-slate-deep border border-slate-border rounded-xl p-3"><span className="block text-cream font-bold">{tierConfig.days}</span> days live</div>
                  <div className="bg-slate-deep border border-slate-border rounded-xl p-3"><span className="block text-cream font-bold">{maxPhotos}</span> photo{maxPhotos !== 1 ? 's' : ''}</div>
                </div>
                {plan !== 'unmissable' && (
                  <button
                    type="button"
                    onClick={() => navigate('/plan-select', { state: { forcePlans: true } })}
                    className="w-full border border-gold text-gold hover:bg-gold/10 font-bold py-2.5 rounded-xl transition-colors mt-3"
                  >
                    View upgrade options
                  </button>
                )}
              </section>

              <button
                onClick={handleSubmit}
                disabled={loading || uploading || !title || (!posterMode && (!category || !price || description.length < 20)) || !residence}
                className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {loading ? (editListing ? 'Saving...' : 'Submitting...') : (editListing ? 'Save Changes' : 'Post Listing')}
              </button>
              <p className="text-cream-muted text-xs text-center">Review your listing details above before publishing.</p>
            </aside>
          </div>
        </main>
      </div>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={posterMode ? 3 / 4 : 16 / 9}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
      <BottomNav />
    </>
  )
}
