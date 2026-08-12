import { useState } from 'react'
import { Flag, MessageSquare, Ban, ShieldOff, XCircle } from 'lucide-react'
import { ChatReport, Message, getConversationMessages, setUserBlocked, endConversationByAdmin } from '../../services/dataService'

interface Props {
  report: ChatReport
  onEnded: (conversationId: string) => void
}

export default function ChatReportCard({ report, onEnded }: Props) {
  const conv = report.conversation
  const buyer = conv?.buyer
  const seller = conv?.seller

  const [buyerBlocked, setBuyerBlocked] = useState(!!buyer?.is_blocked)
  const [sellerBlocked, setSellerBlocked] = useState(!!seller?.is_blocked)
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<Message[] | null>(null)
  const [loadingChat, setLoadingChat] = useState(false)

  const handleToggleBlock = async (userId: string, currentlyBlocked: boolean, isBuyer: boolean) => {
    setBusyAccountId(userId)
    const { error } = await setUserBlocked(userId, !currentlyBlocked)
    setBusyAccountId(null)
    if (error) return
    if (isBuyer) setBuyerBlocked(!currentlyBlocked)
    else setSellerBlocked(!currentlyBlocked)
  }

  const handleReadChat = async () => {
    if (!conv) return
    setShowChat(prev => !prev)
    if (chatMessages === null) {
      setLoadingChat(true)
      const msgs = await getConversationMessages(conv.id)
      setChatMessages(msgs)
      setLoadingChat(false)
    }
  }

  const handleEndChat = async () => {
    if (!conv) return
    setEnding(true)
    const { error } = await endConversationByAdmin(conv.id)
    setEnding(false)
    if (!error) onEnded(conv.id)
  }

  if (!conv) return null

  return (
    <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-cream font-bold text-sm">{conv.listing?.title || 'Listing'}</p>
          <p className="text-cream-muted text-xs mt-0.5">
            Reported {new Date(report.created_at).toLocaleString()} by {report.reporter?.full_name || 'Unknown user'}
          </p>
        </div>
        {conv.is_closed_by_admin && (
          <span className="text-xs text-red-400 border border-red-500/40 px-2 py-1 rounded-xl flex-shrink-0">
            Chat Ended
          </span>
        )}
      </div>

      <p className="text-cream-muted text-xs mt-1 pl-2 border-l-2 border-red-500/40 mb-4">
        "{report.reason}"
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Buyer', profile: buyer, blocked: buyerBlocked, isBuyer: true },
          { label: 'Seller', profile: seller, blocked: sellerBlocked, isBuyer: false },
        ].map(({ label, profile, blocked, isBuyer }) => (
          profile && (
            <div key={profile.id} className="bg-slate-deep border border-slate-border rounded-xl p-3">
              <p className="text-cream-muted text-[10px] uppercase tracking-wide">{label}</p>
              <p className="text-cream text-sm font-bold truncate">{profile.full_name}</p>
              <p className="text-cream-muted text-xs truncate mb-2">{profile.email}</p>
              <button
                onClick={() => handleToggleBlock(profile.id, blocked, isBuyer)}
                disabled={busyAccountId === profile.id}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40 ${
                  blocked
                    ? 'border border-teal-primary text-teal-light hover:bg-teal-faint'
                    : 'border border-red-500 text-red-400 hover:bg-red-500/10'
                }`}
              >
                {blocked ? <ShieldOff size={13} /> : <Ban size={13} />}
                {blocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          )
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleReadChat}
          className="flex items-center gap-1.5 bg-teal-primary hover:bg-teal-light text-cream text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          <MessageSquare size={13} />
          {showChat ? 'Hide Chat' : 'Read Chat'}
        </button>
        {!conv.is_closed_by_admin && (
          <button
            onClick={handleEndChat}
            disabled={ending}
            className="flex items-center gap-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 disabled:opacity-40 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            <XCircle size={13} />
            {ending ? 'Ending...' : 'End Chat'}
          </button>
        )}
      </div>

      {showChat && (
        <div className="mt-3 max-h-64 overflow-y-auto bg-slate-deep border border-slate-border rounded-xl p-3 flex flex-col gap-2">
          {loadingChat && <p className="text-cream-muted text-xs">Loading...</p>}
          {!loadingChat && chatMessages?.length === 0 && (
            <p className="text-cream-muted text-xs">No messages in this conversation.</p>
          )}
          {!loadingChat && chatMessages?.map(msg => {
            const senderName = msg.sender_id === buyer?.id ? buyer?.full_name : seller?.full_name
            return (
              <div key={msg.id} className="text-xs">
                <span className="text-cream-muted">{senderName || 'Unknown'} · {new Date(msg.sent_at).toLocaleString()}</span>
                <p className="text-cream">{msg.content}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
