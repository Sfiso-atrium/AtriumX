// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

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
