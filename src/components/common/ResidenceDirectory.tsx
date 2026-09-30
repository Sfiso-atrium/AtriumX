import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getResidences, Residence } from '../../services/residenceReviews'

export default function ResidenceDirectory({ university = '' }: { university?: string }) {
  const [items,setItems]=useState<Residence[]>([])
  const [search,setSearch]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const load=()=>{setLoading(true);setError('');getResidences().then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false))}
  useEffect(load,[])
  const filtered=useMemo(()=>items.filter(r=>(!university||r.university===university||r.listing?.universities.includes(university))&&r.name.toLowerCase().includes(search.trim().toLowerCase())),[items,university,search])
  return <section className="mt-10 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 className="font-serif text-2xl text-cream">Student residence reviews</h2><p className="text-cream-muted text-sm mt-1">Read students' experiences, including residences that haven't listed with AtriumX.</p></div><Link to="/accommodations/review" className="bg-teal-primary text-white rounded-xl px-4 py-3 font-bold text-sm">Write a review</Link></div>
    <label className="block text-cream-muted text-sm">Find a residence<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search accommodation names" className="block mt-2 w-full max-w-lg rounded-xl bg-slate-card border border-slate-border px-4 py-3 text-cream"/></label>
    {loading?<p className="py-5 text-cream-muted">Loading residences...</p>:error?<p role="alert" className="py-5 text-red-400">{error} <button onClick={load} className="underline">Retry</button></p>:<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{filtered.map(r=>{const reviews=r.reviews??[];const average=reviews.length?reviews.reduce((n,v)=>n+v.stars,0)/reviews.length:0;return <Link key={r.id} to={`/accommodations/residence/${r.id}`} className="block border border-slate-border bg-slate-card rounded-2xl p-5 hover:border-teal-light"><h3 className="font-bold text-cream">{r.name}</h3><p className="text-cream-muted text-xs mt-2">Near {r.university}</p><p className="text-teal-light text-sm mt-3">{reviews.length?`${average.toFixed(1)} / 5 · ${reviews.length} ${reviews.length===1?'review':'reviews'}`:'Be the first to review'}</p></Link>})}</div>}
    {!loading&&!error&&!filtered.length&&<p className="text-cream-muted text-sm py-5">No matching residences yet. Write a review to add yours.</p>}
  </section>
}
