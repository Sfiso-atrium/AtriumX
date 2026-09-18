// src/pages/FocusMode.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Play, Pause, RotateCcw, Heart, Target, Flame, GraduationCap, Coffee, NotebookPen } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useFocusSession } from '../hooks/useFocusSession'
import { getTodayStudyMinutes } from '../services/dataService'
import ToolsMenu from '../components/common/ToolsMenu'

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

  // Focus defaults to the same AtriumX palette as the rest of the site.
  // Girly Mode remains an explicit optional theme; its current pink palette
  // is kept intact but is no longer embedded into the standard page theme.
  const theme = girly
    ? {
        text: 'text-[var(--atriumx-focus-girly-text)]',
        textMuted: 'text-[var(--atriumx-focus-girly-muted)]',
        accent: 'var(--atriumx-focus-girly-accent)',
        accentSoft: 'var(--atriumx-focus-girly-accent-soft)',
        accentWash: 'color-mix(in srgb, var(--atriumx-focus-girly-accent) 13%, transparent)',
        studyImage: '/images/focus/study-pink.png',
        breakImage: '/images/focus/break-pink.png',
        studyLabel: 'var(--atriumx-focus-girly-accent)',
        breakLabel: 'var(--atriumx-focus-girly-break)',
        cardBg: 'bg-[var(--atriumx-focus-girly-card)] border-[var(--atriumx-focus-girly-border)]',
        activeCard: 'border-[var(--atriumx-focus-girly-accent)]/30',
        statBg: 'bg-[var(--atriumx-focus-girly-card-strong)] border-[var(--atriumx-focus-girly-border)]',
        progressTrack: 'var(--atriumx-focus-girly-track)',
        controlBg: 'bg-[var(--atriumx-focus-girly-card-strong)]',
      }
    : {
        text: 'text-cream',
        textMuted: 'text-cream-muted',
        accent: 'rgb(var(--atriumx-gold-rgb))',
        accentSoft: 'rgb(var(--atriumx-border-rgb))',
        accentWash: 'rgb(var(--atriumx-gold-rgb) / 0.13)',
        studyImage: '/images/focus/study-neutral.png',
        breakImage: '/images/focus/break-neutral.png',
        studyLabel: 'rgb(var(--atriumx-teal-light-rgb))',
        breakLabel: 'rgb(var(--atriumx-gold-rgb))',
        cardBg: 'bg-slate-card/80 border-slate-border',
        activeCard: 'border-gold/30',
        statBg: 'bg-slate-card/90 border-slate-border',
        progressTrack: 'rgb(var(--atriumx-border-rgb))',
        controlBg: 'bg-slate-card/90',
      }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden transition-colors duration-500 bg-slate-deep text-cream">

      {/* Top bar — z-30 so its dropdown (Toolbox, and QR's nested panel)
          always paints above the content below, which sits at z-10. Equal
          z-index siblings stack in DOM order, so without this the content
          div (being later in the DOM) was winning and swallowing clicks on
          the dropdown wherever the two overlapped. */}
      <div className="relative z-30 flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => navigate('/space')}
          className={`w-9 h-9 rounded-xl ${theme.controlBg} shadow-sm flex items-center justify-center ${theme.text} hover:opacity-70 transition-opacity`}
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-2">
          <ToolsMenu triggerClassName={`w-9 h-9 rounded-xl ${theme.controlBg} shadow-sm flex items-center justify-center ${theme.text} hover:opacity-70 transition-opacity`} />
          <button
            onClick={() => navigate('/notebook')}
            className={`w-9 h-9 rounded-xl ${theme.controlBg} shadow-sm flex items-center justify-center ${theme.text} hover:opacity-70 transition-opacity`}
            title="Notebook"
          >
            <NotebookPen size={17} />
          </button>
          <button
            onClick={() => setGirly(g => !g)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors ${theme.controlBg} shadow-sm ${
              girly ? 'border-[var(--atriumx-focus-girly-accent)] text-[var(--atriumx-focus-girly-accent)]' : 'border-slate-border text-cream-muted'
            }`}
          >
            <Heart size={13} fill={girly ? 'var(--atriumx-focus-girly-accent)' : 'none'} />
            {girly ? 'Girly Mode' : 'AtriumX Mode'}
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 pb-10 pt-6 flex flex-col gap-5">
        {showResumePrompt && (
          <div className="flex flex-col items-center text-center gap-4 py-16">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme.controlBg} border ${theme.activeCard}`}>
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
                className={`w-12 h-12 rounded-full flex items-center justify-center ${theme.controlBg} shadow-sm ${theme.textMuted}`}
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

            <p className={`text-center text-xs ${theme.textMuted} px-4 py-2.5 rounded-full ${theme.controlBg} flex items-center justify-center gap-1.5 mx-auto`}>
              {phase === 'study' ? 'Study minutes are being recorded as you go.' : "Break time isn't recorded — enjoy it."}
            </p>

            {/* Stats — Sessions Today is a real, ever-increasing count (no streak stat) */}
            <div className={`rounded-3xl border p-4 flex items-center justify-center gap-6 sm:gap-10 ${theme.statBg}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: theme.accentWash }}>
                  <Target size={16} style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className={`font-bold text-lg leading-none ${theme.text}`}>{sessionsToday}</p>
                  <p className={`text-[11px] mt-1 ${theme.textMuted}`}>Sessions Today</p>
                </div>
              </div>
              <div className="w-px h-9" style={{ background: theme.progressTrack }} />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: theme.accentWash }}>
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
