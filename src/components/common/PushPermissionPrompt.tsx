import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '../../services/push'

export default function PushPermissionPrompt() {
  const { currentUser } = useApp()
  const [visible, setVisible] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!currentUser || !pushSupported()) return
    // Don't spam: only show once per session, after 8s, if not already subscribed
    const timer = setTimeout(async () => {
      if (Notification.permission === 'denied') { setBlocked(true); return }
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) { setPushOn(true); return }
        // Not subscribed and permission not denied -> show prompt if not dismissed recently
        const dismissed = localStorage.getItem('push_prompt_dismissed_at')
        if (dismissed && Date.now() - Number(dismissed) < 1000 * 60 * 60 * 24 * 3) return // 3 days
        setVisible(true)
      } catch {}
    }, 8000)
    return () => clearTimeout(timer)
  }, [currentUser])

  const handleEnable = async () => {
    if (!currentUser || loading) return
    setLoading(true)
    const { error } = await subscribeToPush(currentUser.id)
    if (!error) { setPushOn(true); setVisible(false) }
    setLoading(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed_at', String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[90] bg-slate-card border border-slate-border rounded-2xl p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center flex-shrink-0">
          {pushOn ? <Bell size={18} className="text-[#2563EB]" /> : <BellOff size={18} className="text-cream-muted" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-cream font-bold text-sm">Stay in the loop?</p>
          <p className="text-cream-muted text-xs mt-1 leading-relaxed">Get notified when someone messages you about your listings or study groups.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleEnable} disabled={loading} className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs py-2 rounded-xl disabled:opacity-60">
              {loading ? 'Enabling...' : 'Enable'}
            </button>
            <button onClick={handleDismiss} className="flex-1 bg-slate-deep border border-slate-border text-cream-muted font-bold text-xs py-2 rounded-xl hover:text-cream">Not now</button>
          </div>
          {blocked && <p className="text-red-400 text-[11px] mt-2">Notifications blocked in browser settings.</p>}
        </div>
        <button onClick={handleDismiss} className="text-cream-muted hover:text-cream flex-shrink-0"><X size={16} /></button>
      </div>
    </div>
  )
}
