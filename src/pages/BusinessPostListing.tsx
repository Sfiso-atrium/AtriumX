import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  createListing, uploadListingImage, getUserListings, getBusinessProfile,
  PLAN_TIERS, PlanKey, BusinessProfile
} from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import ImageCropModal from '../components/common/ImageCropModal'

export default function BusinessPostListing() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, isLoadingAuth, showToast } = useApp()
  const { plan: statePlan } = (location.state as { plan?: PlanKey } | null) || {}
  const plan = statePlan || (currentUser?.plan as PlanKey | undefined)

  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [checkingBusiness, setCheckingBusiness] = useState(true)
  const [atLimit, setAtLimit] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { navigate('/retailer/signup'); return }
    if (currentUser.account_type !== 'business') { navigate('/plan-select'); return }
    if (!plan) { navigate('/business/plan-select'); return }

    getBusinessProfile(currentUser.id).then(biz => {
      setBusiness(biz)
      setCheckingBusiness(false)
    })

    getUserListings(currentUser.id).then(listings => {
      const active = listings.filter(l => l.status === 'active' || l.status === 'pending').length
      const max = PLAN_TIERS[plan].maxListings
      if (active >= max) setAtLimit(true)
    })
  }, [currentUser, isLoadingAuth, navigate, plan])

  if (isLoadingAuth || checkingBusiness || !currentUser || !plan) return null

  if (business?.status !== 'approved') return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center">
      <p className="text-cream font-bold text-xl mb-2">
        {business?.status === 'rejected' ? 'Application Not Approved' : 'Awaiting Approval'}
      </p>
      <p className="text-cream-muted text-sm max-w-sm">
        {business?.status === 'rejected'
          ? 'Your business application was not approved. Contact us if you think this is a mistake.'
          : 'Our team is reviewing your business account. You can post a listing once approved — usually within 48 hours.'}
      </p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <span className="text-3xl">✓</span>
      </div>
      <h2 className="text-cream font-bold text-2xl mb-2">Listing Submitted</h2>
      <p className="text-cream-muted text-sm max-w-sm mb-6">
        Your listing is under review. Once approved, it will appear on the Business tab of the feed.
      </p>
      <button
        onClick={() => navigate('/feed')}
        className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-8 rounded-xl transition-colors"
      >
        Back to Feed
      </button>
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

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) return setError('Give your listing a name.')
    if (description.trim().length < 20) return setError('Description needs at least 20 characters.')

    setLoading(true)
    const { error: err } = await createListing({
      sellerId: currentUser.id,
      title: title.trim(),
      description: description.trim(),
      price: Number(price) || 0,
      category: business?.business_type || 'other',
      imageUrls,
      residence: '',
      listingType: 'ongoing',
      isNegotiable: false,
      planTier: plan,
      variants: [],
    })
    setLoading(false)
    if (err) { setError(err); return }
    setSubmitted(true)
  }

  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
          <h1 className="font-serif text-2xl text-cream mb-1">New Business Listing</h1>
          <p className="text-cream-muted text-sm mb-6">
            Posting on the {tierConfig.label} plan — {maxPhotos === 0 ? 'text only, no photos' : `up to ${maxPhotos} photo${maxPhotos !== 1 ? 's' : ''}`}.
          </p>

          <div className="flex flex-col gap-5">
            {/* PHOTOS */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Photos ({imageUrls.length}/{maxPhotos})
              </label>
              {!canUploadPhoto ? (
                <div className="bg-slate-card border border-slate-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <ImagePlus size={18} className="text-cream-muted flex-shrink-0" />
                  <div>
                    <p className="text-cream-muted text-sm">Photos aren't included on the Noticeboard plan</p>
                    <button
                      onClick={() => navigate('/business/plan-select', { state: { forcePlans: true } })}
                      className="text-blue-400 text-xs underline"
                    >
                      Upgrade to add photos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-slate-deep/80 rounded-full flex items-center justify-center text-cream"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {imageUrls.length < maxPhotos && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-20 h-20 rounded-xl border border-dashed border-slate-border flex items-center justify-center text-cream-muted hover:border-teal-light transition-colors disabled:opacity-40"
                    >
                      <ImagePlus size={20} />
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>
              )}
            </div>

            {/* TITLE */}
            <div>
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

            {/* PRICE */}
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
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                placeholder="What are you offering? Include anything students should know."
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
              disabled={loading || uploading || !title || description.length < 20}
              className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Submitting...' : 'Post Listing'}
            </button>

            {/* Nothing ranks above Campus Partner, so there's nothing to
                upgrade to — hide the button entirely rather than show a dead end. */}
            {plan !== 'campus_partner' && (
              <button
                type="button"
                onClick={() => navigate('/business/plan-select', { state: { forcePlans: true } })}
                className="w-full border border-gold text-gold hover:bg-gold/10 font-bold py-3 rounded-xl transition-colors"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>
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
