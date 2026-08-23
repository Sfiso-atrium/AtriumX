// src/pages/FocusMode.tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Play, Pause, RotateCcw, Heart, Moon, PartyPopper } from 'lucide-react'

const BREAK_RATIO = 0.2 // suggested break = 20% of study time, editable by the person

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

type Phase = 'setup' | 'study' | 'break' | 'done'

export default function FocusMode() {
  const navigate = useNavigate()
  const [girly, setGirly] = useState(false)

  const [phase, setPhase] = useState<Phase>('setup')
  const [studyMinutes, setStudyMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [breakTouched, setBreakTouched] = useState(false)

  const [studySecondsLeft, setStudySecondsLeft] = useState(0)
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

  // Break suggestion appears once study time is set, and only pre-fills
  // the field until the person edits it themselves.
  useEffect(() => {
    if (!breakTouched) {
      setBreakMinutes(Math.max(1, Math.round(studyMinutes * BREAK_RATIO)))
    }
  }, [studyMinutes, breakTouched])

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = window.setInterval(() => {
      if (phase === 'study') {
        setStudySecondsLeft(prev => {
          if (prev <= 1) {
            setPhase('break')
            setBreakSecondsLeft(breakMinutes * 60)
            return 0
          }
          return prev - 1
        })
      } else if (phase === 'break') {
        setBreakSecondsLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            setPhase('done')
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, phase, breakMinutes])

  const handleStart = () => {
    setStudySecondsLeft(studyMinutes * 60)
    setBreakSecondsLeft(breakMinutes * 60)
    setPhase('study')
    setIsRunning(true)
  }

  const handlePauseResume = () => setIsRunning(prev => !prev)

  const handleReset = () => {
    setIsRunning(false)
    setPhase('setup')
    setStudySecondsLeft(0)
    setBreakSecondsLeft(0)
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
        {phase === 'setup' && (
          <>
            <div className="text-center mb-2">
              <h1 className={`font-serif text-3xl font-bold ${theme.text}`}>Focus Mode</h1>
              <p className={`${theme.textMuted} text-sm mt-1`}>Set your study time — nothing here gets saved anywhere.</p>
            </div>

            <div className={`rounded-3xl border p-5 ${theme.cardBg}`}>
              <label className={`text-xs font-bold block mb-2 ${theme.text}`}>Study for how long?</label>
              <input
                type="number"
                min={1}
                max={180}
                value={studyMinutes}
                onChange={e => setStudyMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                className={`w-full bg-transparent border rounded-xl px-4 py-3 text-2xl font-serif font-bold focus:outline-none ${theme.text}`}
                style={{ borderColor: theme.accentSoft }}
              />
              <span className={`text-xs ${theme.textMuted}`}>minutes</span>
            </div>

            <div className={`rounded-3xl border p-5 ${theme.cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold ${theme.text}`}>Break time</label>
                <span className={`text-[11px] ${theme.textMuted}`}>
                  suggested: {Math.max(1, Math.round(studyMinutes * BREAK_RATIO))} min (20% of study time)
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={90}
                value={breakMinutes}
                onChange={e => { setBreakTouched(true); setBreakMinutes(Math.max(1, Math.min(90, Number(e.target.value) || 1))) }}
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

        {(phase === 'study' || phase === 'break') && (
          <>
            <div className={`rounded-3xl border p-6 text-center transition-all ${phase === 'study' ? theme.activeCard : theme.cardBg}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${phase === 'study' ? theme.text : theme.textMuted}`}>
                Study
              </p>
              <p
                className={`font-serif font-bold leading-none ${theme.text}`}
                style={{ fontSize: '4.5rem', transform: 'scaleY(1.2)', letterSpacing: '0.02em' }}
              >
                {phase === 'study' ? formatTime(studySecondsLeft) : formatTime(studyMinutes * 60)}
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
                {phase === 'break' ? formatTime(breakSecondsLeft) : formatTime(breakMinutes * 60)}
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
                onClick={handlePauseResume}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                style={{ background: theme.accent }}
              >
                {isRunning ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
              </button>
              <div className="w-12 h-12" />
            </div>

            <p className={`text-center text-xs ${theme.textMuted} flex items-center justify-center gap-1.5 mt-1`}>
              <Moon size={12} /> Not tracked, not saved — just this session.
            </p>
          </>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <PartyPopper size={36} style={{ color: theme.accent }} />
            <h2 className={`font-serif text-2xl font-bold ${theme.text}`}>Session complete</h2>
            <p className={`${theme.textMuted} text-sm max-w-xs`}>
              {studyMinutes} min of focus, {breakMinutes} min of rest. Nicely done.
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
