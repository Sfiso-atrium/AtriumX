// src/pages/Entrance.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Store, Backpack, MessageCircle, MapPin, CalendarCheck, Contrast } from 'lucide-react'
import { useApp } from '../context/AppContext'
import InstallAppButton from '../components/common/InstallAppButton'

export default function Entrance() {
  const navigate = useNavigate()
  const { currentUser, isLoadingAuth, setRedirectAfterLogin, bwMode, toggleBwMode } = useApp()

  // The installed PWA's start_url is "/" (this page), so every time
  // someone reopens the app it lands here first — previously with no
  // check at all, meaning an already-signed-in person saw the landing
  // page and Sign In button again instead of just going to their feed.
  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      navigate('/feed', { replace: true })
    }
  }, [isLoadingAuth, currentUser, navigate])

  const handleMySpace = () => {
    if (currentUser) {
      navigate('/space')
    } else {
      setRedirectAfterLogin('/space')
      navigate('/student')
    }
  }

  // Nothing to show while we still don't know if there's a session, or
  // for the instant before the redirect above fires — avoids a flash of
  // the landing page for someone who's actually already signed in.
  if (isLoadingAuth || currentUser) {
    return <div className="min-h-screen bg-slate-deep" />
  }

  return (
    <div className="min-h-screen bg-slate-deep">

      <nav className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-6 pt-6">
        <div className="flex items-center min-w-0 flex-shrink">
          <img src="/logo.png" alt="AtriumX" className="h-7 sm:h-9 w-auto -mr-1 sm:-mr-1.5 flex-shrink-0" />
          <span className="font-serif text-base sm:text-xl truncate">
            <span className="text-cream">trium</span><span className="text-ember">X</span>
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2.5 flex-shrink-0">
          <button
            onClick={toggleBwMode}
            aria-label="Toggle black and white mode"
            title="Toggle black and white mode"
            className={`flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 rounded-xl border transition-colors ${
              bwMode ? 'border-gold text-gold' : 'border-slate-border text-cream-muted hover:text-cream'
            }`}
          >
            <Contrast size={16} className="sm:hidden" />
            <Contrast size={18} className="hidden sm:block" />
          </button>
          <button
            onClick={() => navigate('/student')}
            className="border border-slate-border hover:border-teal-light text-cream hover:text-teal-light text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/student?mode=register')}
            className="bg-gold hover:opacity-85 text-black text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-opacity whitespace-nowrap"
          >
            Get Started
          </button>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">

        <div className="flex justify-end mb-4">
          <InstallAppButton />
        </div>

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
              <Backpack size={22} className="text-sapphire-light" />
              <h2 className="text-cream font-bold text-base">My Space</h2>
            </div>
            <button
              onClick={handleMySpace}
              className="w-full bg-sapphire-light hover:opacity-85 text-white font-bold py-3 rounded-xl transition-opacity mb-3"
            >
              {currentUser ? 'Open My Space' : 'Sign In to Open My Space'}
            </button>
            <p className="text-cream-muted text-xs leading-relaxed">
              Your personal student dashboard — log assignment deadlines, add your class timetable,
              track your monthly budget, and run focus sessions, all tied to your AtriumX account.
            </p>
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
            <p className="text-cream-muted text-xs leading-relaxed">
              Log due dates, add your timetable and run timed focus sessions inside My Space —
              so studying stays on track alongside your buying and selling.
            </p>
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
