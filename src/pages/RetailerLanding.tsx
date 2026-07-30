// src/pages/RetailerLanding.tsx
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Users, MapPin, TrendingUp } from 'lucide-react'
import Navbar from '../components/common/Navbar'

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-gold font-bold text-4xl">{value}</p>
      <p className="text-cream-muted text-sm mt-1">{label}</p>
    </div>
  )
}

function StepCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="bg-slate-card border border-slate-border rounded-2xl p-5 flex-1">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-cream font-bold text-base">{title}</h3>
        <span className="text-gold/30 font-bold text-3xl leading-none">{number}</span>
      </div>
      <p className="text-cream-muted text-sm leading-relaxed">{body}</p>
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
    <div className={`rounded-2xl p-6 flex flex-col gap-4 ${
      highlighted
        ? 'bg-slate-card border-2 border-gold'
        : 'bg-slate-card border border-slate-border'
    }`}>
      {highlighted && (
        <span className="text-xs font-bold text-slate-deep bg-gold px-3 py-1 rounded-full w-fit">
          MOST POPULAR
        </span>
      )}
      <div>
        <h3 className="text-cream font-bold text-xl">{name}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-gold font-bold text-3xl">{price}</span>
          <span className="text-cream-muted text-sm">{period}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle size={14} className="text-teal-light mt-0.5 flex-shrink-0" />
            <span className="text-cream text-sm">{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(packageId)}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors mt-auto ${
          highlighted
            ? 'bg-ember hover:bg-ember-dark text-white'
            : 'bg-teal-primary hover:bg-teal-light text-cream'
        }`}
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
    <div className="min-h-screen bg-slate-deep">
      <Navbar />

      {/* HERO */}
      <section className="px-6 py-20 text-center max-w-2xl mx-auto">
        <p className="text-teal-light text-xs font-bold tracking-widest uppercase mb-4">
          Campus Advertising · Johannesburg
        </p>
        <h1 className="font-serif text-4xl text-cream leading-tight mb-4">
          Reach students where they live.
        </h1>
        <p className="text-cream-muted text-base mb-8">
          Atrium puts your business in front of hundreds of students inside their residences — right when they need what you offer.
        </p>
        <button
          onClick={() => handlePackageSelect('featured')}
          className="bg-ember hover:bg-ember-dark text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Apply for a Slot
        </button>
      </section>

      {/* STATS */}
      <section className="bg-teal-primary py-12 px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-around gap-8">
          <StatCard value="500+" label="Active Students" />
          <StatCard value="4" label="Residences Covered" />
          <StatCard value="Daily" label="New Listings Posted" />
        </div>
        <p className="text-cream-muted text-xs text-center mt-6">
          Figures are estimates for the current campus cluster. Updated as platform grows.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-cream font-bold text-2xl text-center mb-10">How It Works</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <StepCard number="01" title="Apply" body="Fill in your business details and choose an advertising package that fits your budget." />
          <StepCard number="02" title="We Review" body="Our team reviews your application within 48 hours to ensure it fits the student community." />
          <StepCard number="03" title="Go Live" body="Your listing goes live inside the Atrium feed and reaches students immediately in their residences." />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 py-16 bg-teal-primary">
        <h2 className="text-cream font-bold text-2xl text-center mb-2">Simple, Transparent Pricing</h2>
        <p className="text-cream-muted text-sm text-center mb-10">No contracts. No surprises. Cancel anytime.</p>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <PricingCard
            name="Noticeboard"
            price="Free"
            period="/ 7 days"
            packageId="noticeboard"
            onSelect={handlePackageSelect}
            features={[
              'Text listing in the student feed',
              'Listed in your category',
              '7-day active window',
              'Basic view count',
            ]}
          />
          <PricingCard
            name="Featured"
            price="R350"
            period="/ week"
            packageId="featured"
            highlighted
            onSelect={handlePackageSelect}
            features={[
              'Pinned to top of your category',
              'Gold Sponsored badge',
              '14-day active window',
              'Full analytics dashboard',
              'Priority support',
            ]}
          />
          <PricingCard
            name="Campus Partner"
            price="R800"
            period="/ month"
            packageId="campus_partner"
            onSelect={handlePackageSelect}
            features={[
              'Permanent listing in Business section',
              'Category sponsorship naming rights',
              'Monthly analytics report',
              'Logo on welcome screen',
              'Featured in weekly digest',
            ]}
          />
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-cream font-bold text-xl mb-3">Ready to reach students?</h2>
        <p className="text-cream-muted text-sm mb-6">
          Questions first? Email us at{' '}
          <span className="text-gold font-bold">hello@atrium.co.za</span>
        </p>
        <button
          onClick={() => handlePackageSelect('featured')}
          className="bg-ember hover:bg-ember-dark text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Apply Now
        </button>
      </section>
    </div>
  )
}
