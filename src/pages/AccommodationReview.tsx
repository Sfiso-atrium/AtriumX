import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Navbar from '../components/common/Navbar'
import { SOUTH_AFRICAN_UNIVERSITIES } from '../data/universities'
import { getResidences, postResidenceReview, Residence } from '../services/residenceReviews'

export default function AccommodationReviewPage() {
  const {currentUser,isLoadingAuth,setRedirectAfterLogin}=useApp()
  const navigate=useNavigate()
  const [params]=useSearchParams()
  const residenceId=params.get('residence')
  const [residences,setResidences]=useState<Residence[]>([])
  const [loaded,setLoaded]=useState(false)
  const [selected,setSelected]=useState<Residence|null>(null)
  const [name,setName]=useState('')
  const [university,setUniversity]=useState(currentUser?.university??'')
  const [stars,setStars]=useState(0)
  const [comment,setComment]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const load=()=>{setLoaded(false);setError('');getResidences().then(rows=>{setResidences(rows);const found=rows.find(r=>r.id===residenceId);if(found){setSelected(found);setName(found.name);setUniversity(found.university)}setLoaded(true)}).catch(e=>setError(e.message))}
  useEffect(load,[residenceId])
  const matches=useMemo(()=>residences.filter(r=>(!university||r.university===university||r.listing?.universities.includes(university))&&r.name.toLowerCase().includes(name.trim().toLowerCase())).slice(0,8),[name,university,residences])
  const signIn=()=>{setRedirectAfterLogin(`/accommodations/review${residenceId?`?residence=${residenceId}`:''}`);navigate('/student')}
  const submit=async()=>{if(busy)return;setError('');if(!selected&&(!name.trim()||!university))return setError('Choose a residence or enter its name and nearby university.');if(!stars||!comment.trim())return setError('Choose a star rating and write your review.');setBusy(true);try{const id=await postResidenceReview({residenceId:selected?.id??null,name,university,stars,comment});navigate(`/accommodations/residence/${id}`,{replace:true})}catch(e){setError(e instanceof Error?e.message:'Could not save your review.')}finally{setBusy(false)}}
  const field='w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream mt-2'
  return <div className="min-h-screen bg-slate-deep pb-20"><Navbar/><main className="max-w-2xl mx-auto px-4 py-8 space-y-5"><Link to="/accommodations" className="text-teal-light underline text-sm">Back to accommodation</Link><h1 className="font-serif text-3xl text-cream">Review your accommodation</h1>
    {isLoadingAuth?<p className="text-cream-muted">Loading account...</p>:!currentUser?<div className="bg-slate-card border border-slate-border rounded-2xl p-6 space-y-4"><p className="text-cream">Sign in with a student account to write a review. Your name will appear with it.</p><button onClick={signIn} className="bg-teal-primary text-white font-bold rounded-xl px-5 py-3">Sign in to write a review</button><p className="text-cream-muted text-sm">You can read residence reviews without signing in.</p></div>:currentUser.account_type!=='student'?<p className="text-cream">Only student accounts can write accommodation reviews. You can still browse students' reviews.</p>:<>
      <p className="text-cream-muted text-sm">Your review will be public under <strong className="text-cream">{currentUser.full_name}</strong>. Describe your own experience and avoid sharing anyone's private contact details.</p>
      <label className="block text-cream text-sm">Accommodation near<select className={field} value={university} onChange={e=>{setUniversity(e.target.value);setSelected(null)}}><option value="">Choose university</option>{SOUTH_AFRICAN_UNIVERSITIES.map(u=><option key={u}>{u}</option>)}</select></label>
      <label className="block text-cream text-sm">Residence / accommodation name<input className={field} value={name} maxLength={150} onChange={e=>{setName(e.target.value);setSelected(null)}} placeholder="Start typing your residence name" autoComplete="off"/></label>
      {!loaded&&!error&&<p className="text-cream-muted text-sm">Loading residence suggestions...</p>}
      {!selected&&name.trim()&&loaded&&<div className="border border-slate-border rounded-xl overflow-hidden">{matches.map(r=><button key={r.id} onClick={()=>{setSelected(r);setName(r.name);setUniversity(r.university)}} className="block w-full text-left p-3 bg-slate-card hover:bg-slate-deep text-cream border-b border-slate-border"><span className="font-semibold">{r.name}</span><span className="block text-xs text-cream-muted">{r.university}</span></button>)}<p className="p-3 text-cream-muted text-sm">{matches.length?'Choose the correct match above. If yours is different,':'No matching residence yet.'} Submitting a new name adds a residence review page.</p></div>}
      {selected&&<p className="text-teal-light text-sm">Reviewing: {selected.name} — {selected.university}</p>}
      <div><p className="text-cream text-sm mb-2">Your rating</p><div className="flex gap-2">{[1,2,3,4,5].map(n=><button key={n} aria-label={`${n} ${n===1?'star':'stars'}`} aria-pressed={stars===n} onClick={()=>setStars(n)} className="p-2 text-amber-500"><Star size={26} className={n<=stars?'fill-current':''}/></button>)}</div></div>
      <label className="block text-cream text-sm">Your experience<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={3000} rows={5} className={field} placeholder="What should other students know?"/></label>
      <button disabled={busy||!loaded} onClick={submit} className="bg-teal-primary text-white font-bold rounded-xl px-5 py-3 disabled:opacity-50">{busy?'Posting...':'Post review'}</button>
    </>}
    {error&&<p role="alert" className="text-red-400">{error} {!loaded&&<button onClick={load} className="underline">Retry</button>}</p>}
  </main></div>
}
