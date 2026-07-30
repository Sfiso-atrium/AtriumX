interface Step {
  number: string
  title: string
  body: string
}

const STEPS: Step[] = [
  { number: '01', title: 'Apply', body: 'Fill in your business details and choose an advertising package that fits your budget.' },
  { number: '02', title: 'We Review', body: 'Our team reviews your application within 48 hours to ensure it fits the student community.' },
  { number: '03', title: 'Go Live', body: 'Your listing goes live inside the Atrium feed and reaches students immediately in their residences.' },
]

export default function HowItWorks() {
  return (
    <section className="px-6 py-16 max-w-4xl mx-auto">
      <h2 className="text-cream font-bold text-2xl text-center mb-10">How It Works</h2>
      <div className="flex flex-col md:flex-row gap-4">
        {STEPS.map(step => (
          <div key={step.number} className="bg-slate-card border border-slate-border rounded-2xl p-5 flex-1">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-cream font-bold text-base">{step.title}</h3>
              <span className="text-gold/30 font-bold text-3xl leading-none">{step.number}</span>
            </div>
            <p className="text-cream-muted text-sm leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
