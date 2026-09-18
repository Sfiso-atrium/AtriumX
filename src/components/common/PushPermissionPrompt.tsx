// src/components/common/PushPermissionPrompt.tsx
//
// Shows once per sign-in session, if and only if this browser has never
// been asked for notification permission (Notification.permission ===
// 'default'). Already granted or already denied both mean "don't ask" —
// granted needs no prompt, and denied can only be undone by the person
// themselves in their browser's own settings, so re-prompting would just
// be noise.
//
// The actual permission dialog only fires from the "Enable Notifications"
// button below — see services/push.ts's own note on why: browsers
// increasingly ignore or penalize a permission request that isn't tied to
// a direct click, so this can't just call it automatically on mount.
import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { pushSupported, subscribeToPush } from '../../services/push'

export default function PushPermissionPrompt() {
  const { currentUser } = useApp()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentUser || !pushSupported()) { setVisible(false); return }
    if (Notification.permission === 'granted') {
      // Already granted on this device - possibly by a different
      // account. Re-subscribing here is silent (no dialog, since
      // requestPermission() resolves immediately when already granted)
      // and re-associates this device's existing push subscription with
      // whoever is logged in now, so a shared/dev device always routes
      // pushes to its current user instead of a stale previous one.
      subscribeToPush(currentUser.id)
      setVisible(false)
      return
    }
    setVisible(Notification.permission === 'default')
  }, [currentUser])

  if (!visible || !currentUser) return null

  const handleEnable = async () => {
    setLoading(true)
    await subscribeToPush(currentUser.id)
    setLoading(false)
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-32 px-4">
      <div className="bg-slate-card border border-slate-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-cream-muted hover:text-cream"
        >
          <X size={18} />
        </button>

        <div className="w-11 h-11 rounded-full bg-teal-primary/20 border border-teal-light/30 flex items-center justify-center mb-4">
          <Bell size={19} className="text-teal-light" />
        </div>

        <h2 className="text-cream font-bold text-xl mb-2">Turn on notifications?</h2>
        <p className="text-cream-muted text-sm mb-6">
          Know the moment someone messages you or your study group — even when AtriumX isn't open in a tab.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Enabling…' : 'Enable'}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="flex-1 bg-transparent border border-slate-border hover:border-teal-primary text-cream font-bold py-3 rounded-xl transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
