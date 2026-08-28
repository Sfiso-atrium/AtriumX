// src/components/common/InstallAppButton.tsx
import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  // already installed / already running as an app - covers both the
  // standard check and the older iOS-only navigator flag
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
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

  // Nothing to show: already installed, or this browser never handed us a
  // native prompt to trigger. That second case covers iOS Safari and
  // desktop Safari/Firefox specifically — none of them expose any API to
  // install a PWA programmatically, so there is no silent one-tap action
  // possible there at all. A button with no real action behind it creates
  // more doubt than no button, so it simply doesn't render on those browsers.
  if (installed || !deferredPrompt) return null

  const handleClick = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 border border-slate-border hover:border-teal-light text-cream hover:text-teal-light text-sm font-bold px-4 py-2 rounded-xl transition-colors"
    >
      <Download size={15} />
      Download
    </button>
  )
}
