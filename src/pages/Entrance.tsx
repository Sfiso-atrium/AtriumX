// src/pages/Entrance.tsx
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Store, ListChecks, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Entrance() {
  const navigate = useNavigate()
  const { currentUser, setRedirectAfterLogin } = useApp()

  const handleMySpace = () => {
    if (currentUser) {
      navigate('/space')
    } else {
      setRedirectAfterLogin('/space')
      navigate('/student')
    }
  }

  return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center px-6 pt-14 pb-10">

      <div className="mb-8 text-center flex flex-col items-center">
        <img src="/logo.png" alt="AtriumX" className="h-20 w-auto mb-4" />
        <h1 className="font-serif text-5xl text-ember mb-2">
          AtriumX
        </h1>
        <p className="text-cream-muted text-sm">The campus economy, organised.</p>
      </div>

      <p className="text-cream-muted text-sm text-center max-w-sm mb-9 leading-relaxed">
        Buy and sell with students in your own residence, chat straight from a listing, and keep your
        deadlines, timetable and budget in one place built just for res life. Real neighbours, real prices,
        no strangers from across town.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">

        <div className="bg-slate-card border border-slate-border hover:border-gold rounded-2xl p-6 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap size={28} className="text-gold" />
            <h2 className="text-cream font-bold text-xl">I'm a Student</h2>
          </div>
          <p className="text-cream-muted text-sm mb-5">
            Browse listings from your neighbours, message sellers directly, and find things fast with
            watchlists and alerts.
          </p>
          <button
            onClick={() => { window.location.href = '/Welcome.html' }}
            className="w-full bg-gold hover:opacity-85 text-black font-bold py-3 rounded-xl transition-opacity"
          >
            Browse the Marketplace
          </button>
        </div>

        <div className="bg-slate-card border border-slate-border hover:border-teal-primary rounded-2xl p-6 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <Store size={28} className="text-teal-primary" />
            <h2 className="text-cream font-bold text-xl">I'm a Business</h2>
          </div>
          <p className="text-cream-muted text-sm mb-5">
            Reach hundreds of students in one residence — from campus vendors to student-run side hustles.
          </p>
          <button
            onClick={() => navigate('/retailer')}
            className="w-full bg-teal-primary hover:opacity-85 text-black font-bold py-3 rounded-xl transition-opacity"
          >
            Sell With Us
          </button>
        </div>

        <div className="relative overflow-hidden bg-slate-card border border-slate-border hover:border-sapphire-light rounded-2xl p-6 transition-colors">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-sapphire-light/15 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <ListChecks size={28} className="text-sapphire-light" />
              <h2 className="text-cream font-bold text-xl">My Space</h2>
            </div>
            <p className="text-cream-muted text-sm mb-5">
              Your own study toolkit — deadlines, a weekly timetable, budget tracking and a focus timer,
              separate from the marketplace. Sign in to make it yours.
            </p>
            <button
              onClick={handleMySpace}
              className="w-full bg-sapphire-light hover:opacity-85 text-white font-bold py-3 rounded-xl transition-opacity"
            >
              {currentUser ? 'Open My Space' : 'Sign In to Open My Space'}
            </button>
          </div>
        </div>

      </div>

      <div className="w-full max-w-sm mt-10 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <MessageCircle size={16} className="text-teal-light flex-shrink-0 mt-0.5" />
          <p className="text-cream-muted text-xs leading-relaxed">Chat with sellers in-app the moment you find something you want.</p>
        </div>
        <div className="flex items-start gap-3">
          <Sparkles size={16} className="text-gold flex-shrink-0 mt-0.5" />
          <p className="text-cream-muted text-xs leading-relaxed">Study tools built for res life — plan, focus and keep track without leaving the app.</p>
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck size={16} className="text-cream-muted flex-shrink-0 mt-0.5" />
          <p className="text-cream-muted text-xs leading-relaxed">Built for students, by design — your campus, your neighbours, your deals.</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        <a href="/How-it-works.html" className="text-cream-muted hover:text-teal-light transition-colors">How it works</a>
        <span className="text-slate-border">·</span>
        <a href="/Faq.html" className="text-cream-muted hover:text-teal-light transition-colors">FAQ</a>
        <span className="text-slate-border">·</span>
        <a href="/safety.html" className="text-cream-muted hover:text-teal-light transition-colors">Safety</a>
        <span className="text-slate-border">·</span>
        <a href="/Terms.html" className="text-cream-muted hover:text-teal-light transition-colors">Terms of Service</a>
        <span className="text-slate-border">·</span>
        <a href="/Privacy.html" className="text-cream-muted hover:text-teal-light transition-colors">Privacy Policy</a>
      </div>

      <p className="text-cream-muted text-xs text-center mt-4">
        AtriumX is your campus marketplace.
      </p>
    </div>
  )
}
