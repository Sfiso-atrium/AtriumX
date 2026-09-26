import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleCheck as CheckCircle, Tag, ShoppingBag, HandHelping, Building2, Flag, Paperclip, X, Trash2 } from 'lucide-react'
import SendIcon from '../common/icons/SendIcon'
import { useApp } from '../../context/AppContext'
import {
  Message, Conversation, Profile, WantedPost,
  getConversationMessages, getConversationMessageLimit, sendMessage,
  markConversationResolved, getUnreadMessageCount,
  markMessagesRead, sendRatingInvite,
  sendChatImage, CHAT_IMAGE_PLACEHOLDER, clearChatForMe,
} from '../../services/dataService'
import { supabase } from '../../services/supabaseClient'
import ChatReportModal from './ChatReportModal'
import ChatImage from './ChatImage'
import ConfirmModal from '../common/ConfirmModal'

interface Props {
  conversation: Conversation & {
    buyer: Profile
    seller: Profile
    listing?: { id: string; title: string; image_urls: string[]; price: number }
    wanted_post?: Pick<WantedPost, 'id' | 'title' | 'category' | 'max_price' | 'price_flexible' | 'urgency'>
    accommodation_listing?: { id: string; title: string; image_urls: string[]; monthly_rent: number | null }
  }
  onResolved: () => void
  // Removes this conversation from the caller's own list once they've
  // confirmed the delete. The chat itself, and the other person's copy,
  // are unaffected.
  onDeleted: () => void
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

export default function ChatWindow({ conversation, onResolved, onDeleted }: Props) {
  const navigate = useNavigate()
  const { currentUser, showToast, setUnreadMessageCount } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [ownMsgCount, setOwnMsgCount] = useState(0)
  const [resolving, setResolving] = useState(false)
  const [showResolvePrompt, setShowResolvePrompt] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [titleExpanded, setTitleExpanded] = useState(false)
  // Photo picked but not sent yet, plus the full-screen viewer.
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isSeller = currentUser?.id === conversation.seller_id
  const isWantedPost = !!conversation.wanted_post_id
  const isAccommodation = !!conversation.accommodation_listing_id
  const otherParty = isSeller ? conversation.buyer : conversation.seller
  const [maxMsgs, setMaxMsgs] = useState(999)
  const [sellerLocked, setSellerLocked] = useState(false)

  useEffect(() => {
    getConversationMessageLimit(conversation.id).then(({ maxMsgs: limit, sellerLocked: locked }) => {
      setMaxMsgs(limit)
      setSellerLocked(locked)
    })
  }, [conversation.id])

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
          if (currentUser) {
            // The chat is open right now, so a message arriving live counts
            // as read the instant it lands — mark it read in the same beat,
            // not just refresh the badge off the stale (still-unread) count.
            markMessagesRead(conversation.id, currentUser.id).then(() => {
              getUnreadMessageCount(currentUser.id).then(setUnreadMessageCount)
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        payload => {
          const updated = payload.new as Message
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  // Object URL for the pending photo's thumbnail — released when it's
  // cleared, replaced, or the chat closes.
  useEffect(() => {
    return () => { if (pendingPreview) URL.revokeObjectURL(pendingPreview) }
  }, [pendingPreview])

  const clearPendingImage = () => {
    setPendingImage(null)
    setPendingPreview(null)
  }

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file.', 'error')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('That image is too large.', 'error')
      return
    }
    setPendingImage(file)
    setPendingPreview(URL.createObjectURL(file))
  }

  const handleSend = async () => {
    if ((!text.trim() && !pendingImage) || !currentUser) return
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
    if (pendingImage) {
      // A photo counts as one message towards the plan limit, and any
      // caption went through the same contact-info check above.
      const { error: imageError } = await sendChatImage(conversation.id, pendingImage, text.trim())
      setSending(false)
      if (imageError) { showToast(imageError, 'error'); return }
      clearPendingImage()
      setText('')
      setOwnMsgCount(c => c + 1)
      return
    }
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
    // Product decision: a rating invite now fires automatically (see the
    // notify_rating_request trigger, migration 077) the moment a listing
    // conversation is marked resolved, in addition to this explicit
    // opt-in prompt -- lower friction than requiring the seller to also
    // press "Invite a rating". Both can safely coexist: send_rating_invite
    // (called below when the seller confirms this prompt) no-ops if a
    // rating_request notification for this conversation already exists,
    // so whichever of the two fires second is just a no-op, not a
    // duplicate.
    //
    // A wanted-post or accommodation conversation has no listing_id at
    // all -- ratings are a listing-transaction concept, and the trigger
    // above already guards on listing_id IS NOT NULL for the same reason
    // -- so there's nothing to invite a rating about here either way.
    if (!isWantedPost && !isAccommodation) setShowResolvePrompt(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Grows the textarea with its content (up to a cap, then it scrolls
  // internally) so a longer message is actually visible while typing.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

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

const handleDeleteChat = async () => {
    setDeleting(true)
    const { error } = await clearChatForMe(conversation.id)
    setDeleting(false)
    if (error) { showToast(error, 'error'); return }
    setShowDeleteConfirm(false)
    showToast('Chat deleted from your side.', 'success')
    onDeleted()
  }

  return (
    <div className="flex flex-col h-full bg-[#EEF3FB]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 mx-3 mt-3 bg-white rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] flex-shrink-0">
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: otherParty.avatar_color }}
          >
            {otherParty.avatar_initials}
          </div>
          <span
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${
              isSeller ? 'bg-teal-primary' : 'bg-ember'
            }`}
            title={isAccommodation ? (isSeller ? 'Your accommodation' : 'Accommodation') : isWantedPost ? (isSeller ? 'Your wanted post' : 'You can help') : (isSeller ? 'Your listing' : "You're interested")}
          >
            {isAccommodation
              ? <Building2 size={9} className="text-white" />
              : isWantedPost
                ? <HandHelping size={9} className="text-white" />
                : isSeller
                  ? <Tag size={9} className="text-white" />
                  : <ShoppingBag size={9} className="text-white" />}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-cream font-bold text-sm leading-tight truncate">{otherParty.full_name}</p>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className="flex-shrink-0 text-[11px] font-semibold leading-none px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
              {isAccommodation ? (isSeller ? 'Accommodation' : 'Student accommodation') : isWantedPost ? (isSeller ? 'Can help' : 'Looking for this') : (isSeller ? 'Buying' : 'Selling')}
            </span>
            {titleExpanded ? (
              <div
                onClick={() => setTitleExpanded(false)}
                className="min-w-0 max-w-[150px] overflow-x-auto whitespace-nowrap text-cream-muted text-xs cursor-pointer"
              >
                {conversation.accommodation_listing?.title || conversation.listing?.title || conversation.wanted_post?.title}
              </div>
            ) : (
              <button
                onClick={() => setTitleExpanded(true)}
                title={conversation.accommodation_listing?.title || conversation.listing?.title || conversation.wanted_post?.title}
                className="min-w-0 text-cream-muted text-xs truncate max-w-[150px]"
              >
                {conversation.accommodation_listing?.title || conversation.listing?.title || conversation.wanted_post?.title}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 bg-blue-50 rounded-full px-1.5 py-1">
          {isSeller && !conversation.is_resolved && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-white px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-40"
            >
              <CheckCircle size={13} />
              Resolve
            </button>
          )}
          {conversation.is_resolved && (
            <span className="text-xs font-semibold text-blue-600 px-2 py-1">
              Resolved
            </span>
          )}
          <button
            onClick={() => setShowReportModal(true)}
            title="Report this conversation"
            className="text-cream-muted hover:text-red-400 p-1.5 rounded-full transition-colors"
          >
            <Flag size={15} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete this chat for me"
            className="text-cream-muted hover:text-red-400 p-1.5 rounded-full transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
  <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-cream-muted text-xs text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUser?.id
          const masked = msg.content.replace(/\d{7,}/g, '[number hidden]')
          const hasImage = !!msg.image_path || !!msg.image_deleted_at
          const isLast = msg.id === messages[messages.length - 1]?.id
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] ${hasImage ? 'p-1.5' : 'px-3 py-2'} rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-ember text-white rounded-br-sm'
                    : 'bg-white text-cream rounded-bl-sm shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                }`}
              >
                {hasImage && (
                  <ChatImage
                    message={msg}
                    isOwn={isOwn}
                    onOpen={setLightboxUrl}
                    onLoaded={isLast ? () => bottomRef.current?.scrollIntoView({ behavior: 'auto' }) : undefined}
                  />
                )}
                {(!hasImage || msg.content !== CHAT_IMAGE_PLACEHOLDER) && (
                  <div className={hasImage ? 'px-1.5 pt-1.5 pb-0.5' : ''}>{masked}</div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

{showDeleteConfirm && (
        <ConfirmModal
          title="Delete this chat?"
          message="Are you sure? This will delete the chat from your side only — the other person will keep their copy. This cannot be undone."
          confirmLabel={deleting ? 'Deleting…' : 'Delete chat'}
          confirmDisabled={deleting}
          destructive
          onConfirm={handleDeleteChat}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showReportModal && (
        <ChatReportModal
          conversationId={conversation.id}
          listingId={conversation.listing_id}
          wantedPostId={conversation.wanted_post_id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Input */}
      {!conversation.is_resolved && sellerLocked && (
        <div className="px-4 py-3 mx-3 mb-3 bg-white rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] flex items-center justify-between gap-3 flex-shrink-0">
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
        <div className="px-3 pt-2 pb-3 flex flex-col gap-2 flex-shrink-0">
          {pendingPreview && (
            <div className="relative self-start">
              <img src={pendingPreview} alt="Photo to send" className="h-20 w-20 rounded-xl object-cover border border-slate-100 shadow-sm" />
              <button
                onClick={clearPendingImage}
                title="Remove photo"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-900 text-white flex items-center justify-center transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="Send a photo"
            className="w-10 h-10 flex items-center justify-center text-cream-muted hover:text-blue-600 disabled:opacity-40 rounded-2xl flex-shrink-0 transition-colors"
          >
            <Paperclip size={20} />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)}
            placeholder={pendingImage ? 'Add a caption (optional)...' : 'Type a message...'}
            rows={1}
            className="flex-1 bg-white border border-slate-100 shadow-[0_1px_4px_rgba(15,23,42,0.06)] rounded-2xl px-4 py-2 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-none transition-colors max-h-[120px] overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && !pendingImage)}
            className="w-10 h-10 flex items-center justify-center bg-ember hover:bg-ember-dark disabled:opacity-40 rounded-2xl text-white flex-shrink-0 transition-colors"
          >
            <SendIcon size={16} />
          </button>
          </div>
        </div>
      )}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
        >
          <img src={lightboxUrl} alt="Photo shared in chat" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
      {conversation.is_resolved && (
        <p className="text-center text-cream-muted text-xs px-4 py-3">
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
