import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import Navbar from '../components/common/Navbar'
import { getResidence, getResidenceReviews, Residence } from '../services/residenceReviews'
import type { AccommodationReview } from '../services/dataService'

export default function ResidenceDetail() {
  const {id}=useParams<{id:string}>()
  const [residence,setResidence]=useState<Residence|null>(null)
  const [reviews,setReviews]=useState<AccommodationReview[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const load=()=>{if(!id)return;setLoading(true);setError('');Promise.all([getResidence(id),getResidenceReviews(id)]).then(([r,rows])=>{setResidence(r);setReviews(rows)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))}
  useEffect(load,[id])
  return <div className="min-h-screen bg-slate-deep pb-20"><Navbar/><main className="max-w-3xl mx-auto px-4 py-8"><Link to="/accommodations" className="text-teal-light underline text-sm">Back to accommodation</Link>
    {loading?<p className="py-8 text-cream-muted">Loading residence reviews...</p>:error?<p role="alert" className="py-8 text-red-400">{error} <button onClick={load} className="underline">Retry</button></p>:!residence?<p className="py-8 text-cream-muted">Residence not found.</p>:<>
      <h1 className="font-serif text-3xl text-cream mt-6">{residence.name}</h1><p className="text-cream-muted mt-2">Near {residence.university}</p>
      <div className="flex flex-wrap gap-3 my-6"><Link to={`/accommodations/review?residence=${residence.id}`} className="bg-teal-primary text-white font-bold px-4 py-3 rounded-xl">Write a review</Link>{residence.public_listing_id&&<Link to={`/accommodation/${residence.public_listing_id}`} className="border border-slate-border text-teal-light px-4 py-3 rounded-xl">View property listing</Link>}</div>
      <p className="text-cream-muted text-sm mb-5">Student experiences remain available here, whether or not the provider has an active listing.</p>
      {reviews.length>0&&<p className="text-cream font-bold mb-5">{(reviews.reduce((n,r)=>n+r.stars,0)/reviews.length).toFixed(1)} / 5 · {reviews.length} {reviews.length===1?'review':'reviews'}</p>}
      <div className="space-y-4">{!reviews.length?<p className="text-cream-muted">No reviews yet. Be the first to share your experience.</p>:reviews.map(r=><article key={r.id} className="bg-slate-card border border-slate-border rounded-2xl p-5"><div className="flex justify-between gap-3"><h2 className="text-cream font-bold">{r.reviewer_name||r.student?.full_name||'Student'}</h2><span className="text-cream-muted text-xs">{new Date(r.created_at).toLocaleDateString('en-ZA')}</span></div><div className="flex gap-1 text-amber-500 mt-2" aria-label={`${r.stars} out of 5 stars`}>{[1,2,3,4,5].map(n=><Star size={16} key={n} className={n<=r.stars?'fill-current':''}/>)}</div><p className="text-cream-muted text-sm whitespace-pre-wrap mt-3">{r.comment}</p>{r.reply&&<div className="mt-4 border-l-2 border-teal-light pl-3"><p className="text-teal-light text-xs font-bold">Accommodation reply</p><p className="text-cream-muted text-sm whitespace-pre-wrap mt-2">{r.reply}</p></div>}</article>)}</div>
    </>}
  </main></div>
}
