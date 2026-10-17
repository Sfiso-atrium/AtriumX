import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { support, workspaceError, type SupportMessage, type SupportThread } from '../../services/partnerWorkspace'
export default function PartnerSupportInbox() {
 const {currentUser}=useApp(),[params,setParams]=useSearchParams()
 const [threads,setThreads]=useState<SupportThread[]>([]),[messages,setMessages]=useState<SupportMessage[]>([])
 const [text,setText]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[hasOlder,setHasOlder]=useState(false),[olderBusy,setOlderBusy]=useState(false)
 const [height,setHeight]=useState(window.visualViewport?.height||window.innerHeight)
 const epoch=useRef(0),bottom=useRef<HTMLDivElement>(null),scroller=useRef<HTMLDivElement>(null),follow=useRef(true),pending=useRef<{content:string;request:string;partner:string}|null>(null)
 const isAdmin=!!currentUser?.is_admin
 const selected=isAdmin?params.get('partner'):currentUser?.id
 const loadInbox=useCallback(async()=>{setThreads(await support<SupportThread[]>('inbox'))},[])
 useEffect(()=>{const resize=()=>setHeight(window.visualViewport?.height||window.innerHeight);window.visualViewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);return()=>{window.visualViewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize)}},[])
 useEffect(()=>{void loadInbox().catch(e=>setError(workspaceError(e)));const timer=setInterval(()=>{if(document.visibilityState==='visible')void loadInbox().catch(e=>setError(workspaceError(e)))},8000);return()=>clearInterval(timer)},[loadInbox])
 useEffect(()=>{
  const generation=++epoch.current;setMessages([]);setError('');setText('');setHasOlder(false);setLoading(!!selected);follow.current=true;pending.current=null
  if(!selected)return
  let initial=true
  async function poll(){try{
   const rows=await support<SupportMessage[]>('messages',{p_partner:selected})
   if(generation!==epoch.current)return
   setMessages(previous=>{const combined=new Map(previous.map(m=>[m.id,m]));rows.forEach(m=>combined.set(m.id,m));return [...combined.values()].sort((a,b)=>a.id-b.id)})
   if(initial){setHasOlder(rows.length===50);initial=false}
   setLoading(false)
   if(document.visibilityState==='visible'&&document.hasFocus()&&rows.length){await support('read',{p_partner:selected,p_read_id:rows[rows.length-1].id});await loadInbox()}
  }catch(e){if(generation===epoch.current){setError(workspaceError(e));setLoading(false)}}}
  void poll();const timer=setInterval(()=>{if(document.visibilityState==='visible')void poll()},5000)
  const focus=()=>void poll();window.addEventListener('focus',focus)
  return()=>{epoch.current++;clearInterval(timer);window.removeEventListener('focus',focus)}
 },[selected,loadInbox])
 useEffect(()=>{if(follow.current)bottom.current?.scrollIntoView({block:'end'})},[messages.length])
 async function older(){if(!selected||!messages.length)return;setOlderBusy(true);const generation=epoch.current;const oldHeight=scroller.current?.scrollHeight||0;try{const rows=await support<SupportMessage[]>('messages',{p_partner:selected,p_before:messages[0].id});if(generation!==epoch.current)return;follow.current=false;setMessages(all=>{const map=new Map([...rows,...all].map(m=>[m.id,m]));return [...map.values()].sort((a,b)=>a.id-b.id)});setHasOlder(rows.length===50);requestAnimationFrame(()=>{if(scroller.current)scroller.current.scrollTop=scroller.current.scrollHeight-oldHeight})}catch(e){setError(workspaceError(e))}finally{setOlderBusy(false)}}
 async function send(e:React.FormEvent){e.preventDefault();if(!selected||!text.trim()||sending)return;const generation=epoch.current;setSending(true);setError('');const content=text.trim();if(!pending.current||pending.current.content!==content||pending.current.partner!==selected)pending.current={content,request:crypto.randomUUID(),partner:selected};try{await support('send',{p_partner:selected,p_content:content,p_request:pending.current.request});if(generation!==epoch.current)return;pending.current=null;setText('');follow.current=true;const rows=await support<SupportMessage[]>('messages',{p_partner:selected});if(generation!==epoch.current)return;setMessages(all=>{const map=new Map([...all,...rows].map(m=>[m.id,m]));return [...map.values()].sort((a,b)=>a.id-b.id)});await loadInbox()}catch(e){if(generation===epoch.current)setError(workspaceError(e))}finally{setSending(false)}}
 const selectedThread=threads.find(t=>t.partner_id===selected)
 return <div className="bg-slate-deep flex min-h-0 max-w-6xl mx-auto" style={{height:Math.max(220,height-112)}}>
 {isAdmin&&<aside aria-label="Partner conversations" className={`${selected?'hidden md:block':'block'} w-full md:w-80 shrink-0 border-r border-slate-border overflow-y-auto p-3`}><h2 className="font-bold text-cream p-2">Partners</h2>{threads.length===0&&<p className="text-sm text-cream-muted p-2">No partner conversations yet. Registered partners appear here automatically.</p>}{threads.map(t=><button key={t.partner_id} onClick={()=>setParams({support:'1',partner:t.partner_id})} className={`w-full text-left rounded-xl p-3 mb-2 ${selected===t.partner_id?'bg-teal-primary/15':'bg-slate-card'}`}><span className="text-cream font-bold flex justify-between gap-2">{t.name}{t.unread>0&&<span className="text-xs bg-teal-primary text-white rounded-full px-2 py-1">{t.unread}</span>}</span><span className="block truncate text-cream-muted text-xs mt-1">{t.preview||'Start a conversation'}</span></button>)}</aside>}
 <section aria-label="Support conversation" className={`${isAdmin&&!selected?'hidden md:flex':'flex'} flex-col min-w-0 min-h-0 flex-1`}>
 <header className="flex items-center gap-3 p-4 border-b border-slate-border bg-slate-card shrink-0">{isAdmin&&selected&&<button className="md:hidden p-2 text-cream" aria-label="Back to partners" onClick={()=>setParams({support:'1'})}><ArrowLeft size={20}/></button>}<div><h1 className="font-bold text-cream">{isAdmin?(selectedThread?.name||'Partner inbox'):'Admin'}</h1><p className="text-xs text-cream-muted">{isAdmin?'Shared by all AtriumX admins':'Ask a question, request contacts or discuss your tasks.'}</p></div></header>
 <div ref={scroller} onScroll={()=>{const el=scroller.current;if(el)follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<100}} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
 {!selected?<p className="text-cream-muted text-sm">Choose a partner to start or continue a conversation.</p>:loading?<p className="text-cream-muted text-sm">Loading messages…</p>:<>{hasOlder&&<button disabled={olderBusy} onClick={older} className="block mx-auto text-gold text-sm py-2">{olderBusy?'Loading…':'Load earlier messages'}</button>}{!messages.length&&<p className="text-cream-muted text-sm text-center py-8">{isAdmin?'Send a welcome or assign the next step.':'Your conversation with Admin starts here. Say hello or ask what to work on first.'}</p>}{messages.map(m=><div key={m.id} className={`flex ${m.from_admin===isAdmin?'justify-end':'justify-start'}`}><div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${m.from_admin===isAdmin?'bg-teal-primary text-white':'bg-slate-card border border-slate-border text-cream'}`}><p className="text-xs font-bold mb-1">{m.sender_name}</p><p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content}</p><p className="text-[10px] mt-2 opacity-70">{new Date(m.sent_at).toLocaleString()}</p></div></div>)}</>}
 <div ref={bottom}/></div>
 {error&&<p role="alert" className="text-red-500 text-sm px-4 py-2 shrink-0">{error}</p>}
 {selected&&<form onSubmit={send} className="flex items-end gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-card border-t border-slate-border shrink-0"><textarea aria-label="Message" value={text} onChange={e=>setText(e.target.value)} maxLength={4000} rows={2} placeholder={isAdmin?'Message this partner…':'Message Admin…'} className="flex-1 min-w-0 max-h-32 resize-none rounded-xl bg-slate-deep border border-slate-border p-3 text-base text-cream focus:outline-none focus:ring-2 focus:ring-teal-light"/><button aria-label="Send message" disabled={sending||!text.trim()||loading} className="p-3 rounded-xl bg-teal-primary text-white disabled:opacity-50"><Send size={22}/></button></form>}
 </section></div>
}
