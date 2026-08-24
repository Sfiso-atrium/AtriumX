// src/pages/StudyGroupChat.tsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, MoreVertical, Image as ImageIcon, Camera, CalendarClock, Clock, BookOpen, Timer, Send, Settings } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  StudyGroup, StudyGroupMember, StudyGroupMessage,
  getStudyGroup, getStudyGroupMembers, getStudyGroupMessages,
  sendStudyGroupMessage, sendStudyGroupImage,
  StudyGroupPomodoroSession, getLatestStudyGroupPomodoroSession,
  isStudyGroupPomodoroActive, studyGroupPomodoroRemainingSeconds,
} from '../services/dataService'
import { supabase } from '../services/supabaseClient'
import GroupSpacePanel from '../components/common/GroupSpacePanel'
import GroupChatImage from '../components/common/GroupChatImage'
import GroupAvatarImage from '../components/common/GroupAvatarImage'
import EditGroupModal from '../components/common/EditGroupModal'
import GroupPomodoroPanel from '../components/common/GroupPomodoroPanel'

type SpaceTab = 'Deadlines' | 'Schedule' | 'Timetable'


export default function StudyGroupChat() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { currentUser, showToast } = useApp()

  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [members, setMembers] = useState<StudyGroupMember[]>([])
  const [messages, setMessages] = useState<StudyGroupMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [spaceTab, setSpaceTab] = useState<SpaceTab | null>(null)
  const [showPomodoroPanel, setShowPomodoroPanel] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [activeSession, setActiveSession] = useState<StudyGroupPomodoroSession | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [, forceHeaderTick] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sessionActive = isStudyGroupPomodoroActive(activeSession)

  useEffect(() => {
    if (!sessionActive) return
    tickRef.current = setInterval(() => forceHeaderTick(t => t + 1), 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [sessionActive])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') forceHeaderTick(t => t + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!groupId || !currentUser) return
    setLoading(true)
    Promise.all([
      getStudyGroup(groupId),
      getStudyGroupMembers(groupId),
      getStudyGroupMessages(groupId),
      getLatestStudyGroupPomodoroSession(groupId),
    ]).then(([g, m, msgs, session]) => {
      setGroup(g)
      setMembers(m)
      setMessages(msgs)
      setActiveSession(session)
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'study_group_pomodoro_sessions', filter: `group_id=eq.${groupId}` },
        payload => setActiveSession(payload.new as StudyGroupPomodoroSession)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'study_group_pomodoro_sessions', filter: `group_id=eq.${groupId}` },
        payload => {
          const raw = payload.new as StudyGroupPomodoroSession
          setActiveSession(prev => (prev?.id === raw.id ? raw : prev))
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

  const handleImagePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !currentUser || !groupId) return
    setUploadingImage(true)
    const { error } = await sendStudyGroupImage(groupId, currentUser.id, file)
    setUploadingImage(false)
    if (error) showToast(error, 'error')
  }


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Grows the textarea with its content (up to a cap, then it scrolls
  // internally) so a longer message is actually visible while typing,
  // instead of staying pinned to a single line. This is the piece that
  // was missing — the ref and CSS classes were already there, but nothing
  // was actually resizing the box.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

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
    <div className="h-[100dvh] bg-slate-deep flex flex-col overflow-hidden">

      {/* Header */}
      <div className="relative flex items-center px-4 py-3 border-b border-slate-border bg-slate-deep flex-shrink-0 gap-3">
        <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <GroupAvatarImage path={group.avatar_url} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-cream font-bold text-sm truncate">{group.name}</p>
          <p className="text-cream-muted text-xs">{members.length} member{members.length === 1 ? '' : 's'}</p>
        </div>

        {sessionActive && activeSession && (
          <button
            onClick={() => setShowPomodoroPanel(true)}
            className="flex-shrink-0 bg-ember/15 border border-ember/40 text-ember font-bold text-[11px] sm:text-xs px-2 sm:px-3 py-1 rounded-full flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
          >
            <Timer size={11} className="sm:hidden" />
            <Timer size={12} className="hidden sm:block" />
            {(() => {
              const s = studyGroupPomodoroRemainingSeconds(activeSession)
              return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
            })()}
          </button>
        )}

        <div className="relative flex-shrink-0">
          <button onClick={() => setMenuOpen(o => !o)} className="text-cream-muted hover:text-cream">
            <MoreVertical size={20} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[190]" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-[195] bg-slate-card border border-slate-border rounded-2xl py-2 w-48 shadow-lg">
                {[
                  ...(group.created_by === currentUser?.id
                    ? [{ label: 'Edit Group', icon: Settings, action: () => setShowEditGroup(true) }]
                    : []),
                  { label: 'Group Deadlines', icon: CalendarClock, action: () => setSpaceTab('Deadlines') },
                  { label: 'Group Schedule', icon: Clock, action: () => setSpaceTab('Schedule') },
                  { label: 'Group Timetable', icon: BookOpen, action: () => setSpaceTab('Timetable') },
                  { label: 'Group Pomodoro', icon: Timer, action: () => setShowPomodoroPanel(true) },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-cream hover:bg-slate-deep transition-colors text-left"
                  >
                    <item.icon size={15} className="text-cream-muted flex-shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
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
                {msg.image_url ? (
                  <GroupChatImage path={msg.image_url} />
                ) : (
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isOwn
                        ? 'bg-ember text-white rounded-br-sm'
                        : 'bg-slate-card border border-slate-border text-cream rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-border flex gap-2 flex-shrink-0 items-end">
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleImagePicked} className="hidden" />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImagePicked} className="hidden" />
        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploadingImage}
          title="Attach an image"
          className="text-cream-muted hover:text-cream disabled:opacity-40 flex-shrink-0 pb-2"
        >
          <ImageIcon size={20} />
        </button>
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploadingImage}
          title="Take a photo"
          className="text-cream-muted hover:text-cream disabled:opacity-40 flex-shrink-0 pb-2"
        >
          <Camera size={20} />
        </button>
          <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-none transition-colors max-h-[120px] overflow-y-auto"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="w-10 h-10 flex items-center justify-center bg-ember hover:bg-ember-dark disabled:opacity-40 rounded-xl text-white flex-shrink-0 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>

      {spaceTab && (
        <GroupSpacePanel groupId={groupId!} initialTab={spaceTab} onClose={() => setSpaceTab(null)} />
      )}
      {showPomodoroPanel && (
        <GroupPomodoroPanel
          groupId={groupId!}
          session={activeSession}
          onClose={() => setShowPomodoroPanel(false)}
          onSessionChange={setActiveSession}
        />
      )}
      {showEditGroup && group && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditGroup(false)}
          onSaved={updated => setGroup(updated)}
        />
      )}
    </div>
  )
}
