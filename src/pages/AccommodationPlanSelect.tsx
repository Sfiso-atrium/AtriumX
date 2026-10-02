import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const { currentUser, businessProfile, showToast, isLoadingAuth, isLoadingBusinessProfile } = useApp()
  const [paying, setPaying] = useState(false)
  const hasPendingDraft = !!sessionStorage.getItem('atriumx_pending_accommodation_draft')

  if (isLoadingAuth || (currentUser?.account_type === 'business' && isLoadingBusinessProfile)) {
    return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>
  }

  if (currentUser?.account_type === 'student') return null
  if (currentUser?.account_type === 'business' && businessProfile && !businessProfile.is_accommodation) return null

  const current = businessProfile?.is_accommodation ? businessProfile.accommodation_plan as AccommodationPlanKey : null
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

    if (plan === current) {
      navigate(hasPendingDraft ? '/accommodation/post?resume=1' : '/accommodation/post')
      return
    }

    if (plan === 'accommodation_free') {
      navigate(hasPendingDraft ? '/accommodation/post?resume=1' : '/accommodation/post')
      return
    }

    setPaying(true)
    const { error } = await startAccommodationPlanPayment(plan)
    if (error) {
      setPaying(false)
      showToast(error, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-28">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <h1 className="font-serif text-3xl text-cream">Accommodation plans</h1>
        <p className="text-cream-muted text-sm mt-1 mb-6">Choose the visibility and reach for your accommodation listing. If you are not signed in yet, paid plans ask only for your email and password before taking you to the matching listing form.</p>
        <div className="grid gap-4">
          {ACCOMMODATION_PLAN_ORDER.map(plan => {
            const tier = ACCOMMODATION_PLANS[plan]
            const active = plan === current
            return (
              <div key={plan} className={`w-full text-left bg-slate-card border-2 rounded-2xl p-5 transition-all ${active ? 'border-teal-light' : 'border-slate-border hover:border-teal-light'}`}>
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
                  <button onClick={() => choose(plan)} disabled={paying} className={`w-full font-bold py-2.5 rounded-xl disabled:opacity-50 ${active ? 'bg-teal-primary text-white' : 'border border-slate-border text-cream hover:border-teal-light'}`}>
                    {paying ? 'Opening payment...' : active ? 'Create listing with this plan' : currentUser && businessProfile ? `Upgrade to ${tier.label}` : `Choose ${tier.label}`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>
      {currentUser && <BottomNav />}
    </div>
  )
}
