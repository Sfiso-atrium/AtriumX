// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Checks for a newer version every 30 minutes while the app is open, not
// just once at launch. A browser tab naturally gets a fresh update-check
// on every reload; an installed app can sit open for hours without ever
// reloading, so without this it would only ever notice a new version the
// next time someone fully closes and reopens it.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    setInterval(async () => {
      if (registration.installing || !navigator.onLine) return
      const resp = await fetch(swUrl, { cache: 'no-store' })
      if (resp.status === 200) await registration.update()
    }, UPDATE_CHECK_INTERVAL_MS)
  },
})

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.error('AtriumX crashed:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, textAlign: 'center', background: '#0f172a', color: '#f5f0e6' }}>
          <p style={{ fontSize: 20 }}>Something went wrong</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>Refresh the page. If this keeps happening, let us know.</p>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{ background: '#d4af37', color: '#000', fontWeight: 700, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
          >
            Back to AtriumX
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
