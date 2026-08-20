import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, ListChecks, Handshake } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
const navigate = useNavigate()
  const { currentUser, partner } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

return (
<>
<nav className="sticky top-0 z-40 bg-slate-deep flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu size={24} className="text-cream" />
        </button>
        <button onClick={() => navigate(currentUser ? '/feed' : '/')} className="flex items-center gap-0">
            <img src="/logo.png" alt="A" className="h-14 w-auto -mr-3" />
            <span className="text-cream font-serif text-2xl font-bold">trium</span>
            <span className="text-ember font-serif text-2xl font-bold">X</span>
          </button>
      </div>

      <div className="flex items-center gap-4">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/space')}
              className="flex items-center justify-center w-9 h-9 text-cream-muted hover:text-cream transition-colors"
              aria-label="My Space"
              title="My Space"
            >
              <ListChecks size={20} />
            </button>
            {partner && (
              <button
                onClick={() => navigate('/partner')}
                className="flex items-center justify-center w-9 h-9 text-cream-muted hover:text-cream transition-colors"
                aria-label="Partner Dashboard"
                title="Partner Dashboard"
              >
                <Handshake size={20} />
              </button>
            )}
            <NotificationBell />
            <button
              onClick={() => navigate(`/profile/${currentUser.id}`)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: currentUser.avatar_color }}
            >
              {currentUser.avatar_initials}
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/student')}
            className="bg-ember hover:bg-ember-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Sign In
          </button>
      )}
      </div>
    </nav>

    <div
      className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${
        menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={() => setMenuOpen(false)}
    />
    <div
      className={`fixed top-0 left-0 h-full w-72 max-w-[80%] bg-slate-card border-r border-slate-border z-50 p-6 flex flex-col gap-1 transition-transform duration-300 ${
        menuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="text-cream font-serif text-xl font-bold">Menu</span>
        <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
          <X size={22} className="text-cream-muted" />
        </button>
      </div>
<a href="/How-it-works.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm font-medium py-3 border-b border-slate-border transition-colors">How It Works</a>
      <a href="/Faq.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm font-medium py-3 border-b border-slate-border transition-colors">FAQ</a>
      <a href="/Safety.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm font-medium py-3 border-b border-slate-border transition-colors">Safety Tips</a>
      <a href="/Terms.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm font-medium py-3 border-b border-slate-border transition-colors">Terms of Service</a>
      <a href="/Privacy.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm font-medium py-3 transition-colors">Privacy Policy</a>
    </div>
    </>
  )
}
