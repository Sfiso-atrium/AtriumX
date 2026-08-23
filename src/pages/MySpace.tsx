import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Play, Pause, RotateCcw, Sparkles, X, ChevronDown, ChevronUp, CheckCircle2, Circle, CalendarClock, BookOpen, Clock, Wallet, Timer, Eye, PartyPopper, Lock, Users, Plus, Copy, Check } from 'lucide-react'
import HomeIcon from '../components/common/icons/HomeIcon'
import { getSeenMySpaceIntro, markSeenMySpaceIntro } from '../services/dataService'
import { useApp } from '../context/AppContext'
import { STUDENT_CATEGORIES } from '../components/common/CategoryChips'
import {
  Deadline, getDeadlines, createDeadline, deleteDeadline,
  ScheduleEntry, getScheduleEntries, createScheduleEntry, deleteScheduleEntry,
  BudgetEntry, getBudgetEntries, createBudgetEntry, deleteBudgetEntry,
  getTodayStudyMinutes, getYesterdayStudyMinutes, addStudyMinutes,
  Watchlist, getWatchlists, createWatchlist, deleteWatchlist,
  StudyCourse, getStudyCourses, createStudyCourse, deleteStudyCourse,
  StudyPrepNote, getStudyPrepNotes, createStudyPrepNote, setStudyPrepClarified,
  StudyGroup, getStudyGroupsForUser, createStudyGroup,
} from '../services/dataService'
import BottomNav from '../components/common/BottomNav'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TABS = ['Deadlines', 'Timetable', 'Schedule', 'Budget', 'Pomodoro', 'Watchlist'] as const
type Tab = typeof TABS[number]

// Friendly, explanatory line shown at the top of every tab — what the tab
// does, said in an encouraging voice rather than a dry feature description.
const TAB_INTRO: Record<Tab, string> = {
  Deadlines: "Every exam and assignment due date lives here, so nothing sneaks up on you. You've got this. 💪",
  Timetable: "Plan your study week course by course — a few minutes now saves a scramble later.",
  Schedule: "Enter your week once and this tab always knows what's next for you.",
  Budget: "Log what comes in and what goes out, and always know what's left. Small habit, big peace of mind.",
  Pomodoro: "Focus in short bursts, log your minutes, and watch your streak grow. One session at a time.",
  Watchlist: "Tell us what you're after and we'll ping you the moment it turns up. No more refreshing the feed.",
}

// Each tab gets its own icon + accent, pulled from AtriumX's existing color
// tokens (sapphire was defined in the theme but unused elsewhere in the
// app — a natural fit for the newest feature, Timetable).
const TAB_META: Record<Tab, { icon: typeof CalendarClock; active: string; iconWrap: string; iconColor: string }> = {
  Deadlines: { icon: CalendarClock, active: 'bg-ember border-ember', iconWrap: 'bg-ember/15 border-ember/30', iconColor: 'text-ember' },
  Timetable: { icon: BookOpen, active: 'bg-sapphire-light border-sapphire-light', iconWrap: 'bg-sapphire-light/15 border-sapphire-light/30', iconColor: 'text-sapphire-light' },
  Schedule: { icon: Clock, active: 'bg-teal-primary border-teal-primary', iconWrap: 'bg-teal-faint border-teal-light/30', iconColor: 'text-teal-light' },
  Budget: { icon: Wallet, active: 'bg-gold border-gold', iconWrap: 'bg-gold/15 border-gold/30', iconColor: 'text-gold' },
  Pomodoro: { icon: Timer, active: 'bg-gold border-gold', iconWrap: 'bg-gold/15 border-gold/30', iconColor: 'text-gold' },
  Watchlist: { icon: Eye, active: 'bg-teal-primary border-teal-primary', iconWrap: 'bg-teal-faint border-teal-light/30', iconColor: 'text-teal-light' },
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-slate-card border border-slate-border rounded-2xl p-4">{children}</div>
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-cream-muted hover:text-red-400 transition-colors flex-shrink-0">
      <Trash2 size={16} />
    </button>
  )
}

function TabIntro({ tab }: { tab: Tab }) {
  const meta = TAB_META[tab]
  const Icon = meta.icon
  return (
    <div className="flex items-start gap-2.5 mb-1">
      <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.iconWrap}`}>
        <Icon size={14} className={meta.iconColor} />
      </div>
      <p className="text-cream-muted text-sm leading-snug pt-0.5">{TAB_INTRO[tab]}</p>
    </div>
  )
}

// Shown once per user on their first visit to My Space, via a localStorage
// flag (this is a real deployed app, not a Claude artifact, so localStorage
// is fine here — it just needs to remember "seen" per browser).
function MySpaceIntroModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="flex justify-end mb-1">
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-primary/40 to-sapphire-light/40 border border-teal-light/30 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={24} className="text-teal-light" />
        </div>
        <h2 className="font-serif text-xl text-cream mb-2">Welcome to My Space!</h2>
        <p className="text-cream-muted text-sm mb-5 leading-relaxed">
          This is your own corner of AtriumX — separate from the marketplace and just for you. Track deadlines,
          plan a study timetable, log your budget, run focus sessions, and watch your watchlist for you.
          Every tab has a quick line at the top telling you what it's for. Let's get you organised. 🎓
        </p>
        <button
          onClick={onClose}
          className="w-full bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors"
        >
          Let's go
        </button>
      </div>
    </div>
  )
}

function DeadlinesSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [items, setItems] = useState<Deadline[]>([])
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => getDeadlines(userId).then(d => { setItems(d); setLoading(false) })
  useEffect(() => { load() }, [userId])

  const handleAdd = async () => {
    if (!title.trim() || !dueAt) { showToast('Add a title and a due date.', 'error'); return }
    const { error } = await createDeadline(userId, title.trim(), new Date(dueAt).toISOString(), notes)
    if (error) { showToast(error, 'error'); return }
    setTitle(''); setDueAt(''); setNotes('')
    showToast('Deadline added — you\'re on top of it.', 'success')
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteDeadline(id)
    setItems(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Deadlines" />
      <SectionCard>
        <p className="text-cream font-bold text-sm mb-3">Add a deadline</p>
        <div className="flex flex-col gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Exam / assignment title"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream focus:outline-none focus:border-teal-light" />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <button onClick={handleAdd} className="bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-sm transition-colors">
            Add
          </button>
        </div>
      </SectionCard>

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8">
          <PartyPopper size={28} className="text-cream-muted" />
          <p className="text-cream-muted text-sm text-center">No deadlines yet — add your first one above.</p>
        </div>
      )}

      {items.map(d => {
        const due = new Date(d.due_at)
        const soon = due.getTime() - Date.now() < 24 * 60 * 60 * 1000
        return (
          <div key={d.id} className={`bg-slate-card border rounded-2xl p-4 border-l-4 ${soon ? 'border-slate-border border-l-ember' : 'border-slate-border border-l-teal-light/40'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-cream font-bold text-sm truncate">{d.title}</p>
                <p className={`text-xs mt-0.5 ${soon ? 'text-ember' : 'text-cream-muted'}`}>
                  {due.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {d.notes && <p className="text-cream-muted text-xs mt-1">{d.notes}</p>}
              </div>
              <DeleteBtn onClick={() => handleDelete(d.id)} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ScheduleSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [items, setItems] = useState<ScheduleEntry[]>([])
  const [day, setDay] = useState('1')
  const [time, setTime] = useState('')
  const [module, setModule] = useState('')
  const [room, setRoom] = useState('')

  const load = () => getScheduleEntries(userId).then(setItems)
  useEffect(() => { load() }, [userId])

  const handleAdd = async () => {
    if (!module.trim() || !time) { showToast('Add a module and a time.', 'error'); return }
    const { error } = await createScheduleEntry(userId, Number(day), time, module.trim(), room)
    if (error) { showToast(error, 'error'); return }
    setModule(''); setTime(''); setRoom('')
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteScheduleEntry(id)
    setItems(prev => prev.filter(s => s.id !== id))
  }

  // Next class: soonest entry from now to end of week, wrapping to next week if needed
  const now = new Date()
  const withMinutes = items.map(s => {
    const [h, m] = s.start_time.split(':').map(Number)
    let deltaDays = s.day_of_week - now.getDay()
    if (deltaDays < 0 || (deltaDays === 0 && (h * 60 + m) < now.getHours() * 60 + now.getMinutes())) deltaDays += 7
    const target = new Date(now)
    target.setDate(now.getDate() + deltaDays)
    target.setHours(h, m, 0, 0)
    return { entry: s, target }
  }).sort((a, b) => a.target.getTime() - b.target.getTime())
  const next = withMinutes[0]

  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Schedule" />
      {next && (
        <SectionCard>
          <p className="text-cream-muted text-xs mb-1">Next class</p>
          <p className="text-cream font-bold">{next.entry.module}</p>
          <p className="text-teal-light text-sm mt-0.5">
            {DAYS[next.entry.day_of_week]} · {next.entry.start_time.slice(0, 5)}
            {next.entry.room ? ` · ${next.entry.room}` : ''}
          </p>
          <p className="text-cream-muted text-xs mt-1">
            in {Math.max(0, Math.round((next.target.getTime() - now.getTime()) / 60000))} min
          </p>
        </SectionCard>
      )}

      <SectionCard>
        <p className="text-cream font-bold text-sm mb-3">Add a class</p>
        <div className="flex flex-col gap-2">
          <select value={day} onChange={e => setDay(e.target.value)}
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream focus:outline-none focus:border-teal-light">
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream focus:outline-none focus:border-teal-light" />
          <input value={module} onChange={e => setModule(e.target.value)} placeholder="Module"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room (optional)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <button onClick={handleAdd} className="bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-sm transition-colors">
            Add
          </button>
        </div>
      </SectionCard>

      {items.map(s => (
        <SectionCard key={s.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-cream font-bold text-sm truncate">{s.module}</p>
              <p className="text-cream-muted text-xs">
                {DAYS[s.day_of_week]} · {s.start_time.slice(0, 5)}{s.room ? ` · ${s.room}` : ''}
              </p>
            </div>
            <DeleteBtn onClick={() => handleDelete(s.id)} />
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

function BudgetSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [items, setItems] = useState<BudgetEntry[]>([])
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<'in' | 'out'>('out')
  const [note, setNote] = useState('')

  const load = () => getBudgetEntries(userId).then(setItems)
  useEffect(() => { load() }, [userId])

  const balance = items.reduce((sum, e) => sum + (e.direction === 'in' ? e.amount : -e.amount), 0)

  const handleAdd = async () => {
    const n = Number(amount)
    if (!n || n <= 0) { showToast('Enter an amount greater than 0.', 'error'); return }
    const { error } = await createBudgetEntry(userId, n, direction, note)
    if (error) { showToast(error, 'error'); return }
    setAmount(''); setNote('')
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteBudgetEntry(id)
    setItems(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Budget" />
      <SectionCard>
        <p className="text-cream-muted text-xs mb-1">Balance</p>
        <p className={`text-2xl font-serif font-bold ${balance >= 0 ? 'text-teal-light' : 'text-red-400'}`}>
          R{balance.toFixed(2)}
        </p>
      </SectionCard>

      <SectionCard>
        <p className="text-cream font-bold text-sm mb-3">Log money</p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={() => setDirection('in')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${direction === 'in' ? 'bg-teal-primary text-white' : 'bg-slate-deep text-cream-muted border border-slate-border'}`}>
              Money in
            </button>
            <button onClick={() => setDirection('out')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${direction === 'out' ? 'bg-ember text-white' : 'bg-slate-deep text-cream-muted border border-slate-border'}`}>
              Money out
            </button>
          </div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (R)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <button onClick={handleAdd} className="bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-sm transition-colors">
            Add
          </button>
        </div>
      </SectionCard>

      {items.map(e => (
        <SectionCard key={e.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`font-bold text-sm ${e.direction === 'in' ? 'text-teal-light' : 'text-ember'}`}>
                {e.direction === 'in' ? '+' : '-'}R{e.amount.toFixed(2)}
              </p>
              {e.note && <p className="text-cream-muted text-xs truncate">{e.note}</p>}
            </div>
            <DeleteBtn onClick={() => handleDelete(e.id)} />
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

const FOCUS_PRESETS = [15, 25, 45, 60]

const AHEAD_MESSAGES = [
  "Already past yesterday's number — nice.",
  "You're outpacing yesterday-you today.",
  'New high for the week, keep it up.',
  'More focused time than yesterday. Solid.',
  "Yesterday's you would be impressed.",
  'Beat your own record today.',
  'More minutes than yesterday — the trend is real.',
  'You showed up more than yesterday. That counts.',
  "Today's you is winning against yesterday's you.",
  "Ahead of yesterday's pace — don't stop now.",
]
const BEHIND_MESSAGES = [
  'A bit less focus time than yesterday so far.',
  "Below yesterday's number right now — still time to close the gap.",
  'Slower start than yesterday, no rush to catch up.',
  "Today's a little lighter than yesterday's session.",
  "Not quite at yesterday's total yet.",
  'Yesterday edges ahead for now.',
  'A shorter stretch than yesterday today.',
  "Trailing yesterday's minutes a little.",
  "Today's tally is under yesterday's, so far.",
  'Less time logged than yesterday — still counts.',
]

// Shown every time a session finishes, regardless of how it compares to
// yesterday — that comparison is a nice-to-know, this is the actual
// congratulations.
const SESSION_COMPLETE_MESSAGES = [
  'Session done — nice focus. 🎉',
  "That's a full session in the bank. Well done.",
  'Timer done. That kind of focus adds up fast.',
  "Nice one — that's time you'll be glad you spent.",
  'Session complete. Your future self says thanks.',
  "Boom, done. That's real progress.",
  'Focus session logged — take a breather, you earned it.',
]

function pickMessage(pool: string[], storageKey: string): string {
  const lastIndex = Number(localStorage.getItem(storageKey) ?? '-1')
  let idx = Math.floor(Math.random() * pool.length)
  if (pool.length > 1) {
    while (idx === lastIndex) idx = Math.floor(Math.random() * pool.length)
  }
  localStorage.setItem(storageKey, String(idx))
  return pool[idx]
}

function GoldPaperFall() {
  const pieces = Array.from({ length: 28 })
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 999 }}>
      <style>{`@keyframes goldFall { to { top: 100vh; transform: translateY(0) rotate(720deg); } }`}</style>
      {pieces.map((_, i) => {
        const left = Math.random() * 100
        const delay = (Math.random() * 0.6).toFixed(2)
        const duration = (2.2 + Math.random() * 1.2).toFixed(2)
        const rotate = Math.round(Math.random() * 360)
        return (
          <span
            key={i}
            style={{
              position: 'absolute', top: '-24px', left: `${left}vw`,
              width: '7px', height: '14px', background: '#F2B84B',
              transform: `rotate(${rotate}deg)`,
              animation: `goldFall ${duration}s linear ${delay}s forwards`,
            }}
          />
        )
      })}
    </div>
  )
}

// Wall-clock based, not a plain countdown: startedAt is the timestamp the
// current running segment began, accumulatedSeconds is everything banked
// from segments before that (pausing folds the just-finished segment in).
// secondsLeft is always derived from these two vs Date.now() — never
// decremented directly — so the timer is correct the instant the page
// loads, whether the tab was open the whole time, backgrounded and
// throttled, or closed entirely and reopened minutes later. Both values
// live in localStorage so a closed tab doesn't lose the session either.
function PomodoroSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const navigate = useNavigate()
  const [focusMinutes, setFocusMinutes] = useState(() => {
    const saved = Number(localStorage.getItem('pomodoro_focus_minutes'))
    return saved > 0 ? saved : 25
  })
  const [startedAt, setStartedAt] = useState<number | null>(() => {
    const raw = localStorage.getItem('pomodoro_started_at')
    return raw ? Number(raw) : null
  })
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(() => {
    return Number(localStorage.getItem('pomodoro_accumulated_seconds')) || 0
  })
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [yesterdayMinutes, setYesterdayMinutes] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [dayMessage, setDayMessage] = useState<{ text: string; ahead: boolean } | null>(null)
  const [, forceTick] = useState(0)
  const completedRef = useRef(false)

  const running = startedAt !== null
  const totalSeconds = focusMinutes * 60
  const elapsedSeconds = accumulatedSeconds + (running ? Math.floor((Date.now() - startedAt!) / 1000) : 0)
  const secondsLeft = Math.max(0, totalSeconds - elapsedSeconds)

  useEffect(() => {
    getTodayStudyMinutes(userId).then(setTodayMinutes)
    getYesterdayStudyMinutes(userId).then(setYesterdayMinutes)
  }, [userId])

  useEffect(() => { getTodayStudyMinutes(userId).then(setTodayMinutes) }, [userId])

  const handleSessionComplete = async () => {
    showToast(pickMessage(SESSION_COMPLETE_MESSAGES, 'pomodoro_last_complete_msg'), 'success')
    const newTotal = await addStudyMinutes(userId, focusMinutes)
    setTodayMinutes(newTotal)
    const yesterday = await getYesterdayStudyMinutes(userId)
    if (newTotal > yesterday) {
      setDayMessage({ text: pickMessage(AHEAD_MESSAGES, 'pomodoro_last_ahead_msg'), ahead: true })
      setCelebrate(true)
      setTimeout(() => setCelebrate(false), 4200)
    } else {
      setDayMessage({ text: pickMessage(BEHIND_MESSAGES, 'pomodoro_last_behind_msg'), ahead: false })
    }
    setTimeout(() => setDayMessage(null), 6000)
  }

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => forceTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [running])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') forceTick(t => t + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (running && secondsLeft <= 0 && !completedRef.current) {
      completedRef.current = true
      localStorage.removeItem('pomodoro_started_at')
      localStorage.removeItem('pomodoro_accumulated_seconds')
      setStartedAt(null)
      setAccumulatedSeconds(0)
      handleSessionComplete()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, secondsLeft])

  const handleToggle = () => {
    if (running) {
      const segment = Math.floor((Date.now() - startedAt!) / 1000)
      const newAccumulated = Math.min(totalSeconds, accumulatedSeconds + segment)
      localStorage.setItem('pomodoro_accumulated_seconds', String(newAccumulated))
      localStorage.removeItem('pomodoro_started_at')
      setAccumulatedSeconds(newAccumulated)
      setStartedAt(null)
    } else {
      completedRef.current = false
      const now = Date.now()
      localStorage.setItem('pomodoro_started_at', String(now))
      setStartedAt(now)
    }
  }

  const handleReset = () => {
    localStorage.removeItem('pomodoro_started_at')
    localStorage.removeItem('pomodoro_accumulated_seconds')
    setStartedAt(null)
    setAccumulatedSeconds(0)
    completedRef.current = false
  }

  const handlePreset = (m: number) => {
    setFocusMinutes(m)
    localStorage.setItem('pomodoro_focus_minutes', String(m))
    localStorage.removeItem('pomodoro_accumulated_seconds')
    setAccumulatedSeconds(0)
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')
  return (
    <div className="flex flex-col gap-3">
      {celebrate && <GoldPaperFall />}
      <TabIntro tab="Pomodoro" />
      <SectionCard>
        <div className="flex flex-col items-center py-6">
          <p className="text-cream font-serif text-5xl font-bold mb-6">{mins}:{secs}</p>
          <div className="flex gap-3">
            <button onClick={handleToggle}
              className="bg-ember hover:bg-ember-dark text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
            </button>
            <button onClick={handleReset}
              className="bg-slate-deep border border-slate-border text-cream-muted font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-cream-muted text-xs mb-2">Focus length</p>
        <div className="flex flex-wrap gap-2 items-center">
          {FOCUS_PRESETS.map(m => (
            <button key={m} disabled={running} onClick={() => handlePreset(m)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-40 ${
                focusMinutes === m ? 'bg-teal-primary text-white border-teal-light' : 'bg-slate-deep text-cream-muted border-slate-border'
              }`}>
              {m}m
            </button>
          ))}
          <input
            type="number" min="1" max="180" disabled={running}
            value={focusMinutes}
            onChange={e => handlePreset(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
            className="w-20 bg-slate-deep border border-slate-border rounded-xl px-3 py-1.5 text-sm text-cream disabled:opacity-40 focus:outline-none focus:border-teal-light"
          />
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-cream-muted text-xs mb-1">Studied today</p>
        <p className="text-teal-light text-2xl font-serif font-bold">{todayMinutes} min</p>
        <div className="mt-3 pt-3 border-t border-slate-border">
          <p className="text-cream-muted text-xs mb-1">Studied yesterday</p>
          <p className="text-cream text-sm font-bold">{yesterdayMinutes} min</p>
        </div>
        {dayMessage && (
          <p className={`text-sm mt-2 ${dayMessage.ahead ? 'text-gold' : 'text-cream-muted'}`}>
            {dayMessage.text}
          </p>
        )}
      </SectionCard>

      <button
        onClick={() => navigate('/focus')}
        className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-muted text-slate-deep font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-gold/20"
      >
        <Sparkles size={18} /> Enter Focus Mode
      </button>

      <StudyGroupsSection userId={userId} />
    </div>
  )
}

// Card list of the user's study groups, plus a "+" button that opens the
// create-group modal. Cards don't navigate anywhere yet — the group chat
// screen itself is a later build stack.
function StudyGroupsSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newGroup, setNewGroup] = useState<StudyGroup | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () => getStudyGroupsForUser(userId).then(setGroups)
  useEffect(() => { load() }, [userId])

  const handleCreated = (group: StudyGroup) => {
    setShowCreate(false)
    setNewGroup(group)
    setCopied(false)
    load()
  }

  const inviteLink = (groupId: string) => `${window.location.origin}/#/student?join=${groupId}`

  const handleCopy = (groupId: string) => {
    navigator.clipboard.writeText(inviteLink(groupId))
    setCopied(true)
    showToast('Invite link copied.', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="flex items-center justify-between mt-2 mb-1">
        <p className="text-cream font-bold text-sm">Study Groups</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-gold hover:bg-gold-muted text-slate-deep font-bold text-xs px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={14} /> New Group
        </button>
      </div>

      {groups.length === 0 && (
        <SectionCard>
          <p className="text-cream-muted text-sm text-center py-4">
            No study groups yet. Create one and invite your study buddies.
          </p>
        </SectionCard>
      )}

      {groups.map(g => (
        <SectionCard key={g.id}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/group/${g.id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <div className="w-10 h-10 rounded-xl bg-teal-faint flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-teal-light" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-cream font-bold text-sm truncate">{g.name}</p>
                {g.study_weekdays && g.study_weekdays.length > 0 && g.study_hour !== null && g.study_minute !== null && (
                  <p className="text-cream-muted text-xs">
                    Studies {g.study_weekdays.map(d => DAYS[d].slice(0, 3)).join(', ')} at {String(g.study_hour).padStart(2, '0')}:{String(g.study_minute).padStart(2, '0')}
                  </p>
                )}
              </div>
            </button>
            <button
              onClick={() => handleCopy(g.id)}
              title="Copy invite link"
              className="text-cream-muted hover:text-teal-light flex-shrink-0"
            >
              <Copy size={16} />
            </button>
          </div>
        </SectionCard>
      ))}

      {showCreate && (
        <CreateGroupModal userId={userId} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
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

// Name + optional recurring study slot (weekdays + one shared time) —
// this is the fallback source for notifications; the Timetable tab is
// the real source of truth whenever a group builds one out.
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

function WatchlistSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [items, setItems] = useState<Watchlist[]>([])
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('all')
  const [maxPrice, setMaxPrice] = useState('')

  const load = () => getWatchlists(userId).then(setItems)
  useEffect(() => { load() }, [userId])

  const handleAdd = async () => {
    if (!keyword.trim() && category === 'all' && !maxPrice) {
      showToast('Set a keyword, category, or max price.', 'error'); return
    }
    const { error } = await createWatchlist(userId, keyword, category, maxPrice)
    if (error) { showToast(error, 'error'); return }
    setKeyword(''); setCategory('all'); setMaxPrice('')
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteWatchlist(id)
    setItems(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Watchlist" />
      <SectionCard>
        <p className="text-cream font-bold text-sm mb-3">New watchlist</p>
        <div className="flex flex-col gap-2">
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Keyword (e.g. mini-fridge)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream focus:outline-none focus:border-teal-light">
            {STUDENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max price (optional)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <button onClick={handleAdd} className="bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-sm transition-colors">
            Watch
          </button>
        </div>
      </SectionCard>

      {items.map(w => (
        <SectionCard key={w.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex flex-wrap gap-1.5">
              {w.keyword && <span className="bg-teal-faint text-teal-light text-xs font-bold px-2 py-1 rounded-lg">"{w.keyword}"</span>}
              {w.category && <span className="bg-teal-faint text-teal-light text-xs font-bold px-2 py-1 rounded-lg">{w.category}</span>}
              {w.max_price != null && <span className="bg-teal-faint text-teal-light text-xs font-bold px-2 py-1 rounded-lg">under R{w.max_price}</span>}
            </div>
            <DeleteBtn onClick={() => handleDelete(w.id)} />
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

// Pops up when the student checks an unprepped course. Three fixed,
// specific prompts (never more) plus one optional free-text question for
// the lecturer.
function PrepModal({ course, onClose, onSubmitted }: { course: StudyCourse; onClose: () => void; onSubmitted: () => void }) {
  const { currentUser, showToast } = useApp()
  const [focusTopic, setFocusTopic] = useState('')
  const [resource, setResource] = useState('')
  const [goal, setGoal] = useState('')
  const [clarification, setClarification] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!currentUser) return
    if (!focusTopic.trim() || !resource.trim() || !goal.trim()) {
      showToast('Please answer all three questions.', 'info'); return
    }
    setLoading(true)
    const { error } = await createStudyPrepNote(currentUser.id, course.id, focusTopic, resource, goal, clarification)
    setLoading(false)
    if (error) { showToast(error, 'error'); return }
    showToast('Locked in — go get it.', 'success')
    onSubmitted()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-serif text-xl text-cream">Quick prep</h2>
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>
        <p className="text-cream-muted text-sm mb-5">
          For <span className="text-cream">{course.course_name}</span> — three quick questions to walk in ready.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-cream text-xs font-bold block mb-1.5">1. What will you focus on in this session?</label>
            <input value={focusTopic} onChange={e => setFocusTopic(e.target.value)} placeholder="e.g. Chapter 4, past paper Q2"
              className="w-full bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          </div>
          <div>
            <label className="text-cream text-xs font-bold block mb-1.5">2. What resource will you use?</label>
            <input value={resource} onChange={e => setResource(e.target.value)} placeholder="e.g. lecture slides, textbook, YouTube"
              className="w-full bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          </div>
          <div>
            <label className="text-cream text-xs font-bold block mb-1.5">3. What's your goal for this session?</label>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Understand and solve 5 problems"
              className="w-full bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          </div>
          <div>
            <label className="text-cream text-xs font-bold block mb-1.5">Anything you need clarified from your lecturer? (optional)</label>
            <textarea value={clarification} onChange={e => setClarification(e.target.value)} placeholder="e.g. Not sure which formula applies here"
              rows={2}
              className="w-full bg-slate-card border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-none" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors mt-5"
        >
          {loading ? 'Saving...' : 'Save & get ready'}
        </button>
      </div>
    </div>
  )
}

function TimetableSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [courses, setCourses] = useState<StudyCourse[]>([])
  const [preps, setPreps] = useState<StudyPrepNote[]>([])
  const [prepTarget, setPrepTarget] = useState<StudyCourse | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [openDayForm, setOpenDayForm] = useState<number | null>(null)
  const [courseName, setCourseName] = useState('')
  const [minutes, setMinutes] = useState('')

  const load = () => {
    getStudyCourses(userId).then(setCourses)
    getStudyPrepNotes(userId).then(setPreps)
  }
  useEffect(() => { load() }, [userId])

  const handleAddCourse = async (day: number) => {
    const dayCount = courses.filter(c => c.day_of_week === day).length
    if (dayCount >= 3) { showToast('Max 3 courses per day.', 'info'); return }
    if (!courseName.trim() || !minutes || Number(minutes) <= 0) {
      showToast('Add a course name and a study time.', 'error'); return
    }
    const { error } = await createStudyCourse(userId, day, courseName.trim(), Number(minutes))
    if (error) { showToast(error, 'error'); return }
    setCourseName(''); setMinutes(''); setOpenDayForm(null)
    load()
  }

  const handleDeleteCourse = async (id: string) => {
    await deleteStudyCourse(id)
    setCourses(prev => prev.filter(c => c.id !== id))
    setPreps(prev => prev.filter(p => p.course_id !== id))
  }

  const handleClarifiedToggle = async (note: StudyPrepNote) => {
    await setStudyPrepClarified(note.id, !note.clarified)
    setPreps(prev => prev.map(p => p.id === note.id ? { ...p, clarified: !p.clarified } : p))
  }

  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Timetable" />

      {DAYS.map((dayName, dayIdx) => {
        const dayCourses = courses.filter(c => c.day_of_week === dayIdx)
        const totalMinutes = dayCourses.reduce((s, c) => s + c.minutes, 0)
        return (
          <SectionCard key={dayIdx}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-cream font-bold text-sm">{dayName}</p>
              {totalMinutes > 0 && <span className="text-sapphire-light text-xs font-bold bg-sapphire-light/10 border border-sapphire-light/30 px-2 py-0.5 rounded-full">{totalMinutes} min planned</span>}
            </div>

            {dayCourses.length === 0 && (
              <p className="text-cream-muted text-xs mb-2">No courses planned yet — small steps add up.</p>
            )}

            <div className="flex flex-col gap-2">
              {dayCourses.map(course => {
                const note = preps.find(p => p.course_id === course.id)
                const isExpanded = expanded === course.id
                return (
                  <div key={course.id} className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => course.prepped ? setExpanded(isExpanded ? null : course.id) : setPrepTarget(course)}
                        className="flex-shrink-0"
                        aria-label={course.prepped ? 'View prep notes' : 'Prep for this session'}
                      >
                        {course.prepped
                          ? <CheckCircle2 size={20} className="text-teal-light" />
                          : <Circle size={20} className="text-cream-muted" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-cream text-sm font-bold truncate">{course.course_name}</p>
                        <p className="text-cream-muted text-xs">{course.minutes} min</p>
                      </div>
                      {course.prepped && (
                        <button onClick={() => setExpanded(isExpanded ? null : course.id)} className="text-cream-muted flex-shrink-0">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                      <DeleteBtn onClick={() => handleDeleteCourse(course.id)} />
                    </div>

                    {isExpanded && note && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-border flex flex-col gap-1.5">
                        <p className="text-xs"><span className="text-cream-muted">Focus: </span><span className="text-cream">{note.focus_topic}</span></p>
                        <p className="text-xs"><span className="text-cream-muted">Resource: </span><span className="text-cream">{note.resource}</span></p>
                        <p className="text-xs"><span className="text-cream-muted">Goal: </span><span className="text-cream">{note.goal}</span></p>
                        {note.clarification_question && (
                          <button
                            onClick={() => handleClarifiedToggle(note)}
                            className="flex items-start gap-2 mt-1.5 text-left"
                          >
                            {note.clarified
                              ? <CheckCircle2 size={16} className="text-teal-light flex-shrink-0 mt-0.5" />
                              : <Circle size={16} className="text-cream-muted flex-shrink-0 mt-0.5" />}
                            <span className={`text-xs ${note.clarified ? 'text-cream-muted line-through' : 'text-cream'}`}>
                              {note.clarification_question}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {dayCourses.length < 3 && (
              openDayForm === dayIdx ? (
                <div className="flex flex-col gap-2 mt-2.5 pt-2.5 border-t border-slate-border">
                  <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name"
                    className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                  <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="Minutes to study"
                    className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                  <div className="flex gap-2">
                    <button onClick={() => handleAddCourse(dayIdx)} className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-sm transition-colors">
                      Add
                    </button>
                    <button onClick={() => { setOpenDayForm(null); setCourseName(''); setMinutes('') }} className="flex-1 border border-slate-border text-cream-muted font-bold py-2 rounded-xl text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setOpenDayForm(dayIdx)}
                  className="w-full mt-2.5 border border-dashed border-slate-border text-cream-muted hover:text-teal-light hover:border-teal-light text-xs font-bold py-2 rounded-xl transition-colors"
                >
                  + Add course
                </button>
              )
            )}
          </SectionCard>
        )
      })}

      {prepTarget && (
        <PrepModal
          course={prepTarget}
          onClose={() => setPrepTarget(null)}
          onSubmitted={() => { setPrepTarget(null); load() }}
        />
      )}
    </div>
  )
}

// The one "signature" moment for My Space: a quiet gradient panel (built
// entirely from colors already in the app's palette — no new tokens) that
// greets the student with a glanceable snapshot instead of dropping them
// straight into a flat tab bar. Pulls light reads from tables the tabs
// already use — no new data model, just a summarized view of it.
function TodaySnapshot({ userId }: { userId: string }) {
  const { currentUser } = useApp()
  const [nextDeadline, setNextDeadline] = useState<Deadline | null>(null)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [balance, setBalance] = useState(0)
  const [watchCount, setWatchCount] = useState(0)

  useEffect(() => {
    getDeadlines(userId).then(items => {
      const upcoming = items.filter(d => new Date(d.due_at).getTime() > Date.now())
      setNextDeadline(upcoming[0] ?? null)
    })
    getTodayStudyMinutes(userId).then(setTodayMinutes)
    getBudgetEntries(userId).then(entries => {
      setBalance(entries.reduce((s, e) => s + (e.direction === 'in' ? e.amount : -e.amount), 0))
    })
    getWatchlists(userId).then(w => setWatchCount(w.length))
  }, [userId])

  const firstName = currentUser?.full_name?.split(' ')[0] || 'there'
  const daysUntil = nextDeadline ? Math.max(0, Math.ceil((new Date(nextDeadline.due_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null

  return (
    <div className="relative overflow-hidden bg-slate-card border border-slate-border rounded-3xl p-5 mx-4 mt-3">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-sapphire-light/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-14 -left-10 w-40 h-40 rounded-full bg-teal-primary/20 blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="text-cream font-serif text-lg mb-3">Hey {firstName} 👋</p>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-ember/10 border border-ember/25 rounded-xl px-3 py-1.5">
            <CalendarClock size={14} className="text-ember flex-shrink-0" />
            <span className="text-cream text-xs font-medium">
              {nextDeadline ? `${nextDeadline.title} in ${daysUntil}d` : 'No deadlines'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-gold/10 border border-gold/25 rounded-xl px-3 py-1.5">
            <Timer size={14} className="text-gold flex-shrink-0" />
            <span className="text-cream text-xs font-medium">{todayMinutes} min focused today</span>
          </div>
          <div className="flex items-center gap-2 bg-teal-faint border border-teal-light/25 rounded-xl px-3 py-1.5">
            <Wallet size={14} className="text-teal-light flex-shrink-0" />
            <span className="text-cream text-xs font-medium">R{balance.toFixed(0)} left</span>
          </div>
          <div className="flex items-center gap-2 bg-sapphire-light/10 border border-sapphire-light/25 rounded-xl px-3 py-1.5">
            <Eye size={14} className="text-sapphire-light flex-shrink-0" />
            <span className="text-cream text-xs font-medium">{watchCount} watching</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MySpace() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('myspace_last_tab')
    return (TABS as readonly string[]).includes(saved || '') ? (saved as Tab) : 'Deadlines'
  })
  useEffect(() => { localStorage.setItem('myspace_last_tab', tab) }, [tab])
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    getSeenMySpaceIntro(currentUser.id).then(seen => {
      if (!seen) {
        setShowIntro(true)
        markSeenMySpaceIntro(currentUser.id)
      }
    })
  }, [currentUser])

  if (!currentUser) {
    navigate('/student')
    return null
  }

  if (currentUser.account_type === 'business') {
    return (
      <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-card border border-slate-border flex items-center justify-center">
          <Lock size={24} className="text-cream-muted" />
        </div>
        <p className="text-cream font-bold text-lg">My Space is only available for students</p>
        <p className="text-cream-muted text-sm max-w-sm leading-relaxed">
          Deadlines, timetables, budgeting and focus sessions are built for student accounts. Your business
          account can still post listings, chat with buyers and manage your storefront from your profile.
        </p>
        <button
          onClick={() => navigate(`/profile/${currentUser.id}`)}
          className="bg-teal-primary hover:opacity-85 text-white font-bold px-5 py-2.5 rounded-xl transition-opacity mt-2"
        >
          Go to My Profile
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      {showIntro && <MySpaceIntroModal onClose={() => setShowIntro(false)} />}

      <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3">
        <button onClick={() => navigate('/feed')} className="flex items-center gap-1.5 text-teal-light border border-teal-light/40 bg-teal-faint px-3 py-1.5 rounded-xl hover:bg-teal-light/10 transition-colors">
          <HomeIcon size={18} />
          <span className="text-sm font-medium">Feed</span>
        </button>
        <span className="text-cream font-bold">My Space</span>
      </div>

      <TodaySnapshot userId={currentUser.id} />

      <div className="overflow-x-auto scrollbar-hide px-4 py-3">
        <div className="flex gap-2 w-max">
          {TABS.map(t => {
            const meta = TAB_META[t]
            const Icon = meta.icon
            const isActive = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  isActive
                    ? `${meta.active} text-white`
                    : 'bg-transparent text-cream-muted border-slate-border hover:border-teal-light'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-cream-muted'} />
                {t}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4">
        {tab === 'Deadlines' && <DeadlinesSection userId={currentUser.id} />}
        {tab === 'Timetable' && <TimetableSection userId={currentUser.id} />}
        {tab === 'Schedule' && <ScheduleSection userId={currentUser.id} />}
        {tab === 'Budget' && <BudgetSection userId={currentUser.id} />}
        {tab === 'Pomodoro' && <PomodoroSection userId={currentUser.id} />}
        {tab === 'Watchlist' && <WatchlistSection userId={currentUser.id} />}
      </div>

      <BottomNav />
    </div>
  )
}
