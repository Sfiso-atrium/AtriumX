import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
const navigate = useNavigate()
  const { currentUser } = useApp()

return (
    <nav className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center justify-between px-4">
      <button onClick={() => navigate('/feed')} className="font-serif text-xl text-cream">
        AtriumX
      </button>

      <div className="flex items-center gap-4">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => navigate(`/profile/${currentUser.id}`)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: currentUser.avatar_color }}
            >
              {currentUser.avatar_initials}
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/student')}
            className="bg-ember hover:bg-ember-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  )
}
