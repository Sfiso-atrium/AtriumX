// src/hooks/useFocusSession.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { addStudyMinutes, addStudySession, getTodayStudySessions } from '../services/dataService'

export type FocusPhase = 'idle' | 'study' | 'break' | 'done'

const KEYS = {
  focusMinutes: 'pomodoro_focus_minutes',
  breakMinutes: 'pomodoro_break_minutes',
  phase: 'pomodoro_phase',
  startedAt: 'pomodoro_started_at',
  accumulatedSeconds: 'pomodoro_accumulated_seconds',
  creditedSeconds: 'pomodoro_credited_seconds',
}

function readNum(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  const n = Number(raw)
  return raw !== null && !Number.isNaN(n) ? n : fallback
}

function readPhase(): FocusPhase {
  const raw = localStorage.getItem(KEYS.phase)
  return raw === 'study' || raw === 'break' || raw === 'done' ? raw : 'idle'
}

// One shared, wall-clock-based focus session — used by both the Pomodoro
// widget on My Space and the full-screen Focus Mode page, off the same
// localStorage keys, so they're always showing the same clock instead of
// two independent ones.
//
// Study minutes are credited to Supabase progressively: every time this
// hook gets a chance to check (each running tick, on tab refocus, on
// mount, on pause, on reset), it banks whichever whole minutes of STUDY
// time have newly elapsed via the existing addStudyMinutes/study_log
// logic. That means time studied is recorded as it happens, not just on
// full completion — closing the tab mid-session doesn't lose it. Break
// time is never credited: the credit check is gated on phase === 'study'.
export function useFocusSession(userId: string) {
  const [focusMinutes, setFocusMinutesState] = useState(() => readNum(KEYS.focusMinutes, 25))
  const [breakMinutes, setBreakMinutesState] = useState(() => readNum(KEYS.breakMinutes, 5))
  const [phase, setPhaseState] = useState<FocusPhase>(readPhase)
  const [startedAt, setStartedAtState] = useState<number | null>(() => {
    const raw = localStorage.getItem(KEYS.startedAt)
    return raw ? Number(raw) : null
  })
  const [accumulatedSeconds, setAccumulatedSecondsState] = useState(() => readNum(KEYS.accumulatedSeconds, 0))
  const [, forceTick] = useState(0)
  const creditedSecondsRef = useRef(readNum(KEYS.creditedSeconds, 0))
  const completedRef = useRef(false)

  // Sessions completed today — a real, ever-increasing count fetched from
  // (and credited to) the same study_log row as minutes, so it survives
  // refreshes and stays in sync across the Pomodoro widget and Focus Mode.
  const [sessionsToday, setSessionsToday] = useState(0)
  useEffect(() => {
    if (!userId) return
    getTodayStudySessions(userId).then(setSessionsToday)
  }, [userId])

  const running = startedAt !== null
  const totalSeconds = (phase === 'break' ? breakMinutes : focusMinutes) * 60
  const elapsedSeconds = accumulatedSeconds + (running ? Math.floor((Date.now() - startedAt!) / 1000) : 0)
  const secondsLeft = Math.max(0, totalSeconds - elapsedSeconds)

  const persistPhase = (p: FocusPhase) => { localStorage.setItem(KEYS.phase, p); setPhaseState(p) }
  const persistStartedAt = (v: number | null) => {
    if (v === null) localStorage.removeItem(KEYS.startedAt)
    else localStorage.setItem(KEYS.startedAt, String(v))
    setStartedAtState(v)
  }
  const persistAccumulated = (v: number) => {
    localStorage.setItem(KEYS.accumulatedSeconds, String(v))
    setAccumulatedSecondsState(v)
  }
  const persistCredited = (v: number) => {
    localStorage.setItem(KEYS.creditedSeconds, String(v))
    creditedSecondsRef.current = v
  }

  // Bank whichever whole minutes of STUDY time are newly elapsed since we
  // last credited Supabase. Cheap to call often — it's a no-op unless a
  // new whole minute has actually passed. Never runs during a break.
  const creditElapsedMinutes = useCallback(async (elapsedStudySeconds: number, currentPhase: FocusPhase) => {
    if (!userId || currentPhase !== 'study') return
    const wholeMinutesElapsed = Math.floor(elapsedStudySeconds / 60)
    const wholeMinutesCredited = Math.floor(creditedSecondsRef.current / 60)
    const delta = wholeMinutesElapsed - wholeMinutesCredited
    if (delta > 0) {
      persistCredited(wholeMinutesElapsed * 60)
      await addStudyMinutes(userId, delta)
    }
  }, [userId])

  // Tick every second while running.
  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => forceTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [running])

  // Re-check on tab refocus — covers a backgrounded/throttled tab where
  // the interval above was suspended by the browser.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') forceTick(t => t + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Runs on every tick (including the first, on mount) — this is what
  // catches up on study time that elapsed while nothing was mounted at
  // all, e.g. the tab was closed and reopened later.
  useEffect(() => {
    creditElapsedMinutes(elapsedSeconds, phase)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, phase])

  // Phase completion: study -> break -> done.
  useEffect(() => {
    if (running && secondsLeft <= 0 && !completedRef.current) {
      completedRef.current = true
      if (phase === 'study') {
        creditElapsedMinutes(elapsedSeconds, phase).then(() => {
          persistAccumulated(0)
          persistCredited(0)
          persistPhase('break')
          persistStartedAt(Date.now())
          completedRef.current = false
        })
        if (userId) addStudySession(userId).then(setSessionsToday)
      } else if (phase === 'break') {
        persistAccumulated(0)
        persistStartedAt(null)
        persistPhase('done')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, secondsLeft, phase])

  const start = (studyMins?: number, breakMins?: number) => {
    if (studyMins) { localStorage.setItem(KEYS.focusMinutes, String(studyMins)); setFocusMinutesState(studyMins) }
    if (breakMins) { localStorage.setItem(KEYS.breakMinutes, String(breakMins)); setBreakMinutesState(breakMins) }
    completedRef.current = false
    persistAccumulated(0)
    persistCredited(0)
    persistPhase('study')
    persistStartedAt(Date.now())
  }

  const toggle = () => {
    if (running) {
      const segment = Math.floor((Date.now() - startedAt!) / 1000)
      const newAccumulated = Math.min(totalSeconds, accumulatedSeconds + segment)
      creditElapsedMinutes(newAccumulated, phase)
      persistAccumulated(newAccumulated)
      persistStartedAt(null)
    } else {
      completedRef.current = false
      persistStartedAt(Date.now())
    }
  }

  const reset = () => {
    creditElapsedMinutes(elapsedSeconds, phase)
    persistAccumulated(0)
    persistCredited(0)
    persistStartedAt(null)
    persistPhase('idle')
    completedRef.current = false
  }

  const setFocusMinutes = (m: number) => {
    localStorage.setItem(KEYS.focusMinutes, String(m))
    setFocusMinutesState(m)
    if (phase !== 'study') { persistAccumulated(0); persistCredited(0) }
  }

  const setBreakMinutes = (m: number) => {
    localStorage.setItem(KEYS.breakMinutes, String(m))
    setBreakMinutesState(m)
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return {
    phase, running, focusMinutes, breakMinutes, secondsLeft, mins, secs, totalSeconds, sessionsToday,
    start, toggle, reset, setFocusMinutes, setBreakMinutes,
  }
}
