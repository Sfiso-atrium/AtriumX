// src/components/common/InstallAppButton.tsx
import { useState, useEffect } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function isStandalone() {
  // already installed / already running as an app - covers both the
  // standard check and the older iOS-only navigator flag
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSSheet, setShowIOSSheet] = useState(false)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (installed) return null
  // Neither a real install prompt nor iOS's manual path applies (e.g. desktop
  // Safari, or a browser that simply doesn't support installable PWAs) -
  // nothing useful to show, so stay out of the way rather than show a dead button.
  if (!deferredPrompt && !isIOS()) return null

  const handleClick = async () => {
    if (isIOS()) {
      setShowIOSSheet(true)
      return
    }
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 border border-slate-border hover:border-teal-light text-cream hover:text-teal-light text-sm font-bold px-4 py-2 rounded-xl transition-colors"
      >
        <Download size={15} />
        Get the App
      </button>

      {showIOSSheet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="bg-slate-card border border-slate-border rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-cream font-bold text-base">Install AtriumX</h2>
              <button onClick={() => setShowIOSSheet(false)} className="text-cream-muted hover:text-cream">
                <X size={18} />
              </button>
            </div>
            <p className="text-cream-muted text-sm leading-relaxed mb-3">
              Safari doesn't support one-tap installs, but adding it to your Home Screen takes two taps:
            </p>
            <ol className="text-cream text-sm leading-relaxed flex flex-col gap-2 mb-2">
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-primary text-white text-xs flex items-center justify-center font-bold">1</span>
                Tap the <Share size={14} className="inline mx-0.5" /> Share button in Safari's toolbar
              </li>
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                Scroll down and tap "Add to Home Screen"
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
