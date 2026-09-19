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
      navigate('/space', { replace: true })
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

      <nav className="max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-6 pt-6">
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
            className="bg-cream hover:opacity-85 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-opacity whitespace-nowrap"
          >
            Get Started
          </button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 lg:pt-12 pb-14 lg:pb-16">

        <div className="flex justify-end mb-5 sm:mb-6">
          <InstallAppButton />
        </div>

        <section className="grid lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] gap-6 lg:gap-10 items-stretch mb-12 lg:mb-16">
          <div className="flex flex-col justify-center bg-slate-card border border-slate-border rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg">
            <div className="h-[3px] w-16 rounded-full bg-cream/70 mb-6" />

            <p className="text-cream-muted text-xs font-bold uppercase tracking-[0.18em] mb-3">
              Campus Community &amp; My Space
            </p>

            <h1 className="font-serif font-normal text-4xl sm:text-5xl lg:text-[3.7rem] text-cream leading-[1.05] mb-5 max-w-2xl">
              Your campus life, organised in one place.
            </h1>

            <p className="text-cream-muted text-base sm:text-lg leading-relaxed max-w-xl mb-7">
              Stay connected to the things already inside AtriumX — campus activity, the marketplace,
              messaging and your personal My Space tools — without having to jump between different places.
            </p>

            <div className="space-y-3 mb-8 max-w-xl">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-border bg-slate-deep/30 px-4 py-3.5">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-cream/70 flex-shrink-0" />
                <div>
                  <p className="text-cream font-bold text-sm">See what is happening</p>
                  <p className="text-cream-muted text-sm leading-relaxed">Browse existing listings and campus events from the same AtriumX space.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-border bg-slate-deep/30 px-4 py-3.5">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-teal-primary flex-shrink-0" />
                <div>
                  <p className="text-cream font-bold text-sm">Keep conversations together</p>
                  <p className="text-cream-muted text-sm leading-relaxed">Use the existing AtriumX messaging flow to stay in touch with other students.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-border bg-slate-deep/30 px-4 py-3.5">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-sapphire-light flex-shrink-0" />
                <div>
                  <p className="text-cream font-bold text-sm">Make My Space yours</p>
                  <p className="text-cream-muted text-sm leading-relaxed">Keep your existing deadlines, timetable, budget, focus sessions, watchlist and notebook organised.</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
              <button
                onClick={() => { window.location.href = '/Welcome.html' }}
                className="w-full bg-cream hover:opacity-85 text-white font-bold py-3 rounded-xl transition-opacity"
              >
                Explore AtriumX
              </button>
              <button
                onClick={handleMySpace}
                className="w-full border border-slate-border hover:border-teal-light text-cream hover:text-teal-light font-bold py-3 rounded-xl transition-colors"
              >
                {currentUser ? 'Open My Space' : 'Sign In to My Space'}
              </button>
            </div>
          </div>

          <div className="relative min-h-[360px] sm:min-h-[440px] lg:min-h-0">
            <img
              src="/images/entrance/campus-library.png"
              alt="Campus library shelves"
              className="w-full h-full min-h-[360px] sm:min-h-[440px] lg:min-h-[620px] object-cover rounded-3xl border border-slate-border shadow-lg"
            />
            <div className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-6 sm:bottom-6 rounded-2xl border border-white/10 bg-slate-deep/85 backdrop-blur-sm px-4 py-3.5 sm:px-5 sm:py-4">
              <p className="text-cream text-sm sm:text-base font-bold">One campus. One account. One space.</p>
              <p className="text-cream-muted text-xs sm:text-sm mt-1">Start where you need to, then keep everything else together in AtriumX.</p>
            </div>
          </div>
        </section>

        <section className="mb-12 lg:mb-14">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="text-cream text-xl sm:text-2xl font-bold">Choose your starting point</h2>
              <p className="text-cream-muted text-sm mt-1.5">These are the existing AtriumX spaces available to you.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-card border border-slate-border hover:border-gold rounded-2xl p-5 sm:p-6 transition-colors">
              <div className="flex items-center gap-2.5 mb-4">
                <GraduationCap size={22} className="text-gold" />
                <h3 className="text-cream font-bold text-base">Student</h3>
              </div>
              <p className="text-cream-muted text-sm leading-relaxed mb-5">Explore the existing student experience, campus activity and marketplace.</p>
              <button
                onClick={() => { window.location.href = '/Welcome.html' }}
                className="w-full border border-slate-border hover:border-gold text-cream hover:text-gold font-bold py-2.5 rounded-xl transition-colors"
              >
                Explore Student
              </button>
            </div>

            <div className="bg-slate-card border border-slate-border hover:border-teal-primary rounded-2xl p-5 sm:p-6 transition-colors">
              <div className="flex items-center gap-2.5 mb-4">
                <Store size={22} className="text-teal-primary" />
                <h3 className="text-cream font-bold text-base">Business</h3>
              </div>
              <p className="text-cream-muted text-sm leading-relaxed mb-5">Access the existing business tools and partner spaces already available in AtriumX.</p>
              <button
                onClick={() => navigate('/retailer')}
                className="w-full border border-slate-border hover:border-teal-primary text-cream hover:text-teal-light font-bold py-2.5 rounded-xl transition-colors"
              >
                Explore Business
              </button>
            </div>

            <div className="bg-slate-card border border-slate-border hover:border-sapphire-light rounded-2xl p-5 sm:p-6 transition-colors">
              <div className="flex items-center gap-2.5 mb-4">
                <Backpack size={22} className="text-sapphire-light" />
                <h3 className="text-cream font-bold text-base">My Space</h3>
              </div>
              <p className="text-cream-muted text-sm leading-relaxed mb-5">Your existing personal dashboard for deadlines, timetable, budget, focus sessions, watchlist and notebook.</p>
              <button
                onClick={handleMySpace}
                className="w-full border border-slate-border hover:border-sapphire-light text-cream hover:text-sapphire-light font-bold py-2.5 rounded-xl transition-colors"
              >
                {currentUser ? 'Open My Space' : 'Sign In to My Space'}
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-teal-light text-xs font-bold uppercase tracking-wider mb-4">Already inside AtriumX</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
              <MessageCircle size={16} className="text-teal-light mb-2" />
              <p className="text-cream font-bold text-sm mb-1">Messages</p>
              <p className="text-cream-muted text-xs leading-relaxed">Keep your existing conversations in one place.</p>
            </div>
            <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
              <MapPin size={16} className="text-gold mb-2" />
              <p className="text-cream font-bold text-sm mb-1">Marketplace</p>
              <p className="text-cream-muted text-xs leading-relaxed">Browse existing listings and connect with other students.</p>
            </div>
            <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
              <CalendarCheck size={16} className="text-sapphire-light mb-2" />
              <p className="text-cream font-bold text-sm mb-1">My Space</p>
              <p className="text-cream-muted text-xs leading-relaxed">Keep your existing personal tools organised around your day.</p>
            </div>
          </div>
        </section>

        <div className="bg-teal-faint border border-teal-primary rounded-2xl px-5 py-4 mt-8">
          <p className="text-cream text-sm font-medium leading-relaxed">
            🎓 Start with the part of AtriumX you need most, then keep everything else organised in the same account.
          </p>
        </div>

      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-center">
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
