import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  BellOff,
  ChevronDown,
  Compass,
  Contrast,
  GraduationCap,
  Handshake,
  Menu,
  MessageCircle,
  NotebookPen,
  PlusCircle,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import NotificationBell from './NotificationBell'
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '../../services/push'
import { getBusinessProfile, BusinessProfile } from '../../services/dataService'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, partner, darkMode, toggleDarkMode, businessProfile: contextBusinessProfile } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBlocked, setPushBlocked] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [universityMenuOpen, setUniversityMenuOpen] = useState(false)

  // Sign in/up, business account creation, and the retailer landing page are
  // entry points without their own account context yet, so the sidemenu
  // (which is all about a signed-in user's spaces) has nothing useful to
  // offer there.
  const hideSidemenu = ['/student', '/retailer', '/retailer/signup'].includes(location.pathname)

  useEffect(() => {
    if (!currentUser || currentUser.account_type !== 'business') {
      setBusinessProfile(null)
      setUniversityMenuOpen(false)
      return
    }

    getBusinessProfile(currentUser.id).then(setBusinessProfile)
  }, [currentUser])

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
    setDiscoverOpen(false)
  }

  function go(path: string) {
    closeMenu()
    navigate(path)
  }

  return (
    <>
      <nav className="sticky top-0 z-40 bg-slate-deep border-b border-slate-border">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* LEFT CORNER - hamburger stays in corner even on desktop */}
          <div className="flex items-center gap-2.5 min-w-0">
            {!hideSidemenu && (
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-border bg-white text-cream-muted hover:text-cream hover:bg-slate-card transition-colors flex-shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* LOGO - fixed spacing: logo = 'a', same distance as other letters */}
            <button
              onClick={() => navigate(currentUser ? (currentUser.account_type === 'business' ? (contextBusinessProfile?.is_accommodation ? '/accommodation' : '/feed') : '/space') : '/')}
              className="flex items-center min-w-0 group"
              aria-label="AtriumX home"
            >
              <div className="flex items-baseline gap-[1px] h-[18.2px] sm:h-[20.47px]">
                <img src="/logo.png" alt="AtriumX" className="h-8 w-8 sm:h-9 sm:w-9 object-contain flex-shrink-0 -mt-[13.81px] sm:-mt-[15.53px] -mr-[8.09px] sm:-mr-[9.1px] translate-y-[7.35px] sm:translate-y-[8.27px]" />
                <span
                  className="text-[22px] sm:text-[24px] font-extrabold text-teal-primary whitespace-nowrap leading-none tracking-tight"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  <span className="inline-flex" style={{ gap: '0.5px' }}>
                    <span>t</span>
                    <span>r</span>
                    <span>i</span>
                    <span>u</span>
                    <span>m</span>
                    <span className="ml-[0.5px]">X</span>
                  </span>
                </span>
              </div>
            </button>
          </div>

          {/* RIGHT CORNER - notifications + profile locked to right */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {currentUser ? (
              <>
                {currentUser.account_type === 'business' && (
                  <div className="relative">
                    <button
                      onClick={() => setUniversityMenuOpen(open => !open)}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-teal-faint text-teal-light border border-slate-border hover:border-teal-light transition-colors"
                      aria-label="Open business university access"
                      title="University access"
                    >
                      <GraduationCap className="w-5 h-5" />
                    </button>
                    {universityMenuOpen && (
                      <div className="absolute right-0 top-11 w-72 bg-slate-card border border-slate-border rounded-2xl shadow-xl p-4 z-50">
                        <p className="text-cream font-bold text-sm mb-1">University access</p>
                        <p className="text-cream-muted text-xs mb-3">Your listings can reach these universities.</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-cream text-xs font-semibold">
                            {(businessProfile?.universities?.length ?? 0)} / {(currentUser.plan === 'campus_partner' ? 3 : currentUser.plan === 'featured' ? 2 : 1)} universities
                          </span>
                          {currentUser.plan !== 'campus_partner' && (businessProfile?.universities?.length ?? 0) >= (currentUser.plan === 'featured' ? 2 : 1) && (
                            <span className="text-cream-muted text-[10px]">Plan limit reached</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {(businessProfile?.universities ?? []).map(university => (
                            <button
                              key={university}
                              type="button"
                              onClick={() => {
                                setUniversityMenuOpen(false)
                                navigate(`/feed?university=${encodeURIComponent(university)}`)
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl bg-slate-deep border border-slate-border text-cream text-sm hover:border-teal-light hover:bg-teal-faint transition-colors"
                            >
                              {university}
                            </button>
                          ))}
                          {(businessProfile?.universities?.length ?? 0) === 0 && (
                            <p className="text-cream-muted text-xs">No university has been selected yet.</p>
                          )}
                        </div>
                        {currentUser.plan !== 'campus_partner' && (
                          <button
                            onClick={() => { setUniversityMenuOpen(false); navigate('/business/plan-select', { state: { forcePlans: true } }) }}
                            className="mt-3 w-full bg-ember hover:bg-ember-dark text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                          >
                            Upgrade to reach more universities
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => navigate(currentUser.account_type === 'business' ? (contextBusinessProfile?.is_accommodation ? '/accommodation/plan-select' : '/business/plan-select') : '/plan-select')}
                  className="hidden lg:flex w-9 h-9 rounded-full items-center justify-center bg-teal-primary text-white shadow-sm hover:bg-teal-primary/90 hover:scale-105 active:scale-95 transition-transform"
                  aria-label="Create a post"
                  title="Create a post"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
                <NotificationBell />
                <button
                  onClick={() => navigate(`/profile/${currentUser.id}`)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-1 ring-slate-border hover:ring-teal-light transition-all shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
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
        className={`fixed top-0 left-0 h-full w-80 max-w-[86%] bg-slate-card border-r border-slate-border z-50 px-5 py-5 flex flex-col overflow-y-auto overscroll-contain transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => go(currentUser ? (currentUser.account_type === 'business' ? (contextBusinessProfile?.is_accommodation ? '/accommodation' : '/feed') : '/space') : '/')}
            className="flex items-center min-w-0 group"
            aria-label="AtriumX home"
          >
            <div className="flex items-baseline gap-[1px] h-[18.2px] sm:h-[20.47px]">
              <img src="/logo.png" alt="AtriumX" className="h-8 w-8 sm:h-9 sm:w-9 object-contain flex-shrink-0 -mt-[13.81px] sm:-mt-[15.53px] -mr-[8.09px] sm:-mr-[9.1px] translate-y-[7.35px] sm:translate-y-[8.27px]" />
              <span
                className="text-[22px] sm:text-[24px] font-extrabold text-teal-primary whitespace-nowrap leading-none tracking-tight"
                style={{ letterSpacing: '-0.01em' }}
              >
                <span className="inline-flex" style={{ gap: '0.5px' }}>
                  <span>t</span>
                  <span>r</span>
                  <span>i</span>
                  <span>u</span>
                  <span>m</span>
                  <span className="ml-[0.5px]">X</span>
                </span>
              </span>
            </div>
          </button>
          <button
            onClick={closeMenu}
            aria-label="Close navigation menu"
            className="w-9 h-9 rounded-xl border border-slate-border bg-slate-deep flex items-center justify-center text-cream-muted hover:text-cream transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          <>
            <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cream-muted">{contextBusinessProfile?.is_accommodation ? 'Accommodation' : currentUser.account_type === 'business' ? 'Business' : 'My Space'}</p>
            <nav className="space-y-1">
              {currentUser.account_type !== 'business' && (
                <button onClick={() => go('/space')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${location.pathname === '/space' ? 'bg-teal-primary text-white' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>
                  <NotebookPen className="w-4 h-4" /> My Space
                </button>
              )}
              {contextBusinessProfile?.is_accommodation ? (
                <button onClick={() => go('/accommodation')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${location.pathname === '/accommodation' ? 'bg-teal-primary text-white' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>
                  <Building2 className="w-4 h-4" /> Accommodation
                </button>
              ) : (
                <button onClick={() => go('/feed')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${location.pathname === '/feed' ? 'bg-teal-primary text-white' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>
                  <Compass className="w-4 h-4" /> Discover
                </button>
              )}
              <button onClick={() => go('/chat')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${location.pathname.startsWith('/chat') ? 'bg-teal-primary text-white' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>
                <MessageCircle className="w-4 h-4" /> Messages
              </button>
              {currentUser.account_type !== 'business' && (
                <button onClick={() => go('/accommodations')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${location.pathname === '/accommodations' ? 'bg-teal-primary text-white' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>
                  <Building2 className="w-4 h-4" /> Accommodation
                </button>
              )}
            </nav>

            <div className="mt-4">
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                <span>More</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <div className="mt-1 space-y-1">
                  <button onClick={() => go(`/profile/${currentUser.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors">
                    <UserRound className="w-4 h-4" /> Profile
                  </button>
                  <button onClick={() => go('/notebook')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors">
                    <NotebookPen className="w-4 h-4" /> Notebook
                  </button>
                  {partner && (
                    <button onClick={() => go('/partner')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors">
                      <Handshake className="w-4 h-4" /> Partner Dashboard
                    </button>
                  )}
                  {currentUser.is_admin && (
                    <button onClick={() => go('/admin')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors">
                      <ShieldCheck className="w-4 h-4" /> Admin Panel
                    </button>
                  )}
                </div>
              )}
              {pushSupported() && (
                <button
                  onClick={handleTogglePush}
                  disabled={pushLoading || pushBlocked}
                  className={`mt-3 w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium transition-colors disabled:opacity-60 ${pushOn ? 'text-gold hover:bg-slate-deep' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}
                >
                  {pushOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  {pushBlocked ? 'Notifications: Blocked' : pushLoading ? 'Updating notifications…' : pushOn ? 'Notifications: On' : 'Notifications: Off'}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cream-muted">Explore</p>
            <nav className="space-y-1">
              <button
                onClick={() => setDiscoverOpen((open) => !open)}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-left text-sm font-bold text-cream hover:bg-slate-deep transition-colors"
              >
                <span className="flex items-center gap-3"><Compass className="w-5 h-5 text-teal-light" /> Discover</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${discoverOpen ? 'rotate-180' : ''}`} />
              </button>
              {discoverOpen && (
                <div className="ml-8 mt-1 space-y-1 border-l border-slate-border pl-3">
                  <button onClick={() => go('/feed')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === '/feed' ? 'text-teal-primary bg-teal-faint' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>Marketplace</button>
                  <button onClick={() => go('/events')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === '/events' ? 'text-teal-primary bg-teal-faint' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>Events</button>
                </div>
              )}
            </nav>
          </>
        )}

        <div className="space-y-1 pb-28">
          <button onClick={toggleDarkMode} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium transition-colors ${darkMode ? 'text-teal-light bg-slate-deep' : 'text-cream-muted hover:text-cream hover:bg-slate-deep'}`}>
            <Contrast className="w-4 h-4" /> {darkMode ? 'Dark Mode: On' : 'Dark Mode: Off'}
          </button>
          <div className="border-t border-slate-border pt-2">
            <button onClick={() => setHelpOpen((open) => !open)} className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-left text-sm font-medium text-cream-muted hover:text-cream hover:bg-slate-deep transition-colors">
              <span>Help & Legal</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
            </button>
            {helpOpen && (
              <div className="space-y-1 px-1 pb-2">
                <a href="/How-it-works.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">How It Works</a>
                <a href="/Faq.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">FAQ</a>
                <a href="/safety.html" onClick={closeMenu} className="block text-cream-muted hover:text-teal-light text-sm py-2 pl-3 transition-colors">Safety Tips</a>
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
