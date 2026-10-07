import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ACCOMMODATION_PLAN_ORDER, ACCOMMODATION_PLANS, AccommodationPlanKey, startAccommodationPlanPayment } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

const FEATURES: Record<AccommodationPlanKey, string[]> = {
  accommodation_free: ['1 university', '1 accommodation listing', 'Up to 3 photos', 'Basic visibility'],
  accommodation_featured: ['2 universities', '1 accommodation listing', 'Up to 12 photos', 'Featured placement', 'Accommodation reviews can be replied to'],
  accommodation_premium: ['3 universities', '1 accommodation listing', 'Up to 30 photos', 'Premium featured placement', 'Optional property video', 'Accommodation reviews can be replied to'],
}

export default function AccommodationPlanSelect() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { managePlan?: boolean } | null
  const managePlan = !!routeState?.managePlan
  const { currentUser, businessProfile, showToast, isLoadingAuth, isLoadingBusinessProfile } = useApp()
  const [paying, setPaying] = useState(false)
  const hasPendingDraft = !!sessionStorage.getItem('atriumx_pending_accommodation_draft')

  if (isLoadingAuth || (currentUser?.account_type === 'business' && isLoadingBusinessProfile)) {
    return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>
  }

  if (currentUser?.account_type === 'student') return null
  if (currentUser?.account_type === 'business' && businessProfile && !businessProfile.is_accommodation) return null

  const current = businessProfile?.is_accommodation ? businessProfile.accommodation_plan as AccommodationPlanKey : null
  const paidPlanIsActive = !!businessProfile?.is_accommodation
    && current !== 'accommodation_free'
    && !!businessProfile.accommodation_plan_expires_at
    && new Date(businessProfile.accommodation_plan_expires_at) > new Date()
  const needsProfileSetup = currentUser?.account_type === 'business' && !businessProfile

  async function choose(plan: AccommodationPlanKey) {
    if (paying) return

    if (!currentUser) {
      if (plan === 'accommodation_free') {
        navigate('/accommodation/post')
      } else {
        navigate(`/retailer/signup?accommodation=1&quick=1&package=${plan}`)
      }
      return
    }

    if (needsProfileSetup) {
      navigate(`/accommodation/post?setup=1&plan=${plan}`)
      return
    }

    const currentRank = current ? ACCOMMODATION_PLAN_ORDER.indexOf(current) : -1
    const targetRank = ACCOMMODATION_PLAN_ORDER.indexOf(plan)

    if (paidPlanIsActive && current && targetRank < currentRank) {
      showToast(
        `Your ${ACCOMMODATION_PLANS[current].label} plan stays active until ${new Date(businessProfile!.accommodation_plan_expires_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}. AtriumX does not renew it automatically. After it ends, you can choose this lower plan.`,
        'info'
      )
      return
    }

    if (plan === current && paidPlanIsActive && managePlan) {
      setPaying(true)
      const { error } = await startAccommodationPlanPayment(
        plan as Exclude<AccommodationPlanKey, 'accommodation_free'>,
        'renewal'
      )
      if (error) {
        setPaying(false)
        showToast(error, 'error')
      }
      return
    }

    if (plan === current) {
      navigate(hasPendingDraft ? '/accommodation/post?resume=1' : '/accommodation/post')
      return
    }

    if (plan === 'accommodation_free') {
      navigate(hasPendingDraft ? '/accommodation/post?resume=1' : '/accommodation/post')
      return
    }

    setPaying(true)
    const { error } = await startAccommodationPlanPayment(
      plan,
      paidPlanIsActive && current && targetRank > currentRank ? 'upgrade' : 'purchase'
    )
    if (error) {
      setPaying(false)
      showToast(error, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-28">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <h1 className="font-serif text-3xl text-cream">{managePlan ? 'Manage accommodation plan' : 'Accommodation plans'}</h1>
        <p className="text-cream-muted text-sm mt-1 mb-4">Choose the visibility and reach for your accommodation listing. Paid plans are one-time purchases — AtriumX never renews or charges them automatically.</p>
        {paidPlanIsActive && businessProfile?.accommodation_plan_expires_at && current && (
          <div className="mb-6 rounded-2xl border border-slate-border bg-slate-card p-4">
            <p className="text-cream text-sm font-semibold">
              {ACCOMMODATION_PLANS[current].label} is active until {new Date(businessProfile.accommodation_plan_expires_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
            <p className="text-cream-muted text-xs mt-1">
              Renewing requires a new PayFast payment. If you do nothing, the accommodation account falls back to Free when this period ends.
            </p>
          </div>
        )}
        <div className="grid gap-4">
          {ACCOMMODATION_PLAN_ORDER.map(plan => {
            const tier = ACCOMMODATION_PLANS[plan]
            const active = plan === current
            const currentRank = current ? ACCOMMODATION_PLAN_ORDER.indexOf(current) : -1
            const targetRank = ACCOMMODATION_PLAN_ORDER.indexOf(plan)
            const lowerWhilePaid = paidPlanIsActive && currentRank >= 0 && targetRank < currentRank
            return (
              <div key={plan} className={`w-full text-left bg-slate-card border-2 rounded-2xl p-5 transition-all ${active ? 'border-teal-light' : 'border-slate-border'} ${lowerWhilePaid ? 'opacity-50' : 'hover:border-teal-light'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-cream font-bold text-lg">{tier.label}</p>
                    {active && <span className="text-[11px] text-teal-light font-semibold">Current plan</span>}
                  </div>
                  <span className="text-cream font-bold text-xl">{tier.price}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {FEATURES[plan].map(f => <li key={f} className="flex items-center gap-2 text-sm text-cream-muted"><Check size={14} className="text-teal-light" />{f}</li>)}
                </ul>
                <div className="mt-5">
                  <button onClick={() => choose(plan)} disabled={paying || lowerWhilePaid} className={`w-full font-bold py-2.5 rounded-xl disabled:opacity-50 ${active ? 'bg-teal-primary text-white' : 'border border-slate-border text-cream hover:border-teal-light'}`}>
                    {paying
                      ? 'Opening payment...'
                      : lowerWhilePaid
                        ? 'Available after current plan ends'
                        : active && paidPlanIsActive && managePlan
                          ? `Renew ${tier.label} — ${tier.price}`
                          : active
                            ? 'Continue with this plan'
                            : paidPlanIsActive && current && targetRank > currentRank
                              ? `Upgrade to ${tier.label} — ${tier.price}`
                              : plan === 'accommodation_free'
                                ? 'Choose Free'
                                : `Choose ${tier.label} — ${tier.price}`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-cream-muted text-xs text-center mt-6">
          Choosing a paid option shows your price and any unused-time credit before PayFast. Your accommodation plan changes only after PayFast confirms the payment.
        </p>
      </main>
      {currentUser && <BottomNav />}
    </div>
  )
}
