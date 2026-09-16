import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { PlusCircle, ShieldCheck, Handshake, CalendarDays } from 'lucide-react'
import { PostTypeModal } from './PostTypeChooser'
import HomeIcon from './icons/HomeIcon'
import ChatIcon from './icons/ChatIcon'
import ListingsIcon from './icons/ListingsIcon'
import { useApp } from '../../context/AppContext'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, partner, setAuthPromptOpen, setRedirectAfterLogin, unreadMessageCount } = useApp()
  const [chooserOpen, setChooserOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path
  const handleProtected = (path: string) => {
    if (!currentUser) {
      setRedirectAfterLogin(path)
      setAuthPromptOpen(true)
      return
    }
    navigate(path)
  }

const tabs = [
    {
      label: 'Feed',
    icon: HomeIcon,
      path: '/feed',
      onClick: () => navigate('/feed'),
    },
    {
      label: 'Post',
      icon: PlusCircle,
      path: currentUser?.account_type === 'business' ? '/business/plan-select' : '/plan-select',
      // Opens the listing-or-event chooser rather than assuming a listing.
      onClick: () => currentUser ? setChooserOpen(true) : handleProtected('/plan-select'),
    },
    // Events sits in the bottom nav rather than becoming a fourth pill in
    // the feed's tab row. The feed's tabs all answer "what am I browsing
    // to buy" — Students vs Businesses are two views of the same
    // marketplace. Events isn't a shopping filter, it's a different
    // destination with its own time-based sorting, so a fourth pill there
    // would both crowd the row on a phone and lump together two things
    // that aren't alternatives to each other.
    {
      label: 'Events',
      icon: CalendarDays,
      path: '/events',
      onClick: () => navigate('/events'),
    },
    ...(currentUser ? [
      {
        label: 'Messages',
        icon: ChatIcon,
        path: '/chat',
        onClick: () => navigate('/chat'),
        badge: unreadMessageCount > 0 ? unreadMessageCount : null,
      },
      {
        label: 'My Listings',
        icon: ListingsIcon,
        path: `/profile/${currentUser.id}`,
        onClick: () => navigate(`/profile/${currentUser.id}`),
      },
      ...(currentUser.is_admin ? [
        {
          label: 'Admin',
          icon: ShieldCheck,
          path: '/admin',
          onClick: () => navigate('/admin'),
        },
      ] : []),
      ...(partner ? [
        {
          label: 'Partner',
          icon: Handshake,
          path: '/partner',
          onClick: () => navigate('/partner'),
        },
      ] : []),
    ] : []),
  ]
  return (
    <>
    {chooserOpen && <PostTypeModal onClose={() => setChooserOpen(false)} />}
   <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-deep border-t border-slate-border">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = isActive(tab.path)
          return (
            <button
              key={tab.label}
              onClick={tab.onClick}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
            >
              <div className="relative">
               <Icon
                  size={tab.label === 'Post' ? 28 : tab.label === 'Feed' ? 26 : 22}
                  className={active ? 'text-ember' : 'text-cream-muted'}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${active ? 'text-ember' : 'text-cream-muted'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
    </>
  )
}
