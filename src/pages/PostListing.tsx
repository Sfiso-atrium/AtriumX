import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  createListing, uploadListingImage,
  PLAN_TIERS, PlanKey, CATEGORIES
} from '../services/dataService'
import Navbar from '../components/common/Navbar'

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
  const { currentUser, showToast } = useApp()
  const plan = (location.state as { plan?: PlanKey })?.plan

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
  const fileRef = useRef<HTMLInputElement>(null)

  if (!plan) { navigate('/plan-select'); return null }
  if (!currentUser) { navigate('/student'); return null }

  const tierConfig = PLAN_TIERS[plan]
  const canUploadPhoto = tierConfig.maxPhotos > 0
  const maxPhotos = tierConfig.maxPhotos
  const maxVariants = tierConfig.maxVariants

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrls.length >= maxPhotos) return
    setUploading(true)
    const { url, error: uploadError } = await uploadListingImage(file, currentUser.id)
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
    if (!category) return setError('Category is required.')
    if (category === 'other' && !customCategory.trim()) return setError('Please specify the category.')
    if (!price || Number(price) < 0) return setError('Enter a valid price.')
    if (description.length < 20) return setError('Description must be at least 20 characters.')
    if (!residence.trim()) return setError('Residence is required.')

    setLoading(true)
    const { id, error: createError } = await createListing({
      sellerId: currentUser.id,
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      customCategory: category === 'other' ? customCategory.trim() : undefined,
      imageUrls,
      residence: residence.trim(),
      listingType,
      isNegotiable: tierConfig.canNegBadge ? isNegotiable : false,
      planTier: plan,
      variants: variants
        .filter(v => v.name.trim() && v.price)
        .map(v => ({ name: v.name.trim(), price: Number(v.price) })),
    })
    setLoading(false)

    if (createError) return setError(createError)
    showToast('Listing submitted for review. It will go live once approved.', 'success')
    navigate('/feed')
  }

  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

  return (
    <div className="min-h-screen bg-slate-deep">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl text-cream">New Listing</h1>
            <span className="text-xs text-teal-light font-medium">
              {PLAN_TIERS[plan].label} plan · {PLAN_TIERS[plan].days} days
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">

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
                <button onClick={() => navigate('/plan-select')} className="text-teal-light text-xs underline">
                  Upgrade to add photos
                </button>
              </div>
            </div>
          )}

          {/* TITLE */}
          <div>
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
              className={inputClass}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
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
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || uploading || !title || !category || !price || description.length < 20 || !residence}
            className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Submitting...' : 'Post Listing'}
          </button>
        </div>
      </div>
    </div>
  )
}
