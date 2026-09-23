import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ACCOMMODATION_PLAN_ORDER, ACCOMMODATION_PLANS, AccommodationPlanKey, startAccommodationPlanPayment } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

const FEATURES: Record<AccommodationPlanKey, string[]> = {
  accommodation_free: ['1 university', '1 property', 'Basic visibility'],
  accommodation_featured: ['2 universities', '3 properties', 'Featured placement', 'Accommodation reviews can be replied to'],
  accommodation_premium: ['3 universities', '10 properties', 'Premium featured placement', 'Accommodation reviews can be replied to'],
}

export default function AccommodationPlanSelect() {
  const navigate = useNavigate()
  const { currentUser, businessProfile, showToast, isLoadingAuth } = useApp()
  const [paying, setPaying] = useState(false)

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>
  if (!currentUser || currentUser.account_type !== 'business' || !businessProfile?.is_accommodation) return null

  const current = businessProfile.accommodation_plan as AccommodationPlanKey

  async function choose(plan: AccommodationPlanKey) {
    if (paying || plan === current) return
    if (plan === 'accommodation_free') {
      navigate('/accommodation')
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
        <p className="text-cream-muted text-sm mt-1 mb-6">Choose the visibility and reach for your accommodation properties.</p>
        <div className="grid gap-4">
          {ACCOMMODATION_PLAN_ORDER.map(plan => {
            const tier = ACCOMMODATION_PLANS[plan]
            const active = plan === current
            return (
              <button key={plan} onClick={() => choose(plan)} disabled={paying || active} className={`w-full text-left bg-slate-card border-2 rounded-2xl p-5 transition-all ${active ? 'border-teal-light opacity-70 cursor-not-allowed' : 'border-slate-border hover:border-teal-light'}`}>
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
              </button>
            )
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
