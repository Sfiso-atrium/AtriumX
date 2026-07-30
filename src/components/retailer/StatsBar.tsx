interface StatItem {
  value: string
  label: string
}

const STATS: StatItem[] = [
  { value: '500+', label: 'Active Students' },
  { value: '4',    label: 'Residences Covered' },
  { value: 'Daily', label: 'New Listings Posted' },
]

export default function StatsBar() {
  return (
    <section className="bg-teal-primary py-12 px-6">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-around gap-8">
        {STATS.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-gold font-bold text-4xl">{s.value}</p>
            <p className="text-cream-muted text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-cream-muted text-xs text-center mt-6">
        Figures are estimates for the current campus cluster. Updated as platform grows.
      </p>
    </section>
  )
}
