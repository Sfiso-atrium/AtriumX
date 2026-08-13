import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PLAN_TIERS, BUSINESS_PLAN_ORDER, PlanKey, getUserListings } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

type BusinessPlanKey = 'noticeboard' | 'featured' | 'campus_partner'

const PLAN_FEATURES: Record<BusinessPlanKey, string[]> = {
  noticeboard: [
    'Text-only listing',
    '1 active listing',
    '7-day visibility',
  ],
  featured: [
    '1 photo per listing',
    'Up to 3 active listings',
    'Reply to student messages',
    '"Sponsored" badge on your listings',
    '14-day visibility',
  ],
  campus_partner: [
    'Up to 3 photos per listing',
    'Up to 6 active listings',
    'Reply to student messages',
    'Reply to reviews',
    'Pinned to top of the Business tab',
    'Gold "Campus Partner" banner on your listings',
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
  const forcePlans = !!(location.state as { forcePlans?: boolean } | null)?.forcePlans
  const { currentUser, showToast, isLoadingAuth } = useApp()
  const [selected, setSelected] = useState<PlanKey | null>(null)
  const [view, setView] = useState<'checking' | 'grid' | 'upgrade' | 'maxed'>('checking')

  const plans = BUSINESS_PLAN_ORDER.map(k => [k, PLAN_TIERS[k]] as [BusinessPlanKey, typeof PLAN_TIERS[BusinessPlanKey]])
  const currentPlan = currentUser?.plan as PlanKey | undefined
  const planIsActive = !!currentPlan && currentPlan !== 'noticeboard' &&
    !!currentUser?.plan_expires_at && new Date(currentUser.plan_expires_at) > new Date()

  useEffect(() => {
    if (isLoadingAuth || !currentUser) return
    if (currentUser.account_type !== 'business') { navigate('/plan-select'); return }

    if (forcePlans) { setView('grid'); return }

    const plan = currentUser.plan as PlanKey

    getUserListings(currentUser.id).then(listings => {
      if (listings.length === 0) { setView('grid'); return }

      const active = listings.filter(l => l.status === 'active' || l.status === 'pending').length
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

  const handleSelectPlan = (key: PlanKey) => {
    if (planIsActive && currentPlan) {
      const currentRank = BUSINESS_PLAN_ORDER.indexOf(currentPlan)
      const targetRank = BUSINESS_PLAN_ORDER.indexOf(key)
      if (targetRank < currentRank) {
        showToast(
          `You're on the ${PLAN_TIERS[currentPlan].label} plan until ${new Date(currentUser!.plan_expires_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}. You can't switch to a lower plan while it's still active.`,
          'error'
        )
        return
      }
    }
    setSelected(key)
    navigate('/business/post', { state: { plan: key } })
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
<h1 className="font-serif text-3xl text-cream mb-1">Choose Your Plan</h1>
          <p className="text-cream-muted text-sm mb-4">
            Select a plan for this listing. You can change plans anytime.
          </p>

          <div className="bg-gold/10 border border-gold/30 rounded-2xl px-5 py-4 mb-8">
            <p className="text-cream font-bold text-sm md:text-base leading-snug">
              🎉 You're one of our Founding Businesses — every plan, including Campus Partner, is{' '}
              <span className="text-gold">100% free for August</span>. No card, no catch. Grab the tier
              that gets you seen before pricing kicks in on September 1st.
            </p>
          </div>

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
                          Current
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
