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
// The listing detail page displays photos in a 16:9 box with object-cover,
// so a photo whose own shape is far from 16:9 gets aggressively cropped —
// potentially cutting off the actual item. This reads the file's real pixel
// dimensions client-side, before it's ever uploaded, so we can catch that.
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('unreadable'))
    }
    img.src = objectUrl
  })
}

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
  const [variants, setVariants] = useState<{ name: string; price: string }[]>([])
const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [atLimit, setAtLimit] = useState(false)
  const [residenceOptions, setResidenceOptions] = useState<string[]>([])
  const [posterMode, setPosterMode] = useState(false)
  const [submitted, setSubmitted] = useState(false)
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
          const active = listings.filter(l => l.status === 'active' || l.status === 'pending').length
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

 if (submitted) return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <span className="text-3xl">✓</span>
      </div>
 <h2 className="text-cream font-bold text-2xl mb-2">
        {editListing ? 'Listing Updated' : 'Listing Submitted'}
      </h2>
      <p className="text-cream-muted text-sm max-w-sm mb-6">
        {editListing
          ? 'Your changes are live now. Our team may still review them, but your listing was never taken down while that happens.'
          : 'Your listing is under review. Once our team approves it, it will appear on the feed for students in your residence to see.'}
      </p>
      <button
        onClick={() => navigate(editListing ? `/profile/${currentUser.id}` : '/feed')}
        className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-8 rounded-xl transition-colors"
      >
        {editListing ? 'Back to My Listings' : 'Back to Feed'}
      </button>
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
  const maxVariants = tierConfig.maxVariants

const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrls.length >= maxPhotos) return

    try {
      const { width, height } = await getImageDimensions(file)
      const ratio = width / height
      const targetRatio = 16 / 9
      const tolerance = 0.15 // 15% wiggle room either side of 16:9
      if (Math.abs(ratio - targetRatio) / targetRatio > tolerance) {
        showToast(
          'That photo is too far from a 16:9 landscape shape — it would get cropped and cut off in the listing. Please crop it closer to 16:9 first.',
          'error'
        )
        if (fileRef.current) fileRef.current.value = ''
        return
      }
    } catch {
      showToast('Could not read that image. Try a different file.', 'error')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
   const { url, error: uploadError } = await uploadListingImage(file, currentUser.id)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
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
if (posterMode) {
      if (imageUrls.length === 0) return setError('Upload a poster image first.')
      if (!residence.trim()) return setError('Residence is required.')
    } else {
      if (!title.trim()) return setError('Title is required.')
      if (!category) return setError('Category is required.')
      if (category === 'other' && !customCategory.trim()) return setError('Please specify the category.')
      if (!price || Number(price) < 0) return setError('Enter a valid price.')
      if (description.length < 20) return setError('Description must be at least 20 characters.')
      if (!residence.trim()) return setError('Residence is required.')
    }
setLoading(true)

    const sharedFields = {
      title: posterMode ? 'Poster listing' : title.trim(),
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

    const { error: createError } = await createListing({
      sellerId: currentUser.id,
      ...sharedFields,
      planTier: plan,
    })
    setLoading(false)
    if (createError) return setError(createError)

    // createListing may have just rolled the account onto a new plan —
    // currentUser in context is still whatever it was at login, so without
    // this it would keep reading as the old plan for the rest of the session.
    const refreshed = await getUserById(currentUser.id)
    if (refreshed) setCurrentUser(refreshed)

    setSubmitted(true)
  }
  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="font-serif text-2xl text-cream">{editListing ? 'Edit Listing' : 'New Listing'}</h1>
              <span className="text-xs text-teal-light font-medium">
                {PLAN_TIERS[plan].label} plan · {PLAN_TIERS[plan].days} days
              </span>
            </div>
          </div>

<div className="flex flex-col gap-5">

            {/* POST MODE TOGGLE */}
            {tierConfig.maxPhotos > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPosterMode(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    !posterMode ? 'bg-teal-primary border-teal-light text-cream' : 'bg-slate-card border-slate-border text-cream-muted'
                  }`}
                >
                  Fill in manually
                </button>
                <button
                  onClick={() => setPosterMode(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    posterMode ? 'bg-teal-primary border-teal-light text-cream' : 'bg-slate-card border-slate-border text-cream-muted'
                  }`}
                >
                  Upload a poster
                </button>
              </div>
            )}

            {/* PHOTO UPLOAD */}
            {canUploadPhoto ? (
              <div>
                <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                  Photos ({imageUrls.length}/{maxPhotos})
                </label>
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {imageUrls.length < maxPhotos && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-24 h-24 border-2 border-dashed border-slate-border rounded-xl flex flex-col items-center justify-center gap-1 text-cream-muted hover:border-teal-primary transition-colors"
                    >
                      <ImagePlus size={20} />
                      <span className="text-xs">{uploading ? 'Uploading...' : 'Add photo'}</span>
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>
            ) : (
              <div className="bg-slate-card border border-slate-border rounded-xl px-4 py-3 flex items-center gap-3">
                <ImagePlus size={18} className="text-cream-muted" />
                <div>
                  <p className="text-cream-muted text-sm">Photo upload not available on Ghost plan</p>
              <button onClick={() => navigate('/plan-select', { state: { forcePlans: true } })} className="text-teal-light text-xs underline">
                    Upgrade to add photos
                  </button>
                </div>
              </div>
            )}

{posterMode && imageUrls.length > 0 && (
              <p className="text-teal-light text-xs text-center">
                Poster uploaded. Hit Post Listing — title and description will be set automatically.
              </p>
            )}

            {/* TITLE */}
            {!posterMode && <div>
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
            </div>}

            {/* CATEGORY */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>Select a category</option>
                {CATEGORIES_LIST.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
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

            {/* LISTING TYPE */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Listing Type
              </label>
              <div className="flex gap-2">
                {(['single', 'ongoing'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setListingType(type)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize ${
                      listingType === type
                        ? 'bg-teal-primary border-teal-light text-cream'
                        : 'bg-slate-card border-slate-border text-cream-muted'
                    }`}
                  >
                    {type === 'single' ? 'Once-off' : 'Ongoing'}
                  </button>
                ))}
              </div>
            </div>

            {/* PRICE */}
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
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
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

            {/* VARIANTS */}
            {maxVariants > 0 && (
              <div>
                <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                  Variants — optional ({variants.length}/{maxVariants})
                </label>
                <p className="text-cream-muted text-xs mb-3">
                  Use this if you sell the same item in multiple sizes, flavours, or types.
                </p>
                {variants.map((v, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
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
                    <button onClick={() => removeVariant(idx)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {variants.length < maxVariants && (
                  <button
                    onClick={addVariant}
                    className="flex items-center gap-2 text-teal-light text-sm hover:text-cream transition-colors"
                  >
                    <Plus size={14} /> Add variant
                  </button>
                )}
              </div>
            )}

{/* RESIDENCE */}
            <div>
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
                {residenceOptions.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          {/* DESCRIPTION */}
            {!posterMode && <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                placeholder="Describe your item — condition, what is included, where to collect."
                maxLength={500}
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={inputClass + ' resize-none'}
              />
              <div className="flex justify-between mt-1">
                {description.length < 20 && description.length > 0 && (
                  <p className="text-red-400 text-xs">Minimum 20 characters</p>
                )}
                <p className="text-cream-muted text-xs text-right ml-auto">{description.length}/500</p>
</div>
            </div>}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
            disabled={loading || uploading || (!posterMode && (!title || !category || !price || description.length < 20)) || !residence}
              
              className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
            {loading ? (editListing ? 'Saving...' : 'Submitting...') : (editListing ? 'Save Changes' : 'Post Listing')}  
            </button>
          </div>
        </div>
     </div>
      <BottomNav />
    </>
  )
}
