import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Flag, Users, RefreshCw, CircleCheck as CheckCircle, Star } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/common/BottomNav'
import ReportModal from '../components/student/ReportModal'
import {
  Listing, Profile, RecentBuyer, getListingById,
  startConversation, markListingAsSold,
  renewListing, getRecentBuyers, sendRatingInvite,
  getConversationsForListing,
  PLAN_TIERS, PlanKey
} from '../services/dataService'

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
  const lowestVariantPrice = listing.variants?.length
    ? Math.min(...listing.variants.map(v => v.price))
    : null

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
        <div className="max-w-lg mx-auto pb-32">
          {listing.video_url ? (
            <video
              src={listing.video_url}
              controls
              className="w-full aspect-video object-cover bg-black"
              poster={listing.image_urls?.[0] || undefined}
            />
          ) : listing.image_urls?.length > 0 ? (
            <div className="w-full">
              <img
                src={listing.image_urls[activeImage]}
                alt={listing.title}
                className="w-full aspect-video object-cover"
              />
              {listing.image_urls.length > 1 && (
                <div className="flex gap-2 px-4 py-2 overflow-x-auto">
                  {listing.image_urls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        activeImage === idx ? 'border-ember' : 'border-slate-border'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-teal-faint flex items-center justify-center">
              <span className="text-cream-muted text-sm">No photo</span>
            </div>
          )}
          <div className="px-4 pt-5 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-faint text-teal-light capitalize">
                {listing.custom_category || listing.category}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-card border border-slate-border text-cream-muted capitalize">
                {listing.listing_type === 'single' ? 'Once-off' : 'Ongoing'}
              </span>
              {listing.is_negotiable && tierConfig.canNegBadge && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
                  Open to offers
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl text-cream">{listing.title}</h1>

            <div>
              {lowestVariantPrice !== null ? (
                <p className="text-gold font-bold text-3xl">From R {lowestVariantPrice.toLocaleString('en-ZA')}</p>
              ) : (
                <p className="text-gold font-bold text-3xl">R {listing.price.toLocaleString('en-ZA')}</p>
              )}
            </div>

            {listing.variants?.length > 0 && (
              <div className="bg-slate-card border border-slate-border rounded-xl p-4">
                <p className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-3">Available Options</p>
                {listing.variants.map((v, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-border last:border-0">
                    <span className="text-cream text-sm">{v.name}</span>
                    <span className="text-gold font-bold text-sm">R {v.price.toLocaleString('en-ZA')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-cream-muted text-xs">
              <span className={expiry.color}>{expiry.label}</span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {listing.contact_count} interested
              </span>
              <span>{listing.residence}</span>
            </div>

            <hr className="border-slate-border" />

            <p className="text-cream text-sm leading-relaxed">{listing.description}</p>

            {seller && (
              <>
                <hr className="border-slate-border" />
                <button
                  onClick={() => navigate(`/profile/${seller.id}`)}
                  className="flex items-center gap-3 text-left"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: seller.avatar_color }}
                  >
                    {seller.avatar_initials}
                  </div>
                  <div>
                    <p className="text-cream font-bold text-sm">{seller.full_name}</p>
                    <p className="text-cream-muted text-xs">
                      {seller.avg_rating > 0 ? `${seller.avg_rating} ★ (${seller.total_ratings}) · ` : ''}
                      {seller.residence || 'Campus'}
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="fixed bottom-16 left-0 right-0 z-40 bg-slate-deep border-t border-slate-border px-4 py-3 max-w-lg mx-auto">
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
