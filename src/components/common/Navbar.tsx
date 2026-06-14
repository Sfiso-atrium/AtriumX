// src/components/common/Navbar.tsx
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const navLinks = [
    { label: 'Feed', path: '/feed' },
    { label: 'Retailer', path: '/retailer' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center justify-between px-4">
      <button
        onClick={() => navigate('/')}
        className="text-xl font-bold"
      >
        <span className="text-cream">Atrium</span>
      </button>

      <div className="flex items-center gap-4">
        {navLinks.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`text-sm font-medium transition-colors hidden md:block ${
              location.hash === `#${link.path}`
                ? 'text-ember'
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
