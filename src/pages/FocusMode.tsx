// src/pages/FocusMode.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Play, Pause, RotateCcw, Heart, Moon, PartyPopper, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useFocusSession } from '../hooks/useFocusSession'

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
  const { phase, running, secondsLeft, mins, secs, focusMinutes, breakMinutes, start, toggle, reset } = session

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
  // site-wide black & white mode.
  const theme = girly
    ? {
        bg: 'bg-white',
        blobs: ['#FADCE0', '#F7C6D9', '#FFF0F5'],
        text: 'text-[#4a2338]',
        textMuted: 'text-[#C2185B]/60',
        accent: '#C2185B',
        accentSoft: '#F48FB1',
        cardBg: 'bg-white/70 border-[#F3B6CE]',
        activeCard: 'bg-gradient-to-br from-[#FADCE0] to-[#FFF0F5] border-[#C2185B]/30',
      }
    : {
        bg: 'bg-slate-deep',
        blobs: ['#3C5F94', '#1F8A70', '#D4A017'],
        text: 'text-cream',
        textMuted: 'text-cream-muted',
        accent: '#D4A017',
        accentSoft: '#7DD3C0',
        cardBg: 'bg-slate-card border-slate-border',
        activeCard: 'bg-gradient-to-br from-teal-primary/20 to-sapphire-light/20 border-teal-light/40',
      }

  return (
    <div className={`min-h-[100dvh] relative overflow-hidden ${theme.bg} transition-colors duration-500`}>
      {/* Ambient background — CSS gradient blobs, no image assets needed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-40"
          style={{ background: theme.blobs[0] }} />
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: theme.blobs[1] }} />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: theme.blobs[2] }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <button onClick={() => navigate('/space')} className={`${theme.textMuted} hover:opacity-70 transition-opacity`}>
          <X size={22} />
        </button>
        <button
          onClick={() => setGirly(g => !g)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
            girly ? 'border-[#C2185B] text-[#C2185B] bg-[#FADCE0]/50' : 'border-slate-border text-cream-muted hover:text-cream'
          }`}
        >
          <Heart size={13} fill={girly ? '#C2185B' : 'none'} />
          Girly Mode
        </button>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 pb-16 pt-6 flex flex-col gap-6">
        {showResumePrompt && (
          <div className="flex flex-col items-center text-center gap-4 py-16">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme.activeCard} border`}>
              <Sparkles size={26} style={{ color: theme.accent }} />
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
              <p className={`${theme.textMuted} text-sm mt-1`}>Set your study time — study minutes count toward your streak, breaks don't.</p>
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
            <div className={`rounded-3xl border p-6 text-center transition-all ${phase === 'study' ? theme.activeCard : theme.cardBg}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${phase === 'study' ? theme.text : theme.textMuted}`}>
                Study
              </p>
              <p
                className={`font-serif font-bold leading-none ${theme.text}`}
                style={{ fontSize: '4.5rem', transform: 'scaleY(1.2)', letterSpacing: '0.02em' }}
              >
                {phase === 'study' ? formatTime(secondsLeft) : formatTime(focusMinutes * 60)}
              </p>
            </div>

            <div className={`rounded-3xl border p-6 text-center transition-all ${phase === 'break' ? theme.activeCard : theme.cardBg}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${phase === 'break' ? theme.text : theme.textMuted}`}>
                {phase === 'break' ? 'Break — go stretch' : 'Break (up next)'}
              </p>
              <p
                className={`font-serif font-bold leading-none ${theme.text}`}
                style={{ fontSize: '4.5rem', transform: 'scaleY(1.2)', letterSpacing: '0.02em' }}
              >
                {phase === 'break' ? formatTime(secondsLeft) : formatTime(breakMinutes * 60)}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 mt-2">
              <button
                onClick={handleReset}
                className={`w-12 h-12 rounded-full flex items-center justify-center border ${theme.cardBg} ${theme.textMuted}`}
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={toggle}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                style={{ background: theme.accent }}
              >
                {running ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
              </button>
              <div className="w-12 h-12" />
            </div>

            <p className={`text-center text-xs ${theme.textMuted} flex items-center justify-center gap-1.5 mt-1`}>
              <Moon size={12} />
              {phase === 'study' ? 'Study minutes are being recorded as you go.' : "Break time isn't recorded — enjoy it."}
            </p>
          </>
        )}

        {showDone && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <PartyPopper size={36} style={{ color: theme.accent }} />
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
