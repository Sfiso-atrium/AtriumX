// src/pages/Entrance.tsx
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Store } from 'lucide-react'

export default function Entrance() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 relative">

      <button
        onClick={() => navigate('/student')}
        className="absolute top-4 right-4 text-sm font-medium text-cream-muted hover:text-cream border border-slate-border hover:border-teal-primary px-4 py-2 rounded-xl transition-colors"
      >
        Sign In
      </button>

      <div className="mb-10 text-center">
        <h1 className="font-serif text-5xl text-cream mb-2">
          Atrium
        </h1>
        <p className="text-cream-muted text-sm">The campus economy, organised.</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">

        <div className="bg-slate-card border border-slate-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap size={28} className="text-teal-primary" />
            <h2 className="text-cream font-bold text-xl">I'm a Student</h2>
          </div>
          <p className="text-cream-muted text-sm mb-5">
            Browse listings and buy from your neighbours.
          </p>
          <button
            onClick={() => navigate('/feed')}
            className="w-full bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors"
          >
            Enter the Marketplace
          </button>
        </div>

        <div className="bg-teal-primary border border-teal-light rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Store size={28} className="text-gold" />
            <h2 className="text-cream font-bold text-xl">I'm a Business</h2>
          </div>
          <p className="text-cream-muted text-sm mb-5">
            Reach hundreds of students in one residence.
          </p>
          <button
            onClick={() => navigate('/retailer')}
            className="w-full bg-gold hover:bg-gold-muted text-slate-deep font-bold py-3 rounded-xl transition-colors"
          >
            Advertise With Us
          </button>
        </div>

      </div>

      <p className="text-cream-muted text-xs text-center mt-8">
        Atrium is your campus marketplace.
      </p>
    </div>
  )
}
