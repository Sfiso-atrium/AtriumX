import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function AuthPromptModal() {
  const navigate = useNavigate()
  const { setAuthPromptOpen, redirectAfterLogin, setRedirectAfterLogin } = useApp()

  const close = () => setAuthPromptOpen(false)

  const go = (mode: 'login' | 'register') => {
    setAuthPromptOpen(false)
    navigate(`/student?mode=${mode}`)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-32 px-4">
      <div className="bg-slate-card border border-slate-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
        <button
          onClick={close}
          className="absolute top-4 right-4 text-cream-muted hover:text-cream"
        >
          <X size={18} />
        </button>
        <h2 className="text-cream font-bold text-xl mb-2">Login Required</h2>
        <p className="text-cream-muted text-sm mb-6">
          You need to be logged in to do that.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => go('login')}
            className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => go('register')}
            className="flex-1 bg-transparent border border-slate-border hover:border-teal-primary text-cream font-bold py-3 rounded-xl transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}
