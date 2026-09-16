// src/pages/PaymentResult.tsx
//
// Where PayFast sends the person back to. Serves both /payment/success
// and /payment/cancelled.
//
// Worth being clear about what this page is and isn't: landing on
// /payment/success does NOT mean the payment cleared, and this page
// deliberately never treats it that way. Anyone can type that URL. The
// only thing that actually grants a plan is the payfast-itn callback,
// server to server. So this page polls the payments table (read-only,
// RLS-scoped to the person) and waits for that callback to land.
//
// The wait is usually a second or two, but PayFast doesn't guarantee the
// ITN arrives before the redirect does, so a short "confirming" state is
// the honest thing to show rather than a premature success message.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getLatestPayment, getUserById, PLAN_TIERS, PlanKey } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

type Status = 'confirming' | 'complete' | 'slow' | 'cancelled' | 'failed'

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 12 // ~30 seconds before we stop and explain

export default function PaymentResult() {
  const navigate = useNavigate()
  const { outcome } = useParams<{ outcome: string }>()
  const { currentUser, setCurrentUser } = useApp()

  const [status, setStatus] = useState<Status>(
    outcome === 'cancelled' ? 'cancelled' : 'confirming'
  )
  const [planKey, setPlanKey] = useState<PlanKey | null>(null)

  useEffect(() => {
    if (outcome === 'cancelled' || !currentUser) return

    let polls = 0
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      polls += 1

      const payment = await getLatestPayment(currentUser.id)

      if (payment?.status === 'complete') {
        setPlanKey(payment.plan_key as PlanKey)
        setStatus('complete')
        // Pull the profile fresh so the rest of the app sees the new plan
        // straight away instead of after a reload.
        const refreshed = await getUserById(currentUser.id)
        if (refreshed) setCurrentUser(refreshed)
        return
      }

      if (payment?.status === 'failed' || payment?.status === 'cancelled') {
        setStatus('failed')
        return
      }

      if (polls >= MAX_POLLS) {
        setStatus('slow')
        return
      }

      setTimeout(tick, POLL_INTERVAL_MS)
    }

    tick()
    return () => { cancelled = true }
  }, [outcome, currentUser, setCurrentUser])

  const body = () => {
    switch (status) {
      case 'confirming':
        return {
          icon: <Loader2 size={44} className="text-teal-light animate-spin" />,
          title: 'Confirming your payment',
          text: "This usually takes a few seconds. You don't need to do anything — please don't close this page.",
          action: null,
        }
      case 'complete':
        return {
          icon: <CheckCircle2 size={44} className="text-teal-light" />,
          title: `You're on ${planKey ? PLAN_TIERS[planKey].label : 'your new plan'}`,
          text: 'Your plan is active and your listings have moved across to it.',
          action: { label: 'Post a listing', to: '/post' },
        }
      case 'slow':
        return {
          icon: <Clock size={44} className="text-gold" />,
          title: 'Still confirming',
          text: "Your payment went through, but the confirmation from PayFast is taking longer than usual. Your plan will activate on its own as soon as it lands — there's no need to pay again. Check your profile in a few minutes.",
          action: { label: 'Go to my profile', to: `/profile/${currentUser?.id ?? ''}` },
        }
      case 'cancelled':
        return {
          icon: <XCircle size={44} className="text-cream-muted" />,
          title: 'Payment cancelled',
          text: "Nothing was charged. Your plan hasn't changed — you can pick one again whenever you're ready.",
          action: { label: 'Back to plans', to: '/plans' },
        }
      case 'failed':
        return {
          icon: <XCircle size={44} className="text-ember" />,
          title: "That payment didn't go through",
          text: "Nothing was charged to you. If you think this is wrong, don't pay again — get in touch and we'll check it against our records first.",
          action: { label: 'Back to plans', to: '/plans' },
        }
    }
  }

  const content = body()

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-md mx-auto px-4 pt-20 pb-24 flex flex-col items-center text-center">
          <div className="mb-5">{content.icon}</div>
          <h1 className="text-cream font-bold text-2xl mb-3">{content.title}</h1>
          <p className="text-cream-muted text-sm leading-relaxed mb-8">{content.text}</p>

          {content.action && (
            <button
              onClick={() => navigate(content.action!.to)}
              className="bg-teal hover:bg-teal-dark text-white font-bold py-3 px-8 rounded-xl text-sm transition-colors"
            >
              {content.action.label}
            </button>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  )
}
