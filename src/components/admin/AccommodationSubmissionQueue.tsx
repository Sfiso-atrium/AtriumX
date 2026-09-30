import { useEffect, useState } from 'react'
import { AccommodationSubmission, getAccommodationSubmissions, reviewAccommodationSubmission } from '../../services/accommodationIntake'

export default function AccommodationSubmissionQueue(){
  const [items,setItems]=useState<AccommodationSubmission[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState<string|null>(null)
  const load=()=>{setLoading(true);setError('');getAccommodationSubmissions().then(setItems).catch(()=>setError('Could not load accommodation submissions.')).finally(()=>setLoading(false))}
  useEffect(load,[])
  const review=async(id:string,approve:boolean)=>{setBusy(id);setError('');try{await reviewAccommodationSubmission(id,approve);setItems(prev=>prev.map(s=>s.id===id?{...s,status:approve?'approved':'rejected'}:s))}catch(e){setError(e instanceof Error?e.message:'Could not save the review.')}finally{setBusy(null)}}
  return <section className="space-y-4">
    <h2 className="text-cream font-bold text-lg">Accommodation submissions</h2>
    <p className="text-cream-muted text-sm">Check the property and provider's contact details before approving. Approved submissions appear publicly without requiring an account.</p>
    {loading&&<p className="text-cream-muted">Loading submissions...</p>}
    {error&&<div role="alert" className="text-red-400">{error} <button onClick={load} className="underline">Retry</button></div>}
    {!loading&&!error&&!items.length&&<p className="text-cream-muted py-8">No accommodation submissions yet.</p>}
    {items.map(s=><article key={s.id} className="bg-slate-card border border-slate-border rounded-2xl p-5 space-y-3">
      <div className="flex justify-between gap-3"><h3 className="text-cream font-bold">{s.payload.title}</h3><span className="text-teal-light text-sm capitalize">{s.status}</span></div>
      <p className="text-cream-muted text-sm">{s.payload.address} · {s.payload.building_count} building(s)</p>
      <p className="text-cream-muted text-sm">{s.payload.universities.join(', ')}</p>
      <p className="text-cream text-sm whitespace-pre-wrap">{s.payload.description}</p>
      <p className="text-cream-muted text-sm">{s.email} · {s.contact_number}</p>
      {s.website&&<a href={s.website} target="_blank" rel="noopener noreferrer" className="text-teal-light underline text-sm">Provider website</a>}
      <p className="text-cream-muted text-xs">{s.payload.amenities.join(', ')}</p>
      {!!s.payload.room_pricing.length&&<pre className="text-cream-muted text-xs whitespace-pre-wrap">{s.payload.room_pricing.map(r=>`${r.room_type}: Bursary ${r.bursary??'—'}, NSFAS ${r.nsfas??'—'}, Self-funded ${r.self_funded??'—'}`).join('\n')}</pre>}
      <div className="flex flex-wrap gap-2">{s.image_urls.map((url,i)=><a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Property photo ${i+1}`} className="w-28 h-24 rounded-xl object-cover"/></a>)}</div>
      <div className="flex gap-3"><button disabled={busy===s.id||s.status==='approved'} onClick={()=>review(s.id,true)} className="bg-teal-primary text-white px-4 py-2 rounded-xl disabled:opacity-40">Approve publication</button><button disabled={busy===s.id||s.status==='rejected'} onClick={()=>review(s.id,false)} className="border border-slate-border text-cream px-4 py-2 rounded-xl disabled:opacity-40">{s.status==='approved'?'Unpublish':'Reject'}</button></div>
    </article>)}
  </section>
}
