// src/components/common/GroupPomodoroPanel.tsx
import { useState, useEffect, useRef } from 'react'
import { X, Play, Square } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  StudyGroupPomodoroSession,
  getLatestStudyGroupPomodoroSession, startStudyGroupPomodoroSession, endStudyGroupPomodoroSession,
  isStudyGroupPomodoroActive, studyGroupPomodoroRemainingSeconds,
  getTodayStudyMinutes, getYesterdayStudyMinutes,
} from '../../services/dataService'

const FOCUS_PRESETS = [15, 25, 45, 60]

export default function GroupPomodoroPanel({
  groupId, session, onClose, onSessionChange,
}: {
  groupId: string
  session: StudyGroupPomodoroSession | null
  onClose: () => void
  onSessionChange: (s: StudyGroupPomodoroSession | null) => void
}) {
  const { currentUser, showToast } = useApp()
  const [duration, setDuration] = useState(() => {
    const saved = Number(localStorage.getItem(`group_pomodoro_focus_${groupId}`))
    return saved > 0 ? saved : 25
  })
  const [starting, setStarting] = useState(false)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [yesterdayMinutes, setYesterdayMinutes] = useState(0)
  const [, forceTick] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const active = isStudyGroupPomodoroActive(session)

  useEffect(() => {
    if (!currentUser) return
    getTodayStudyMinutes(currentUser.id).then(setTodayMinutes)
    getYesterdayStudyMinutes(currentUser.id).then(setYesterdayMinutes)
  }, [currentUser])

  const handleSetDuration = (m: number) => {
    setDuration(m)
    localStorage.setItem(`group_pomodoro_focus_${groupId}`, String(m))
  }

  // Ticks the display once a second while a session is active. The source
  // of truth is always the wall-clock math in dataService — this interval
  // only exists to trigger a re-render, so if the tab was backgrounded and
  // this fired late or not at all, the very next tick (or the
  // visibilitychange handler below) immediately shows the correct time,
  // no drift.
  useEffect(() => {
    if (!active) return
    tickRef.current = setInterval(() => forceTick(t => t + 1), 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [active])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') forceTick(t => t + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // In case this panel is opened stale (e.g. a while after the parent
  // chat last synced) — refresh once against the DB on open.
  useEffect(() => {
    getLatestStudyGroupPomodoroSession(groupId).then(onSessionChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const handleStart = async () => {
    if (!currentUser) return
    setStarting(true)
    const { session: newSession, error } = await startStudyGroupPomodoroSession(groupId, currentUser.id, duration)
    setStarting(false)
    if (error || !newSession) { showToast(error || 'Could not start session.', 'error'); return }
    onSessionChange(newSession)
  }

  const handleStop = async () => {
    if (!session) return
    await endStudyGroupPomodoroSession(session.id)
    onSessionChange({ ...session, ended_at: new Date().toISOString() })
  }

  const secs = active && session ? studyGroupPomodoroRemainingSeconds(session) : duration * 60
  const mins = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-[200] bg-slate-deep flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-border flex-shrink-0">
        <h2 className="font-serif text-lg text-cream">Group Pomodoro</h2>
        <button onClick={onClose} className="text-cream-muted hover:text-cream">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center gap-6">
        <div className="bg-slate-card border border-slate-border rounded-2xl w-full p-6 flex flex-col items-center">
          <p className="text-cream font-serif text-5xl font-bold mb-2">{mins}:{ss}</p>
          {active ? (
            <p className="text-teal-light text-xs font-bold">Everyone in the group sees this timer right now</p>
          ) : (
            <p className="text-cream-muted text-xs">No session running</p>
          )}
        </div>

        <div className="bg-slate-card border border-slate-border rounded-2xl w-full p-4">
          <p className="text-cream-muted text-xs mb-1">Your studied minutes today</p>
          <p className="text-teal-light text-xl font-serif font-bold">{todayMinutes} min</p>
          <div className="mt-2 pt-2 border-t border-slate-border">
            <p className="text-cream-muted text-xs mb-1">Studied yesterday</p>
            <p className="text-cream text-sm font-bold">{yesterdayMinutes} min</p>
          </div>
        </div>

        {active ? (
          <button
            onClick={handleStop}
            className="bg-slate-deep border border-red-400/40 text-red-400 font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors"
          >
            <Square size={16} /> Stop for everyone
          </button>
        ) : (
          <>
            <div className="w-full">
              <p className="text-cream-muted text-xs mb-2">Focus length</p>
              <div className="flex flex-wrap gap-2 items-center">
                {FOCUS_PRESETS.map(m => (
                  <button
                    key={m}
                    onClick={() => handleSetDuration(m)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors ${
                      duration === m ? 'bg-teal-primary text-white border-teal-light' : 'bg-slate-deep text-cream-muted border-slate-border'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={duration}
                  onChange={e => handleSetDuration(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                  className="w-20 bg-slate-deep border border-slate-border rounded-xl px-3 py-1.5 text-sm text-cream focus:outline-none focus:border-teal-light"
                />
              </div>
            </div>
            <button
              onClick={handleStart}
              disabled={starting}
              className="bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              <Play size={16} /> Start for the group
            </button>
          </>
        )}
      </div>
    </div>
  )
}
