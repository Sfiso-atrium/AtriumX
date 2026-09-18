import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { Compass, PlusCircle, UserRound } from 'lucide-react'
import { PostTypeModal } from './PostTypeChooser'
import HomeIcon from './icons/HomeIcon'
import ChatIcon from './icons/ChatIcon'
import { useApp } from '../../context/AppContext'

type NavIcon = ComponentType<{ size?: number; className?: string }>

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
            icon: Compass,
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
            icon: Compass,
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
          icon: Compass,
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

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-deep/95 backdrop-blur border-t border-slate-border">
        <div className="max-w-lg mx-auto flex items-center justify-around h-[68px] px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = !tab.action && isActive(tab.path)

            return (
              <button
                key={tab.label}
                onClick={tab.onClick}
                aria-label={tab.label}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative text-center"
              >
                <div
                  className={
                    tab.action
                      ? 'relative w-11 h-11 -mt-4 rounded-full bg-ember text-white flex items-center justify-center shadow-lg ring-4 ring-slate-deep'
                      : 'relative w-9 h-9 rounded-xl flex items-center justify-center'
                  }
                >
                  <Icon
                    size={tab.action ? 24 : 21}
                    className={
                      tab.action
                        ? 'text-white'
                        : active
                          ? 'text-ember'
                          : 'text-cream-muted'
                    }
                  />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-none ${
                    active ? 'text-ember font-bold' : tab.action ? 'text-cream' : 'text-cream-muted'
                  }`}
                >
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
