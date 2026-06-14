// src/components/common/Navbar.tsx
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const navLinks = [
    { label: 'Feed', path: '/feed' },
    { label: 'Retailer', path: '/retailer' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center justify-between px-4">
      <button
        onClick={() => navigate('/')}
        className="text-xl font-bold"
      >
        <span className="text-cream font-serif">Atrium</span>
      </button>

      <div className="flex items-center gap-4">
        {navLinks.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`text-sm font-medium transition-colors hidden md:block ${
              isActive(link.path)
                ? 'text-ember border-b-2 border-ember pb-0.5'
                : 'text-cream-muted hover:text-cream'
            }`}
          >
            {link.label}
          </button>
        ))}

        <button
          onClick={() => navigate('/student')}
          className="bg-ember hover:bg-ember-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          Sign In
        </button>
      </div>
    </nav>
  )
}
