import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PLAN_TIERS, PlanKey } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
const PLAN_FEATURES: Record<PlanKey, string[]> = {
  ghost: [
    'Text-only listing',
    '1 active listing',
    '3 messages per conversation',
    '3-day visibility',
    'Visible to all students',
  ],
  flash: [
    '1 photo per listing',
    '1 listing, 48 hours only',
    '10 messages per conversation',
    'Price negotiation badge',
    'Visible to all students',
  ],
  visible: [
    '1 photo per listing',
    'Up to 3 active listings',
    'Unlimited messaging',
    'Push notification on interest',
    '7-day visibility',
    'Listing renewal (once)',
  ],
  loud: [
    'Up to 3 photos per listing',
    '8 active listings',
    'Unlimited messaging',
    'Boosted feed placement',
    'Basic analytics',
    'Highlighted card border',
    'Verified seller badge',
    'Bulk post up to 3 listings',
    '14-day visibility',
  ],
  unmissable: [
    'Up to 5 photos + video',
    'Unlimited active listings',
    'Pinned to top of category',
    'Full analytics dashboard',
    'Search ranking boost',
    'Seller Spotlight eligibility',
    'Buyer identity visibility',
    'All Loud features',
    '30-day visibility',
  ],
}

const PLAN_COLORS: Record<PlanKey, string> = {
  ghost: 'border-slate-border',
  flash: 'border-teal-primary',
  visible: 'border-teal-light',
  loud: 'border-gold',
  unmissable: 'border-ember',
}

export default function PlanSelect() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [selected, setSelected] = useState<PlanKey | null>(null)

  const plans = Object.entries(PLAN_TIERS) as [PlanKey, typeof PLAN_TIERS[PlanKey]][]
  const currentPlan = currentUser?.plan as PlanKey | undefined

  return (
    <div className="min-h-screen bg-slate-deep">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        <h1 className="font-serif text-3xl text-cream mb-1">Choose Your Plan</h1>
        <p className="text-cream-muted text-sm mb-8">
          Select a plan for this listing. You can change plans anytime.
        </p>

        {currentPlan && (
          <div className="bg-teal-faint border border-teal-primary rounded-xl px-4 py-3 mb-6 text-cream-muted text-sm">
            You are currently on the{' '}
            <span className="text-cream font-bold">{PLAN_TIERS[currentPlan].label}</span> plan.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {plans.map(([key, tier]) => {
            const isSelected = selected === key
            const isCurrent = currentPlan === key
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
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
                    <span className="text-gold font-bold text-xl">{tier.price}</span>
                    <span className="text-cream-muted text-xs ml-1">/ {tier.days}d</span>
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

        <button
          disabled={!selected}
          onClick={() => selected && navigate('/post', { state: { plan: selected } })}
          className="w-full mt-6 bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
        >
          {selected ? `Continue with ${PLAN_TIERS[selected].label}` : 'Select a plan'}
        </button>
      </div>
  </div>
    <BottomNav />
  )
}
