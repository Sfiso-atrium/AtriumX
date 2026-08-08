// src/pages/Entrance.tsx
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Store } from 'lucide-react'

export default function Entrance() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6">

<div className="mb-10 text-center flex flex-col items-center">
        <img src="/logo.png" alt="AtriumX" className="h-24 w-auto mb-4" />
        <h1 className="font-serif text-5xl text-ember mb-2">
          AtriumX
        </h1>
        <p className="text-cream-muted text-sm">The campus economy, organised.</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-sm">

<div className="bg-slate-card border border-slate-border hover:border-gold rounded-2xl p-6 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap size={28} className="text-gold" />
            <h2 className="text-cream font-bold text-xl">I'm a Student</h2>
          </div>
          <p className="text-cream-muted text-sm mb-5">
            Browse listings and buy from your neighbours.
          </p>
<button
            onClick={() => { window.location.href = '/Welcome.html' }}
            className="w-full bg-gold hover:opacity-85 text-black font-bold py-3 rounded-xl transition-opacity"
          >
            Enter the Marketplace
          </button>
        </div>

        <div className="bg-slate-card border border-slate-border hover:border-teal-primary rounded-2xl p-6 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <Store size={28} className="text-teal-primary" />
            <h2 className="text-cream font-bold text-xl">I'm a Business</h2>
          </div>
          <p className="text-cream-muted text-sm mb-5">
            Reach hundreds of students in one residence.
          </p>
          <button
            onClick={() => navigate('/retailer')}
            className="w-full bg-teal-primary hover:opacity-85 text-black font-bold py-3 rounded-xl transition-opacity"
          >
            Advertise With Us
          </button>
        </div>

      </div>

<p className="text-cream-muted text-xs text-center mt-8">
        AtriumX is your campus marketplace.
      </p>
    </div>
  )
}
