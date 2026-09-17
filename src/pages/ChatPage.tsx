import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Tag, ShoppingBag, Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Conversation, Message, Profile, getConversationsForUser } from '../services/dataService'
import { supabase } from '../services/supabaseClient'
import ChatWindow from '../components/student/ChatWindow'
import BottomNav from '../components/common/BottomNav'
import LegalFooter from '../components/common/LegalFooter'
import Navbar from '../components/common/Navbar'

type FullConversation = Conversation & {
  buyer: Profile
  seller: Profile
  listing: { id: string; title: string; image_urls: string[]; price: number }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

export default function ChatPage() {
  const navigate = useNavigate()
  const { convId } = useParams<{ convId?: string }>()
  const { currentUser, isLoadingAuth } = useApp()
  const [conversations, setConversations] = useState<FullConversation[]>([])
  const [active, setActive] = useState<FullConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const isMobile = useIsMobile()
  const hideBottomNav = isMobile && !!active

  useEffect(() => {
    if (isLoadingAuth) return
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
  }, [currentUser, isLoadingAuth, navigate, convId])

  const activeRef = useRef<FullConversation | null>(null)
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    if (!currentUser) return
    const channel = supabase
      .channel(`chat-list:${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === msg.conversation_id)
          if (idx === -1) return prev
          const isMine = msg.sender_id === currentUser.id
          const isOpenNow = activeRef.current?.id === msg.conversation_id
          const updated = [...prev]
          updated[idx] = {
            ...updated[idx],
            last_message: msg,
            unread_count: isMine || isOpenNow ? updated[idx].unread_count : (updated[idx].unread_count || 0) + 1,
          }
          return updated.sort((a,b) => {
            const aTime = new Date((a as any).last_message?.sent_at ?? a.created_at).getTime()
            const bTime = new Date((b as any).last_message?.sent_at ?? b.created_at).getTime()
            return bTime - aTime
          })
        })
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

  useEffect(() => {
    if (!active) return
    setConversations(prev => prev.map(c => c.id === active.id ? { ...c, unread_count: 0 } : c))
  }, [active?.id])

  if (isLoadingAuth || loading) return <div className="min-h-screen bg-slate-deep flex items-center justify-center"><p className="text-cream-muted">Loading...</p></div>

  const filteredConvs = conversations.filter(conv => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const other = currentUser?.id === conv.buyer_id ? conv.seller : conv.buyer
    return (other?.full_name?.toLowerCase().includes(q) || conv.listing?.title.toLowerCase().includes(q) || conv.last_message?.content.toLowerCase().includes(q))
  })

  return (
    <>
      <div className={hideBottomNav ? 'h-[100dvh] bg-slate-deep flex flex-col overflow-hidden' : 'h-[100dvh] pb-16 bg-slate-deep flex flex-col overflow-hidden md:ml-64'}>
        <Navbar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className={`w-full md:w-80 border-r border-slate-border flex-shrink-0 flex flex-col bg-slate-deep ${active && isMobile ? 'hidden' : 'flex'} md:flex`}>
            <div className="p-4 border-b border-slate-border flex-shrink-0">
              <h1 className="font-serif text-xl text-cream mb-3">Messages</h1>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." className="w-full bg-slate-card border border-slate-border rounded-xl pl-9 pr-8 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-cream-muted"><X size={14} /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                  <p className="text-cream-muted text-sm">No conversations yet.</p>
                  <p className="text-cream-muted text-xs mt-1">Express interest in a listing to start a chat.</p>
                </div>
              ) : (
                filteredConvs.map(conv => {
                  const other = currentUser?.id === conv.buyer_id ? conv.seller : conv.buyer
                  const isActive = active?.id === conv.id
                  const iAmSeller = currentUser?.id === conv.seller_id
                  const unread = (conv as any).unread_count || 0
                  const lastMsg = (conv as any).last_message
                  const preview = lastMsg ? `${lastMsg.sender_id === currentUser?.id ? 'You: ' : ''}${lastMsg.content.length > 40 ? lastMsg.content.slice(0,40)+'...' : lastMsg.content}` : conv.listing?.title
                  return (
                    <button key={conv.id} onClick={() => setActive(conv)} className={`w-full flex items-center gap-3 px-4 py-3 border-b border-b-slate-border border-l-4 text-left transition-colors ${iAmSeller ? 'border-l-teal-primary' : 'border-l-ember'} ${isActive ? 'bg-teal-faint' : 'hover:bg-slate-card'}`}>
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: other?.avatar_color || '#0D9488' }}>{other?.avatar_initials || '?'}</div>
                        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-deep ${iAmSeller ? 'bg-teal-primary' : 'bg-ember'}`} title={iAmSeller ? 'Your listing' : "You're interested"}>{iAmSeller ? <Tag size={11} className="text-white" /> : <ShoppingBag size={11} className="text-white" />}</span>
                        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-deep">{unread > 9 ? '9+' : unread}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-cream font-bold text-sm truncate">{other?.full_name || 'Unknown'} <span className="text-cream-muted font-normal">({iAmSeller ? 'Buying' : 'Selling'})</span></p>
                        <p className="text-cream-muted text-xs truncate">{preview}</p>
                      </div>
                      {(conv as any).is_resolved && <span className="text-teal-light text-[10px] border border-teal-primary px-1.5 py-0.5 rounded-full flex-shrink-0">Done</span>}
                    </button>
                  )
                })
              )}
              <LegalFooter />
            </div>
          </div>

          <div className={`flex-1 overflow-hidden min-h-0 ${!active && isMobile ? 'hidden' : 'flex flex-col'} md:flex md:flex-col`}>
            {active ? (
              <ChatWindow conversation={active} onResolved={() => {
                setConversations(prev => prev.map(c => c.id === active.id ? { ...c, is_resolved: true } as any : c))
                setActive(prev => prev ? { ...prev, is_resolved: true } as any : prev)
              }} />
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center"><p className="text-cream-muted text-sm">Select a conversation.</p></div>
            )}
          </div>
        </div>
      </div>
      {!hideBottomNav && <BottomNav />}
    </>
  )
}
