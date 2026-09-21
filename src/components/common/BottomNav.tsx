import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { Compass, Plus, UserRound } from 'lucide-react'
import { PostTypeModal } from './PostTypeChooser'
import HomeIcon from './icons/HomeIcon'
import ChatIcon from './icons/ChatIcon'
import { useApp } from '../../context/AppContext'

// `filled` = solid glyph, used when the icon sits on the blue active tile
type NavIcon = ComponentType<{ size?: number; className?: string; filled?: boolean }>

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

function PostIcon({ size = 24, className }: { size?: number; className?: string }) {
  return <Plus size={size} className={className} strokeWidth={2.6} />
}

function ProfileIcon({ size = 20, className, filled }: { size?: number; className?: string; filled?: boolean }) {
  return <UserRound size={size} className={className} fill={filled ? 'currentColor' : 'none'} />
}

function EventsIcon({ size = 20, className }: { size?: number; className?: string }) {
  return <Compass size={size} className={className} />
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
          { label: 'Post', icon: PostIcon, path: '/plan-select', onClick: () => setChooserOpen(true), action: true },
          { label: 'Messages', icon: ChatIcon, path: '/chat', onClick: () => navigate('/chat'), badge: unreadMessageCount > 0 ? unreadMessageCount : null },
          { label: 'Profile', icon: ProfileIcon, path: `/profile/${currentUser.id}`, onClick: () => navigate(`/profile/${currentUser.id}`) },
        ]
      : [
          { label: 'My Space', icon: HomeIcon, path: '/space', onClick: () => navigate('/space') },
          { label: 'Discover', icon: DiscoverIcon, path: '/feed', onClick: () => navigate('/feed') },
          { label: 'Post', icon: PostIcon, path: '/plan-select', onClick: () => setChooserOpen(true), action: true },
          { label: 'Messages', icon: ChatIcon, path: '/chat', onClick: () => navigate('/chat'), badge: unreadMessageCount > 0 ? unreadMessageCount : null },
          { label: 'Profile', icon: ProfileIcon, path: `/profile/${currentUser.id}`, onClick: () => navigate(`/profile/${currentUser.id}`) },
        ]
    : [
        { label: 'Discover', icon: DiscoverIcon, path: '/feed', onClick: () => navigate('/feed') },
        { label: 'Post', icon: PostIcon, path: '/plan-select', onClick: () => handleProtected('/plan-select'), action: true },
        { label: 'Events', icon: EventsIcon, path: '/events', onClick: () => navigate('/events') },
      ]

  return (
    <>
      {chooserOpen && <PostTypeModal onClose={() => setChooserOpen(false)} />}

      {/* Mobile: full-width bar pinned to the bottom, tabs spread evenly.
          md and up: the compact floating pill, centred at the bottom.
          Same tabs and behaviour in both; only the shell changes. */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-slate-border shadow-[0_-4px_20px_rgba(15,23,42,0.06)] md:right-auto md:left-1/2 md:-translate-x-1/2 md:w-max md:bottom-5 md:bg-white md:border md:rounded-full md:shadow-[0_12px_32px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.08)]"
      >
        <div className="mx-auto max-w-lg flex items-center justify-around px-2 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:max-w-none md:justify-center md:gap-12 md:px-7 md:pt-2.5 md:pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = !tab.action && isActive(tab.path)

            return (
              <button
                key={tab.label}
                onClick={tab.onClick}
                aria-label={tab.label}
                title={tab.label}
                className="group relative flex flex-1 md:flex-none items-center justify-center focus:outline-none"
              >
                <div
                  className={
                    tab.action
                      ? 'relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(37,99,235,0.35)] hover:bg-[#1D4ED8] hover:scale-105 active:scale-95 transition-all duration-200'
                      : `relative w-11 h-11 md:w-12 md:h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 ${
                          active
                            ? 'bg-[#2563EB] text-white shadow-[0_6px_16px_rgba(37,99,235,0.30)]'
                            : 'text-cream-muted hover:text-cream hover:bg-slate-card'
                        }`
                  }
                >
                  <Icon
                    size={tab.action ? 26 : tab.label === 'My Space' ? 24 : 22}
                    filled={active}
                    className={`${tab.action ? 'text-white' : active ? 'text-white' : 'text-cream-muted'} transform-gpu transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform group-hover:-translate-y-[2px] group-hover:scale-110 ${tab.action ? 'group-hover:rotate-90' : 'group-hover:rotate-[-6deg]'} group-active:scale-90 group-active:translate-y-[1px]`}
                  />
                  {tab.badge ? (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold border-2 border-white">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  ) : null}
                </div>
                {/* Small dot under the active tab */}
                {active && !tab.action && (
                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
