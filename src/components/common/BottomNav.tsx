import { useNavigate, useLocation } from 'react-router-dom'
import { PlusCircle, ShieldCheck } from 'lucide-react'
import HomeIcon from './icons/HomeIcon'
import ChatIcon from './icons/ChatIcon'
import ListingsIcon from './icons/ListingsIcon'
import { useApp } from '../../context/AppContext'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, setAuthPromptOpen, setRedirectAfterLogin, unreadMessageCount } = useApp()

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
      path: currentUser?.account_type === 'business' ? '/business/post' : '/plan-select',
      onClick: () => handleProtected(currentUser?.account_type === 'business' ? '/business/post' : '/plan-select'),
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
    ] : []),
  ]
  return (
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
  )
}
