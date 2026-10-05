import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PLAN_TIERS, PLAN_ORDER, PlanKey, getUserListings, isPaidPlan, startPlanPayment } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
type StudentPlanKey = 'ghost' | 'visible' | 'loud' | 'unmissable'
const PLAN_FEATURES: Record<StudentPlanKey, string[]> = {
  ghost: [
    'Text only — no photos',
    '1 active listing',
    '3 messages per conversation',
    '3-day visibility',
  ],
  visible: [
    '1 photo per listing',
    '1 active listing',
    '10 messages per conversation',
    '"Spotted" badge on your listings',
    '7-day visibility',
    'Manual renewal — no automatic billing',
  ],
  loud: [
    'Up to 2 photos per listing',
    'Up to 2 active listings',
    'Unlimited messaging',
    'Boosted feed placement',
    '"Verified" badge on your listings',
    '14-day visibility',
  ],
  unmissable: [
    'Up to 3 photos',
    'Up to 3 active listings',
    'Pinned to top of category',
    '"Featured" badge on your listing cards',
    'All Loud features',
    '30-day visibility',
  ],
}

const PLAN_COLORS: Record<StudentPlanKey, string> = {
  ghost: 'border-slate-border',
  visible: 'border-teal-light',
  loud: 'border-gold',
  unmissable: 'border-ember',
}

export default function PlanSelect() {
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

  const plans = PLAN_ORDER.map(k => [k, PLAN_TIERS[k]] as [StudentPlanKey, typeof PLAN_TIERS[StudentPlanKey]])
  const currentPlan = currentUser?.plan as PlanKey | undefined
  const planIsActive = !!currentPlan && currentPlan !== 'ghost' &&
    !!currentUser?.plan_expires_at && new Date(currentUser.plan_expires_at) > new Date()

useEffect(() => {
    if (isLoadingAuth || !currentUser) return

    if (currentUser.account_type === 'business') {
      navigate('/business/plan-select', { replace: true })
      return
    }

    // Came here explicitly wanting to see plan options (e.g. "Upgrade to
    // add photos") — skip the under-limit shortcut entirely, or this would
    // just bounce them straight back to where they clicked from.
    if (forcePlans) { setView('grid'); return }

    const plan = currentUser.plan as PlanKey

    getUserListings(currentUser.id).then(listings => {
      // Never posted before — always let them see what's on offer.
      if (listings.length === 0) { setView('grid'); return }

      const active = listings.filter(l => l.plan_enabled !== false && (l.status === 'active' || l.status === 'pending')).length
      const max = PLAN_TIERS[plan].maxListings
      const planActive = plan !== 'ghost'
        ? !!currentUser.plan_expires_at && new Date(currentUser.plan_expires_at) > new Date()
        : true

      // Paid plan lapsed — treat like a fresh choice.
      if (!planActive) { setView('grid'); return }

      if (active < max) {
        navigate('/post', { state: { plan }, replace: true })
        return
      }

      setView(plan === 'unmissable' ? 'maxed' : 'upgrade')
    })
  }, [currentUser, isLoadingAuth, navigate, forcePlans])

  const handleSelectPlan = async (key: PlanKey) => {
    const currentRank = currentPlan ? PLAN_ORDER.indexOf(currentPlan) : -1
    const targetRank = PLAN_ORDER.indexOf(key)

    if (planIsActive && currentPlan && targetRank < currentRank) {
      showToast(
        `Your ${PLAN_TIERS[currentPlan].label} plan stays active until ${new Date(currentUser!.plan_expires_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}. AtriumX does not renew it automatically. After it ends, you can choose this lower plan.`,
        'info'
      )
      return
    }

    setSelected(key)

    const alreadyOnThisPlan = planIsActive && currentPlan === key
    const wantsRenewal = alreadyOnThisPlan && (managePlan || !!renewalListingId)
    const wantsUpgrade = planIsActive && currentPlan != null && targetRank > currentRank

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
      showToast('This is already your active plan. Free plans do not need renewal.', 'info')
      return
    }

    navigate('/post', { state: { plan: key } })
  }
 if (isLoadingAuth || view === 'checking') return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted text-sm">Loading...</p>
    </div>
  )

  if (view === 'maxed') return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-16 pb-24 text-center flex flex-col items-center">
          <p className="text-cream font-bold text-2xl mb-2">Listing Limit Reached</p>
          <p className="text-cream-muted text-sm mb-6 max-w-sm">
            You're already on our top plan, Unmissable, which allows up to {PLAN_TIERS.unmissable.maxListings} active
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
          {planIsActive && currentUser?.plan_expires_at && (
            <div className="mb-5 rounded-2xl border border-slate-border bg-slate-card p-4">
              <p className="text-cream text-sm font-semibold">
                {PLAN_TIERS[currentPlan!].label} is active until {new Date(currentUser.plan_expires_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
              <p className="text-cream-muted text-xs mt-1">
                Renewing requires a new PayFast payment. If you do nothing, the paid plan ends and your account falls back to Ghost automatically.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {plans.map(([key, tier]) => {
              const isSelected = selected === key
              const isCurrent = currentPlan === key
              const isLowerThanCurrent = planIsActive && currentPlan
                ? PLAN_ORDER.indexOf(key) < PLAN_ORDER.indexOf(currentPlan)
                : false
              return (
          <button
                  key={key}
                  onClick={() => handleSelectPlan(key)}
                  disabled={paying || isLowerThanCurrent}
className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
                    paying ? 'opacity-50 cursor-wait' : ''
                  } ${
                    isLowerThanCurrent ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isSelected ? PLAN_COLORS[key] + ' bg-slate-card' : 'border-slate-border bg-slate-card hover:border-teal-primary'
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
                        <span className="text-xs bg-teal-faint text-teal-light px-2 py-0.5 rounded-full font-medium">
                          {key === 'ghost' || planIsActive ? 'Current' : 'Expired'}
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
                        <Check size={12} className="text-teal-light mt-0.5 flex-shrink-0" />
                        <span className="text-cream-muted text-xs">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 ml-8 text-xs font-semibold text-teal-light">
                    {isLowerThanCurrent
                      ? 'Available after your current paid period ends'
                      : isCurrent && planIsActive && (managePlan || renewalListingId)
                        ? `Renew — ${tier.price} one-time payment`
                        : planIsActive && currentPlan && PLAN_ORDER.indexOf(key) > PLAN_ORDER.indexOf(currentPlan)
                          ? `Upgrade — ${tier.price} one-time payment`
                          : tier.priceNum > 0
                            ? `Choose — ${tier.price} one-time payment`
                            : 'Use free plan'}
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
