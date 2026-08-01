import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Flag, Users, RefreshCw, CircleCheck as CheckCircle, Star,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Repeat, Wrench, Tag
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/common/BottomNav'
import ReportModal from '../components/student/ReportModal'
import {
  Listing, Profile, Rating, RecentBuyer, getListingById,
  startConversation, markListingAsSold,
  renewListing, getRecentBuyers, sendRatingInvite,
  getConversationsForListing, getSellerRatings,
  PLAN_TIERS, PlanKey
} from '../services/dataService'
function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 110.01 122.88" className={className} fill="currentColor">
      <path d="M1.87,14.69h22.66L24.5,14.3V4.13C24.5,1.86,26.86,0,29.76,0c2.89,0,5.26,1.87,5.26,4.13V14.3l-0.03,0.39h38.59l-0.03-0.39V4.13C73.55,1.86,75.91,0,78.8,0c2.89,0,5.26,1.87,5.26,4.13V14.3l-0.03,0.39h24.11c1.03,0,1.87,0.84,1.87,1.87v19.46c0,1.03-0.84,1.87-1.87,1.87H1.87C0.84,37.88,0,37.04,0,36.01V16.55C0,15.52,0.84,14.69,1.87,14.69L1.87,14.69z M0.47,42.19h109.08c0.26,0,0.46,0.21,0.46,0.46l0,0v79.76c0,0.25-0.21,0.46-0.46,0.46l-109.08,0c-0.25,0-0.47-0.21-0.47-0.46V42.66C0,42.4,0.21,42.19,0.47,42.19L0.47,42.19L0.47,42.19z M97.27,52.76H83.57c-0.83,0-1.5,0.63-1.5,1.4V66.9c0,0.77,0.67,1.4,1.5,1.4h13.71c0.83,0,1.51-0.63,1.51-1.4V54.16C98.78,53.39,98.1,52.76,97.27,52.76L97.27,52.76z M12.24,74.93h13.7c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4H12.71c-0.83,0-1.5-0.63-1.5-1.4V75.87c0-0.77,0.68-1.4,1.5-1.4L12.24,74.93L12.24,74.93z M12.24,97.11h13.7c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4l-13.24,0c-0.83,0-1.5-0.63-1.5-1.4V98.51c0-0.77,0.68-1.4,1.5-1.4L12.24,97.11L12.24,97.11z M12.24,52.76h13.7c0.83,0,1.51,0.63,1.51,1.4V66.9c0,0.77-0.68,1.4-1.51,1.4l-13.24,0c-0.83,0-1.5-0.63-1.5-1.4V54.16c0-0.77,0.68-1.4,1.5-1.4L12.24,52.76L12.24,52.76z M36.02,52.76h13.71c0.83,0,1.5,0.63,1.5,1.4V66.9c0,0.77-0.68,1.4-1.5,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V54.16C34.51,53.39,35.19,52.76,36.02,52.76L36.02,52.76L36.02,52.76z M36.02,74.93h13.71c0.83,0,1.5,0.63,1.5,1.4v12.74c0,0.77-0.68,1.4-1.5,1.4H36.02c-0.83,0-1.51-0.63-1.51-1.4V75.87c0-0.77,0.68-1.4,1.51-1.4V74.93L36.02,74.93z M36.02,97.11h13.71c0.83,0,1.5,0.63,1.5,1.4v12.74c0,0.77-0.68,1.4-1.5,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V98.51C34.51,97.74,35.19,97.11,36.02,97.11L36.02,97.11L36.02,97.11z M59.79,52.76H73.5c0.83,0,1.51,0.63,1.51,1.4V66.9c0,0.77-0.68,1.4-1.51,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V54.16C58.29,53.39,58.96,52.76,59.79,52.76L59.79,52.76L59.79,52.76z M59.79,74.93H73.5c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4H59.79c-0.83,0-1.51-0.63-1.51-1.4V75.87c0-0.77,0.68-1.4,1.51-1.4V74.93L59.79,74.93z M97.27,74.93H83.57c-0.83,0-1.5,0.63-1.5,1.4v12.74c0,0.77,0.67,1.4,1.5,1.4h13.71c0.83,0,1.51-0.63,1.51-1.4l0-13.21c0-0.77-0.68-1.4-1.51-1.4L97.27,74.93L97.27,74.93z M97.27,97.11H83.57c-0.83,0-1.5,0.63-1.5,1.4v12.74c0,0.77,0.67,1.4,1.5,1.4h13.71c0.83,0,1.51-0.63,1.51-1.4l0-13.21c0-0.77-0.68-1.4-1.51-1.4L97.27,97.11L97.27,97.11z M59.79,97.11H73.5c0.83,0,1.51,0.63,1.51,1.4v12.74c0,0.77-0.68,1.4-1.51,1.4l-13.71,0c-0.83,0-1.51-0.63-1.51-1.4V98.51C58.29,97.74,58.96,97.11,59.79,97.11L59.79,97.11L59.79,97.11z M7.01,47.71h96.92c0.52,0,0.94,0.44,0.94,0.94v67.77c0,0.5-0.44,0.94-0.94,0.94H6.08c-0.5,0-0.94-0.42-0.94-0.94V49.58C5.14,48.55,5.98,47.71,7.01,47.71L7.01,47.71L7.01,47.71z M78.8,29.4c2.89,0,5.26-1.87,5.26-4.13V15.11l-0.03-0.41H73.58l-0.03,0.41v10.16C73.55,27.54,75.91,29.4,78.8,29.4L78.8,29.4L78.8,29.4z M29.76,29.4c2.89,0,5.26-1.87,5.26-4.13V15.11l-0.03-0.41H24.53l-0.03,0.41v10.16C24.5,27.54,26.86,29.4,29.76,29.4L29.76,29.4z"/>
    </svg>
  )
}

function PeopleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 229.02" className={className} fill="currentColor">
      <path d="M397.11 189.528c19.559 2.95 40.984-3.85 47.595-21.606C483.069 192.446 512 176.882 512 229.02H403.237c0-17.639-2.149-30.21-6.127-39.492zM128.795 229.02c4.755-61.58 28.363-38.802 81.188-71.854 16.315 34.041 82.624 36.515 96.221 0 45.588 29.143 79.968 9.897 79.968 71.854H128.795zm93.639-74.539c-.703-.913 1.842-7.183 2.445-8.197-6.902-6.141-12.356-12.337-13.518-25.088l-.74.016c-1.709-.023-3.357-.416-4.9-1.295-2.472-1.406-4.21-3.819-5.384-6.54-2.485-5.71-10.67-24.66 1.801-23.163-6.973-13.023 8.809-35.271-18.411-43.499 22.334-28.286 69.455-71.9 103.989-28.151 37.798 3.663 49.588 48.583 24.136 73.186 1.491.054 2.897.398 4.14 1.063 4.732 2.535 4.887 8.036 3.644 12.651-1.231 3.854-2.793 6.462-4.266 10.22-1.793 5.073-4.413 6.018-9.475 5.472-.256 12.544-6.054 18.701-13.855 26.071l2.135 7.232c-10.462 22.191-53.923 23.084-71.741.022zM0 229.02c4.001-51.821 23.868-33.285 68.323-61.098 8.21 17.13 31.463 24.757 51.28 21.553-3.838 8.657-6.369 20.49-7.728 37.307a17.382 17.382 0 00-.146 2.238H0zm78.8-63.358c-.592-.768 1.55-6.044 2.057-6.898-5.808-5.168-10.396-10.382-11.375-21.112l-.623.013c-1.438-.019-2.825-.35-4.123-1.09-2.08-1.183-3.543-3.214-4.531-5.503-2.091-4.805-8.98-20.753 1.516-19.493-5.869-10.959 7.413-29.681-15.494-36.606 18.795-23.803 58.449-60.505 87.51-23.689 31.808 3.083 41.73 40.884 20.311 61.587 1.255.046 2.438.336 3.485.896 3.981 2.133 4.112 6.762 3.065 10.645-1.035 3.243-2.35 5.439-3.59 8.601-1.508 4.269-3.713 5.065-7.973 4.605-.216 10.556-5.094 15.737-11.659 21.939l1.796 6.086a20.274 20.274 0 01-3.803 5.463c-2.181 1.346-4.203 2.84-6.075 4.545-14.605 7.944-38.947 4.957-50.494-9.989zm295.411 0c-.592-.768 1.55-6.044 2.057-6.898-5.808-5.168-10.397-10.382-11.376-21.112l-.622.013c-1.439-.019-2.825-.35-4.124-1.09-2.079-1.183-3.542-3.214-4.53-5.503-2.091-4.805-8.98-20.753 1.515-19.493-5.868-10.959 7.413-29.681-15.493-36.606 18.794-23.803 58.449-60.505 87.509-23.689 31.809 3.083 41.731 40.884 20.312 61.587 1.255.046 2.437.336 3.484.896 3.982 2.133 4.112 6.762 3.066 10.645-1.035 3.243-2.351 5.439-3.59 8.601-1.509 4.269-3.714 5.065-7.974 4.605-.215 10.556-5.094 15.737-11.659 21.939l1.796 6.086c-6.65 14.106-29.144 17.983-46.214 10.672-3.653-3.682-7.918-6.523-12.719-8.928a30.616 30.616 0 01-1.438-1.725z"/>
    </svg>
  )
}

function LocationIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 92.26 122.88" className={className} fill="currentColor">
      <path d="M47.49,116.85c6.31-4.01,11.98-8.87,16.92-14.29c10.73-11.75,17.97-26.11,20.87-40.2c2.88-13.91,1.52-27.54-4.85-38.06c-1.81-3.02-4.08-5.78-6.78-8.26c-7.74-7.05-16.6-10.41-25.52-10.5c-9.37-0.07-18.87,3.45-27.27,10.14c-3.58,2.86-6.53,6.15-8.82,9.78c-5.9,9.28-7.69,20.8-5.74,32.85c1.97,12.23,7.78,25.02,17.04,36.61c6.44,8.08,14.54,15.58,24.18,21.91L47.49,116.85L47.49,116.85z M46.13,21.16c7.05,0,13.45,2.86,18.06,7.49c4.63,4.63,7.49,11,7.49,18.06c0,7.05-2.86,13.45-7.49,18.06c-4.63,4.63-11,7.49-18.06,7.49c-7.05,0-13.45-2.86-18.06-7.49c-4.63-4.63-7.49-11-7.49-18.06c0-7.05,2.86-13.45,7.49-18.06C32.7,24.02,39.07,21.16,46.13,21.16L46.13,21.16z M60.51,32.33c-3.67-3.67-8.78-5.97-14.38-5.97c-5.63,0-10.71,2.27-14.38,5.97c-3.67,3.67-5.97,8.78-5.97,14.38c0,5.63,2.27,10.71,5.97,14.38c3.67,3.67,8.78,5.97,14.38,5.97c5.63,0,10.71-2.27,14.38-5.97c3.67-3.67,5.97-8.78,5.97-14.38C66.47,41.08,64.21,36,60.51,32.33L60.51,32.33z M68.52,106.27c-5.6,6.12-12.09,11.61-19.42,16.06c-0.88,0.66-2.13,0.75-3.13,0.11c-10.8-6.87-19.85-15.13-26.99-24.09C9.15,86.02,2.94,72.34,0.83,59.16c-2.15-13.36-0.14-26.2,6.51-36.68c2.63-4.13,5.97-7.89,10.07-11.14C26.78,3.88,37.51-0.07,48.17,0c10.28,0.09,20.42,3.9,29.22,11.93c3.09,2.81,5.67,5.99,7.78,9.48c7.15,11.77,8.69,26.81,5.56,42.01c-3.11,15.04-10.8,30.33-22.18,42.8L68.52,106.27L68.52,106.27z"/>
    </svg>
  )
}
function postedAgo(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { label: 'Expired', color: 'text-red-400' }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days >= 2) return { label: `${days} days left`, color: 'text-cream-muted' }
  return { label: `${days > 0 ? days + 'd ' : ''}${hours}h left`, color: 'text-yellow-400' }
}

// The two steps of the "invite buyers to rate me" flow that opens after a
// seller marks a listing sold. Step 1 is a plain yes/no ask so the seller
// isn't forced into picking buyers if they don't want to bother. Step 2
// lists everyone who chatted with them about *this specific listing* so
// they can choose who actually bought it.
type SoldFlowStep = 'ask' | 'pick-buyers' | null

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, setAuthPromptOpen, setRedirectAfterLogin, showToast } = useApp()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
const [showReportModal, setShowReportModal] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [showPricing, setShowPricing] = useState(false)
  const [sellerRatings, setSellerRatings] = useState<Rating[]>([])
  const [soldFlowStep, setSoldFlowStep] = useState<SoldFlowStep>(null)
  const [recentBuyers, setRecentBuyers] = useState<RecentBuyer[]>([])
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<string[]>([])
  const [sendingInvites, setSendingInvites] = useState(false)

  useEffect(() => {
    if (!id) return
    getListingById(id, currentUser?.id)
      .then(data => {
        setListing(data)
        setLoading(false)
      })
.catch(() => {
        setListing(null)
        setLoading(false)
      })
  }, [id, currentUser?.id])

  useEffect(() => {
    if (!listing?.seller_id) return
    // Reviews are attached to the seller, not to any single listing — a
    // rating left after one sale shows up here regardless of which of the
    // seller's listings it came from.
    getSellerRatings(listing.seller_id).then(setSellerRatings)
  }, [listing?.seller_id])

  if (loading) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted">Loading...</p>
    </div>
  )

  if (!listing) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted">Listing not found.</p>
    </div>
  )

  const seller = listing.seller as Profile | undefined
  const isSeller = currentUser?.id === listing.seller_id
  const plan = listing.plan_tier as PlanKey
  const tierConfig = PLAN_TIERS[plan]
const expiry = timeLeft(listing.expires_at)

  const handleInterested = async () => {
    if (!currentUser) {
      setRedirectAfterLogin(`/listing/${listing.id}`)
      setAuthPromptOpen(true)
      return
    }
    if (!tierConfig.canChat) {
      showToast('This seller has not enabled private chat. Try contacting them via the feed.', 'info')
      return
    }
    setActionLoading(true)
    const { convId, error } = await startConversation(listing.id, currentUser.id, listing.seller_id)
    setActionLoading(false)
    if (error) { showToast(error, 'error'); return }
    if (convId) navigate(`/chat/${convId}`)
  }

  const handleMarkSold = async () => {
    if (!id || !currentUser) return
    setActionLoading(true)
    const { error } = await markListingAsSold(id)
    if (error) { setActionLoading(false); showToast(error, 'error'); return }
    setListing(prev => (prev ? { ...prev, status: 'sold' } : prev))

    const buyers = await getRecentBuyers(currentUser.id, id)
    setActionLoading(false)
    showToast('Listing marked as sold.', 'success')

    if (buyers.length > 0) {
      setRecentBuyers(buyers)
      setSoldFlowStep('ask')
    } else {
      navigate('/feed')
    }
  }

  const handleRenew = async () => {
    if (!id) return
    setActionLoading(true)
    const { error } = await renewListing(id, plan)
    setActionLoading(false)
    if (error) { showToast(error, 'error'); return }
    showToast('Listing renewed.', 'success')
    navigate('/feed')
  }

  const handleReportClick = () => {
    if (!currentUser) { setAuthPromptOpen(true); return }
    setShowReportModal(true)
  }

  const toggleBuyerSelected = (buyerId: string) => {
    setSelectedBuyerIds(prev =>
      prev.includes(buyerId) ? prev.filter(b => b !== buyerId) : [...prev, buyerId]
    )
  }

  const closeSoldFlow = () => {
    setSoldFlowStep(null)
    setSelectedBuyerIds([])
    navigate('/feed')
  }

  const handleSendInvites = async () => {
    if (!currentUser || !listing || selectedBuyerIds.length === 0) return
    setSendingInvites(true)
    // Rating invites always need the conversation id for the specific
    // buyer + listing pair, so this looks up each selected buyer's
    // conversation for this listing before inviting them.
    const conversations = await getConversationsForListing(listing.id, currentUser.id)
    let sentCount = 0
    for (const buyerId of selectedBuyerIds) {
      const conv = conversations.find(c => c.buyer_id === buyerId)
      if (!conv) continue
      const { error } = await sendRatingInvite(
        currentUser.id,
        currentUser.full_name,
        buyerId,
        listing.id,
        conv.id
      )
      if (!error) sentCount++
    }
    setSendingInvites(false)
    if (sentCount > 0) {
      showToast(
        sentCount === 1
          ? 'Rating invite sent.'
          : `Rating invites sent to ${sentCount} buyers.`,
        'success'
      )
    }
    closeSoldFlow()
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream">
            <ArrowLeft size={20} />
          </button>
          {!isSeller && currentUser && (
            <button
              onClick={handleReportClick}
              className="flex items-center gap-1.5 text-cream-muted hover:text-red-400 text-sm transition-colors"
            >
              <Flag size={14} />
              Report
            </button>
          )}
        </div>
<div className="max-w-5xl mx-auto pb-8 md:px-6 lg:px-8 md:pt-6">
          {/* Hero placeholder: image/video, title, and badges live together */}
          <div className="w-full bg-slate-card border border-slate-border rounded-2xl overflow-hidden md:flex md:gap-6 md:items-stretch">
          {listing.video_url ? (
            <video
              src={listing.video_url}
              controls
              className="w-full aspect-video md:w-[420px] md:aspect-square md:flex-shrink-0 object-cover bg-black"
              poster={listing.image_urls?.[0] || undefined}
            />
          ) : (
            <div className="relative w-full aspect-video md:w-[420px] md:aspect-square md:flex-shrink-0 bg-teal-faint overflow-hidden">
              {listing.image_urls?.length > 0 ? (
                <img
                  src={listing.image_urls[activeImage]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-cream-muted text-sm">No photo</span>
                </div>
              )}

              {seller && seller.total_ratings > 0 && (
                <span className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-deep/90 border border-gold/40 text-gold text-xs font-bold px-2.5 py-1 rounded-full">
                  <Star size={13} className="fill-gold" />
                  {seller.avg_rating} ({seller.total_ratings})
                </span>
              )}

              {listing.image_urls?.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImage(prev => (prev - 1 + listing.image_urls.length) % listing.image_urls.length)
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-deep/70 hover:bg-slate-deep text-cream flex items-center justify-center transition-colors"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={() => setActiveImage(prev => (prev + 1) % listing.image_urls.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-deep/70 hover:bg-slate-deep text-cream flex items-center justify-center transition-colors"
                    aria-label="Next photo"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
          )}
          <div className="px-4 pb-5 pt-4 md:px-0 md:py-6 md:pr-6 md:flex-1 md:min-w-0 flex flex-col justify-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl text-cream">{listing.title}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-faint text-teal-light capitalize">
                  {listing.custom_category || listing.category}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-deep border border-slate-border text-cream-muted capitalize">
                  {listing.listing_type === 'single' ? 'Once-off' : 'Ongoing'}
                </span>
                {listing.is_negotiable && tierConfig.canNegBadge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
                    Open to offers
                  </span>
                )}
              </div>
              <p className="text-cream-muted text-sm flex items-center gap-1.5">
                <LocationIcon className="w-5 h-5 text-ember flex-shrink-0" />
                {listing.residence}
              </p>
              {listing.description && (
                <p className="text-cream text-sm leading-relaxed">{listing.description}</p>
              )}
            </div>
          </div>

          <div className="px-4 md:px-0 flex flex-col gap-4 mt-4">

            <div className="w-full grid grid-cols-3 gap-3 bg-slate-card border border-slate-border rounded-xl p-4">
<div className="flex items-start gap-2.5 min-w-0">
                <Repeat size={22} className="text-gold flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-cream-muted text-[10px] font-bold uppercase tracking-wide">Type</p>
                  <p className="text-cream text-xs font-semibold truncate">
                    {listing.listing_type === 'single' ? 'Once-off' : 'Ongoing'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 min-w-0">
                <CalendarIcon className="w-[22px] h-[22px] text-gold flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-cream-muted text-[10px] font-bold uppercase tracking-wide">Posted</p>
                  <p className="text-cream text-xs font-semibold truncate">{postedAgo(listing.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 min-w-0">
                <Wrench size={22} className="text-gold flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-cream-muted text-[10px] font-bold uppercase tracking-wide">Category</p>
                  <p className="text-cream text-xs font-semibold truncate capitalize">
                    {listing.custom_category || listing.category}
                  </p>
                </div>
              </div>
            </div>

            {isSeller && (
              <div className="flex items-center gap-4 text-cream-muted text-xs flex-wrap">
                <span className={`flex items-center gap-1 ${expiry.color}`}>
                  <CalendarIcon className="w-4 h-4" />
                  {expiry.label}
                </span>
                <span className="flex items-center gap-1">
                  <PeopleIcon className="w-4 h-4 text-ember" />
                  {listing.contact_count} interested
                </span>
              </div>
            )}

            <div className="bg-slate-card border border-slate-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowPricing(!showPricing)}
                className="w-full flex items-center gap-3 p-4 text-left"
                aria-expanded={showPricing}
              >
<Tag size={24} className="text-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gold font-bold text-sm">Pricing Options</p>
                  <p className="text-cream-muted text-xs">See what's on offer and how much it costs.</p>
                </div>
                {showPricing ? (
                  <ChevronUp size={18} className="text-cream-muted flex-shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-cream-muted flex-shrink-0" />
                )}
              </button>
              {showPricing && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  {listing.variants?.length > 0 ? (
                    listing.variants.map((v, i) => (
                      <div key={i}>
                        <p className="text-cream-muted text-[10px] font-bold uppercase tracking-wide truncate">{v.name}</p>
                        <p className="text-gold font-bold text-sm">R {v.price.toLocaleString('en-ZA')}</p>
                      </div>
                    ))
                  ) : (
                    <div>
                      <p className="text-cream-muted text-[10px] font-bold uppercase tracking-wide truncate">{listing.title}</p>
                      <p className="text-gold font-bold text-sm">R {listing.price.toLocaleString('en-ZA')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

    <div className="w-full">
              {isSeller ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleMarkSold}
                    disabled={actionLoading || listing.status === 'sold'}
                    className="flex-1 flex items-center justify-center gap-2 border border-slate-border text-cream font-bold py-3 rounded-xl disabled:opacity-40 transition-colors hover:border-teal-primary"
                  >
                    <CheckCircle size={16} />
                    {listing.status === 'sold' ? 'Sold' : 'Mark as Sold'}
                  </button>
                  {PLAN_TIERS[plan].canRenew && listing.status !== 'suspended' && (
                    <button
                      onClick={handleRenew}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl disabled:opacity-40 transition-colors"
                    >
                      <RefreshCw size={16} />
                      Renew
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleInterested}
                  disabled={actionLoading || listing.status !== 'active'}
                  className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {listing.status !== 'active'
                    ? 'Listing Unavailable'
                    : actionLoading
                    ? 'Opening chat...'
                    : "I'm Interested — Message Seller"}
                </button>
              )}
            </div>

            {seller && (
              <p className="text-cream-muted text-xs">
                Sold by{' '}
                <button
                  onClick={() => navigate(`/profile/${seller.id}`)}
                  className="text-teal-light font-semibold hover:underline"
                >
                  {seller.full_name}
                </button>
              </p>
            )}

            <hr className="border-slate-border" />
            <div>
              <p className="text-gold font-bold text-sm mb-0.5">What Students Are Saying</p>
              <p className="text-cream-muted text-xs mb-3">Real reviews from other students who bought from this seller.</p>
              {sellerRatings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sellerRatings.map(r => (
                    <div key={r.id} className="bg-slate-card border border-slate-border rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-cream text-sm font-medium truncate">
                          {r.buyer?.full_name || 'Anonymous'}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              size={12}
                              className={n <= r.stars ? 'text-gold fill-gold' : 'text-slate-border'}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-cream-muted text-xs leading-relaxed">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-cream-muted text-xs text-center py-6">
                  No reviews yet for this seller.
                </p>
              )}
            </div>
          </div>
          </div>
        </div>

      {showReportModal && (
        <ReportModal listingId={listing.id} onClose={() => setShowReportModal(false)} />
      )}

      {/* Step 1: plain yes/no ask, shown right after marking sold */}
      {soldFlowStep === 'ask' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
              <Star size={22} className="text-gold fill-gold" />
            </div>
            <h2 className="font-serif text-xl text-cream mb-2">Request a Rating?</h2>
            <p className="text-cream-muted text-sm mb-6">
              Would you like to ask the buyer to rate their experience with you? This helps build trust on your profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSoldFlowStep('pick-buyers')}
                className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors"
              >
                Yes, ask them
              </button>
              <button
                onClick={closeSoldFlow}
                className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-3 rounded-xl transition-colors"
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: who chatted about this listing — pick one or more to invite */}
      {soldFlowStep === 'pick-buyers' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-serif text-xl text-cream mb-2">Who bought this?</h2>
            <p className="text-cream-muted text-sm mb-5">
              Select everyone you'd like to invite. They'll each be asked if they want to rate you — it's entirely up to them.
            </p>
            <div className="flex flex-col gap-2 mb-5 max-h-60 overflow-y-auto">
              {recentBuyers.map(buyer => {
                const selected = selectedBuyerIds.includes(buyer.buyer_id)
                return (
                  <button
                    key={buyer.buyer_id}
                    onClick={() => toggleBuyerSelected(buyer.buyer_id)}
                    className={`flex items-center gap-3 px-4 py-3 bg-slate-card border rounded-xl transition-colors text-left ${
                      selected ? 'border-teal-primary' : 'border-slate-border hover:border-teal-light'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: buyer.avatar_color }}
                    >
                      {buyer.avatar_initials}
                    </div>
                    <span className="text-cream text-sm font-medium flex-1">{buyer.full_name}</span>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-teal-primary border-teal-primary' : 'border-slate-border'
                      }`}
                    >
                      {selected && <CheckCircle size={13} className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendInvites}
                disabled={sendingInvites || selectedBuyerIds.length === 0}
                className="flex-1 bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {sendingInvites
                  ? 'Sending...'
                  : `Send Invite${selectedBuyerIds.length > 1 ? 's' : ''}${
                      selectedBuyerIds.length > 0 ? ` (${selectedBuyerIds.length})` : ''
                    }`}
              </button>
              <button
                onClick={closeSoldFlow}
                className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-3 rounded-xl transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  )
}
