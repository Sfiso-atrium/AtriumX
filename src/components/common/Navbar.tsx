import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, setAuthPromptOpen, setRedirectAfterLogin } = useApp()

  const isActive = (path: string) => location.pathname === path

  const handleProtected = (path: string) => {
    if (!currentUser) {
      setRedirectAfterLogin(path)
      setAuthPromptOpen(true)
      return
    }
    navigate(path)
  }

  const navLinks = [
    { label: 'Feed', path: '/feed', protected: false },
    { label: 'Post', path: '/plan-select', protected: true },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center justify-between px-4">
      <button onClick={() => navigate('/')} className="font-serif text-xl text-cream">
        Atrium
      </button>

      <div className="flex items-center gap-4">
        {navLinks.map(link => (
          <button
            key={link.path}
            onClick={() => link.protected ? handleProtected(link.path) : navigate(link.path)}
            className={`text-sm font-medium transition-colors hidden md:block ${
              isActive(link.path)
                ? 'text-ember border-b-2 border-ember pb-0.5'
                : 'text-cream-muted hover:text-cream'
            }`}
          >
            {link.label}
          </button>
        ))}

        {currentUser ? (
          <button
            onClick={() => navigate(`/profile/${currentUser.id}`)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: currentUser.avatar_color }}
          >
            {currentUser.avatar_initials}
          </button>
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
