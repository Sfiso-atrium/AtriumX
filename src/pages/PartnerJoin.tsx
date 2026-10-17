import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Handshake } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getPartnerStatus, getUserById } from '../services/dataService'
import { supabase } from '../services/supabaseClient'
import { joinPartner, workspaceButton, workspaceError, workspaceInput } from '../services/partnerWorkspace'
import Navbar from '../components/common/Navbar'
export default function PartnerJoin() {
 const { currentUser, isLoadingAuth, setCurrentUser }=useApp(), navigate=useNavigate()
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[accepted,setAccepted]=useState(false)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=> { if(currentUser) getPartnerStatus(currentUser.id).then(p=> { if(p) navigate('/partner?welcome=1',{replace:true}) }) },[currentUser?.id,navigate])
 async function submit(event: React.FormEvent) {
  event.preventDefault(); setError(''); setNotice(''); setBusy(true)
  try {
   if(!accepted) throw new Error('Please confirm the partner guidelines.')
   let id=currentUser?.id
   if(!id) {
    const {data,error:authError}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim(),account_type:'partner'},emailRedirectTo:`${window.location.origin}/`}})
    if(authError) throw authError
    if(!data.session) { setNotice('Check your email to confirm your account, then sign in to open your partner dashboard. No admin approval is needed.'); setPassword(''); return }
    id=data.session.user.id
   }
   await joinPartner()
   const profile=await getUserById(id)
   if(!profile) throw new Error('Your account was created, but your profile could not load. Sign in again to continue.')
   setCurrentUser(profile); navigate('/partner?welcome=1',{replace:true})
  } catch(e) { setError(workspaceError(e)) } finally { setBusy(false) }
 }
 return <div className="min-h-screen bg-slate-deep pb-12"><Navbar/><main className="max-w-lg mx-auto p-5 sm:py-10"><div className="w-14 h-14 rounded-2xl bg-teal-primary/10 text-teal-light flex items-center justify-center mb-5"><Handshake size={28}/></div><p className="text-xs font-bold tracking-widest text-teal-light uppercase">AtriumX partners</p><h1 className="text-3xl font-serif text-cream mt-2">Good conversations start here.</h1><p className="text-cream-muted text-sm mt-3 mb-6">Connect students with useful local businesses and accommodation. Your dashboard brings your tasks, referral links and conversations with Admin together.</p>
 <form onSubmit={submit} className="bg-slate-card border border-slate-border rounded-2xl p-5 space-y-4">
 {currentUser ? <p className="text-cream text-sm">Join as <strong>{currentUser.full_name}</strong>. You’ll keep your existing account.</p> : <><label className="block text-sm text-cream">Your name<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className={`${workspaceInput} mt-1`}/></label><label className="block text-sm text-cream">Email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className={`${workspaceInput} mt-1`}/><span className="block text-xs text-cream-muted mt-1">Any email address is welcome.</span></label><label className="block text-sm text-cream">Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className={`${workspaceInput} mt-1`}/><span className="text-xs text-cream-muted">At least 8 characters.</span></label></>}
 <label className="flex gap-3 text-sm text-cream-muted leading-relaxed"><input required type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="w-5 h-5 shrink-0 mt-1 accent-teal-primary"/><span>I’ll represent AtriumX honestly and respect people’s contact preferences. I understand earnings depend on an agreed commission arrangement and eligible payments; joining does not guarantee income.</span></label>
 {error&&<p role="alert" className="text-red-500 text-sm">{error}</p>}{notice&&<p role="status" className="text-teal-light text-sm">{notice}</p>}
 <button disabled={busy||isLoadingAuth} className={`${workspaceButton} w-full`}>{busy?'Opening your workspace…':'Join & open my dashboard'}</button>
 {!currentUser&&<button type="button" onClick={()=>navigate('/student?next=%2Fpartner%2Fjoin')} className="w-full text-sm text-gold py-2">Already have an account? Sign in</button>}
 </form></main></div>
}
