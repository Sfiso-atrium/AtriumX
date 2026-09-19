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
  const {
    currentUser,
    setAuthPromptOpen,
    setRedirectAfterLogin,
    unreadMessageCount,
  } = useApp()
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
          {
            label: 'Discover',
            icon: DiscoverIcon,
            path: '/feed',
            onClick: () => navigate('/feed'),
          },
          {
            label: 'Post',
            icon: PlusCircle,
            path: '/plan-select',
            onClick: () => setChooserOpen(true),
            action: true,
          },
          {
            label: 'Messages',
            icon: ChatIcon,
            path: '/chat',
            onClick: () => navigate('/chat'),
            badge: unreadMessageCount > 0 ? unreadMessageCount : null,
          },
          {
            label: 'Profile',
            icon: UserRound,
            path: `/profile/${currentUser.id}`,
            onClick: () => navigate(`/profile/${currentUser.id}`),
          },
        ]
      : [
          {
            label: 'My Space',
            icon: HomeIcon,
            path: '/space',
            onClick: () => navigate('/space'),
          },
          {
            label: 'Discover',
            icon: DiscoverIcon,
            path: '/feed',
            onClick: () => navigate('/feed'),
          },
          {
            label: 'Post',
            icon: PlusCircle,
            path: '/plan-select',
            onClick: () => setChooserOpen(true),
            action: true,
          },
          {
            label: 'Messages',
            icon: ChatIcon,
            path: '/chat',
            onClick: () => navigate('/chat'),
            badge: unreadMessageCount > 0 ? unreadMessageCount : null,
          },
          {
            label: 'Profile',
            icon: UserRound,
            path: `/profile/${currentUser.id}`,
            onClick: () => navigate(`/profile/${currentUser.id}`),
          },
        ]
    : [
        {
          label: 'Discover',
          icon: DiscoverIcon,
          path: '/feed',
          onClick: () => navigate('/feed'),
        },
        {
          label: 'Post',
          icon: PlusCircle,
          path: '/plan-select',
          onClick: () => handleProtected('/plan-select'),
          action: true,
        },
        {
          label: 'Events',
          icon: Compass,
          path: '/events',
          onClick: () => navigate('/events'),
        },
      ]

  return (
    <>
      {chooserOpen && <PostTypeModal onClose={() => setChooserOpen(false)} />}

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-deep/95 backdrop-blur border-t border-transparent">
        <div className="max-w-lg mx-auto flex items-center justify-around h-[68px] px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = !tab.action && isActive(tab.path)

            return (
              <button
                key={tab.label}
                onClick={tab.onClick}
                aria-label={tab.label}
                title={tab.label}
                className="group flex items-center justify-center flex-1 h-full relative text-center focus:outline-none"
              >
                <div
                  className={
                    tab.action
                      ? 'relative w-11 h-11 -mt-5 rounded-full bg-gold text-slate-deep flex items-center justify-center shadow-lg ring-4 ring-slate-deep transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105 group-active:translate-y-0 group-active:scale-90'
                      : `relative w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-110 group-active:scale-90 ${
                          active ? 'bg-gold/10' : ''
                        }`
                  }
                >
                  <Icon
                    size={tab.action ? 24 : tab.label === 'My Space' ? 27 : 22}
                    className={
                      tab.action
                        ? 'text-slate-deep transition-transform duration-200 ease-out group-hover:rotate-3'
                        : active
                          ? 'text-gold transition-all duration-200 ease-out group-hover:rotate-3'
                          : 'text-cream-muted transition-all duration-200 ease-out group-hover:text-cream group-hover:rotate-[-3deg]'
                    }
                  />
                  {active && !tab.action && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-gold transition-transform duration-200 group-hover:scale-125" aria-hidden="true" />
                  )}
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
