import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Conversation, Profile, getConversationsForUser } from '../services/dataService'
import ChatWindow from '../components/student/ChatWindow'
import BottomNav from '../components/common/BottomNav'

type FullConversation = Conversation & {
  buyer: Profile
  seller: Profile
  listing: { id: string; title: string; image_urls: string[]; price: number }
}

export default function ChatPage() {
  const navigate = useNavigate()
  const { convId } = useParams<{ convId?: string }>()
  const { currentUser } = useApp()
  const [conversations, setConversations] = useState<FullConversation[]>([])
  const [active, setActive] = useState<FullConversation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) { navigate('/student'); return }
    getConversationsForUser(currentUser.id).then(data => {
      const full = data as FullConversation[]
      setConversations(full)
      if (convId) {
        const found = full.find(c => c.id === convId)
        setActive(found || full[0] || null)
      } else if (full.length > 0) {
        setActive(full[0])
      }
      setLoading(false)
    })
  }, [currentUser, navigate, convId])

  if (loading) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted">Loading...</p>
    </div>
  )

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <>
      <div className="min-h-screen bg-slate-deep flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3 flex-shrink-0">
          {active && isMobile ? (
            <button onClick={() => setActive(null)} className="text-cream-muted hover:text-cream">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream">
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="text-cream font-bold">
            {active && isMobile ? 'Chat' : 'Messages'}
          </span>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 3.5rem - 4rem)' }}>
          {/* Conversation list — hidden on mobile when a convo is open */}
          <div className={`w-full md:w-80 border-r border-slate-border flex-shrink-0 overflow-y-auto ${active && isMobile ? 'hidden' : 'block'} md:block`}>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                <p className="text-cream-muted text-sm">No conversations yet.</p>
                <p className="text-cream-muted text-xs mt-1">
                  Express interest in a listing to start a chat.
                </p>
              </div>
            ) : (
              conversations.map(conv => {
                const other = currentUser?.id === conv.buyer_id ? conv.seller : conv.buyer
                const isActive = active?.id === conv.id
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActive(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-border text-left transition-colors ${
                      isActive ? 'bg-teal-faint' : 'hover:bg-slate-card'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: other?.avatar_color || '#1A5F7A' }}
                    >
                      {other?.avatar_initials || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-cream font-bold text-sm truncate">{other?.full_name || 'Unknown'}</p>
                      <p className="text-cream-muted text-xs truncate">{conv.listing?.title}</p>
                    </div>
                    {conv.is_resolved && (
                      <span className="text-teal-light text-[10px] border border-teal-primary px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Done
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Chat window */}
          <div className={`flex-1 overflow-hidden ${!active && isMobile ? 'hidden' : 'flex flex-col'} md:flex md:flex-col`}>
            {active ? (
              <ChatWindow
                conversation={active}
                onResolved={() => {
                  setConversations(prev =>
                    prev.map(c => c.id === active.id ? { ...c, is_resolved: true } : c)
                  )
                  setActive(prev => prev ? { ...prev, is_resolved: true } : prev)
                }}
              />
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center">
                <p className="text-cream-muted text-sm">Select a conversation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
