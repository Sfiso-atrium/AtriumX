import { ArrowRight, Building2, CheckCircle2, GraduationCap, Home, ImagePlus, MapPin, MessageCircle, ShieldCheck, Store, Users } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function StepCard({ number, title, body, icon: Icon }: { number: string; title: string; body: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-[#E3EAF4] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
          <Icon size={21} strokeWidth={1.8} />
        </div>
        <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">{number}</span>
      </div>
      <h3 className="text-[16px] font-bold text-[#0F172A]">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[#64748B]">{body}</p>
    </div>
  )
}

function InfoCard({ title, body, icon: Icon }: { title: string; body: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-[#E8EEF7] bg-[#F8FBFF] p-5">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2563EB] shadow-sm">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <h3 className="text-[16px] font-bold text-[#0F172A]">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[#64748B]">{body}</p>
    </div>
  )
}

function PricingCard({ name, price, period, features, highlighted, onSelect }: { name: string; price: string; period: string; features: string[]; highlighted?: boolean; onSelect: () => void }) {
  return (
    <div className={`rounded-2xl border bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${highlighted ? 'border-[#2563EB] ring-2 ring-[#DBEAFE]' : 'border-[#E3EAF4]'}`}>
      {highlighted && <span className="mb-4 inline-flex rounded-full bg-[#2563EB] px-3 py-1 text-[10px] font-bold text-white">POPULAR</span>}
      <h3 className="text-[18px] font-bold text-[#0F172A]">{name}</h3>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[31px] font-bold leading-none text-[#2563EB]">{price}</span>
        <span className="text-[13px] font-medium text-[#64748B]">{period}</span>
      </div>
      <ul className="mt-5 space-y-2.5">
        {features.map(feature => (
          <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[#475569]">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#2563EB]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Get started <ArrowRight size={15} />
      </button>
    </div>
  )
}

export default function RetailerLanding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAccommodation = searchParams.get('accommodation') === '1'

  const hero = isAccommodation
    ? {
        eyebrow: 'STUDENT ACCOMMODATION • JOHANNESBURG',
        title: 'Show your student accommodation to the right students.',
        body: 'AtriumX helps accommodation providers present rooms, pricing and location clearly to students who are already looking for a place near campus.',
        cta: 'List your accommodation',
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1400&q=85',
        imageAlt: 'Student accommodation room',
        bubble: 'A better fit for\nstudent housing',
      }
    : {
        eyebrow: 'CAMPUS ADVERTISING • JOHANNESBURG',
        title: 'Put your business in front of students on campus.',
        body: 'AtriumX helps local businesses reach students where they already browse listings, discover services and stay connected to campus life.',
        cta: 'Create a business account',
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400&q=85',
        imageAlt: 'Students on campus',
        bubble: 'Be seen by students\nnear campus',
      }

  const infoCards = isAccommodation
    ? [
        { icon: Users, title: 'Reach students near campus', body: 'Connect with students who are actively looking for rooms, flats and residences close to where they study.' },
        { icon: ImagePlus, title: 'Show your property clearly', body: 'Present your rooms, amenities, rent and location in a clean format that is easy to compare.' },
        { icon: ShieldCheck, title: 'Build trust early', body: 'Clear details and a consistent listing format help students enquire with confidence.' },
      ]
    : [
        { icon: GraduationCap, title: 'Reach a focused audience', body: 'Put your business in front of students who live, study and spend time on or near campus.' },
        { icon: Store, title: 'Show what you offer', body: 'Promote products and services in the same app students already use to browse campus listings.' },
        { icon: MessageCircle, title: 'Turn views into enquiries', body: 'Make it easier for students to discover your business and get in touch when they are interested.' },
      ]

  const steps = isAccommodation
    ? [
        { number: '01', title: 'Create your account', body: 'Set up your accommodation account with your property details and your main university.', icon: Building2 },
        { number: '02', title: 'Add your listing', body: 'Upload photos, set your price and include the details students usually want to know.', icon: Home },
        { number: '03', title: 'Start receiving enquiries', body: 'Once your listing is live, students can view it and contact you through AtriumX.', icon: MessageCircle },
      ]
    : [
        { number: '01', title: 'Create your account', body: 'Register your business in a few minutes and choose the university you want to start with.', icon: Store },
        { number: '02', title: 'Choose a plan', body: 'Start free on Noticeboard or upgrade when you need more visibility and more active listings.', icon: CheckCircle2 },
        { number: '03', title: 'Post and get discovered', body: 'Publish your listing and let students find your products or services from the Businesses tab.', icon: Users },
      ]

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-[#E6EDF7] bg-white/95 backdrop-blur-xl">
        <div className="flex h-[70px] w-full items-center justify-between px-4 sm:px-6">
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

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(`/retailer/signup?mode=login${isAccommodation ? '&accommodation=1' : ''}`)}
              className="rounded-full border border-[#1565F9] bg-white px-4 py-2 text-[13px] font-semibold text-[#1565F9] hover:bg-[#EFF6FF]"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate(isAccommodation ? '/accommodation/post' : '/retailer/signup')}
              className="hidden rounded-full bg-[#1565F9] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(21,101,249,0.20)] hover:opacity-90 sm:inline-flex"
            >
              Create account
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1260px] px-5 pb-12 pt-7 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-[28px] border border-[#E4ECF7] bg-white px-6 py-8 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10 lg:px-10 lg:py-12">
          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">{hero.eyebrow}</p>
            <h1 className="max-w-[560px] font-serif text-[38px] font-bold leading-[0.97] tracking-[-0.04em] text-[#07152F] sm:text-[50px] lg:text-[58px]">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-[#52637B] sm:text-[16px]">
              {hero.body}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate(isAccommodation ? '/accommodation/post' : '/retailer/signup')}
                className="inline-flex min-w-[210px] items-center justify-center gap-2 rounded-full bg-[#1565F9] px-7 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(21,101,249,0.20)] hover:opacity-90"
              >
                {hero.cta} <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 text-[13px] text-[#52637B] sm:flex-row sm:flex-wrap sm:gap-x-5">
              {(isAccommodation
                ? ['Free to get started', 'Show rooms clearly', 'Reach students near campus']
                : ['Free to get started', 'Reach real students', 'List products or services']
              ).map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#1565F9]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-8 lg:mt-0">
            <div className="absolute inset-x-0 bottom-4 top-6 rounded-[32px] bg-[#EDF5FF]" />
            <div className="relative overflow-hidden rounded-[30px] border border-[#E4ECF7] bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <img src={hero.image} alt={hero.imageAlt} className="h-[260px] w-full rounded-[24px] object-cover sm:h-[340px]" />
              <div className="absolute right-5 top-5 max-w-[180px] rounded-[18px] bg-white/96 px-4 py-3 text-[13px] font-semibold leading-snug text-[#0F172A] shadow-[0_12px_24px_rgba(15,23,42,0.10)]">
                {hero.bubble.split('\n').map((line, idx) => <div key={idx}>{line}</div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="grid gap-4 md:grid-cols-3">
            {infoCards.map(card => <InfoCard key={card.title} {...card} />)}
          </div>
        </section>

        {!isAccommodation && (
          <section className="rounded-[28px] bg-[#1565F9] px-6 py-10 text-white sm:px-8 lg:px-10">
            <div className="mb-8 text-center">
              <h2 className="text-[30px] font-bold tracking-[-0.03em]">Business plans</h2>
              <p className="mt-2 text-[14px] text-white/80">Start free or choose more reach and visibility when you need it.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <PricingCard
                name="Noticeboard"
                price="Free"
                period="/ 7 days"
                onSelect={() => navigate('/retailer/signup')}
                features={['1 university reach', 'Text-only listing', '1 active listing', '7-day visibility']}
              />
              <PricingCard
                name="Featured"
                price="R199"
                period="/ 30 days"
                highlighted
                onSelect={() => navigate('/retailer/signup?package=featured')}
                features={['Reach up to 2 universities', '1 photo per listing', 'Up to 2 active listings', 'Reply to student messages', 'Sponsored badge']}
              />
              <PricingCard
                name="Campus Partner"
                price="R349"
                period="/ 30 days"
                onSelect={() => navigate('/retailer/signup?package=campus_partner')}
                features={['Reach up to 3 universities', 'Up to 3 photos per listing', 'Up to 3 active listings', 'Reply to reviews', 'Campus Partner badge']}
              />
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="mb-6 text-center">
            <h2 className="text-[31px] font-bold tracking-[-0.03em] text-[#07152F]">How it works</h2>
            <p className="mt-2 text-[14px] text-[#64748B]">
              {isAccommodation
                ? 'List your space in a few simple steps.'
                : 'Get your business in front of students in a few simple steps.'}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(step => <StepCard key={step.number} {...step} />)}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#DCE8F8] bg-gradient-to-r from-[#EDF5FF] to-[#F8FBFF] px-6 py-8 sm:px-8 lg:flex lg:items-center lg:justify-between lg:px-10">
          <div className="max-w-[560px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">{isAccommodation ? 'START LISTING' : 'START REACHING STUDENTS'}</p>
            <h2 className="mt-3 font-serif text-[34px] font-bold leading-[1.02] tracking-[-0.035em] text-[#07152F] sm:text-[42px]">
              {isAccommodation ? 'Make it easier for students to discover your rooms.' : 'Make it easier for students to discover your business.'}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-[#52637B]">
              {isAccommodation
                ? 'Give students the details they need, from price and location to photos and amenities, in one clear listing.'
                : 'Show students what you offer, where to find you and how to get in touch — all in one place.'}
            </p>
            <button
              onClick={() => navigate(isAccommodation ? '/accommodation/post' : '/retailer/signup')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1565F9] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(21,101,249,0.18)] hover:opacity-90"
            >
              {isAccommodation ? 'Create accommodation account' : 'Create business account'} <ArrowRight size={16} />
            </button>
          </div>

          <div className="mt-8 w-full max-w-[360px] rounded-[24px] border border-[#E3EAF4] bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] lg:mt-0">
            <div className="overflow-hidden rounded-[18px]">
              <img
                src={isAccommodation ? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=85' : 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&q=85'}
                alt={isAccommodation ? 'Accommodation preview' : 'Business preview'}
                className="h-[180px] w-full object-cover"
              />
            </div>
            <div className="mt-4">
              <span className="inline-flex rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-semibold text-[#2563EB]">
                {isAccommodation ? 'Featured accommodation' : 'Featured business'}
              </span>
              <h3 className="mt-3 text-[18px] font-bold text-[#0F172A]">
                {isAccommodation ? 'Campus View Residence' : 'Inkukhu Student Deals'}
              </h3>
              <div className="mt-2 space-y-2 text-[13px] text-[#64748B]">
                <p className="flex items-center gap-2"><MapPin size={14} /> {isAccommodation ? 'Auckland Park, Johannesburg' : 'Braamfontein, Johannesburg'}</p>
                <p>{isAccommodation ? 'From R4 800 / month • Wi-Fi • Laundry' : 'Electronics • Clothing • Student offers'}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
