import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Home, Search, Plus, MessageCircle, User } from 'lucide-react'
import { PostTypeModal } from './PostTypeChooser'
import { useApp } from '../../context/AppContext'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, setAuthPromptOpen, setRedirectAfterLogin, unreadMessageCount } = useApp()
  const [chooserOpen, setChooserOpen] = useState(false)

  const handleProtected = (path: string) => {
    if (!currentUser) {
      setRedirectAfterLogin(path)
      setAuthPromptOpen(true)
      return
    }
    navigate(path)
  }

  const isDiscover = ['/feed', '/discover', '/events', '/listing'].some(p => location.pathname.startsWith(p))
  const isMySpace = location.pathname.startsWith('/space')
  const isChat = location.pathname.startsWith('/chat')
  const isProfile = location.pathname.startsWith('/profile')

  return (
    <>
      {chooserOpen && <PostTypeModal onClose={() => setChooserOpen(false)} />}
      {/* Mobile only - desktop uses sidebar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-deep border-t border-slate-border md:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-around h-[68px] px-2">
          {/* My Space */}
          <button
            onClick={() => handleProtected('/space')}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
          >
            <Home size={22} className={isMySpace ? 'text-ember' : 'text-cream-muted'} />
            <span className={`text-[10px] ${isMySpace ? 'text-ember font-bold' : 'text-cream-muted'}`}>My Space</span>
          </button>

          {/* Discover */}
          <button
            onClick={() => navigate('/feed')}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
          >
            <Search size={22} className={isDiscover ? 'text-ember' : 'text-cream-muted'} />
            <span className={`text-[10px] ${isDiscover ? 'text-ember font-bold' : 'text-cream-muted'}`}>Discover</span>
          </button>

          {/* Center + */}
          <button
            onClick={() => currentUser ? setChooserOpen(true) : handleProtected('/plan-select')}
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center shadow-lg -mt-2">
              <Plus size={24} className="text-white" />
            </div>
          </button>

          {/* Messages */}
          <button
            onClick={() => handleProtected('/chat')}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
          >
            <div className="relative">
              <MessageCircle size={22} className={isChat ? 'text-ember' : 'text-cream-muted'} />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${isChat ? 'text-ember font-bold' : 'text-cream-muted'}`}>Messages</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => handleProtected(currentUser ? `/profile/${currentUser.id}` : '/profile')}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
          >
            {currentUser ? (
              <div
                className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-bold ${isProfile ? 'ring-2 ring-ember' : ''}`}
                style={{ backgroundColor: currentUser.avatar_color }}
              >
                {currentUser.avatar_initials}
              </div>
            ) : (
              <User size={22} className={isProfile ? 'text-ember' : 'text-cream-muted'} />
            )}
            <span className={`text-[10px] ${isProfile ? 'text-ember font-bold' : 'text-cream-muted'}`}>Profile</span>
          </button>
        </div>
      </div>
    </>
  )
}
