import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Home, Search, MessageCircle, ChevronDown, Contrast, Bell, BellOff, NotebookPen, Backpack, Handshake } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import NotificationBell from './NotificationBell'
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '../../services/push'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, partner, bwMode, toggleBwMode, unreadMessageCount } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBlocked, setPushBlocked] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if (!menuOpen || !currentUser || !pushSupported()) return
    if (Notification.permission === 'denied') { setPushBlocked(true); setPushOn(false); return }
    setPushBlocked(false)
    navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(sub => setPushOn(!!sub)).catch(() => setPushOn(false))
  }, [menuOpen, currentUser])

  async function handleTogglePush() {
    if (!currentUser || pushLoading || pushBlocked) return
    setPushLoading(true)
    if (pushOn) { await unsubscribeFromPush(currentUser.id); setPushOn(false) }
    else { const { error } = await subscribeToPush(currentUser.id); if (!error) setPushOn(true) }
    setPushLoading(false)
  }

  const isMySpace = location.pathname.startsWith('/space')
  const isDiscover = ['/feed','/discover','/events','/listing'].some(p => location.pathname.startsWith(p))
  const isEvents = location.pathname.startsWith('/events')
  const isMarketplace = location.pathname.startsWith('/feed') || location.pathname.startsWith('/discover')
  const isChat = location.pathname.startsWith('/chat')
  const isProfile = location.pathname.startsWith('/profile')

  const NavItem = ({ label, icon: Icon, active, onClick, badge, indent }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${active ? 'bg-[#2563EB] text-white' : 'text-cream-muted hover:text-cream hover:bg-slate-card'} ${indent ? 'ml-6 w-[calc(100%-1.5rem)]' : ''}`}>
      <Icon size={18} className={active ? 'text-white' : 'text-cream-muted'} />
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
    </button>
  )

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-deep border-r border-slate-border flex-col z-40">
        <div className="h-14 flex items-center px-4 gap-2 border-b border-slate-border flex-shrink-0">
          <button onClick={() => navigate(currentUser ? '/space' : '/')} className="flex items-center gap-0 min-w-0">
            <img src="/logo.png" alt="A" className="h-8 w-auto -mr-2 flex-shrink-0" />
            <span className="text-cream font-serif text-lg font-bold">trium</span><span className="text-ember font-serif text-lg font-bold">X</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {currentUser?.account_type !== 'business' && (
            <NavItem label="My Space" icon={Backpack} active={isMySpace} onClick={() => navigate('/space')} />
          )}
          <NavItem label="Discover" icon={Search} active={isDiscover && !isEvents} onClick={() => navigate('/feed')} />
          {isDiscover && (
            <div className="flex flex-col gap-1 mt-1">
              <NavItem label="Marketplace" icon={Search} active={isMarketplace && !isEvents} onClick={() => navigate('/feed')} indent />
              <NavItem label="Events" icon={Search} active={isEvents} onClick={() => navigate('/events')} indent />
            </div>
          )}
          <NavItem label="Messages" icon={MessageCircle} active={isChat} onClick={() => navigate('/chat')} badge={unreadMessageCount} />
          <div className="h-px bg-slate-border my-3" />
          <div className="px-3 py-2"><p className="text-[10px] font-bold text-cream-muted uppercase tracking-wider">Secondary</p></div>
          <button onClick={() => navigate(currentUser ? `/profile/${currentUser.id}` : '/student')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-cream-muted hover:text-cream hover:bg-slate-card text-left ${isProfile ? 'bg-slate-card text-cream' : ''}`}>My Listings & Profile</button>
          {currentUser?.is_admin && <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-cream-muted hover:text-cream hover:bg-slate-card text-left">Admin</button>}
          {partner && <button onClick={() => navigate('/partner')} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-cream-muted hover:text-cream hover:bg-slate-card text-left flex"><Handshake size={16} className="mr-1" />Partner</button>}
        </div>
        <div className="p-3 border-t border-slate-border flex flex-col gap-1">
          <button onClick={() => setHelpOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-cream-muted hover:text-cream hover:bg-slate-card">Help & Legal <ChevronDown size={14} className={`transition-transform ${helpOpen ? 'rotate-180' : ''}`} /></button>
          {helpOpen && <div className="flex flex-col pl-3"><a href="/How-it-works.html" className="text-cream-muted hover:text-teal-light text-xs py-1.5">How It Works</a><a href="/Faq.html" className="text-cream-muted hover:text-teal-light text-xs py-1.5">FAQ</a><a href="/Safety.html" className="text-cream-muted hover:text-teal-light text-xs py-1.5">Safety</a><a href="/Terms.html" className="text-cream-muted hover:text-teal-light text-xs py-1.5">Terms</a><a href="/Privacy.html" className="text-cream-muted hover:text-teal-light text-xs py-1.5">Privacy</a></div>}
          <button onClick={toggleBwMode} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${bwMode ? 'text-gold' : 'text-cream-muted'}`}><Contrast size={14} />{bwMode ? 'B&W: On' : 'B&W: Off'}</button>
        </div>
      </aside>

      <nav className="sticky top-0 z-30 bg-slate-deep border-b border-slate-border flex items-center justify-between h-14 px-4 md:ml-64">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="md:hidden flex-shrink-0"><Menu className="w-6 h-6 text-cream" /></button>
          <button onClick={() => navigate(currentUser ? '/space' : '/')} className="flex items-center gap-0 min-w-0 md:hidden"><img src="/logo.png" alt="A" className="h-9 w-auto -mr-2 flex-shrink-0" /><span className="text-cream font-serif text-base font-bold truncate">trium</span><span className="text-ember font-serif text-base font-bold">X</span></button>
          <div className="hidden md:flex items-center"><span className="text-cream-muted text-sm">{isMySpace ? 'My Space' : isDiscover ? 'Discover' : isChat ? 'Messages' : 'AtriumX'}</span></div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {currentUser ? (<div className="flex items-center gap-2"><NotificationBell /><button onClick={() => navigate(`/profile/${currentUser.id}`)} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: currentUser.avatar_color }}>{currentUser.avatar_initials}</button></div>) : (<button onClick={() => navigate('/student')} className="bg-ember hover:bg-ember-dark text-white text-sm font-bold px-4 py-2 rounded-xl">Sign In</button>)}
        </div>
      </nav>

      <div className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)} />
      <div className={`fixed top-0 left-0 h-full w-72 max-w-[80%] bg-slate-card border-r border-slate-border z-50 p-6 flex flex-col gap-1 transition-transform duration-300 md:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-6"><span className="text-cream font-serif text-xl font-bold">AtriumX</span><button onClick={() => setMenuOpen(false)}><X size={22} className="text-cream-muted" /></button></div>
        {currentUser?.account_type !== 'business' && (
          <button onClick={() => { setMenuOpen(false); navigate('/space'); }} className={`flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border w-full text-left ${isMySpace ? 'text-cream' : 'text-cream-muted'}`}><Backpack size={16} /> My Space</button>
        )}
        <button onClick={() => { setMenuOpen(false); navigate('/feed'); }} className={`flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border w-full text-left ${isDiscover ? 'text-cream' : 'text-cream-muted'}`}><Search size={16} /> Discover</button>
        <button onClick={() => { setMenuOpen(false); navigate('/events'); }} className="flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border text-cream-muted w-full text-left pl-6">Events</button>
        <button onClick={() => { setMenuOpen(false); navigate('/chat'); }} className={`flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border w-full text-left ${isChat ? 'text-cream' : 'text-cream-muted'}`}><MessageCircle size={16} /> Messages {unreadMessageCount > 0 && `(${unreadMessageCount})`}</button>
        <button onClick={() => { setMenuOpen(false); navigate(currentUser ? `/profile/${currentUser.id}` : '/student'); }} className="flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border text-cream-muted w-full text-left">My Listings & Profile</button>
        {currentUser?.is_admin && <button onClick={() => { setMenuOpen(false); navigate('/admin'); }} className="flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border text-cream-muted w-full text-left">Admin</button>}
        <button onClick={() => { setMenuOpen(false); navigate('/notebook'); }} className="flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border text-cream-muted w-full text-left"><NotebookPen size={16} /> Notebook</button>
        {partner && <button onClick={() => { setMenuOpen(false); navigate('/partner'); }} className="flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border text-cream-muted w-full text-left"><Handshake size={16} /> Partner</button>}
        {currentUser && pushSupported() && <button onClick={handleTogglePush} disabled={pushLoading || pushBlocked} className={`flex items-center gap-2.5 text-sm font-medium py-3 border-b border-slate-border w-full text-left disabled:opacity-60 ${pushOn ? 'text-gold' : 'text-cream-muted'}`}>{pushOn ? <Bell size={16} /> : <BellOff size={16} />}{pushBlocked ? 'Notifications: Blocked' : pushLoading ? 'Updating…' : pushOn ? 'Notifications: On' : 'Notifications: Off'}</button>}
        <div className="border-b border-slate-border"><button onClick={() => setHelpOpen(o => !o)} className="w-full flex items-center justify-between text-sm font-medium py-3 text-cream-muted">Help & Legal <ChevronDown size={16} className={`transition-transform ${helpOpen ? 'rotate-180' : ''}`} /></button>{helpOpen && <div className="flex flex-col pb-2"><a href="/How-it-works.html" onClick={() => setMenuOpen(false)} className="text-cream-muted text-sm py-2 pl-3">How It Works</a><a href="/Faq.html" onClick={() => setMenuOpen(false)} className="text-cream-muted text-sm py-2 pl-3">FAQ</a><a href="/Safety.html" onClick={() => setMenuOpen(false)} className="text-cream-muted text-sm py-2 pl-3">Safety Tips</a><a href="/Terms.html" onClick={() => setMenuOpen(false)} className="text-cream-muted text-sm py-2 pl-3">Terms</a><a href="/Privacy.html" onClick={() => setMenuOpen(false)} className="text-cream-muted text-sm py-2 pl-3">Privacy</a></div>}</div>
      </div>
    </>
  )
}
