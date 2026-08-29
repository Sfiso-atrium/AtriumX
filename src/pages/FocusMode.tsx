// src/pages/FocusMode.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Play, Pause, RotateCcw, Heart, Target, Flame, GraduationCap, Coffee } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useFocusSession } from '../hooks/useFocusSession'
import { getTodayStudyMinutes } from '../services/dataService'

const BREAK_RATIO = 0.2 // suggested break = 20% of study time, editable by the person

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function FocusMode() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [girly, setGirly] = useState(false)

  // Draft values for the setup form — only committed to the shared
  // session (and localStorage) once "Start Focus Session" is pressed.
  const [studyMinutesDraft, setStudyMinutesDraft] = useState(25)
  const [breakMinutesDraft, setBreakMinutesDraft] = useState(5)
  const [breakTouched, setBreakTouched] = useState(false)

  // Whether the person has actively entered the timer view during THIS
  // visit to the page — starts false every mount so that reopening Focus
  // Mode on an already-running session shows the resume prompt first,
  // rather than dropping straight back into the countdown.
  const [enteredTimerView, setEnteredTimerView] = useState(false)

  useEffect(() => {
    if (!breakTouched) {
      setBreakMinutesDraft(Math.max(1, Math.round(studyMinutesDraft * BREAK_RATIO)))
    }
  }, [studyMinutesDraft, breakTouched])

  useEffect(() => {
    if (!currentUser) navigate('/student')
  }, [currentUser, navigate])

  const session = useFocusSession(currentUser?.id ?? '')
  const { phase, running, secondsLeft, focusMinutes, breakMinutes, sessionsToday, start, toggle, reset } = session

  // Minutes focused today — same study_log source the Pomodoro widget on
  // My Space reads, kept fresh the same way: fetched on mount, and
  // re-polled every 15s while a study phase is actively running (study
  // minutes land in Supabase progressively via useFocusSession).
  const [todayMinutes, setTodayMinutes] = useState(0)
  useEffect(() => {
    if (!currentUser) return
    getTodayStudyMinutes(currentUser.id).then(setTodayMinutes)
  }, [currentUser])
  useEffect(() => {
    if (!currentUser || phase !== 'study' || !running) return
    const interval = setInterval(() => { getTodayStudyMinutes(currentUser.id).then(setTodayMinutes) }, 15000)
    return () => clearInterval(interval)
  }, [currentUser, phase, running])
  useEffect(() => {
    if (!currentUser) return
    if (phase === 'break' || phase === 'done') getTodayStudyMinutes(currentUser.id).then(setTodayMinutes)
  }, [currentUser, phase])

  if (!currentUser) return null

  const showResumePrompt = (phase === 'study' || phase === 'break') && !enteredTimerView
  const showSetup = phase === 'idle'
  const showTimer = (phase === 'study' || phase === 'break') && enteredTimerView
  const showDone = phase === 'done'

  const handleStart = () => {
    start(studyMinutesDraft, breakMinutesDraft)
    setEnteredTimerView(true)
  }

  const handleResume = () => setEnteredTimerView(true)

  const handleReset = () => {
    reset()
    setEnteredTimerView(false)
  }

  // Theme tokens — kept local to this screen only, separate from the
  // site-wide black & white mode. Each theme carries its own desk-scene
  // photography: a soft full-page backdrop, plus a study-card and a
  // break-card image (lamp/plant for study, armchair/cushion for break).
  const theme = girly
    ? {
        pageBg: '#FBE4EC',
        pageImage: '/images/focus/desk-bg-pink.png',
        text: 'text-[#3A1E2C]',
        textMuted: 'text-[#8A5872]',
        accent: '#C2185B',
        accentSoft: '#F48FB1',
        studyImage: '/images/focus/study-pink.png',
        breakImage: '/images/focus/break-pink.png',
        studyLabel: '#C2185B',
        breakLabel: '#8B5FBF',
        cardBg: 'bg-white/80 border-[#F3B6CE]',
        activeCard: 'border-[#C2185B]/30',
        statBg: 'bg-white/90 border-[#F3B6CE]',
        progressTrack: '#F6C9DB',
      }
    : {
        pageBg: '#FDF3E2',
        pageImage: '/images/focus/desk-bg-neutral.png',
        text: 'text-[#2B2013]',
        textMuted: 'text-[#8A7A5E]',
        accent: '#C98A1D',
        accentSoft: '#E9C98A',
        studyImage: '/images/focus/study-neutral.png',
        breakImage: '/images/focus/break-neutral.png',
        studyLabel: '#C98A1D',
        breakLabel: '#8B5FBF',
        cardBg: 'bg-white/80 border-[#EADFC4]',
        activeCard: 'border-[#C98A1D]/30',
        statBg: 'bg-white/90 border-[#EADFC4]',
        progressTrack: '#F1E2C0',
      }

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden bg-cover bg-center transition-colors duration-500"
      style={{ backgroundColor: theme.pageBg, backgroundImage: `url(${theme.pageImage})` }}
    >
      {/* Soft wash over the desk-scene backdrop so foreground cards/text stay legible */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `${theme.pageBg}cc` }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => navigate('/space')}
          className={`w-9 h-9 rounded-xl bg-white/90 shadow-sm flex items-center justify-center ${theme.text} hover:opacity-70 transition-opacity`}
        >
          <X size={18} />
        </button>
        <button
          onClick={() => setGirly(g => !g)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors bg-white/90 shadow-sm ${
            girly ? 'border-[#C2185B] text-[#C2185B]' : 'border-[#EADFC4] text-[#8A7A5E]'
          }`}
        >
          <Heart size={13} fill={girly ? '#C2185B' : 'none'} />
          Girly Mode
        </button>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 pb-10 pt-6 flex flex-col gap-5">
        {showResumePrompt && (
          <div className="flex flex-col items-center text-center gap-4 py-16">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-white/90 border ${theme.activeCard}`}>
              <GraduationCap size={26} style={{ color: theme.accent }} />
            </div>
            <h2 className={`font-serif text-2xl font-bold ${theme.text}`}>
              You're already in a session
            </h2>
            <p className={`${theme.textMuted} text-sm max-w-xs`}>
              {phase === 'study' ? 'Study' : 'Break'} time left: {formatTime(secondsLeft)}
            </p>
            <button
              onClick={handleResume}
              className="mt-2 px-6 py-3 rounded-2xl font-bold text-white transition-transform active:scale-[0.98]"
              style={{ background: theme.accent }}
            >
              Proceed to Focus Mode
            </button>
          </div>
        )}

        {showSetup && (
          <>
            <div className="text-center mb-2">
              <h1 className={`font-serif text-3xl font-bold ${theme.text}`}>Focus Mode</h1>
              <p className={`${theme.textMuted} text-sm mt-1`}>Set your study time — study minutes count toward your total, breaks don't.</p>
            </div>

            <div className={`rounded-3xl border p-5 ${theme.cardBg}`}>
              <label className={`text-xs font-bold block mb-2 ${theme.text}`}>Study for how long?</label>
              <input
                type="number"
                min={1}
                max={180}
                value={studyMinutesDraft}
                onChange={e => setStudyMinutesDraft(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                className={`w-full bg-transparent border rounded-xl px-4 py-3 text-2xl font-serif font-bold focus:outline-none ${theme.text}`}
                style={{ borderColor: theme.accentSoft }}
              />
              <span className={`text-xs ${theme.textMuted}`}>minutes</span>
            </div>

            <div className={`rounded-3xl border p-5 ${theme.cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold ${theme.text}`}>Break time</label>
                <span className={`text-[11px] ${theme.textMuted}`}>
                  suggested: {Math.max(1, Math.round(studyMinutesDraft * BREAK_RATIO))} min (20% of study time)
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={90}
                value={breakMinutesDraft}
                onChange={e => { setBreakTouched(true); setBreakMinutesDraft(Math.max(1, Math.min(90, Number(e.target.value) || 1))) }}
                className={`w-full bg-transparent border rounded-xl px-4 py-3 text-2xl font-serif font-bold focus:outline-none ${theme.text}`}
                style={{ borderColor: theme.accentSoft }}
              />
              <span className={`text-xs ${theme.textMuted}`}>minutes {breakTouched && '· edited by you'}</span>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 rounded-2xl font-bold text-white transition-transform active:scale-[0.98] mt-2"
              style={{ background: theme.accent }}
            >
              Start Focus Session
            </button>
          </>
        )}

        {showTimer && (
          <>
            {/* STUDY card — lamp/plant photo bled into the right edge, text on the left */}
            <div
              className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 min-h-[220px] sm:min-h-[260px] bg-cover bg-no-repeat bg-right transition-all ${phase === 'study' ? theme.activeCard : theme.cardBg}`}
              style={{ backgroundImage: `url(${theme.studyImage})` }}
            >
              <div className="relative max-w-[65%] sm:max-w-[60%] h-full flex flex-col justify-center">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"
                  style={{ color: theme.studyLabel }}
                >
                  <GraduationCap size={13} /> Study
                </p>
                <p
                  className={`font-serif font-bold leading-none ${theme.text}`}
                  style={{ fontSize: '3rem' }}
                >
                  {phase === 'study' ? formatTime(secondsLeft) : formatTime(focusMinutes * 60)}
                </p>
                {phase === 'study' && (
                  <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: theme.progressTrack }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (1 - secondsLeft / (focusMinutes * 60)) * 100)}%`,
                        background: theme.accent,
                      }}
                    />
                  </div>
                )}
                <p className={`text-xs italic mt-3 ${theme.textMuted}`}>Focus now, shine later ✨</p>
              </div>
            </div>

            {/* BREAK card — armchair/cushion photo bled into the right edge */}
            <div
              className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 min-h-[220px] sm:min-h-[260px] bg-cover bg-no-repeat bg-right transition-all ${phase === 'break' ? theme.activeCard : theme.cardBg}`}
              style={{ backgroundImage: `url(${theme.breakImage})` }}
            >
              <div className="relative max-w-[65%] sm:max-w-[60%] h-full flex flex-col justify-center">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"
                  style={{ color: theme.breakLabel }}
                >
                  <Coffee size={13} /> {phase === 'break' ? 'Break — go stretch' : 'Break (up next)'}
                </p>
                <p
                  className={`font-serif font-bold leading-none ${theme.text}`}
                  style={{ fontSize: '3rem' }}
                >
                  {phase === 'break' ? formatTime(secondsLeft) : formatTime(breakMinutes * 60)}
                </p>
                <p className={`text-xs italic mt-3 ${theme.textMuted}`}>You're doing great! 💜</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-1">
              <button
                onClick={handleReset}
                className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/90 shadow-sm ${theme.textMuted}`}
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={toggle}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg"
                style={{ background: theme.accent }}
              >
                {running ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
              </button>
              <div className="w-12 h-12" />
            </div>

            <p className={`text-center text-xs ${theme.textMuted} px-4 py-2.5 rounded-full bg-white/70 flex items-center justify-center gap-1.5 mx-auto`}>
              {phase === 'study' ? 'Study minutes are being recorded as you go.' : "Break time isn't recorded — enjoy it."}
            </p>

            {/* Stats — Sessions Today is a real, ever-increasing count (no streak stat) */}
            <div className={`rounded-3xl border p-4 flex items-center justify-center gap-6 sm:gap-10 ${theme.statBg}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${theme.accent}22` }}>
                  <Target size={16} style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className={`font-bold text-lg leading-none ${theme.text}`}>{sessionsToday}</p>
                  <p className={`text-[11px] mt-1 ${theme.textMuted}`}>Sessions Today</p>
                </div>
              </div>
              <div className="w-px h-9" style={{ background: theme.progressTrack }} />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${theme.accent}22` }}>
                  <Flame size={16} style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className={`font-bold text-lg leading-none ${theme.text}`}>{todayMinutes}</p>
                  <p className={`text-[11px] mt-1 ${theme.textMuted}`}>Minutes Focused</p>
                </div>
              </div>
            </div>
          </>
        )}

        {showDone && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <GraduationCap size={36} style={{ color: theme.accent }} />
            <h2 className={`font-serif text-2xl font-bold ${theme.text}`}>Session complete</h2>
            <p className={`${theme.textMuted} text-sm max-w-xs`}>
              {focusMinutes} min of focus, {breakMinutes} min of rest. Nicely done.
            </p>
            <button
              onClick={handleReset}
              className="mt-2 px-6 py-3 rounded-2xl font-bold text-white transition-transform active:scale-[0.98]"
              style={{ background: theme.accent }}
            >
              Start Another Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
