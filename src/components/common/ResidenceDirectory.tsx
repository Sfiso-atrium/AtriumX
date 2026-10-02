import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Search } from 'lucide-react'
import { getResidences, Residence } from '../../services/residenceReviews'

export default function ResidenceDirectory({ university = '', marketplaceLayout = false }: { university?: string; marketplaceLayout?: boolean }) {
  const [items, setItems] = useState<Residence[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError('')
    getResidences().then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = useMemo(
    () => items.filter(residence => (
      (!university || residence.university === university || residence.listing?.universities.includes(university))
      && residence.name.toLowerCase().includes(search.trim().toLowerCase())
    )),
    [items, university, search],
  )

  if (!marketplaceLayout) {
    return <section className="mt-10 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 className="font-serif text-2xl text-cream">Student residence reviews</h2><p className="text-cream-muted text-sm mt-1">Read students' experiences, including residences that haven't listed with AtriumX.</p></div><Link to="/accommodations/review" className="bg-teal-primary text-white rounded-xl px-4 py-3 font-bold text-sm">Write a review</Link></div>
      <label className="block text-cream-muted text-sm">Find a residence<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accommodation names" className="block mt-2 w-full max-w-lg rounded-xl bg-slate-card border border-slate-border px-4 py-3 text-cream" /></label>
      {loading ? <p className="py-5 text-cream-muted">Loading residences...</p> : error ? <p role="alert" className="py-5 text-red-400">{error} <button onClick={load} className="underline">Retry</button></p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{filtered.map(residence => { const reviews = residence.reviews ?? []; const average = reviews.length ? reviews.reduce((n, value) => n + value.stars, 0) / reviews.length : 0; return <Link key={residence.id} to={`/accommodations/residence/${residence.id}`} className="block border border-slate-border bg-slate-card rounded-2xl p-5 hover:border-teal-light"><h3 className="font-bold text-cream">{residence.name}</h3><p className="text-cream-muted text-xs mt-2">Near {residence.university}</p><p className="text-teal-light text-sm mt-3">{reviews.length ? `${average.toFixed(1)} / 5 · ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}` : 'Be the first to review'}</p></Link> })}</div>}
      {!loading && !error && !filtered.length && <p className="text-cream-muted text-sm py-5">No matching residences yet. Write a review to add yours.</p>}
    </section>
  }

  return (
    <section className="mt-7 pb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
      <div className="rounded-3xl border border-slate-border bg-slate-card p-5 sm:p-6">
        <h2 className="font-serif text-2xl sm:text-3xl text-cream">Student residence reviews</h2>
        <p className="text-cream-muted text-sm mt-1">Read students' experiences, including residences that haven't listed with AtriumX.</p>

        <label className="block text-cream-muted text-sm mt-5 max-w-2xl">
          Find a residence
          <span className="relative block mt-2">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-muted" aria-hidden="true" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accommodation names"
              className="block w-full rounded-xl bg-slate-deep border border-slate-border pl-11 pr-4 py-3 text-cream outline-none focus:border-teal-light focus:ring-2 focus:ring-teal-faint"
            />
          </span>
        </label>

        {loading ? (
          <p className="py-5 text-cream-muted text-sm">Loading residences near {university}...</p>
        ) : error ? (
          <p role="alert" className="py-5 text-red-500 text-sm">{error} <button onClick={load} className="underline">Retry</button></p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            {filtered.map(residence => {
              const reviews = residence.reviews ?? []
              const average = reviews.length ? reviews.reduce((n, value) => n + value.stars, 0) / reviews.length : 0
              return (
                <Link key={residence.id} to={`/accommodations/residence/${residence.id}`} className="block border border-slate-border bg-slate-deep rounded-2xl p-5 hover:border-teal-light transition-colors">
                  <h3 className="font-bold text-cream">{residence.name}</h3>
                  <p className="text-cream-muted text-xs mt-2">Near {residence.university}</p>
                  <p className="text-teal-primary text-sm mt-3">{reviews.length ? `${average.toFixed(1)} / 5 · ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}` : 'Be the first to review'}</p>
                </Link>
              )
            })}
          </div>
        )}

        {!loading && !error && !filtered.length && <p className="text-cream-muted text-sm pt-5">No matching residences yet. Write a review to add yours.</p>}
      </div>

      <aside className="rounded-3xl border border-slate-border bg-slate-card p-5 sm:p-6 flex gap-4 lg:flex-col lg:justify-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-faint text-teal-primary">
          <MessageSquare size={22} />
        </div>
        <div>
          <p className="text-cream font-bold">Have a residence to review?</p>
          <p className="text-cream-muted text-sm mt-1 leading-relaxed">Share your experience so other students can compare residences with more context.</p>
          <Link to="/accommodations/review" className="inline-flex mt-4 text-teal-primary font-bold text-sm hover:underline">Share your experience →</Link>
        </div>
      </aside>
    </section>
  )
}
