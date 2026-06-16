import { useState, useEffect, useRef } from 'react'
import { Send, CircleCheck as CheckCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  Message, Conversation, Profile,
  getConversationMessages, sendMessage,
  getMessageCount, resolveConversation,
} from '../../services/dataService'
import { supabase } from '../../services/supabaseClient'
import { PLAN_TIERS, PlanKey } from '../../services/dataService'

interface Props {
  conversation: Conversation & {
    buyer: Profile
    seller: Profile
    listing: { id: string; title: string; image_urls: string[]; price: number }
  }
  onResolved: () => void
}

export default function ChatWindow({ conversation, onResolved }: Props) {
  const { currentUser, showToast } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [msgCount, setMsgCount] = useState(0)
  const [resolving, setResolving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isSeller = currentUser?.id === conversation.seller_id
  const otherParty = isSeller ? conversation.buyer : conversation.seller
  const sellerPlan = (conversation.seller as Profile & { plan?: string })?.plan as PlanKey | undefined
  const maxMsgs = sellerPlan ? PLAN_TIERS[sellerPlan]?.maxMsgs ?? 999 : 999

  useEffect(() => {
    if (!currentUser) return
    getConversationMessages(conversation.id).then(setMessages)
    getMessageCount(conversation.id, currentUser.id).then(setMsgCount)
  }, [conversation.id, currentUser])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        payload => {
          setMessages(prev => {
            if (prev.find(m => m.id === (payload.new as Message).id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  const handleSend = async () => {
    if (!text.trim() || !currentUser) return
    if (!isSeller && msgCount >= maxMsgs) {
      showToast(`Message limit reached on the seller's plan (${maxMsgs} messages).`, 'info')
      return
    }
    setSending(true)
    const { error } = await sendMessage(conversation.id, currentUser.id, text.trim())
    setSending(false)
    if (error) { showToast(error, 'error'); return }
    setText('')
    setMsgCount(c => c + 1)
  }

  const handleResolve = async () => {
    if (!isSeller) return
    setResolving(true)
    const { error } = await resolveConversation(conversation.id)
    setResolving(false)
    if (error) { showToast(error, 'error'); return }
    showToast('Conversation resolved. Buyer will be prompted to rate.', 'success')
    onResolved()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-border bg-slate-deep flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: otherParty.avatar_color }}
          >
            {otherParty.avatar_initials}
          </div>
          <div>
            <p className="text-cream font-bold text-sm">{otherParty.full_name}</p>
            <p className="text-cream-muted text-xs truncate max-w-[180px]">
              {conversation.listing?.title}
            </p>
          </div>
        </div>
        {isSeller && !conversation.is_resolved && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-light border border-teal-primary hover:bg-teal-faint px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40"
          >
            <CheckCircle size={13} />
            Resolve
          </button>
        )}
        {conversation.is_resolved && (
          <span className="text-xs text-teal-light border border-teal-primary px-2 py-1 rounded-xl">
            Resolved
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-cream-muted text-xs text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUser?.id
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-ember text-white rounded-br-sm'
                    : 'bg-slate-card border border-slate-border text-cream rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!conversation.is_resolved && (
        <div className="px-4 py-3 border-t border-slate-border flex gap-2 flex-shrink-0">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="w-10 h-10 flex items-center justify-center bg-ember hover:bg-ember-dark disabled:opacity-40 rounded-xl text-white flex-shrink-0 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      )}
      {conversation.is_resolved && (
        <p className="text-center text-cream-muted text-xs px-4 py-3 border-t border-slate-border">
          This conversation is resolved.
        </p>
      )}
    </div>
  )
}
