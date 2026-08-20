// src/pages/Entrance.tsx
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Store, ListChecks, MessageCircle, MapPin, CalendarCheck } from 'lucide-react'
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
    <div className="min-h-screen bg-slate-deep">

      <nav className="max-w-3xl mx-auto flex items-center justify-between px-6 pt-6">
        <div className="flex items-center">
          <img src="/logo.png" alt="AtriumX" className="h-9 w-auto -mr-1.5" />
          <span className="font-serif text-xl">
            <span className="text-cream">trium</span><span className="text-ember">X</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/student')}
            className="border border-slate-border hover:border-teal-light text-cream hover:text-teal-light text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/student?mode=register')}
            className="bg-gold hover:opacity-85 text-black text-sm font-bold px-4 py-2 rounded-xl transition-opacity"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">

        <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-teal-light via-gold to-ember mb-7" />

        <p className="text-teal-light text-xs font-bold uppercase tracking-wider mb-3">
          Campus Marketplace &amp; Study Space
        </p>

        <h1 className="font-serif font-normal text-4xl sm:text-5xl text-cream leading-[1.15] mb-5 max-w-2xl">
          Sell to your res. Stay on top of class. That's AtriumX.
        </h1>

        <p className="text-cream-muted text-base leading-relaxed max-w-xl mb-10">
          List what you're selling and chat directly with buyers right where you live — then keep your
          deadlines, timetable and budget in the same place, so studying never falls through the cracks.
        </p>

        <div className="flex flex-wrap gap-4 mb-14">
          <div className="flex-1 min-w-[230px] bg-slate-card border border-slate-border hover:border-gold rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4">
              <GraduationCap size={22} className="text-gold" />
              <h2 className="text-cream font-bold text-base">I'm a Student</h2>
            </div>
            <button
              onClick={() => { window.location.href = '/Welcome.html' }}
              className="w-full bg-gold hover:opacity-85 text-black font-bold py-3 rounded-xl transition-opacity mb-3"
            >
              Browse the Marketplace
            </button>
            <p className="text-cream-muted text-xs leading-relaxed">Buy and sell with students in your own residence.</p>
          </div>

          <div className="flex-1 min-w-[230px] bg-slate-card border border-slate-border hover:border-teal-primary rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4">
              <Store size={22} className="text-teal-primary" />
              <h2 className="text-cream font-bold text-base">I'm a Business</h2>
            </div>
            <button
              onClick={() => navigate('/retailer')}
              className="w-full bg-teal-primary hover:opacity-85 text-black font-bold py-3 rounded-xl transition-opacity mb-3"
            >
              Sell With Us
            </button>
            <p className="text-cream-muted text-xs leading-relaxed">Reach hundreds of students in one residence.</p>
          </div>

          <div className="flex-1 min-w-[230px] bg-slate-card border border-slate-border hover:border-sapphire-light rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-2.5 mb-4">
              <ListChecks size={22} className="text-sapphire-light" />
              <h2 className="text-cream font-bold text-base">My Space</h2>
            </div>
            <button
              onClick={handleMySpace}
              className="w-full bg-sapphire-light hover:opacity-85 text-white font-bold py-3 rounded-xl transition-opacity mb-3"
            >
              {currentUser ? 'Open My Space' : 'Sign In to Open My Space'}
            </button>
            <p className="text-cream-muted text-xs leading-relaxed">Deadlines, timetable, budget and focus time, sorted.</p>
          </div>
        </div>

        <h2 className="text-teal-light text-xs font-bold uppercase tracking-wider mb-4">Why Students Use It</h2>
        <div className="flex flex-wrap gap-3 mb-10">
          <div className="flex-1 min-w-[190px] bg-slate-card border border-slate-border rounded-2xl p-4">
            <MessageCircle size={16} className="text-teal-light mb-2" />
            <p className="text-cream font-bold text-sm mb-1">Chat Directly</p>
            <p className="text-cream-muted text-xs leading-relaxed">Message sellers in-app — no need to share your number.</p>
          </div>
          <div className="flex-1 min-w-[190px] bg-slate-card border border-slate-border rounded-2xl p-4">
            <MapPin size={16} className="text-gold mb-2" />
            <p className="text-cream font-bold text-sm mb-1">Stay In Your Res</p>
            <p className="text-cream-muted text-xs leading-relaxed">See what's for sale right where you live, first.</p>
          </div>
          <div className="flex-1 min-w-[190px] bg-slate-card border border-slate-border rounded-2xl p-4">
            <CalendarCheck size={16} className="text-sapphire-light mb-2" />
            <p className="text-cream font-bold text-sm mb-1">Study, Sorted</p>
            <p className="text-cream-muted text-xs leading-relaxed">Deadlines, timetable and focus sessions, built right in.</p>
          </div>
        </div>

        <div className="bg-teal-faint border border-teal-primary rounded-2xl px-5 py-4 mb-4">
          <p className="text-cream text-sm font-medium leading-relaxed">
            🎓 Whatever you're selling, and whatever you're studying — start small, stay organised, and grow
            from there. Everyone on AtriumX starts with one listing, or one deadline logged.
          </p>
        </div>

      </main>

      <footer className="max-w-3xl mx-auto px-6 pb-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs mb-4">
          <a href="/How-it-works.html" className="text-cream-muted hover:text-teal-light transition-colors">How It Works</a>
          <a href="/Faq.html" className="text-cream-muted hover:text-teal-light transition-colors">FAQ</a>
          <a href="/safety.html" className="text-cream-muted hover:text-teal-light transition-colors">Safety Tips</a>
          <a href="/Terms.html" className="text-cream-muted hover:text-teal-light transition-colors">Terms of Service</a>
          <a href="/Privacy.html" className="text-cream-muted hover:text-teal-light transition-colors">Privacy Policy</a>
        </div>
        <p className="text-cream-muted text-xs">AtriumX | Built for campus communities</p>
      </footer>
    </div>
  )
}
