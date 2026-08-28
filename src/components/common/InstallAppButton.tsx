// src/components/common/InstallAppButton.tsx
import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { useApp } from '../../context/AppContext'

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
  const { showToast } = useApp()
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

  if (installed) return null

  // iOS Safari has no install API at all, so there's no way to make this
  // silent there — but a single toast is far less friction than a
  // full-screen step-by-step sheet.
  if (isIOS()) {
    return (
      <button
        onClick={() => showToast('Tap the Share icon in Safari, then "Add to Home Screen".', 'info')}
        className="flex items-center gap-1.5 border border-slate-border hover:border-teal-light text-cream hover:text-teal-light text-sm font-bold px-4 py-2 rounded-xl transition-colors"
      >
        <Download size={15} />
        Download
      </button>
    )
  }

  // Everywhere else: nothing to show unless the browser actually handed us
  // a real, working, one-tap install action.
  if (!deferredPrompt) return null

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
