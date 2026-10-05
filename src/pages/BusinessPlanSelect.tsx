import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PLAN_TIERS, BUSINESS_PLAN_ORDER, PlanKey, getUserListings, isPaidPlan, startPlanPayment } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

type BusinessPlanKey = 'noticeboard' | 'featured' | 'campus_partner'

const PLAN_FEATURES: Record<BusinessPlanKey, string[]> = {
  noticeboard: [
    '1 university reach',
    'Up to 3 photos per listing',
    '1 active listing',
    '7-day visibility',
  ],
  featured: [
    'Reach up to 2 universities',
    'Up to 5 photos per listing',
    'Up to 2 active listings',
    'Reply to student messages',
    '"Sponsored" badge on your listings',
    '30-day visibility',
  ],
  campus_partner: [
    'Reach up to 3 universities',
    'Up to 10 photos per listing',
    '1 optional listing video',
    'Up to 3 active listings',
    'Reply to student messages',
    'Reply to reviews',
    'Pinned to top of the Business tab',
    '"Campus Partner" badge on your listings',
    '30-day visibility',
  ],
}

const PLAN_COLORS: Record<BusinessPlanKey, string> = {
  noticeboard: 'border-slate-border',
  featured: 'border-sapphire-light',
  campus_partner: 'border-gold',
}

export default function BusinessPlanSelect() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { forcePlans?: boolean; managePlan?: boolean; renewalListingId?: string } | null
  const forcePlans = !!routeState?.forcePlans
  const managePlan = !!routeState?.managePlan
  const renewalListingId = routeState?.renewalListingId ?? null
  const { currentUser, showToast, isLoadingAuth } = useApp()
  const [selected, setSelected] = useState<PlanKey | null>(null)
  const [paying, setPaying] = useState(false)
  const [view, setView] = useState<'checking' | 'grid' | 'upgrade' | 'maxed'>('checking')
  const hasPendingDraft = !!sessionStorage.getItem('atriumx_pending_business_draft')

  const plans = BUSINESS_PLAN_ORDER.map(k => [k, PLAN_TIERS[k]] as [BusinessPlanKey, typeof PLAN_TIERS[BusinessPlanKey]])
  const currentPlan = currentUser?.plan as PlanKey | undefined
  const paidPlanIsActive = !!currentPlan && currentPlan !== 'noticeboard' &&
    !!currentUser?.plan_expires_at && new Date(currentUser.plan_expires_at) > new Date()
  const planIsActive = currentPlan === 'noticeboard' || paidPlanIsActive

  useEffect(() => {
    if (isLoadingAuth || !currentUser) return
    if (currentUser.account_type !== 'business') { navigate('/plan-select'); return }

    if (forcePlans) { setView('grid'); return }

    const plan = currentUser.plan as PlanKey

    getUserListings(currentUser.id).then(listings => {
      if (listings.length === 0) { setView('grid'); return }

      const active = listings.filter(l => l.plan_enabled !== false && (l.status === 'active' || l.status === 'pending')).length
      const max = PLAN_TIERS[plan].maxListings
      const planActive = plan !== 'noticeboard'
        ? !!currentUser.plan_expires_at && new Date(currentUser.plan_expires_at) > new Date()
        : true

      if (!planActive) { setView('grid'); return }

      if (active < max) {
        navigate('/business/post', { state: { plan }, replace: true })
        return
      }

      setView(plan === 'campus_partner' ? 'maxed' : 'upgrade')
    })
  }, [currentUser, isLoadingAuth, navigate, forcePlans])

  const handleSelectPlan = async (key: PlanKey) => {
    const currentRank = currentPlan ? BUSINESS_PLAN_ORDER.indexOf(currentPlan) : -1
    const targetRank = BUSINESS_PLAN_ORDER.indexOf(key)

    if (paidPlanIsActive && currentPlan && targetRank < currentRank) {
      showToast(
        `Your ${PLAN_TIERS[currentPlan].label} plan stays active until ${new Date(currentUser!.plan_expires_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}. AtriumX does not renew it automatically. After it ends, you can choose this lower plan.`,
        'info'
      )
      return
    }

    setSelected(key)

    const alreadyOnThisPlan = planIsActive && currentPlan === key
    const wantsRenewal = paidPlanIsActive && currentPlan === key && (managePlan || !!renewalListingId)
    const wantsUpgrade = paidPlanIsActive && currentPlan != null && targetRank > currentRank

    if (isPaidPlan(key) && (!alreadyOnThisPlan || wantsRenewal)) {
      setPaying(true)
      const { error } = await startPlanPayment(key, {
        intent: wantsRenewal ? 'renewal' : wantsUpgrade ? 'upgrade' : 'purchase',
        listingId: renewalListingId,
      })
      if (error) {
        setPaying(false)
        setSelected(null)
        showToast(error, 'error')
      }
      return
    }

    if (managePlan && alreadyOnThisPlan) {
      showToast('This is already your active free plan. It does not renew or charge automatically.', 'info')
      return
    }

    navigate(hasPendingDraft ? '/business/post?resume=1' : '/business/post', { state: { plan: key } })
  }

  if (isLoadingAuth || view === 'checking') return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted text-sm">Loading...</p>
    </div>
  )

  if (!currentUser || currentUser.account_type !== 'business') return null

  if (view === 'maxed') return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-16 pb-24 text-center flex flex-col items-center">
          <p className="text-cream font-bold text-2xl mb-2">Listing Limit Reached</p>
          <p className="text-cream-muted text-sm mb-6 max-w-sm">
            You're already on our top plan, Campus Partner, which allows up to {PLAN_TIERS.campus_partner.maxListings} active
            listings — and you've used all of them. To post something new, mark one of your current listings as sold first.
          </p>
          <button
            onClick={() => navigate(`/profile/${currentUser!.id}`)}
            className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Go to My Listings
          </button>
        </div>
      </div>
      <BottomNav />
    </>
  )

  if (view === 'upgrade') return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-16 pb-24 text-center flex flex-col items-center">
          <p className="text-cream font-bold text-2xl mb-2">Listing Limit Reached</p>
          <p className="text-cream-muted text-sm mb-6 max-w-sm">
            Your {PLAN_TIERS[currentPlan!].label} plan allows up to {PLAN_TIERS[currentPlan!].maxListings} active
            listing{PLAN_TIERS[currentPlan!].maxListings !== 1 ? 's' : ''}. Upgrade to post more at the same time.
          </p>
          <button
            onClick={() => setView('grid')}
            className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Choose a New Plan
          </button>
        </div>
      </div>
      <BottomNav />
    </>
  )

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
<h1 className="font-serif text-3xl text-cream mb-1">{managePlan || renewalListingId ? 'Manage Your Plan' : 'Choose Your Plan'}</h1>
          <p className="text-cream-muted text-sm mb-4">
            Paid plans are one-time purchases. AtriumX never renews or charges them automatically.
          </p>
          {paidPlanIsActive && currentUser?.plan_expires_at && (
            <div className="mb-5 rounded-2xl border border-slate-border bg-slate-card p-4">
              <p className="text-cream text-sm font-semibold">
                {PLAN_TIERS[currentPlan!].label} is active until {new Date(currentUser.plan_expires_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
              <p className="text-cream-muted text-xs mt-1">
                Renewing requires a new PayFast payment. If you do nothing, the paid plan ends and the account falls back to Noticeboard automatically.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {plans.map(([key, tier]) => {
              const isSelected = selected === key
              const isCurrent = currentPlan === key
              const isLowerThanCurrent = planIsActive && currentPlan
                ? BUSINESS_PLAN_ORDER.indexOf(key) < BUSINESS_PLAN_ORDER.indexOf(currentPlan)
                : false
              return (
                <button
                  key={key}
                  onClick={() => handleSelectPlan(key)}
                  disabled={paying || isLowerThanCurrent}
                  className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
                    isLowerThanCurrent ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isSelected ? PLAN_COLORS[key] + ' bg-slate-card' : 'border-slate-border bg-slate-card hover:border-sapphire-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-ember bg-ember' : 'border-slate-border'
                      }`}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-cream font-bold text-lg">{tier.label}</span>
                      {isCurrent && (
                        <span className="text-xs bg-sapphire-light/10 text-sapphire-light px-2 py-0.5 rounded-full font-medium">
                          {key === 'noticeboard' || paidPlanIsActive ? 'Current' : 'Expired'}
                        </span>
                      )}
                    </div>
<div className="text-right">
                      <span className="text-gold font-bold text-xl">{tier.price}</span>
                      <span className="text-cream-muted text-xs ml-1 block md:inline">/ {tier.days}d</span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-1 ml-8">
                    {PLAN_FEATURES[key].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={12} className="text-sapphire-light mt-0.5 flex-shrink-0" />
                        <span className="text-cream-muted text-xs">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 ml-8 text-xs font-semibold text-sapphire-light">
                    {paidPlanIsActive && currentPlan && BUSINESS_PLAN_ORDER.indexOf(key) < BUSINESS_PLAN_ORDER.indexOf(currentPlan)
                      ? 'Available after your current paid period ends'
                      : isCurrent && paidPlanIsActive && (managePlan || renewalListingId)
                        ? `Renew — ${tier.price} one-time payment`
                        : paidPlanIsActive && currentPlan && BUSINESS_PLAN_ORDER.indexOf(key) > BUSINESS_PLAN_ORDER.indexOf(currentPlan)
                          ? `Upgrade — ${tier.price} one-time payment`
                          : tier.priceNum > 0
                            ? `Choose — ${tier.price} one-time payment`
                            : 'Free plan · no automatic billing'}
                  </p>
                </button>
              )
            })}
          </div>

          <p className="text-cream-muted text-xs text-center mt-6">
            Choosing a paid option opens PayFast. Your plan changes only after PayFast confirms the payment.
          </p>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
