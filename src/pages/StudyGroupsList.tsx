// src/pages/StudyGroupsList.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Copy, Check, X, Link2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  StudyGroup, StudyGroupWithActivity,
  getStudyGroupsForUserWithActivity, createStudyGroup, joinStudyGroup,
} from '../services/dataService'
import { supabase } from '../services/supabaseClient'
import BottomNav from '../components/common/BottomNav'
import LegalFooter from '../components/common/LegalFooter'
import GroupAvatarImage from '../components/common/GroupAvatarImage'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Accepts the full invite link (…#/student?join=<id>, wherever the id
// falls in the pasted text) or just the bare id on its own.
function extractGroupId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fromLink = trimmed.match(/[?&]join=([^&\s]+)/)
  if (fromLink) return decodeURIComponent(fromLink[1])
  if (/^[0-9a-f-]{20,}$/i.test(trimmed)) return trimmed
  return null
}

export default function StudyGroupsList() {
  const navigate = useNavigate()
  const { currentUser, isLoadingAuth, showToast } = useApp()
  const [groups, setGroups] = useState<StudyGroupWithActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newGroup, setNewGroup] = useState<StudyGroup | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [joining, setJoining] = useState(false)

  const load = () => {
    if (!currentUser) return
    getStudyGroupsForUserWithActivity(currentUser.id).then(g => {
      setGroups(g)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { navigate('/student'); return }
    load()
  }, [currentUser, isLoadingAuth])

  // Same idea as ChatPage's conversation-list subscription: no filter on
  // the channel (RLS already limits delivery to messages in groups this
  // user belongs to), bump the sender's group to the top and increment
  // its unread count unless the message is the user's own.
  useEffect(() => {
    if (!currentUser) return
    const channel = supabase
      .channel(`study-groups-list:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'study_group_messages' },
        payload => {
          const msg = payload.new as { group_id: string; sender_id: string; content: string | null; image_url: string | null; sent_at: string }
          const isMine = msg.sender_id === currentUser.id
          setGroups(prev => {
            const idx = prev.findIndex(g => g.id === msg.group_id)
            if (idx === -1) return prev
            const updated = [...prev]
            updated[idx] = {
              ...updated[idx],
              last_message: { ...updated[idx].last_message, ...msg } as any,
              unread_count: isMine ? updated[idx].unread_count : (updated[idx].unread_count || 0) + 1,
            }
            return updated.sort((a, b) => {
              const aTime = new Date(a.last_message?.sent_at ?? a.created_at).getTime()
              const bTime = new Date(b.last_message?.sent_at ?? b.created_at).getTime()
              return bTime - aTime
            })
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

  const handleCreated = (group: StudyGroup) => {
    setShowCreate(false)
    setNewGroup(group)
    setCopied(false)
    load()
  }

  const handleJoinByLink = async () => {
    if (!currentUser) return
    const groupId = extractGroupId(joinInput)
    if (!groupId) { showToast("That doesn't look like a group link.", 'error'); return }
    setJoining(true)
    const { error } = await joinStudyGroup(groupId, currentUser.id)
    setJoining(false)
    if (error) { showToast("Couldn't find that group — check the link and try again.", 'error'); return }
    setJoinInput('')
    navigate(`/group/${groupId}`)
  }

  const inviteLink = (groupId: string) => `${window.location.origin}/#/student?join=${groupId}`

  const handleCopy = (groupId: string) => {
    navigator.clipboard.writeText(inviteLink(groupId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoadingAuth || loading) {
    return (
      <div className="min-h-screen bg-slate-deep flex items-center justify-center">
        <p className="text-cream-muted text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep pb-16">
        <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3">
          <button onClick={() => navigate('/space')} className="text-cream-muted hover:text-cream">
            <ArrowLeft size={20} />
          </button>
          <span className="text-cream font-bold flex-1">Study Groups</span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-gold hover:bg-gold-muted text-slate-deep font-bold text-xs px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={14} /> New
          </button>
        </div>

        <div className="px-4 pt-4 pb-1">
          <p className="text-cream-muted text-xs font-bold mb-1.5">Have an invite link?</p>
          <div className="flex gap-2">
            <input
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleJoinByLink() }}
              placeholder="Paste a group invite link"
              className="flex-1 min-w-0 bg-slate-card border border-slate-border rounded-xl px-3 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
            />
            <button
              onClick={handleJoinByLink}
              disabled={joining || !joinInput.trim()}
              className="flex-shrink-0 flex items-center gap-1.5 bg-teal-primary hover:opacity-90 disabled:opacity-40 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-opacity"
            >
              <Link2 size={15} />
              {joining ? 'Joining…' : 'Join'}
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <p className="text-cream-muted text-sm">No study groups yet.</p>
            <p className="text-cream-muted text-xs mt-1">Create one and invite your study buddies.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {groups.map(g => {
              const unread = g.unread_count || 0
              const lastMsg = g.last_message
              const preview = lastMsg
                ? lastMsg.image_url
                  ? `${lastMsg.sender_id === currentUser?.id ? 'You: ' : ''}📷 Photo`
                  : `${lastMsg.sender_id === currentUser?.id ? 'You: ' : ''}${
                      (lastMsg.content || '').length > 40 ? lastMsg.content!.slice(0, 40) + '...' : lastMsg.content
                    }`
                : (g.study_weekdays && g.study_weekdays.length > 0 && g.study_hour !== null && g.study_minute !== null
                    ? `Studies ${g.study_weekdays.map(d => DAYS[d].slice(0, 3)).join(', ')} at ${String(g.study_hour).padStart(2, '0')}:${String(g.study_minute).padStart(2, '0')}`
                    : 'No messages yet')

              return (
                <div
                  key={g.id}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-border hover:bg-slate-card transition-colors"
                >
                  <button
                    onClick={() => navigate(`/group/${g.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <GroupAvatarImage path={g.avatar_url} size={44} />
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-deep">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-cream font-bold text-sm truncate">{g.name}</p>
                      <p className="text-cream-muted text-xs truncate">{preview}</p>
                    </div>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(inviteLink(g.id))
                      showToast('Invite link copied.', 'success')
                    }}
                    aria-label="Copy group invite link"
                    className="flex-shrink-0 text-cream-muted hover:text-cream transition-colors p-1"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <LegalFooter />
      </div>
      <BottomNav />

      {showCreate && currentUser && (
        <CreateGroupModal userId={currentUser.id} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {newGroup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-xl text-cream">Group created</h2>
              <button onClick={() => setNewGroup(null)} className="text-cream-muted hover:text-cream">
                <X size={18} />
              </button>
            </div>
            <p className="text-cream-muted text-sm mb-4">
              Share this link with your study buddies — opening it takes them to sign in, then straight into <span className="text-cream">{newGroup.name}</span>.
            </p>
            <button
              onClick={() => handleCopy(newGroup.id)}
              className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-muted text-slate-deep font-bold py-3 rounded-xl transition-colors"
            >
              {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy invite link</>}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Moved here from MySpace's Pomodoro tab, unchanged — name + optional
// recurring study slot (weekdays + one shared time), the fallback source
// for notifications until a group builds out its Timetable tab.
function CreateGroupModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: (g: StudyGroup) => void }) {
  const { showToast } = useApp()
  const [name, setName] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleDay = (day: number) => {
    setWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort())
  }

  const handleSubmit = async () => {
    if (!name.trim()) { showToast('Give your group a name.', 'error'); return }
    if (weekdays.length > 0 && !time) { showToast('Pick a time for the days you selected.', 'error'); return }
    if (time && weekdays.length === 0) { showToast('Pick at least one day for that time.', 'error'); return }
    setLoading(true)
    const [hour, minute] = time ? time.split(':').map(Number) : [null, null]
    const { group, error } = await createStudyGroup(
      userId, name,
      weekdays.length > 0 ? weekdays : null, hour, minute
    )
    setLoading(false)
    if (error || !group) { showToast(error || 'Could not create group.', 'error'); return }
    onCreated(group)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-cream">New study group</h2>
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-cream text-xs font-bold block mb-1.5">Group name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Stats 201 Study Squad"
              className="w-full bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          </div>
          <div>
            <label className="text-cream text-xs font-bold block mb-1.5">Which days do you study? (optional)</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    weekdays.includes(i)
                      ? 'bg-ember text-white'
                      : 'bg-slate-card border border-slate-border text-cream-muted'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-cream text-xs font-bold block mb-1.5">What time? (optional)</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-sm text-cream focus:outline-none focus:border-teal-light" />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors mt-5"
        >
          {loading ? 'Creating...' : 'Create group'}
        </button>
      </div>
    </div>
  )
}
