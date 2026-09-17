import { useState, useEffect, useRef } from 'react'
import { Send, Check, CheckCheck, Star, X } from 'lucide-react'
import { Conversation, Message, Profile, getMessagesForConversation, sendMessage, resolveConversation, leaveRating } from '../../services/dataService'
import { supabase } from '../../services/supabaseClient'
import { useApp } from '../../context/AppContext'

type FullConversation = Conversation & {
  buyer: Profile
  seller: Profile
  listing: { id: string; title: string; image_urls: string[]; price: number }
}

export default function ChatWindow({ conversation, onResolved }: { conversation: FullConversation; onResolved: () => void }) {
  const { currentUser, showToast } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showRating, setShowRating] = useState(false)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const other = currentUser?.id === conversation.buyer_id ? conversation.seller : conversation.buyer
  const iAmSeller = currentUser?.id === conversation.seller_id
  const isResolved = (conversation as any).is_resolved

  useEffect(() => {
    setLoading(true)
    // Try dataService first, fallback to supabase direct
    const load = async () => {
      try {
        if (typeof getMessagesForConversation === 'function') {
          const data = await (getMessagesForConversation as any)(conversation.id)
          setMessages(data)
        } else {
          const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversation.id).order('sent_at', { ascending: true })
          if (data) setMessages(data as any)
        }
      } catch {
        // fallback
        const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversation.id).order('sent_at', { ascending: true })
        if (data) setMessages(data as any)
      }
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel(`conv:${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, payload => {
        const msg = payload.new as Message
        setMessages(prev => [...prev, msg])
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !currentUser || sending) return
    setSending(true)
    try {
      if (typeof sendMessage === 'function') {
        await (sendMessage as any)({ conversation_id: conversation.id, sender_id: currentUser.id, content: text })
      } else {
        await supabase.from('messages').insert({ conversation_id: conversation.id, sender_id: currentUser.id, content: text })
      }
      setInput('')
    } catch (e) {
      showToast('Failed to send', 'error')
    }
    setSending(false)
  }

  const handleResolve = async () => {
    try {
      if (typeof resolveConversation === 'function') await (resolveConversation as any)(conversation.id)
      else await supabase.from('conversations').update({ is_resolved: true }).eq('id', conversation.id)
      onResolved()
      if (!iAmSeller) setShowRating(true)
      showToast('Marked as done', 'success')
    } catch {
      showToast('Could not resolve', 'error')
    }
  }

  const handleRating = async () => {
    if (stars === 0) { showToast('Pick a star rating', 'error'); return }
    setRatingSubmitting(true)
    try {
      if (typeof leaveRating === 'function') await (leaveRating as any)({ conversation_id: conversation.id, stars, comment, rater_id: currentUser?.id, rated_id: other?.id, listing_id: conversation.listing?.id })
      else await supabase.from('ratings').insert({ conversation_id: conversation.id, stars, comment, buyer_id: currentUser?.id, seller_id: other?.id, listing_id: conversation.listing?.id })
      setShowRating(false)
      showToast('Thanks for rating!', 'success')
    } catch {
      showToast('Could not submit rating', 'error')
    }
    setRatingSubmitting(false)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-cream-muted text-sm">Loading messages...</p></div>

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-deep">
      {/* Header - listing context, preserves Tag icon logic from ChatPage */}
      <div className="h-14 border-b border-slate-border bg-slate-card flex items-center gap-3 px-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: other?.avatar_color || '#0D9488' }}>{other?.avatar_initials || '?'}</div>
        <div className="flex-1 min-w-0">
          <p className="text-cream font-bold text-sm truncate">{other?.full_name || 'Unknown'} • {conversation.listing?.title}</p>
          <p className="text-cream-muted text-[11px] truncate">R{conversation.listing?.price} • {iAmSeller ? 'You are selling' : 'You are buying'}</p>
        </div>
        {!isResolved && <button onClick={handleResolve} className="text-xs font-bold border border-teal-primary text-teal-light px-3 py-1.5 rounded-full hover:bg-teal-faint">Mark done</button>}
        {isResolved && <span className="text-teal-light text-xs border border-teal-primary px-2 py-1 rounded-full flex items-center gap-1"><Check size={12} />Done</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && <p className="text-cream-muted text-xs text-center mt-8">No messages yet. Say hi!</p>}
        {messages.map(m => {
          const isMe = m.sender_id === currentUser?.id
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMe ? 'bg-[#2563EB] text-white rounded-br-sm' : 'bg-slate-card border border-slate-border text-cream rounded-bl-sm'}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMe ? 'text-white/70 justify-end' : 'text-cream-muted'}`}>
                  <span>{new Date((m as any).sent_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && <span>{(m as any).read_at ? <CheckCheck size={10} /> : <Check size={10} />}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Rating modal - restores Star rating logic from Profile.tsx */}
      {showRating && (
        <div className="absolute inset-0 z-20 bg-black/60 flex items-end md:items-center justify-center p-4">
          <div className="bg-slate-card border border-slate-border rounded-3xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cream font-bold">Rate {other?.full_name}</h3>
              <button onClick={() => setShowRating(false)} className="w-8 h-8 rounded-full bg-slate-deep border border-slate-border flex items-center justify-center text-cream-muted"><X size={14} /></button>
            </div>
            <p className="text-cream-muted text-xs mb-3">Ratings are attached to the seller, not the listing — like in Profile.tsx</p>
            <div className="flex gap-1 mb-4">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setStars(n)} className="p-1">
                  <Star size={28} className={n <= stars ? 'fill-gold text-gold' : 'text-slate-border'} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="What was your experience? (optional)" className="w-full bg-slate-deep border border-slate-border rounded-xl p-3 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light min-h-[80px] resize-none mb-3" />
            <button onClick={handleRating} disabled={ratingSubmitting} className="w-full bg-gold text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">{ratingSubmitting ? 'Submitting...' : 'Submit rating'}</button>
          </div>
        </div>
      )}

      {!isResolved ? (
        <div className="p-3 border-t border-slate-border bg-slate-card flex items-end gap-2 flex-shrink-0">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} placeholder="Type a message..." rows={1} className="flex-1 bg-slate-deep border border-slate-border rounded-2xl px-4 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-none max-h-24" />
          <button onClick={handleSend} disabled={!input.trim() || sending} className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50"><Send size={16} /></button>
        </div>
      ) : (
        <div className="p-4 border-t border-slate-border bg-slate-card text-center flex-shrink-0">
          <p className="text-cream-muted text-xs">This chat is marked done. {iAmSeller ? '' : 'You can still rate the seller above.'}</p>
        </div>
      )}
    </div>
  )
}
