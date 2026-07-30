import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
const navigate = useNavigate()
  const { currentUser } = useApp()

return (
<button onClick={() => navigate(currentUser ? '/feed' : '/')} className="flex items-center gap-0">
          <img src="/logo.png" alt="A" className="h-14 w-auto -mr-3" />
          <span className="text-cream font-serif text-2xl font-bold">trium</span>
          <span className="text-ember font-serif text-2xl font-bold">X</span>
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
