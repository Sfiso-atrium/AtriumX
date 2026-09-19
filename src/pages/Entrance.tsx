// src/pages/Entrance.tsx - REDESIGNED: 50/50 split with literal vertical divider, image desktop-only
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Store, Backpack, MessageCircle, MapPin, CalendarCheck, Contrast, Sparkles, ArrowRight, Check, Shield, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import InstallAppButton from '../components/common/InstallAppButton'

export default function Entrance() {
  const navigate = useNavigate()
  const { currentUser, isLoadingAuth, setRedirectAfterLogin, bwMode, toggleBwMode } = useApp()

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
    return <div className="min-h-screen bg-[#0B1220]" />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* DESKTOP: 50/50 with 1px vertical line center top-bottom */}
      <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1px_1fr] lg:h-screen lg:overflow-hidden">

        {/* LEFT SIDE - DETAILS - visually rebuilt but same pathways */}
        <div className="relative bg-[#0B1220] overflow-hidden flex flex-col min-h-screen lg:min-h-0 lg:h-screen lg:overflow-y-auto scrollbar-thin">
          {/* Ambient glows - custom colors chosen for appeal */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-[520px] h-[520px] bg-[#2563EB]/25 rounded-full blur-[120px]" />
            <div className="absolute top-[40%] -right-24 w-[380px] h-[380px] bg-[#14B8A6]/18 rounded-full blur-[100px]" />
            <div className="absolute -bottom-32 left-[20%] w-[600px] h-[420px] bg-[#1E40AF]/20 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>

          {/* Top nav - same logic */}
          <nav className="relative z-10 flex items-center justify-between gap-2 px-6 sm:px-10 lg:px-10 xl:px-14 pt-6 sm:pt-7 shrink-0">
            <div className="flex items-center min-w-0">
              <img src="/logo.png" alt="AtriumX" className="h-7 sm:h-8 w-auto -mr-1 flex-shrink-0" />
              <span className="font-serif text-[17px] sm:text-[19px] tracking-tight">
                <span className="text-white">trium</span><span className="text-[#60A5FA]">X</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={toggleBwMode}
                aria-label="Toggle black and white mode"
                title="Toggle black and white mode"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all ${
                  bwMode ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10' : 'border-white/15 text-white/60 hover:text-white hover:border-white/25 bg-white/[0.04]'
                }`}
              >
                <Contrast size={16} />
              </button>
              <button
                onClick={() => navigate('/student')}
                className="text-white/80 hover:text-white border border-white/15 hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08] text-[13px] sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/student?mode=register')}
                className="bg-white text-[#0B1220] hover:bg-[#F1F5F9] text-[13px] sm:text-sm font-bold px-3.5 sm:px-5 py-2 rounded-xl transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(255,255,255,0.15)]"
              >
                Get Started
              </button>
            </div>
          </nav>

          {/* Left content - rebuilt visually */}
          <div className="relative z-10 flex-1 px-6 sm:px-10 lg:px-10 xl:px-14 pt-8 pb-8 flex flex-col justify-center max-w-[640px] mx-auto w-full lg:mx-0 lg:max-w-none">
            <div className="flex justify-end lg:justify-start mb-6">
              <InstallAppButton />
            </div>

            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.10] backdrop-blur w-fit mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/70">Campus Community & My Space</span>
              <Sparkles size={12} className="text-[#F59E0B]" />
            </div>

            <h1 className="font-serif font-[650] text-[34px] sm:text-[42px] lg:text-[44px] leading-[0.98] tracking-[-0.03em] text-white mb-5">
              Your campus life,
              <br />
              <span className="bg-gradient-to-r from-[#60A5FA] via-[#38BDF8] to-[#2DD4BF] bg-clip-text text-transparent">organised in one place.</span>
            </h1>

            <p className="text-white/60 text-[15px] leading-relaxed max-w-[480px] mb-8">
              One account for everything that matters on campus — marketplace, events, study tools and your personal space.
            </p>

            {/* Bullets - same meaning, new visuals */}
            <div className="space-y-3.5 mb-10 max-w-[520px]">
              {[
                { icon: Zap, color: 'bg-[#2563EB]', title: "Know what's happening", desc: "events, deals and activity, all in one feed." },
                { icon: Store, color: 'bg-[#0EA5E9]', title: "Find what peers need", desc: "and sell it to them on the marketplace." },
                { icon: Backpack, color: 'bg-[#14B8A6]', title: "Manage your studying", desc: "deadlines, timetable and focus sessions in My Space." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3.5 group">
                  <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.25)] mt-0.5`}>
                    <item.icon size={14} className="text-white" />
                  </div>
                  <p className="text-[14px] leading-[1.5] text-white/70">
                    <span className="text-white font-semibold">{item.title}</span> — {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Primary action cards - same pathways, new appealing design */}
            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              <div className="group relative bg-white/[0.06] backdrop-blur border border-white/[0.08] hover:border-[#60A5FA]/40 rounded-[16px] p-4 transition-all hover:bg-white/[0.08] hover:-translate-y-0.5">
                <div className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-[#2563EB]/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-white/10 flex items-center justify-center mb-3">
                    <GraduationCap size={18} className="text-[#60A5FA]" />
                  </div>
                  <h3 className="text-white font-bold text-[13px] mb-1">I'm a Student</h3>
                  <p className="text-white/50 text-[11px] leading-relaxed mb-3 line-clamp-2">Explore spaces, listings and campus activity.</p>
                  <button onClick={() => { window.location.href = '/Welcome.html' }} className="w-full bg-white text-[#0B1220] font-bold text-[12px] py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-[#F1F5F9] transition-colors">
                    Explore <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              <div className="group relative bg-white/[0.06] backdrop-blur border border-white/[0.08] hover:border-[#2DD4BF]/40 rounded-[16px] p-4 transition-all hover:bg-white/[0.08] hover:-translate-y-0.5">
                <div className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-[#14B8A6]/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-white/10 flex items-center justify-center mb-3">
                    <Store size={18} className="text-[#2DD4BF]" />
                  </div>
                  <h3 className="text-white font-bold text-[13px] mb-1">I'm a Business</h3>
                  <p className="text-white/50 text-[11px] leading-relaxed mb-3 line-clamp-2">Access business tools for partners.</p>
                  <button onClick={() => navigate('/retailer')} className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-[12px] py-2 rounded-xl flex items-center justify-center gap-1 transition-colors">
                    Explore <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] border border-[#60A5FA]/30 rounded-[16px] p-4 transition-all hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center mb-3">
                    <Backpack size={18} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-[13px] mb-1">My Space</h3>
                  <p className="text-white/70 text-[11px] leading-relaxed mb-3 line-clamp-2">Deadlines, timetable, budget & focus.</p>
                  <button onClick={handleMySpace} className="w-full bg-white text-[#1D4ED8] font-bold text-[12px] py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-[#F1F5F9] transition-colors">
                    {currentUser ? 'Open' : 'Sign In'} <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* What you can do - appealing mini */}
            <div className="mb-8">
              <p className="text-[11px] font-bold tracking-widest uppercase text-white/40 mb-3">What you can do</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { icon: MessageCircle, title: 'Messages', desc: 'Keep conversations in one place.', dot: 'bg-[#60A5FA]' },
                  { icon: MapPin, title: 'Marketplace', desc: 'Browse listings & connect.', dot: 'bg-[#F59E0B]' },
                  { icon: CalendarCheck, title: 'My Space', desc: 'Deadlines, budget, focus & more.', dot: 'bg-[#2DD4BF]' },
                ].map((f) => (
                  <div key={f.title} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 flex gap-2.5">
                    <div className="relative mt-0.5">
                      <f.icon size={14} className="text-white/70" />
                      <span className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${f.dot}`} />
                    </div>
                    <div>
                      <p className="text-white text-[12px] font-semibold leading-none mb-1">{f.title}</p>
                      <p className="text-white/45 text-[11px] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Callout */}
            <div className="relative overflow-hidden rounded-xl border border-[#14B8A6]/20 bg-gradient-to-r from-[#14B8A6]/10 via-[#2563EB]/10 to-[#14B8A6]/10 p-[1px] mb-2">
              <div className="bg-[#0B1220]/80 backdrop-blur rounded-[11px] px-4 py-3 flex gap-2.5">
                <Shield size={16} className="text-[#2DD4BF] shrink-0 mt-0.5" />
                <p className="text-[12.5px] leading-relaxed text-white/70">
                  <span className="text-white font-medium">Start with what you need most,</span> then keep everything else organised in the same account. No clutter.
                </p>
              </div>
            </div>
          </div>

          {/* Footer - same links */}
          <footer className="relative z-10 px-6 sm:px-10 lg:px-10 xl:px-14 pb-8 pt-2">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/35 mb-3">
              <a href="/How-it-works.html" className="hover:text-white/70 transition-colors">How It Works</a>
              <a href="/Faq.html" className="hover:text-white/70 transition-colors">FAQ</a>
              <a href="/safety.html" className="hover:text-white/70 transition-colors">Safety Tips</a>
              <a href="/Terms.html" className="hover:text-white/70 transition-colors">Terms</a>
              <a href="/Privacy.html" className="hover:text-white/70 transition-colors">Privacy</a>
            </div>
            <p className="text-white/25 text-[11px]">AtriumX • Built for campus communities</p>
          </footer>
        </div>

        {/* LITERAL VERTICAL LINE - center top to bottom - desktop only */}
        <div className="hidden lg:block w-px bg-[#1E293B] relative z-20 h-screen sticky top-0 self-start">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-7 h-7 rounded-full bg-[#0B1220] border border-[#1E293B] shadow-[0_0_0_4px_#0B1220] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#2563EB] shadow-[0_0_8px_#2563EB]" />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - IMAGE - desktop only per requirement */}
        <div className="hidden lg:flex relative bg-[#F1F5F9] overflow-hidden h-screen sticky top-0">
          <img
            src="/images/entrance/campus-library.jpg"
            alt="Campus library shelves"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlays for appeal */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/70 via-[#0B1220]/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/20 via-transparent to-[#14B8A6]/20 mix-blend-overlay" />
          
          {/* Floating glass cards on image for visual appeal */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-[18px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-w-[380px]">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#0B1220] flex items-center justify-center text-white font-bold text-[11px]">SX</div>
                <div>
                  <p className="text-[#0F172A] font-bold text-[13px] leading-none">Sfiso • Student</p>
                  <p className="text-[#64748B] text-[11px]">Hatfield • Just now</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-1 rounded-full text-[10px] font-bold">
                  <Check size={10} /> Active
                </div>
              </div>
              <p className="text-[#0F172A] font-semibold text-[14px] leading-tight mb-1">Gaming Laptop - R12 000</p>
              <p className="text-[#475569] text-[12px] leading-relaxed">High performance, perfect for students. Only used 6 months. Meet on campus.</p>
              <div className="flex gap-2 mt-3">
                <div className="h-1.5 flex-1 rounded-full bg-[#E2E8F0]"><div className="h-full w-[75%] bg-[#2563EB] rounded-full" /></div>
                <span className="text-[10px] text-[#64748B] font-medium">125 views • 12 interested</span>
              </div>
            </div>
          </div>

          <div className="absolute top-8 left-8 right-8 flex justify-between items-start">
            <div className="bg-[#0B1220]/70 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-white text-[11px] font-medium">2,400+ listings live</span>
            </div>
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
              <MapPin size={12} className="text-[#2563EB]" />
              <span className="text-[#0F172A] text-[11px] font-semibold">University of Pretoria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
