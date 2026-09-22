// src/pages/Entrance.tsx - theme synced with atriumx-theme.css
// Light, airy, 50/50 split with literal vertical divider - image desktop-only
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Store, Backpack, MessageCircle, MapPin, CalendarCheck, Contrast, ArrowRight, Sparkles, Check, Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import InstallAppButton from '../components/common/InstallAppButton'

export default function Entrance() {
  const navigate = useNavigate()
  const { currentUser, isLoadingAuth, setRedirectAfterLogin, darkMode, toggleDarkMode } = useApp()

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

  if (isLoadingAuth || currentUser) {
    return <div className="min-h-screen bg-slate-deep" />
  }

  return (
    <div className="min-h-screen bg-slate-deep">
      <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1px_1fr] lg:h-screen lg:overflow-hidden">

        {/* LEFT SIDE - DETAILS - white theme */}
        <div className="relative bg-slate-deep overflow-hidden flex flex-col min-h-screen lg:min-h-0 lg:h-screen lg:overflow-y-auto">
          {/* Soft appealing glows for white theme */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-[520px] h-[520px] bg-[#DBEAFE] rounded-full blur-[90px] opacity-70" />
            <div className="absolute top-[35%] -right-24 w-[420px] h-[420px] bg-[#E0E7FF] rounded-full blur-[80px] opacity-60" />
            <div className="absolute -bottom-24 left-[15%] w-[560px] h-[380px] bg-[#F1F5F9] rounded-full blur-[70px] opacity-80" />
          </div>

          <nav className="relative z-10 flex items-center justify-between gap-2 px-6 sm:px-10 lg:px-10 xl:px-14 pt-6 sm:pt-7 shrink-0 w-full">
            <div className="flex items-center min-w-0">
              <div className="flex items-baseline gap-[1px] h-[18.2px] sm:h-[20.47px]">
                <img src="/logo.png" alt="AtriumX" className="h-8 w-8 sm:h-9 sm:w-9 object-contain flex-shrink-0 -mt-[13.81px] sm:-mt-[15.53px] -mr-[8.09px] sm:-mr-[9.1px] translate-y-[7.35px] sm:translate-y-[8.27px]" />
                <span
                  className="text-[22px] sm:text-[24px] font-extrabold text-teal-primary whitespace-nowrap leading-none tracking-tight"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  <span className="inline-flex" style={{ gap: '0.5px' }}>
                    <span>t</span>
                    <span>r</span>
                    <span>i</span>
                    <span>u</span>
                    <span>m</span>
                    <span className="ml-[0.5px]">X</span>
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all ${
                  darkMode ? 'border-teal-light text-teal-light bg-teal-faint' : 'border-slate-border text-cream-muted hover:text-cream bg-slate-card'
                }`}
              >
                <Contrast size={16} />
              </button>
              <button
                onClick={() => navigate('/student')}
                className="border border-slate-border hover:border-teal-primary bg-white hover:bg-slate-card text-cream hover:text-teal-primary text-[13px] sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/student?mode=register')}
                className="bg-cream hover:opacity-90 text-white text-[13px] sm:text-sm font-bold px-3.5 sm:px-5 py-2 rounded-xl transition-opacity shadow-[0_1px_2px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.08)]"
              >
                Get Started
              </button>
            </div>
          </nav>

          <div className="relative z-10 flex-1 px-6 sm:px-10 lg:px-10 xl:px-14 pt-8 pb-8 flex flex-col justify-center max-w-[720px] mx-auto w-full lg:mx-0">
            <div className="flex justify-end lg:justify-start mb-6">
              <InstallAppButton />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] w-fit mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#1D4ED8]">Campus Community & My Space</span>
              <Sparkles size={12} className="text-[#2563EB]" />
            </div>

            <h1 className="font-serif font-[700] text-[34px] sm:text-[42px] lg:text-[44px] leading-[0.98] tracking-[-0.03em] text-cream mb-4">
              Your campus life,
              <br />
              <span className="bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">organised in one place.</span>
            </h1>

            <p className="text-cream-muted text-[15px] leading-relaxed max-w-[480px] mb-8">
              One account for marketplace, events, study tools and your personal space — all synced.
            </p>

            <div className="space-y-3.5 mb-10 max-w-[520px]">
              {[
                { icon: Check, title: "Know what's happening on your campus", desc: "events, deals and activity, all in one feed." },
                { icon: Check, title: "Find out what your peers need", desc: "and sell it to them on the marketplace." },
                { icon: Check, title: "Manage your studying", desc: "deadlines, timetable and focus sessions in My Space." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon size={12} className="text-[#2563EB]" />
                  </div>
                  <p className="text-[14px] leading-[1.5] text-cream-muted">
                    <span className="text-cream font-semibold">{item.title}</span> — {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              <div className="group bg-slate-card border border-slate-border hover:border-[#BFDBFE] rounded-[16px] p-4 transition-all hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] hover:-translate-y-0.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center mb-3">
                  <GraduationCap size={18} className="text-[#2563EB]" />
                </div>
                <h3 className="text-cream font-bold text-[13px] mb-1">I'm a Student</h3>
                <p className="text-cream-muted text-[11px] leading-relaxed mb-3 line-clamp-2">Explore spaces, listings and campus activity.</p>
                <button onClick={() => { window.location.href = '/Welcome.html' }} className="w-full bg-cream text-white font-bold text-[12px] py-2 rounded-xl flex items-center justify-center gap-1 hover:opacity-90 transition-opacity">
                  Explore <ArrowRight size={12} />
                </button>
              </div>

              <div className="group bg-slate-card border border-slate-border hover:border-[#A7F3D0] rounded-[16px] p-4 transition-all hover:shadow-[0_8px_24px_rgba(16,185,129,0.08)] hover:-translate-y-0.5">
                <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mb-3">
                  <Store size={18} className="text-[#059669]" />
                </div>
                <h3 className="text-cream font-bold text-[13px] mb-1">I'm a Business</h3>
                <p className="text-cream-muted text-[11px] leading-relaxed mb-3 line-clamp-2">Access business tools for partners.</p>
                <button onClick={() => navigate('/retailer')} className="w-full bg-white border border-slate-border hover:border-slate-border text-cream font-bold text-[12px] py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-slate-deep transition-colors">
                  Explore <ArrowRight size={12} />
                </button>
              </div>

              <div className="group bg-[#2563EB] border border-[#1D4ED8] rounded-[16px] p-4 transition-all hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(37,99,235,0.22)]">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center mb-3">
                  <Backpack size={18} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-[13px] mb-1">My Space</h3>
                <p className="text-white/70 text-[11px] leading-relaxed mb-3 line-clamp-2">Deadlines, timetable, budget & focus.</p>
                <button onClick={handleMySpace} className="w-full bg-white text-[#1D4ED8] font-bold text-[12px] py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-[#F1F5F9] transition-colors">
                  {currentUser ? 'Open' : 'Sign In'} <ArrowRight size={12} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[11px] font-bold tracking-widest uppercase text-cream-muted/70 mb-3">What you can do</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { icon: MessageCircle, title: 'Messages', desc: 'Keep conversations in one place.', accent: 'text-[#2563EB] bg-[#EFF6FF] border-[#DBEAFE]' },
                  { icon: MapPin, title: 'Marketplace', desc: 'Browse listings & connect.', accent: 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]' },
                  { icon: CalendarCheck, title: 'My Space', desc: 'Deadlines, budget, focus & more.', accent: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]' },
                ].map((f) => (
                  <div key={f.title} className="bg-slate-card border border-slate-border rounded-xl p-3 flex gap-2.5">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${f.accent}`}>
                      <f.icon size={13} />
                    </div>
                    <div>
                      <p className="text-cream text-[12px] font-semibold leading-none mb-1">{f.title}</p>
                      <p className="text-cream-muted text-[11px] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 flex gap-2.5 mb-2">
              <Shield size={16} className="text-[#2563EB] shrink-0 mt-0.5" />
              <p className="text-[12.5px] leading-relaxed text-[#1E40AF]/80">
                <span className="text-[#1E293B] font-medium">Start with what you need most,</span> then keep everything else organised in the same account. No clutter.
              </p>
            </div>
          </div>

          <footer className="relative z-10 px-6 sm:px-10 lg:px-10 xl:px-14 pb-8 pt-2 max-w-[720px] mx-auto w-full lg:mx-0">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-cream-muted mb-3">
              <a href="/How-it-works.html" className="hover:text-cream transition-colors">How It Works</a>
              <a href="/Faq.html" className="hover:text-cream transition-colors">FAQ</a>
              <a href="/safety.html" className="hover:text-cream transition-colors">Safety Tips</a>
              <a href="/Terms.html" className="hover:text-cream transition-colors">Terms</a>
              <a href="/Privacy.html" className="hover:text-cream transition-colors">Privacy</a>
            </div>
            <p className="text-cream-muted/70 text-[11px]">AtriumX • Built for campus communities</p>
          </footer>
        </div>

        {/* LITERAL VERTICAL LINE - center top to bottom - desktop only */}
        <div className="hidden lg:block w-px bg-slate-border relative z-20 h-screen sticky top-0 self-start">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-border to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-7 h-7 rounded-full bg-slate-deep border border-slate-border shadow-[0_0_0_4px_white] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - IMAGE - desktop only */}
        <div className="hidden lg:flex relative bg-[#F8FAFF] overflow-hidden h-screen sticky top-0">
          <img
            src="/images/entrance/campus-library.jpg"
            alt="Campus library shelves"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-white/10" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#EFF6FF]/60 via-transparent to-[#ECFDF5]/40" />

          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-border rounded-[18px] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.15)] max-w-[380px]">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white font-bold text-[11px]">SX</div>
                <div>
                  <p className="text-cream font-bold text-[13px] leading-none">Sfiso • Student</p>
                  <p className="text-cream-muted text-[11px]">Hatfield • Just now</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-1 rounded-full text-[10px] font-bold">
                  <Check size={10} /> Active
                </div>
              </div>
              <p className="text-cream font-semibold text-[14px] leading-tight mb-1">Gaming Laptop - R12 000</p>
              <p className="text-cream-muted text-[12px] leading-relaxed">High performance, perfect for students. Only used 6 months. Meet on campus.</p>
              <div className="flex gap-2 mt-3 items-center">
                <div className="h-1.5 flex-1 rounded-full bg-[#E2E8F0]"><div className="h-full w-[75%] bg-[#2563EB] rounded-full" /></div>
                <span className="text-[10px] text-cream-muted font-medium">125 views • 12 interested</span>
              </div>
            </div>
          </div>

          <div className="absolute top-8 left-8 right-8 flex justify-between items-start">
            <div className="bg-white/90 backdrop-blur-xl border border-slate-border rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-cream text-[11px] font-medium">2,400+ listings live</span>
            </div>
            <div className="bg-white/90 backdrop-blur-xl border border-slate-border rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
              <MapPin size={12} className="text-[#2563EB]" />
              <span className="text-cream text-[11px] font-semibold">University of Pretoria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
