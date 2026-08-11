import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PLAN_TIERS, PLAN_ORDER, PlanKey, getUserListings } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
type StudentPlanKey = 'ghost' | 'visible' | 'loud' | 'unmissable'
const PLAN_FEATURES: Record<StudentPlanKey, string[]> = {
  ghost: [
    'Text-only listing',
    '1 active listing',
    '3 messages per conversation',
    '3-day visibility',
  ],
  visible: [
    '1 photo per listing',
    'Up to 2 active listings',
    '10 messages per conversation',
    '"Spotted" badge on your listings',
    'Push notification on interest',
    '7-day visibility',
    'Listing renewal (once)',
  ],
  loud: [
    'Up to 3 photos per listing',
    'Up to 3 active listings',
    'Unlimited messaging',
    'Boosted feed placement',
    '"Verified" badge on your listings',
    'Bulk post up to 3 listings',
    '14-day visibility',
  ],
  unmissable: [
    'Up to 5 photos + video',
    'Up to 6 active listings',
    'Pinned to top of category',
    'Search ranking boost',
    'Gold "★ Featured" banner on your listing cards',
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
  const forcePlans = !!(location.state as { forcePlans?: boolean } | null)?.forcePlans
  const { currentUser, showToast, isLoadingAuth } = useApp()
  const [selected, setSelected] = useState<PlanKey | null>(null)
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

      const active = listings.filter(l => l.status === 'active' || l.status === 'pending').length
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

  const handleSelectPlan = (key: PlanKey) => {
    if (planIsActive && currentPlan) {
      const currentRank = PLAN_ORDER.indexOf(currentPlan)
      const targetRank = PLAN_ORDER.indexOf(key)
      if (targetRank < currentRank) {
        showToast(
          `You're on the ${PLAN_TIERS[currentPlan].label} plan until ${new Date(currentUser!.plan_expires_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}. You can't switch to a lower plan while it's still active.`,
          'error'
        )
        return
      }
    }
    setSelected(key)
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
<h1 className="font-serif text-3xl text-cream mb-1">Choose Your Plan</h1>
          <p className="text-cream-muted text-sm mb-4">
            Select a plan for this listing. You can change plans anytime.
          </p>

          <div className="bg-gold/10 border border-gold/30 rounded-2xl px-5 py-4 mb-8">
            <p className="text-cream font-bold text-sm md:text-base leading-snug">
              🎓 You're one of our Founding Students — every plan, including Unmissable, is{' '}
              <span className="text-gold">100% free for August</span>. No card, no catch. Grab the tier
              that gets your stuff seen before pricing kicks in on September 1st.
            </p>
          </div>

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
className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
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
                          Current
                        </span>
                      )}
                    </div>
 <div className="text-right">
                      {tier.priceNum > 0 ? (
                        <>
                          <span className="text-cream-muted text-xs line-through mr-1.5">{tier.price}</span>
                          <span className="text-gold font-bold text-xl">Free</span>
                        </>
                      ) : (
                        <span className="text-gold font-bold text-xl">{tier.price}</span>
                      )}
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
                </button>
              )
            })}
          </div>

<p className="text-cream-muted text-xs text-center mt-6">
            Tap a plan above to go straight to the listing form.
          </p>
        </div>
    </div>
      <BottomNav />
    </>
  )
}
