import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleCheck as CheckCircle, Tag, ShoppingBag, Flag } from 'lucide-react'
import SendIcon from '../common/icons/SendIcon'
import { useApp } from '../../context/AppContext'
import {
  Message, Conversation, Profile,
  getConversationMessages, sendMessage,
  markConversationResolved, getUnreadMessageCount,
  markMessagesRead, sendRatingInvite,
} from '../../services/dataService'
import { supabase } from '../../services/supabaseClient'
import { PLAN_TIERS, PlanKey } from '../../services/dataService'
import ChatReportModal from './ChatReportModal'

interface Props {
  conversation: Conversation & {
    buyer: Profile
    seller: Profile
    listing: { id: string; title: string; image_urls: string[]; price: number }
  }
  onResolved: () => void
}

// Catches emails outright, and phone numbers after stripping the separators
// people commonly use to dodge a plain digit-count check (spaces, dashes,
// dots, parens) — e.g. "071 234 5678" or "071-234-5678" both get caught.
function containsContactInfo(text: string): boolean {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  if (emailPattern.test(text)) return true

  const digitsOnly = text.replace(/[\s\-().]/g, '')
  if (/\d{7,}/.test(digitsOnly)) return true

  return false
}

export default function ChatWindow({ conversation, onResolved }: Props) {
  const navigate = useNavigate()
  const { currentUser, showToast, setUnreadMessageCount } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [ownMsgCount, setOwnMsgCount] = useState(0)
  const [resolving, setResolving] = useState(false)
  const [showResolvePrompt, setShowResolvePrompt] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isSeller = currentUser?.id === conversation.seller_id
  const otherParty = isSeller ? conversation.buyer : conversation.seller
  const sellerPlan = (conversation.seller as Profile & { plan?: string })?.plan as PlanKey | undefined
  const maxMsgs = sellerPlan ? PLAN_TIERS[sellerPlan]?.maxMsgs ?? 999 : 999
  // A Noticeboard business can't reply — the send is blocked at the RLS
  // level too (migration 014), this just shows them why instead of a
  // silent failed send.
  const sellerLocked = isSeller &&
    (conversation.seller as Profile & { account_type?: string })?.account_type === 'business' &&
    sellerPlan === 'noticeboard'

  useEffect(() => {
    if (!currentUser) return
    getConversationMessages(conversation.id).then(msgs => {
      setMessages(msgs)
      setOwnMsgCount(msgs.filter(m => m.sender_id === currentUser.id).length)
    })
    // Opening a conversation is what "reading" it means here — mark
    // the other person's messages read and refresh the badge count.
    markMessagesRead(conversation.id, currentUser.id).then(() => {
      getUnreadMessageCount(currentUser.id).then(setUnreadMessageCount)
    })
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
            const updated = [...prev, payload.new as Message]
            setOwnMsgCount(updated.filter(m => m.sender_id === currentUser?.id).length)
            return updated
          })
          if (currentUser) getUnreadMessageCount(currentUser.id).then(setUnreadMessageCount)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  const handleSend = async () => {
    if (!text.trim() || !currentUser) return
    if (sellerLocked) {
      showToast('Upgrade to Campus Partner or Featured to respond to messages.', 'info')
      return
    }
    if (ownMsgCount >= maxMsgs) {
      if (isSeller) {
        showToast(`Message limit reached on your plan (${maxMsgs} messages).`, 'info')
      } else {
        showToast(`This conversation has reached the seller's plan limit of ${maxMsgs} messages.`, 'info')
      }
      return
    }
    if (containsContactInfo(text)) {
      showToast('For safety, phone numbers and email addresses can\'t be sent in chat.', 'error')
      return
    }
    setSending(true)
    const { error } = await sendMessage(conversation.id, currentUser.id, text.trim())
    setSending(false)
    if (error) { showToast(error, 'error'); return }
    setText('')
    setOwnMsgCount(c => c + 1)
  }

  const handleResolve = async () => {
    if (!isSeller) return
    setResolving(true)
    const { error } = await markConversationResolved(conversation.id)
    setResolving(false)
    if (error) { showToast(error, 'error'); return }
    onResolved()
    // Resolving a chat is a separate moment from marking the listing sold
    // (see ListingDetail's Mark as Sold flow) — a seller may resolve a
    // conversation that didn't end in a sale. Either way, inviting a rating
    // here is always an explicit opt-in choice, never automatic.
    setShowResolvePrompt(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

if (conversation.is_closed_by_admin) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-6 text-center">
        <p className="text-cream font-bold text-sm mb-2">This conversation is no longer available.</p>
        <p className="text-cream-muted text-xs">
          If you have questions about this, please contact support.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-border border-t-4 bg-slate-deep flex-shrink-0 ${
        isSeller ? 'border-t-teal-primary' : 'border-t-ember'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: otherParty.avatar_color }}
            >
              {otherParty.avatar_initials}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-deep ${
                isSeller ? 'bg-teal-primary' : 'bg-ember'
              }`}
              title={isSeller ? 'Your listing' : "You're interested"}
            >
              {isSeller
                ? <Tag size={9} className="text-white" />
                : <ShoppingBag size={9} className="text-white" />}
            </span>
          </div>
          <div>
            <p className="text-cream font-bold text-sm">
              {otherParty.full_name}{' '}
              <span className="text-cream-muted font-normal">
                ({isSeller ? 'Buying' : 'Selling'})
              </span>
            </p>
            <p className="text-cream-muted text-xs truncate max-w-[180px]">
              {conversation.listing?.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
          <button
            onClick={() => setShowReportModal(true)}
            title="Report this conversation"
            className="text-cream-muted hover:text-red-400 p-1.5 rounded-lg transition-colors"
          >
            <Flag size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-cream-muted text-xs text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUser?.id
          const masked = msg.content.replace(/\d{7,}/g, '[number hidden]')
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-ember text-white rounded-br-sm'
                    : 'bg-slate-card border border-slate-border text-cream rounded-bl-sm'
                }`}
              >
                {masked}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

{showReportModal && (
        <ChatReportModal
          conversationId={conversation.id}
          listingId={conversation.listing_id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Input */}
      {!conversation.is_resolved && sellerLocked && (
        <div className="px-4 py-3 border-t border-slate-border flex items-center justify-between gap-3 flex-shrink-0 bg-slate-card">
          <p className="text-cream-muted text-xs">
            A student has messaged you. Upgrade to respond.
          </p>
          <button
            onClick={() => navigate('/retailer')}
            className="flex-shrink-0 bg-gold text-slate-deep text-xs font-bold px-3 py-2 rounded-xl hover:bg-gold/90 transition-colors"
          >
            Upgrade
          </button>
        </div>
      )}
      {!conversation.is_resolved && !sellerLocked && (
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
            <SendIcon size={16} />
          </button>
        </div>
      )}
      {conversation.is_resolved && (
        <p className="text-center text-cream-muted text-xs px-4 py-3 border-t border-slate-border">
          This conversation is resolved.
        </p>
      )}
      {showResolvePrompt && currentUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-serif text-xl text-cream mb-2">Invite a Rating?</h2>
            <p className="text-cream-muted text-sm mb-6">
              Would you like to invite {otherParty.full_name} to rate their experience with you?
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const { error } = await sendRatingInvite(
                    conversation.seller_id,
                    currentUser.full_name,
                    conversation.buyer_id,
                    conversation.listing?.id ?? '',
                    conversation.id
                  )
                  setShowResolvePrompt(false)
                  if (error) { showToast(error, 'error'); return }
                  showToast('Rating invite sent.', 'success')
                }}
                className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors"
              >
                Yes, invite them
              </button>
              <button
                onClick={() => setShowResolvePrompt(false)}
                className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-3 rounded-xl transition-colors"
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
