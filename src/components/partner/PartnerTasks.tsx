import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWorkspace, workspaceAction, workspaceError, type PartnerTask, type PartnerContact } from '../../services/partnerWorkspace'
export function ContactDetails({ contact }: { contact: PartnerContact }) {
 return <div className="text-sm space-y-2"><p className="font-bold text-cream">{contact.name} <span className="font-normal text-cream-muted capitalize">· {contact.kind}</span></p><div className="flex flex-wrap gap-1.5">{contact.universities.map(u => <span key={u} className="rounded-lg bg-teal-primary/10 text-teal-light px-2 py-1 text-xs">{u}</span>)}</div><div className="flex flex-wrap gap-3 break-all">{contact.phone && <a className="text-gold underline py-1" href={`tel:${contact.phone}`}>{contact.phone}</a>}{contact.email && <a className="text-gold underline py-1" href={`mailto:${contact.email}`}>{contact.email}</a>}</div></div>
}
export default function PartnerTasks() {
 const navigate = useNavigate()
 const [tasks, setTasks] = useState<PartnerTask[]>([]), [contacts, setContacts] = useState<PartnerContact[]>([])
 const [error, setError] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(''), [loading, setLoading] = useState(true)
 const refresh = useCallback(async () => { try { const data = await loadWorkspace(); setTasks(data.tasks); setContacts(data.contacts); setError('') } catch(e) { setError(workspaceError(e)) } finally { setLoading(false) } }, [])
 useEffect(() => { void refresh(); const timer=setInterval(() => { if(document.visibilityState==='visible') void refresh() },30000); return () => clearInterval(timer) },[refresh])
 async function tick(task: PartnerTask, step: number, checked: boolean) {
  setBusy(task.id); setStatus(''); setError('')
  try { const updated=await workspaceAction('tick',{id:task.id,revision:task.revision,step,checked}); setTasks(all=>all.map(t=>t.id===task.id?updated:t)); setStatus('Progress saved. Admin has been notified.') } catch(e) { setError(workspaceError(e)) } finally { setBusy('') }
 }
 return <section className="space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl text-cream">Your tasks & contacts</h2><button onClick={refresh} className="text-gold text-sm py-3">Refresh</button></div>
 <p className="text-cream-muted text-sm">Tick each step after you’ve done it. Your updates go straight to Admin.</p>
 {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}{status && <p role="status" className="text-teal-light text-sm">{status}</p>}
 {loading ? <p className="text-cream-muted">Loading tasks…</p> : !tasks.length && <div className="p-5 rounded-2xl border border-slate-border bg-slate-card text-cream-muted text-sm"><p>You’re ready to get started. Admin hasn’t assigned a task yet.</p><button onClick={()=>navigate('/chat?support=1')} className="text-gold font-bold py-3">Chat with Admin</button></div>}
 {tasks.map(task => <article key={task.id} className="rounded-2xl bg-slate-card border border-slate-border p-4"><div className="flex justify-between gap-3"><h3 className="font-bold text-cream">{task.title}</h3><span className="text-sm text-teal-light whitespace-nowrap">{task.steps.filter(s=>s.done).length}/{task.steps.length}</span></div>{contacts.find(c=>c.id===task.contact_id) && <div className="mt-3 pb-3 border-b border-slate-border"><ContactDetails contact={contacts.find(c=>c.id===task.contact_id)!} /></div>}<fieldset disabled={busy===task.id} className="mt-2">{task.steps.map((step,i)=><label key={i} className="flex items-start gap-3 py-3 text-sm text-cream cursor-pointer"><input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0 accent-teal-primary" checked={step.done} onChange={e=>tick(task,i,e.target.checked)} /><span className={step.done?'line-through text-cream-muted':''}>{step.label}</span></label>)}</fieldset></article>)}
 {contacts.length>0 && <details className="rounded-2xl bg-slate-card border border-slate-border p-4"><summary className="font-bold text-cream cursor-pointer">All assigned contacts · {contacts.length}</summary><div className="divide-y divide-slate-border">{contacts.map(c=><div key={c.id} className="py-4"><ContactDetails contact={c}/></div>)}</div></details>}
 </section>
}
