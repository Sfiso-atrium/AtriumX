import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { Compass, PlusCircle, UserRound } from 'lucide-react'
import { PostTypeModal } from './PostTypeChooser'
import HomeIcon from './icons/HomeIcon'
import ChatIcon from './icons/ChatIcon'
import { useApp } from '../../context/AppContext'

type NavIcon = ComponentType<{ size?: number; className?: string }>

function DiscoverIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 121.76 122.88"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M55.19,0A55.18,55.18,0,0,1,101,85.93l20.74,22.61-15.69,14.34-20-22a55.72,55.72,0,0,1-9.81,5.28A55.19,55.19,0,1,1,55.19,0ZM68.47,51.5l-6.3,3.58A7.11,7.11,0,0,1,62,56.45a7,7,0,0,1-8.5,4.91,7.42,7.42,0,0,1-1.38-.53l-6.68,3.8L72.32,84.46l-3.85-33ZM41.91,58.88l6.42-3.65a6.84,6.84,0,0,1,.21-2.37A7,7,0,0,1,57,48a7,7,0,0,1,2.23,1L65,45.75,38.06,25.92l3.85,32.95ZM86.37,24A43.91,43.91,0,1,0,96,38.32,44.18,44.18,0,0,0,86.37,24Z" />
    </svg>
  )
}

type NavTab = {
  label: string
  icon: NavIcon
  path: string
  onClick: () => void
  badge?: number | null
  action?: boolean
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, setAuthPromptOpen, setRedirectAfterLogin, unreadMessageCount } = useApp()
  const [chooserOpen, setChooserOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/space') return location.pathname === '/space'
    if (path === '/feed') return location.pathname === '/feed' || location.pathname === '/events'
    if (path === '/chat') return location.pathname.startsWith('/chat')
    if (path === '/profile') return location.pathname.startsWith('/profile')
    return location.pathname === path
  }

  const handleProtected = (path: string) => {
    if (!currentUser) {
      setRedirectAfterLogin(path)
      setAuthPromptOpen(true)
      return
    }
    navigate(path)
  }

  const tabs: NavTab[] = currentUser
    ? currentUser.account_type === 'business'
      ? [
          { label: 'Discover', icon: DiscoverIcon, path: '/feed', onClick: () => navigate('/feed') },
          { label: 'Post', icon: PlusCircle, path: '/plan-select', onClick: () => setChooserOpen(true), action: true },
          { label: 'Messages', icon: ChatIcon, path: '/chat', onClick: () => navigate('/chat'), badge: unreadMessageCount > 0 ? unreadMessageCount : null },
          { label: 'Profile', icon: UserRound, path: `/profile/${currentUser.id}`, onClick: () => navigate(`/profile/${currentUser.id}`) },
        ]
      : [
          { label: 'My Space', icon: HomeIcon, path: '/space', onClick: () => navigate('/space') },
          { label: 'Discover', icon: DiscoverIcon, path: '/feed', onClick: () => navigate('/feed') },
          { label: 'Post', icon: PlusCircle, path: '/plan-select', onClick: () => setChooserOpen(true), action: true },
          { label: 'Messages', icon: ChatIcon, path: '/chat', onClick: () => navigate('/chat'), badge: unreadMessageCount > 0 ? unreadMessageCount : null },
          { label: 'Profile', icon: UserRound, path: `/profile/${currentUser.id}`, onClick: () => navigate(`/profile/${currentUser.id}`) },
        ]
    : [
        { label: 'Discover', icon: DiscoverIcon, path: '/feed', onClick: () => navigate('/feed') },
        { label: 'Post', icon: PlusCircle, path: '/plan-select', onClick: () => handleProtected('/plan-select'), action: true },
        { label: 'Events', icon: Compass, path: '/events', onClick: () => navigate('/events') },
      ]

  return (
    <>
      {chooserOpen && <PostTypeModal onClose={() => setChooserOpen(false)} />}

      {/* Centered floating pill - only at center of bottom */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto bg-white border border-slate-border rounded-full shadow-[0_12px_32px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.08)] px-2.5 py-2 flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = !tab.action && isActive(tab.path)

            return (
              <button
                key={tab.label}
                onClick={tab.onClick}
                aria-label={tab.label}
                title={tab.label}
                className="relative flex items-center justify-center focus:outline-none"
              >
                <div
                  className={
                    tab.action
                      ? 'relative w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.35)] hover:bg-[#1D4ED8] hover:scale-105 active:scale-95 transition-all duration-200'
                      : `relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                          active
                            ? 'bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.30)] scale-105'
                            : 'text-cream-muted hover:text-cream hover:bg-slate-card'
                        }`
                  }
                >
                  <Icon
                    size={tab.action ? 24 : tab.label === 'My Space' ? 22 : 20}
                    className={`${tab.action ? 'text-white' : active ? 'text-white' : 'text-cream-muted'} transition-colors`}
                  />
                  {tab.badge ? (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold border-2 border-white">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  ) : null}
                </div>
                {/* Small dot under active for extra emphasis like screenshot */}
                {active && !tab.action && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2563EB]" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
