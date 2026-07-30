import { CircleCheck as CheckCircle } from 'lucide-react'

interface Package {
  name: string
  price: string
  period: string
  features: string[]
  highlighted?: boolean
  packageId: string
}

const PACKAGES: Package[] = [
  {
    name: 'Noticeboard',
    price: 'Free',
    period: '/ 7 days',
    packageId: 'noticeboard',
    features: [
      'Text listing in the student feed',
      'Listed in your category',
      '7-day active window',
      'Basic view count',
    ],
  },
  {
    name: 'Featured',
    price: 'R350',
    period: '/ week',
    packageId: 'featured',
    highlighted: true,
    features: [
      'Pinned to top of your category',
      'Gold Sponsored badge',
      '14-day active window',
      'Full analytics dashboard',
      'Priority support',
    ],
  },
  {
    name: 'Campus Partner',
    price: 'R800',
    period: '/ month',
    packageId: 'campus_partner',
    features: [
      'Permanent listing in Business section',
      'Category sponsorship naming rights',
      'Monthly analytics report',
      'Logo on welcome screen',
      'Featured in weekly digest',
    ],
  },
]

interface Props {
  onSelect: (packageId: string) => void
}

export default function PricingTable({ onSelect }: Props) {
  return (
    <section id="pricing" className="px-6 py-16 bg-teal-primary">
      <h2 className="text-cream font-bold text-2xl text-center mb-2">Simple, Transparent Pricing</h2>
      <p className="text-cream-muted text-sm text-center mb-10">No contracts. No surprises. Cancel anytime.</p>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {PACKAGES.map(pkg => (
          <div
            key={pkg.packageId}
            className={`rounded-2xl p-6 flex flex-col gap-4 ${
              pkg.highlighted
                ? 'bg-slate-card border-2 border-gold'
                : 'bg-slate-card border border-slate-border'
            }`}
          >
            {pkg.highlighted && (
              <span className="text-xs font-bold text-slate-deep bg-gold px-3 py-1 rounded-full w-fit">
                MOST POPULAR
              </span>
            )}
            <div>
              <h3 className="text-cream font-bold text-xl">{pkg.name}</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-gold font-bold text-3xl">{pkg.price}</span>
                <span className="text-cream-muted text-sm">{pkg.period}</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {pkg.features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-teal-light mt-0.5 flex-shrink-0" />
                  <span className="text-cream text-sm">{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelect(pkg.packageId)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors mt-auto ${
                pkg.highlighted
                  ? 'bg-ember hover:bg-ember-dark text-white'
                  : 'bg-teal-primary hover:bg-teal-light text-cream'
              }`}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
