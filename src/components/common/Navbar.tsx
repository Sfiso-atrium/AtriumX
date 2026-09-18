import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  ChevronDown,
  Compass,
  Contrast,
  Handshake,
  Menu,
  MessageCircle,
  NotebookPen,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import NotificationBell from './NotificationBell'
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '../../services/push'

export default function Navbar() {
  const navigate = useNavigate()
  const { currentUser, partner, bwMode, toggleBwMode } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBlocked, setPushBlocked] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

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

  function closeMenu() {
    setMenuOpen(false)
    setHelpOpen(false)
    setMoreOpen(false)
  }

  function go(path: string) {
    closeMenu()
    navigate(path)
  }

  return (
    <>
      <nav className="sticky top-0 z-40 bg-slate-deep border-b border-slate-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-cream-muted hover:text-cream hover:bg-slate-card transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate(currentUser ? '/space' : '/')}
              className="flex items-center min-w-0"
              aria-label="AtriumX home"
            >
              <img src="/logo.png" alt="AtriumX" className="h-10 w-auto flex-shrink-0" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {currentUser ? (
              <>
                <NotificationBell />
                <button
                  onClick={() => navigate(`/profile/${currentUser.id}`)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-1 ring-slate-border hover:ring-teal-light transition-all"
                  style={{ backgroundColor: currentUser.avatar_color }}
                  aria-label="Open profile"
                  title="Profile"
                >
                  {currentUser.avatar_initials}
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/student')}
                className="bg-ember hover:bg-ember-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside
        aria-label="Primary navigation"
        className={`fixed top-0 left-0 h-full w-80 max-w-[86%] bg-slate-card border-r border-slate-border z-50 px-5 py-5 flex flex-col transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => go(currentUser ? '/space' : '/')}
            className="flex items-center"
            aria-label="AtriumX home"
          >
            <img src="/logo.png" alt="AtriumX" className="h-10 w-auto" />
          </button>
          <button
            onClick={closeMenu}
            aria-label="Close navigation menu"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          <>
            <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cream-muted">
              Main
            </p>

            <nav className="space-y-1">
              <button
                onClick={() => go('/space')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                <UserRound className="w-5 h-5 text-teal-light" />
                My Space
              </button>

              <button
                onClick={() => go('/feed')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                <Compass className="w-5 h-5 text-teal-light" />
                Discover
              </button>

              <button
                onClick={() => go('/chat')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-teal-light" />
                Messages
              </button>

              <button
                onClick={() => go(`/profile/${currentUser.id}`)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                <UserRound className="w-5 h-5 text-teal-light" />
                Profile
              </button>
            </nav>

            <div className="my-5 border-t border-slate-border" />

            <button
              onClick={() => setMoreOpen((open) => !open)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-left text-sm font-bold text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
            >
              <span>More</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreOpen && (
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => go(`/profile/${currentUser.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
                >
                  My Listings
                </button>

                <button
                  onClick={() => go('/events')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
                >
                  Events
                </button>

                <button
                  onClick={() => go('/notebook')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
                >
                  <NotebookPen className="w-4 h-4" />
                  Notebook
                </button>

                {partner && (
                  <button
                    onClick={() => go('/partner')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
                  >
                    <Handshake className="w-4 h-4" />
                    Partner Dashboard
                  </button>
                )}

                {currentUser.is_admin && (
                  <button
                    onClick={() => go('/admin')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}
              </div>
            )}

            {pushSupported() && (
              <button
                onClick={handleTogglePush}
                disabled={pushLoading || pushBlocked}
                className={`mt-3 w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium transition-colors disabled:opacity-60 ${
                  pushOn ? 'text-gold hover:bg-slate-deep' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'
                }`}
              >
                {pushOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                {pushBlocked
                  ? 'Notifications: Blocked'
                  : pushLoading
                    ? 'Updating notifications…'
                    : pushOn
                      ? 'Notifications: On'
                      : 'Notifications: Off'}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cream-muted">
              Explore
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => go('/feed')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                <Compass className="w-5 h-5 text-teal-light" />
                Discover
              </button>
              <button
                onClick={() => go('/events')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                Events
              </button>
            </nav>
          </>
        )}

        <div className="mt-auto space-y-1">
          <button
            onClick={toggleBwMode}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
              bwMode ? 'text-gold bg-slate-deep' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'
            }`}
          >
            <Contrast className="w-4 h-4" />
            {bwMode ? 'Black & White: On' : 'Black & White: Off'}
          </button>

          <div className="border-t border-slate-border pt-2">
            <button
              onClick={() => setHelpOpen((open) => !open)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-left text-sm font-medium text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors"
            >
              <span>Help &amp; Legal</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
            </button>
            {helpOpen && (
              <div className="space-y-1 px-1 pb-2">
                <a href="/How-it-works.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">How It Works</a>
                <a href="/Faq.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">FAQ</a>
                <a href="/Safety.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">Safety Tips</a>
                <a href="/Terms.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">Terms of Service</a>
                <a href="/Privacy.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">Privacy Policy</a>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
