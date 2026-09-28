import { ArrowRight, Building2, MapPin, Clock, Heart, Store, Home, Users, BarChart3, Target, ShieldCheck, FileText, Image as ImageIcon, Rocket } from 'lucide-react'
import { Check } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function Header() {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 border-b border-[#E6EDF7] bg-white">
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <span className="text-[22px] font-bold tracking-tight text-[#1565F9]">AtriumX</span>
          <nav className="hidden items-center gap-6 text-[13px] font-medium text-[#64748B] lg:flex">
            <button onClick={()=>navigate('/retailer/landing')} className="hover:text-[#0F172A]">For Businesses</button>
            <button onClick={()=>navigate('/retailer/landing?accommodation=1')} className="hover:text-[#0F172A]">For Accommodation</button>
            <span className="hover:text-[#0F172A] cursor-pointer">About</span>
            <span className="hover:text-[#0F172A] cursor-pointer">Help</span>
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={()=>navigate('/login')} className="rounded-full border border-[#D6E2F5] bg-white px-4 py-2 text-[13px] font-semibold text-[#1565F9] hover:bg-[#F8FBFF]">Sign in</button>
          <button onClick={()=>navigate('/retailer/signup')} className="rounded-full bg-[#1565F9] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:opacity-90">Create account</button>
        </div>
      </div>
    </header>
  )
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-medium text-[#475569]">
      <div className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#DCEBFF] text-[#1565F9]">
        <Check size={10} strokeWidth={3} />
      </div>
      {text}
    </div>
  )
}

function InfoCard({ icon: Icon, title, body }: { icon: any, title: string, body: string }) {
  return (
    <div className="rounded-[16px] bg-[#F3F8FF] p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1565F9] shadow-sm">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <h3 className="mt-4 text-[14px] font-bold text-[#0F172A]">{title}</h3>
      <p className="mt-2 text-[12.5px] leading-[1.6] text-[#64748B]">{body}</p>
    </div>
  )
}

function StepCard({ number, title, body, icon: Icon }: { number: string, title: string, body: string, icon: any }) {
  return (
    <div className="rounded-[16px] border border-[#EAF0FA] bg-white p-6 text-center shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
      <div className="mx-auto flex items-center justify-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F6FF] text-[10px] font-bold text-[#5B8DEF]">{number}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F6FF] text-[#1565F9]">
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="mt-4 text-[13px] font-bold text-[#0F172A]">{title}</h3>
      <p className="mx-auto mt-2 max-w-[240px] text-[11.5px] leading-[1.6] text-[#64748B]">{body}</p>
    </div>
  )
}

export default function RetailerLanding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAccommodation = searchParams.get('accommodation') === '1'

  if (isAccommodation) {
    return (
      <div className="min-h-screen bg-white text-[#0F172A]">
        <Header />
        <main className="mx-auto max-w-[1200px] px-6 pb-16">
          <section className="grid gap-8 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4A7EF6]">STUDENT ACCOMMODATION • JOHANNESBURG</p>
              <h1 className="mt-3 font-serif text-[42px] font-[800] leading-[0.95] tracking-[-0.04em] text-[#0F172A] sm:text-[52px] lg:text-[56px]">Fill your student accommodation with the right tenants.</h1>
              <p className="mt-5 max-w-[460px] text-[14px] leading-[1.7] text-[#64748B]">AtriumX connects accommodation providers with students who are looking for trusted, quality housing near campus.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={()=>navigate('/retailer/signup?accommodation=1')} className="inline-flex items-center gap-2 rounded-full bg-[#1565F9] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(21,101,249,0.22)] hover:opacity-90">List Your Accommodation <ArrowRight size={14} /></button>
                <button className="rounded-full border border-[#D6E2F5] bg-white px-6 py-3 text-[13px] font-semibold text-[#0F172A] hover:bg-[#F8FBFF]">Learn More</button>
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <CheckItem text="Reach verified students" />
                <CheckItem text="Showcase your spaces" />
                <CheckItem text="Free to get started" />
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-6 -top-6 bottom-6 right-6 rounded-[32px] bg-[#EAF2FF] lg:right-0" />
              <div className="relative overflow-hidden rounded-[28px] border-[6px] border-white bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80" alt="Student bedroom" className="h-[360px] w-full object-cover sm:h-[440px]" />
                <div className="absolute right-4 top-4 flex max-w-[200px] items-center gap-2.5 rounded-[14px] bg-white px-4 py-3 text-[12px] font-semibold leading-snug shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF2FF] text-[#1565F9]"><Home size={14} /></div>
                  <span>Find your next home on campus</span>
                </div>
              </div>
            </div>
          </section>
          <section className="mt-14 grid gap-4 md:grid-cols-3">
            <InfoCard icon={Users} title="Reach serious tenants" body="Get in front of students actively looking for accommodation near campus." />
            <InfoCard icon={Home} title="Showcase your spaces" body="Highlight your rooms, amenities, pricing and location with beautiful listings." />
            <InfoCard icon={ShieldCheck} title="Build trust" body="A trusted platform for students and accommodation providers across Johannesburg." />
          </section>
          <section className="mt-14">
            <div className="text-center">
              <h2 className="text-[22px] font-bold tracking-tight">How It Works</h2>
              <p className="mt-1 text-[13px] text-[#64748B]">List your accommodation on AtriumX in three easy steps.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <StepCard number="01" title="Create a provider account" body="Sign up as an accommodation provider and tell us about your property." icon={FileText} />
              <StepCard number="02" title="Add your listing" body="Upload photos, set your pricing and share key details like location and amenities." icon={ImageIcon} />
              <StepCard number="03" title="Go live" body="Your listing appears in the AtriumX app for students to discover and enquire." icon={Rocket} />
            </div>
          </section>
          <section className="mt-14 grid gap-8 rounded-[24px] border border-[#EAF0FA] bg-[#F8FBFF] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4A7EF6]">FEATURED LISTING</p>
              <h2 className="mt-3 max-w-[360px] font-serif text-[32px] font-bold leading-[0.95] tracking-[-0.03em] sm:text-[38px]">Showcase your accommodation to hundreds of students.</h2>
              <p className="mt-4 max-w-[380px] text-[13px] leading-[1.7] text-[#64748B]">Beautiful, easy-to-browse listings help students find the right place to call home.</p>
              <button onClick={()=>navigate('/retailer/signup?accommodation=1')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1565F9] px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90">List Your Accommodation <ArrowRight size={14} /></button>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-[#E3EAF4] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80" alt="Campus View Residence" className="h-[260px] w-full object-cover" />
                <button className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#64748B] shadow"><Heart size={14} /></button>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[14px] font-bold leading-tight">The Campus View Residence</h3>
                  <span className="shrink-0 rounded-full bg-[#E8F0FF] px-2 py-0.5 text-[9px] font-bold text-[#1565F9]">Featured</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-y-2 text-[11px] text-[#64748B]">
                  <div className="flex items-center gap-1.5"><MapPin size={12} /> Auckland Park, Johannesburg</div>
                  <div className="flex items-center gap-1.5"><Building2 size={12} /> Private & shared rooms</div>
                  <div className="flex items-center gap-1.5"><span className="font-bold">R</span> From R4,800 / month</div>
                  <div className="flex items-center gap-1.5"><Clock size={12} /> 5 min walk to campus</div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 pb-16">
        <section className="grid gap-8 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4A7EF6]">CAMPUS ADVERTISING • JOHANNESBURG</p>
            <h1 className="mt-3 font-serif text-[42px] font-[800] leading-[0.95] tracking-[-0.04em] text-[#0F172A] sm:text-[52px] lg:text-[56px]">Get your business<br/>in front of students<br/>on campus.</h1>
            <p className="mt-5 max-w-[460px] text-[14px] leading-[1.7] text-[#64748B]">AtriumX helps local businesses reach hundreds of students across campus, in the same app they already use to buy, sell and discover.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={()=>navigate('/retailer/signup')} className="inline-flex items-center gap-2 rounded-full bg-[#1565F9] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(21,101,249,0.22)] hover:opacity-90">Create a Business Account <ArrowRight size={14} /></button>
              <button className="rounded-full border border-[#D6E2F5] bg-white px-6 py-3 text-[13px] font-semibold text-[#0F172A] hover:bg-[#F8FBFF]">Learn More</button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <CheckItem text="Free to get started" />
              <CheckItem text="Reach real students" />
              <CheckItem text="No credit card required" />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-6 -top-6 bottom-6 right-6 rounded-[32px] bg-[#EAF2FF] lg:right-0" />
            <div className="absolute right-0 top-2 z-10 hidden -translate-y-2 flex-col items-end lg:flex">
              <span className="font-serif text-[12px] italic text-[#475569]">Your business<br/>here</span>
              <svg width="36" height="28" viewBox="0 0 36 28" fill="none" className="text-[#5B8DEF]"><path d="M32 2 C 28 12, 18 20, 8 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/><path d="M6 18 L8 22 L13 19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
            <div className="relative overflow-hidden rounded-[28px] border-[6px] border-white bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80" alt="Students on campus" className="h-[360px] w-full object-cover sm:h-[440px]" />
              <div className="absolute right-4 top-10 flex max-w-[210px] items-center gap-2.5 rounded-[14px] bg-white px-4 py-3 text-[12px] font-semibold leading-snug shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF2FF] text-[#1565F9]"><Store size={14} /></div>
                <span>Discover local businesses on campus</span>
              </div>
            </div>
          </div>
        </section>
        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <InfoCard icon={Users} title="A focused student audience" body="Get in front of hundreds of students who live, study and spend on campus." />
          <InfoCard icon={BarChart3} title="Increase brand awareness" body="Showcase your products, promotions and events directly in the AtriumX app." />
          <InfoCard icon={Target} title="Drive real results" body="More visibility, more customers and a stronger presence on campus." />
        </section>
        <section className="mt-14">
          <div className="text-center">
            <h2 className="text-[22px] font-bold tracking-tight">How It Works</h2>
            <p className="mt-1 text-[13px] text-[#64748B]">Get your business live on AtriumX in just a few simple steps.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StepCard number="01" title="Create an account" body="Register your business for free. It only takes a few minutes to get started." icon={FileText} />
            <StepCard number="02" title="We review" body="Our team reviews your business account, usually within 48 hours, before you're able to post." icon={ShieldCheck} />
            <StepCard number="03" title="Go live" body="Post your listing, share your offers and start reaching students on campus." icon={Rocket} />
          </div>
        </section>
        <section className="mt-14 grid gap-8 rounded-[24px] border border-[#EAF0FA] bg-[#F8FBFF] p-6 sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4A7EF6]">BE SEEN ON CAMPUS</p>
            <h2 className="mt-3 max-w-[400px] font-serif text-[32px] font-bold leading-[0.95] tracking-[-0.03em] sm:text-[38px]">Your business, where students already are.</h2>
            <p className="mt-4 max-w-[400px] text-[13px] leading-[1.7] text-[#64748B]">Your listing appears in the AtriumX app, making it easy for students to discover your business, view your latest offers and get in touch.</p>
            <button onClick={()=>navigate('/retailer/signup')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1565F9] px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90">Create a Business Account <ArrowRight size={14} /></button>
          </div>
          <div className="relative">
            <div className="absolute -right-4 bottom-0 top-6 w-[85%] rounded-[32px] bg-[#EAF2FF]" />
            <div className="relative mx-auto w-[300px] overflow-hidden rounded-[36px] border-[7px] border-[#0F172A] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
              <div className="flex h-6 items-center justify-center bg-[#0F172A]"><div className="h-1 w-16 rounded-full bg-white/30"></div></div>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between"><span className="text-[16px] font-bold text-[#1565F9]">AtriumX</span><div className="h-5 w-5 rounded-full bg-[#F1F5F9]"></div></div>
                <div className="mb-4 flex items-center gap-2 rounded-full bg-[#F1F5F9] px-3 py-2 text-[11px] text-[#94A3B8]"><span>🔍</span> Search businesses, services...</div>
                <div className="mb-4 grid grid-cols-4 gap-2 text-center">
                  {[{l:'Food'},{l:'Retail'},{l:'Services'},{l:'Events'}].map(c=>(<div key={c.l} className="flex flex-col items-center gap-1"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F6FF] text-[14px]">•</div><span className="text-[9px] font-medium text-[#475569]">{c.l}</span></div>))}
                </div>
                <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-bold">Featured Businesses</span><span className="text-[10px] text-[#5B8DEF]">See all</span></div>
                <div className="flex items-center gap-3 rounded-[12px] border border-[#EAF0FA] p-2.5">
                  <div className="h-10 w-10 rounded-[8px] bg-[#E8E0D0] overflow-hidden"><img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80" alt="" className="h-full w-full object-cover" /></div>
                  <div className="flex-1"><div className="text-[11px] font-bold">Brew & Bean</div><div className="text-[9px] text-[#64748B]">Coffee • Good vibes • On campus</div><div className="mt-0.5 flex items-center gap-1 text-[8px] text-[#94A3B8]"><MapPin size={8} /> 0.4 km</div></div>
                  <span className="rounded-full bg-[#E0F2E9] px-2 py-0.5 text-[8px] font-bold text-[#15803D]">Open</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
