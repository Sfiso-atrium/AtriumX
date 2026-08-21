// src/pages/StudyGroupChat.tsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  StudyGroup, StudyGroupMember, StudyGroupMessage,
  getStudyGroup, getStudyGroupMembers, getStudyGroupMessages, sendStudyGroupMessage,
} from '../services/dataService'
import { supabase } from '../services/supabaseClient'
import BottomNav from '../components/common/BottomNav'

export default function StudyGroupChat() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [members, setMembers] = useState<StudyGroupMember[]>([])
  const [messages, setMessages] = useState<StudyGroupMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!groupId || !currentUser) return
    setLoading(true)
    Promise.all([
      getStudyGroup(groupId),
      getStudyGroupMembers(groupId),
      getStudyGroupMessages(groupId),
    ]).then(([g, m, msgs]) => {
      setGroup(g)
      setMembers(m)
      setMessages(msgs)
      setLoading(false)
    })
  }, [groupId, currentUser])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime inserts only carry raw columns, not the joined sender profile —
  // so new messages are matched against the members list already in state
  // to fill in name/avatar, same idea as ChatWindow's live message handling.
  useEffect(() => {
    if (!groupId) return
    const channel = supabase
      .channel(`study-group:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'study_group_messages', filter: `group_id=eq.${groupId}` },
        payload => {
          const raw = payload.new as StudyGroupMessage
          setMessages(prev => {
            if (prev.find(m => m.id === raw.id)) return prev
            const sender = members.find(mem => mem.user_id === raw.sender_id)?.profile
            return [...prev, { ...raw, sender }]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, members])

  const handleSend = async () => {
    if (!text.trim() || !currentUser || !groupId) return
    setSending(true)
    const { error } = await sendStudyGroupMessage(groupId, currentUser.id, text)
    setSending(false)
    if (!error) setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-deep flex items-center justify-center">
        <p className="text-cream-muted text-sm">Loading...</p>
      </div>
    )
  }

  // RLS returns null for groups the user isn't a member of — same
  // treatment for a bad/expired invite link.
  if (!group) {
    return (
      <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-cream font-bold">Group not found</p>
        <p className="text-cream-muted text-sm">
          This group doesn't exist, or you're not a member of it.
        </p>
        <button onClick={() => navigate('/space')} className="text-teal-light text-sm font-bold mt-2">
          Back to My Space
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-deep">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-slate-border bg-slate-deep flex-shrink-0 gap-3">
        <button onClick={() => navigate('/space')} className="text-cream-muted hover:text-cream flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-full bg-teal-faint flex items-center justify-center flex-shrink-0">
          <Users size={16} className="text-teal-light" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-cream font-bold text-sm truncate">{group.name}</p>
          <p className="text-cream-muted text-xs">{members.length} member{members.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-cream-muted text-xs text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUser?.id
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <p className="text-cream-muted text-[11px] font-bold px-1 mb-0.5">
                    {msg.sender?.full_name ?? 'Study buddy'}
                  </p>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-ember text-white rounded-br-sm'
                      : 'bg-slate-card border border-slate-border text-cream rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — text only for now; image sharing comes in a later stack */}
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
          className="bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold px-4 rounded-xl text-sm transition-colors flex-shrink-0"
        >
          Send
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
