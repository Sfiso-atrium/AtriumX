import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, Backpack, Handshake, Contrast, Bell, BellOff, NotebookPen, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import NotificationBell from './NotificationBell'
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '../../services/push'

export default function Navbar() {
const navigate = useNavigate()
  const { currentUser, partner, bwMode, toggleBwMode } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBlocked, setPushBlocked] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  // Check actual subscription status each time the drawer opens, rather
  // than trusting stale local state — the person may have changed the
  // browser's own notification permission since the last time this
  // opened, and that always wins over whatever we last set.
  useEffect(() => {
    if (!menuOpen || !currentUser || !pushSupported()) return
    if (Notification.permission === 'denied') {
      setPushBlocked(true)
      setPushOn(false)
      return
    }
    setPushBlocked(false)
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setPushOn(!!sub))
      .catch(() => setPushOn(false))
  }, [menuOpen, currentUser])

  async function handleTogglePush() {
    if (!currentUser || pushLoading || pushBlocked) return
    setPushLoading(true)
    if (pushOn) {
      await unsubscribeFromPush(currentUser.id)
      setPushOn(false)
    } else {
      const { error } = await subscribeToPush(currentUser.id)
      if (!error) setPushOn(true)
    }
    setPushLoading(false)
  }

return (
<>
<nav className="sticky top-0 z-40 bg-slate-deep flex items-center justify-between p-4">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="flex-shrink-0">
          <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-cream" />
        </button>
        <button onClick={() => navigate(currentUser ? '/feed' : '/')} className="flex items-center gap-0 min-w-0 flex-shrink">
            <img src="/logo.png" alt="A" className="h-9 sm:h-14 w-auto -mr-2 sm:-mr-3 flex-shrink-0" />
            <span className="text-cream font-serif text-base sm:text-2xl font-bold truncate">trium</span>
            <span className="text-ember font-serif text-base sm:text-2xl font-bold">X</span>
          </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {currentUser ? (
          <div className="flex items-center gap-1 sm:gap-2">
            {currentUser.account_type !== 'business' && (
              <button
                onClick={() => navigate('/space')}
                className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 text-cream-muted hover:text-cream transition-colors"
                aria-label="My Space"
                title="My Space"
              >
                <Backpack className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            {partner && (
              <button
                onClick={() => navigate('/partner')}
                className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 text-cream-muted hover:text-cream transition-colors"
                aria-label="Partner Dashboard"
                title="Partner Dashboard"
              >
                <Handshake className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            <NotificationBell />
            <button
              onClick={() => navigate(`/profile/${currentUser.id}`)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: currentUser.avatar_color }}
            >
              {currentUser.avatar_initials}
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/student')}
            className="bg-ember hover:bg-ember-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
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
      <button
        onClick={toggleBwMode}
        className={`flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border transition-colors ${
          bwMode ? 'text-gold' : 'text-cream-muted hover:text-teal-light'
        }`}
      >
        <Contrast size={16} />
        {bwMode ? 'Black & White: On' : 'Black & White: Off'}
      </button>

      <button
        onClick={() => { setMenuOpen(false); navigate('/notebook') }}
        className="flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border text-cream-muted hover:text-teal-light transition-colors"
      >
        <NotebookPen size={16} />
        Notebook
      </button>

      {currentUser && pushSupported() && (
        <button
          onClick={handleTogglePush}
          disabled={pushLoading || pushBlocked}
          className={`flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border transition-colors disabled:opacity-60 ${
            pushOn ? 'text-gold' : 'text-cream-muted hover:text-teal-light'
          }`}
        >
          {pushOn ? <Bell size={16} /> : <BellOff size={16} />}
          {pushBlocked
            ? 'Notifications: Blocked in browser'
            : pushLoading
            ? 'Updating…'
            : pushOn
            ? 'Notifications: On'
            : 'Notifications: Off'}
        </button>
      )}

      {/* How It Works / FAQ / Safety / Terms / Privacy — one collapsible
          group instead of five separate rows, same expand pattern as the
          QR Code entry in the Toolbox menu. */}
      <div className="border-b border-slate-border">
        <button
          onClick={() => setHelpOpen((o) => !o)}
          className="w-full flex items-center justify-between text-sm font-medium py-3 text-cream-muted hover:text-teal-light transition-colors"
        >
          Help &amp; Legal
          <ChevronDown size={16} className={`transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
        </button>
        {helpOpen && (
          <div className="flex flex-col pb-2">
            <a href="/How-it-works.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">How It Works</a>
            <a href="/Faq.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">FAQ</a>
            <a href="/Safety.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">Safety Tips</a>
            <a href="/Terms.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">Terms of Service</a>
            <a href="/Privacy.html" onClick={() => setMenuOpen(false)} className="text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">Privacy Policy</a>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
