// src/pages/RetailerLanding.tsx - visually improved to match reference, logic unchanged
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, ShieldCheck, Rocket } from 'lucide-react'
import Navbar from '../components/common/Navbar'

// Campus illustration - the SVG we generated with university building on left
function CampusIllustration() {
  return (
    <div className="w-full max-w-[720px] mx-auto mt-8 px-4">
      <svg viewBox="0 0 900 260" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        {/* light blue blobs */}
        <path d="M20 60 Q 80 10, 180 40 T 320 80 T 380 140 T 200 210 Q 80 200, 30 150 Z" fill="#DBEAFE" opacity="0.6"/>
        <path d="M380 70 Q 480 30, 580 70 T 680 160 T 550 230 Q 460 210, 380 160 Z" fill="#DBEAFE" opacity="0.5"/>
        <path d="M700 50 Q 820 20, 880 90 T 860 210 Q 760 230, 700 180 Z" fill="#DBEAFE" opacity="0.5"/>
        
        {/* Left: University Building with dome */}
        <g transform="translate(30,20)">
          <rect x="0" y="110" width="280" height="110" fill="none" stroke="#1e3a8a" strokeWidth="2.2" rx="2"/>
          <rect x="10" y="120" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <line x1="17" y1="120" x2="17" y2="158" stroke="#1e3a8a" strokeWidth="1.5"/><line x1="33" y1="120" x2="33" y2="158" stroke="#1e3a8a" strokeWidth="1.5"/><line x1="10" y1="139" x2="40" y2="139" stroke="#1e3a8a" strokeWidth="1.5"/>
          <rect x="50" y="120" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <line x1="57" y1="120" x2="57" y2="158" stroke="#1e3a8a" strokeWidth="1.5"/><line x1="73" y1="120" x2="73" y2="158" stroke="#1e3a8a" strokeWidth="1.5"/><line x1="50" y1="139" x2="80" y2="139" stroke="#1e3a8a" strokeWidth="1.5"/>
          <rect x="200" y="120" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <rect x="240" y="120" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <rect x="10" y="172" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <rect x="50" y="172" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <rect x="200" y="172" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <rect x="240" y="172" width="30" height="38" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          {/* center portico */}
          <rect x="95" y="90" width="90" height="100" fill="none" stroke="#1e3a8a" strokeWidth="2.2"/>
          <rect x="105" y="102" width="18" height="28" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>
          <rect x="157" y="102" width="18" height="28" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>
          <rect x="105" y="152" width="18" height="28" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>
          <rect x="157" y="152" width="18" height="28" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>
          <rect x="125" y="152" width="30" height="30" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          {/* columns */}
          <rect x="98" y="90" width="8" height="90" fill="white" stroke="#1e3a8a" strokeWidth="1.8"/>
          <rect x="132" y="90" width="8" height="90" fill="white" stroke="#1e3a8a" strokeWidth="1.8"/>
          <rect x="170" y="90" width="8" height="90" fill="white" stroke="#1e3a8a" strokeWidth="1.8"/>
          {/* pediment */}
          <path d="M85 90 L140 60 L195 90 Z" fill="none" stroke="#1e3a8a" strokeWidth="2.2"/>
          {/* dome */}
          <path d="M110 60 Q140 10, 170 60" fill="none" stroke="#1e3a8a" strokeWidth="2"/>
          <path d="M115 60 L115 40 Q140 20, 165 40 L165 60" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>
          <circle cx="140" cy="15" r="3" fill="#1e3a8a"/>
          {/* steps */}
          <rect x="105" y="185" width="70" height="6" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>
          <rect x="100" y="191" width="80" height="6" fill="none" stroke="#1e3a8a" strokeWidth="1.6"/>
        </g>
        
        {/* Middle trees */}
        <g transform="translate(400,110)">
          <path d="M0 0 Q10 -20, 0 -40 Q-10 -20, 0 0" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <path d="M30 -10 Q45 -35, 30 -60 Q15 -35, 30 -10" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
        </g>
        
        {/* Graduation cap */}
        <g transform="translate(490,20)">
          <path d="M0 20 L50 0 L100 20 L50 40 Z" fill="none" stroke="#1e3a8a" strokeWidth="2.2"/>
          <path d="M50 40 L50 55 Q50 65, 60 65" fill="none" stroke="#1e3a8a" strokeWidth="1.8"/>
          <line x1="100" y1="20" x2="100" y2="45" stroke="#1e3a8a" strokeWidth="1.8" strokeDasharray="3 3"/>
        </g>
        
        {/* dotted path */}
        <path d="M180 200 C 260 210, 320 180, 400 130 S 540 60, 620 110 S 750 150, 820 140" fill="none" stroke="#1e3a8a" strokeWidth="1.6" strokeDasharray="6 6"/>
        
        {/* dots decoration */}
        <circle cx="320" cy="40" r="4" fill="#2563EB" opacity="0.6"/>
        <circle cx="460" cy="50" r="3" fill="#2563EB" opacity="0.4"/>
        <circle cx="580" cy="90" r="2.5" fill="#1e3a8a"/>
      </svg>
    </div>
  )
}

function StepCard({ number, title, body, icon: Icon }: { number: string; title: string; body: string; icon: any }) {
  return (
    <div className="bg-[#F0F7FF] border border-[#DBEAFE] rounded-2xl p-6 flex-1 text-center relative">
      <span className="absolute top-4 right-4 bg-[#DBEAFE] text-[#1e40af] text-[11px] font-bold px-2.5 py-1 rounded-full">
        {number}
      </span>
      <div className="w-14 h-14 rounded-full bg-[#DBEAFE] flex items-center justify-center mx-auto mb-4">
        <Icon size={26} className="text-[#1e40af]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[#0F172A] font-bold text-[15px] mb-2">{title}</h3>
      <p className="text-[#475569] text-[12px] leading-[1.5]">{body}</p>
    </div>
  )
}

function PricingCard({
  name, price, period, features, highlighted, packageId, onSelect,
}: {
  name: string; price: string; period: string; features: string[]
  highlighted?: boolean; packageId: string; onSelect: (id: string) => void
}) {
  return (
    <div className={`rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] border ${highlighted ? 'border-[#2563EB] ring-2 ring-[#BFDBFE]' : 'border-slate-200'}`}>
      {highlighted && (
        <span className="text-[10px] font-bold text-white bg-[#2563EB] px-3 py-1 rounded-full w-fit mx-auto -mt-2">
          MOST POPULAR
        </span>
      )}
      <div>
        <h3 className="text-[#0F172A] font-bold text-[16px]">{name}</h3>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-[#2563EB] font-bold text-[28px] leading-none">{price}</span>
          <span className="text-[#64748B] text-[13px] font-medium">{period}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className="text-[#334155] text-[12px] leading-snug">{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(packageId)}
        className="w-full py-3 rounded-xl font-bold text-[13px] transition-colors mt-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
      >
        Get Started
      </button>
    </div>
  )
}

export default function RetailerLanding() {
  const navigate = useNavigate()

  const handlePackageSelect = (pkg: string) => {
    navigate(`/retailer/signup?package=${pkg}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO - matches reference */}
      <section className="px-6 pt-10 pb-6 text-center max-w-3xl mx-auto bg-white">
        <p className="text-[#2563EB] text-[11px] font-bold tracking-[0.14em] uppercase mb-4">
          CAMPUS ADVERTISING • JOHANNESBURG
        </p>
        <h1 className="font-serif text-[32px] sm:text-[38px] text-[#0F172A] leading-[1.1] font-bold mb-3 tracking-tight">
          Reach students where they live.
        </h1>
        <p className="text-[#475569] text-[13px] sm:text-[14px] leading-relaxed max-w-[560px] mx-auto mb-7">
          Atrium puts your business in front of hundreds of students across campus, in the same app they already use to buy and sell with each other.
        </p>
        <button
          onClick={() => handlePackageSelect('featured')}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-6 py-3 rounded-xl transition-colors text-[14px] inline-flex items-center gap-2 shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
        >
          Apply for a Slot <span>→</span>
        </button>

        <CampusIllustration />
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-10 max-w-5xl mx-auto bg-white">
        <h2 className="text-[#0F172A] font-bold text-[22px] text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StepCard icon={ClipboardCheck} number="01" title="Apply" body="Register your business for free — every account starts on the Noticeboard plan, so there's no cost or card needed to get listed." />
          <StepCard icon={ShieldCheck} number="02" title="We Review" body="Our team reviews your business account, usually within 48 hours, before you're able to post." />
          <StepCard icon={Rocket} number="03" title="Go Live" body="Post your first listing and, once it's approved, it appears in the Business tab of the Atrium feed for every student to see." />
        </div>
      </section>

      {/* PRICING - blue background like reference */}
      <section id="pricing" className="px-6 py-14 bg-[#2563EB]">
        <h2 className="text-white font-bold text-[22px] text-center mb-2">Simple, Transparent Pricing</h2>
        <p className="text-[#DBEAFE] text-[13px] text-center mb-10">No contracts. No surprises. Cancel anytime.</p>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <PricingCard
            name="Noticeboard" price="Free" period="/ 7 days" packageId="noticeboard"
            onSelect={handlePackageSelect}
            features={[
              'Text-only listing (no photos)',
              '1 active listing at a time',
              "Can't message students directly",
              '7-day active window',
            ]}
          />
          <PricingCard
            name="Featured" price="R350" period="/ 14 days" packageId="featured" highlighted
            onSelect={handlePackageSelect}
            features={[
              '1 photo per listing',
              'Up to 2 active listings',
              'Unlimited messaging with students',
              '"Sponsored" badge on your listings',
              '14-day active window',
            ]}
          />
          <PricingCard
            name="Campus Partner" price="R800" period="/ 30 days" packageId="campus_partner"
            onSelect={handlePackageSelect}
            features={[
              'Up to 3 photos per listing',
              'Up to 3 active listings',
              'Unlimited messaging with students',
              'Reply to student reviews',
              '"Campus Partner" badge on your listings',
              '30-day active window',
            ]}
          />
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="px-6 py-12 text-center bg-[#F8FAFF] border-t border-[#EAF0F8]">
        <h2 className="text-[#0F172A] font-bold text-[18px] mb-2">Ready to reach students?</h2>
        <p className="text-[#64748B] text-[13px] mb-6">
          Questions first? Email us at{' '}
          <span className="text-[#2563EB] font-bold">students@atriumx.co.za</span>
        </p>
        <button
          onClick={() => handlePackageSelect('featured')}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-7 py-3 rounded-xl transition-colors text-[14px] inline-flex items-center gap-2"
        >
          Apply Now <span>→</span>
        </button>
        <p className="text-[#94A3B8] text-[11px] mt-10">
          © 2024 AtriumX • Johannesburg • Privacy Policy • Terms of Service
        </p>
      </section>
    </div>
  )
}
