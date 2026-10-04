import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Contrast,
  GraduationCap,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

const exploreCards = [
  {
    kind: 'Marketplace',
    title: 'MacBook Air M2',
    detail: 'R650',
    meta: 'On campus',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=85',
    tagClass: 'bg-[#EFF6FF] text-[#2563EB]',
  },
  {
    kind: 'Event',
    title: "Freshers' Social",
    detail: 'Thu, 26 Sep • 7:00 PM',
    meta: "Students' Union",
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=85',
    tagClass: 'bg-[#F5F3FF] text-[#7C3AED]',
  },
  {
    kind: 'Accommodation',
    title: 'Modern En-suite Room',
    detail: 'R6 200 pcm',
    meta: '5 mins from campus',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=85',
    tagClass: 'bg-[#FFF7ED] text-[#C2410C]',
  },
]

export default function Entrance() {
  const navigate = useNavigate()
  const { currentUser, isLoadingAuth, darkMode, toggleDarkMode } = useApp()

  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      navigate('/space', { replace: true })
    }
  }, [isLoadingAuth, currentUser, navigate])

  if (isLoadingAuth || currentUser) {
    return <div className="min-h-screen bg-slate-deep" />
  }

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-[#0F172A]">
      <header className="sticky top-0 z-40 border-b border-[#E6EDF7] bg-white/95 backdrop-blur-xl">
        <div className="flex h-[66px] w-full items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate('/')} className="flex items-center min-w-0 group" aria-label="AtriumX home">
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
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            <button onClick={() => navigate('/feed')} className="text-[13px] font-medium text-[#334155] hover:text-[#1565F9]">Marketplace</button>
            <button onClick={() => navigate('/events')} className="text-[13px] font-medium text-[#334155] hover:text-[#1565F9]">Events</button>
            <button onClick={() => navigate('/accommodations')} className="text-[13px] font-medium text-[#334155] hover:text-[#1565F9]">Accommodation</button>
            <button onClick={() => navigate('/retailer')} className="text-[13px] font-medium text-[#334155] hover:text-[#1565F9]">Businesses</button>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${darkMode ? 'border-teal-light bg-teal-faint text-teal-light' : 'border-[#E6EDF7] bg-white text-[#334155] hover:bg-[#F1F5F9]'}`}
            >
              <Contrast size={17} />
            </button>
            <button
              onClick={() => navigate('/feed')}
              aria-label="Browse marketplace"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-[#0F172A] hover:bg-[#F1F5F9] sm:flex"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => navigate('/student')}
              className="rounded-full border border-[#1565F9] bg-white px-4 py-2 text-[13px] font-semibold text-[#1565F9] transition-colors hover:bg-[#EFF6FF]"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/student?mode=register')}
              className="rounded-full bg-[#1565F9] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(21,101,249,0.20)] transition-opacity hover:opacity-90 sm:px-5"
            >
              Create account
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-10 sm:px-8 lg:px-12">
        <section className="relative grid overflow-hidden rounded-b-[36px] bg-white lg:min-h-[520px] lg:grid-cols-[0.88fr_1.12fr]">
          <div className="relative z-10 flex flex-col justify-center px-2 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-16 xl:px-14">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">A brighter campus together</p>
            <h1 className="max-w-[560px] font-serif text-[44px] font-bold leading-[0.94] tracking-[-0.045em] text-[#07152F] sm:text-[58px] lg:text-[64px] xl:text-[70px]">
              Campus life,
              <br />
              all in one place.
            </h1>
            <p className="mt-6 max-w-[520px] text-[16px] leading-[1.55] text-[#52637B] sm:text-[17px]">
              Buy and sell with students, discover trusted businesses, find accommodation, and stay connected to what&apos;s happening on campus.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/student')}
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-[#1565F9] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(21,101,249,0.20)] hover:opacity-90"
              >
                Sign in <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/student?mode=register')}
                className="inline-flex min-w-[190px] items-center justify-center rounded-full border border-[#1565F9] bg-white px-7 py-3 text-sm font-semibold text-[#1565F9] hover:bg-[#EFF6FF]"
              >
                Create account
              </button>
            </div>

            <button
              onClick={() => navigate('/feed')}
              className="mt-4 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[#1565F9] hover:underline"
            >
              Browse as guest <ArrowRight size={14} />
            </button>
          </div>

          <div className="relative mx-2 mb-8 h-[220px] overflow-hidden rounded-[28px] sm:mx-8 sm:h-[280px] lg:m-0 lg:h-auto lg:min-h-full lg:rounded-none">
            <div className="absolute -left-16 top-12 hidden h-[520px] w-[520px] rounded-full bg-[#EDF5FF] lg:block" />
            <img
              src="https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=88"
              alt="University campus"
              className="absolute inset-0 h-full w-full object-cover lg:[clip-path:ellipse(78%_76%_at_72%_46%)]"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-white via-white/10 to-transparent lg:block" />
            <div className="absolute right-7 top-[36%] hidden max-w-[150px] rotate-[-5deg] text-center font-serif text-[21px] italic leading-tight text-[#1565F9] xl:block">
              A stronger campus, together.
            </div>
          </div>
        </section>

        <section className="relative z-20 grid gap-3 md:grid-cols-3 lg:-mt-10 lg:px-4">
          {[
            {
              icon: GraduationCap,
              title: 'Students',
              text: 'Buy, sell, meet and stay in the loop.',
              iconClass: 'bg-[#EFF6FF] text-[#1565F9]',
              action: () => navigate('/student?mode=register'),
            },
            {
              icon: Store,
              title: 'Businesses',
              text: 'Reach students and grow on campus.',
              iconClass: 'bg-[#ECFDF5] text-[#059669]',
              action: () => navigate('/retailer'),
            },
            {
              icon: Building2,
              title: 'Accommodation',
              text: 'Find student-friendly places to live.',
              iconClass: 'bg-[#FFF7ED] text-[#C25B08]',
              action: () => navigate('/accommodations'),
            },
          ].map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="group flex min-h-[112px] items-center gap-5 rounded-[18px] border border-[#E5ECF6] bg-white px-6 py-5 text-left shadow-[0_10px_32px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#C9D8EE]"
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}>
                <item.icon size={27} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-bold text-[#0F172A]">{item.title}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">{item.text}</p>
              </div>
              <ArrowRight size={19} className="shrink-0 text-[#1565F9] transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </section>
        <div className="mt-4 flex justify-center lg:mt-5">
          <button
            onClick={() => navigate('/accommodation/post')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1565F9] hover:underline"
          >
            Accommodation provider? List your accommodation <ArrowRight size={14} />
          </button>
        </div>
        <section className="py-10 lg:px-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-serif text-[31px] font-bold tracking-[-0.03em] text-[#07152F]">Why AtriumX?</h2>
            <p className="hidden text-[12px] font-medium text-[#3B82F6] sm:block">A stronger campus, together.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: ShoppingCart, title: 'Marketplace', text: 'Buy and sell with students safely.' },
              { icon: CalendarDays, title: 'Campus Events', text: "Discover what's happening on campus." },
              { icon: ShieldCheck, title: 'Verified Community', text: 'Real students, real businesses.' },
              { icon: Users, title: 'Student Accommodation', text: 'Find trusted, student-friendly places to live.' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 rounded-2xl bg-transparent px-2 py-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF3FF] text-[#1565F9]">
                  <feature.icon size={23} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#0F172A]">{feature.title}</h3>
                  <p className="mt-1 max-w-[190px] text-[12.5px] leading-relaxed text-[#64748B]">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-7 lg:px-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-serif text-[31px] font-bold tracking-[-0.03em] text-[#07152F]">Explore what&apos;s on AtriumX</h2>
            <button onClick={() => navigate('/feed')} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1565F9] hover:underline">
              View all <ArrowRight size={15} />
            </button>
          </div>

          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {exploreCards.map((card) => (
              <article key={card.title} className="w-[82vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-[#E3EAF4] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)] md:w-auto md:max-w-none">
                <div className="relative h-[190px] overflow-hidden">
                  <img src={card.image} alt={card.title} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.025]" />
                  <button aria-label={`Save ${card.title}`} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#334155] shadow-sm">
                    <Heart size={18} />
                  </button>
                </div>
                <div className="p-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${card.tagClass}`}>{card.kind}</span>
                  <h3 className="mt-2 text-[16px] font-bold text-[#0F172A]">{card.title}</h3>
                  <p className="mt-1 text-[14px] font-semibold text-[#1E293B]">{card.detail}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#64748B]">
                    <MapPin size={13} className="text-[#64748B]" /> {card.meta}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-8 mt-2 overflow-hidden rounded-[20px] border border-[#D8E8FF] bg-gradient-to-r from-[#EDF5FF] to-[#F8FBFF] px-6 py-6 lg:mx-4 lg:flex lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1565F9] shadow-sm">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">Join thousands of students already on AtriumX</h2>
              <p className="mt-1 text-[12.5px] text-[#64748B]">A safer, easier and more connected campus experience.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/student?mode=register')}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1565F9] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(21,101,249,0.18)] hover:opacity-90 lg:mt-0"
          >
            Create account <ArrowRight size={16} />
          </button>
        </section>

        <footer className="flex flex-col gap-4 border-t border-[#E5ECF5] px-1 py-7 text-[11px] text-[#64748B] sm:flex-row sm:items-center sm:justify-between lg:mx-4">
          <p>© AtriumX | Built for campus communities</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/How-it-works.html" className="hover:text-[#1565F9]">How It Works</a>
            <a href="/Faq.html" className="hover:text-[#1565F9]">FAQ</a>
            <a href="/safety.html" className="hover:text-[#1565F9]">Safety Tips</a>
            <a href="/Terms.html" className="hover:text-[#1565F9]">Terms of Service</a>
            <a href="/Privacy.html" className="hover:text-[#1565F9]">Privacy Policy</a>
          </div>
        </footer>
      </main>
    </div>
  )
}
