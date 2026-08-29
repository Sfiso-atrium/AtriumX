import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Play, Pause, RotateCcw, Sparkles, X, ChevronDown, ChevronUp, CheckCircle2, Circle, CalendarClock, BookOpen, Clock, Wallet, Timer, Eye, PartyPopper, Lock, Users, Calendar, ClipboardList, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getSeenMySpaceIntro, markSeenMySpaceIntro } from '../services/dataService'
import { STUDENT_CATEGORIES } from '../components/common/CategoryChips'
import {
  Deadline, getDeadlines, createDeadline, deleteDeadline,
  ScheduleEntry, getScheduleEntries, createScheduleEntry, deleteScheduleEntry,
  BudgetEntry, getBudgetEntries, createBudgetEntry, deleteBudgetEntry,
  getTodayStudyMinutes, getYesterdayStudyMinutes,
  Watchlist, getWatchlists, createWatchlist, deleteWatchlist,
  StudyCourse, getStudyCourses, createStudyCourse, deleteStudyCourse,
  StudyPrepNote, getStudyPrepNotes, createStudyPrepNote, setStudyPrepClarified,
  getUnreadStudyGroupCount,
} from '../services/dataService'
import BottomNav from '../components/common/BottomNav'
import NotificationBell from '../components/common/NotificationBell'
import { useFocusSession } from '../hooks/useFocusSession'

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
const TAB_META: Record<Tab, { icon: typeof CalendarClock }> = {
  Deadlines: { icon: CalendarClock },
  Timetable: { icon: BookOpen },
  Schedule: { icon: Clock },
  Budget: { icon: Wallet },
  Pomodoro: { icon: Timer },
  Watchlist: { icon: Eye },
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
      <div className="w-7 h-7 rounded-full border border-slate-border bg-slate-card flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-cream-muted" />
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
      <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6 text-center overflow-hidden">
        <div className="flex justify-end mb-1">
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>
        <img
          src="/images/myspace/myspace-intro-summit.png"
          alt=""
          className="w-full h-28 sm:h-36 object-contain mx-auto mb-3"
        />
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
      <div className="bg-slate-card rounded-2xl p-3 flex items-center gap-3">
        <p className="text-cream text-sm font-bold leading-snug flex-1 min-w-0">Tick them off one by one — that's all a deadline list needs to be.</p>
        <img
          src="/images/myspace/myspace-deadlines-checklist.png"
          alt="A checklist notepad and alarm clock"
          className="w-36 h-28 sm:w-52 sm:h-40 object-contain flex-shrink-0"
        />
      </div>
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
      <div className="bg-slate-card rounded-2xl p-3 flex items-center gap-3">
        <p className="text-cream text-sm font-bold leading-snug flex-1 min-w-0">Every rand logged is one less surprise at month-end.</p>
        <img
          src="/images/myspace/myspace-budget-piggybank.png"
          alt="A piggy bank with Rand coins and a wallet"
          className="w-36 h-24 sm:w-52 sm:h-36 object-contain flex-shrink-0"
        />
      </div>
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

function FocusTimerVisual({
  mins,
  secs,
  focusMinutes,
  label = 'Focus session',
}: {
  mins: string
  secs: string
  focusMinutes: number
  label?: string
}) {
  const totalSeconds = focusMinutes * 60
  const remainingSeconds =
    Number(mins) * 60 + Number(secs)

  const progress = totalSeconds
    ? 1 - remainingSeconds / totalSeconds
    : 0

  const circumference = 2 * Math.PI * 118
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative w-[260px] h-[260px] flex items-center justify-center">
      <svg
        viewBox="0 0 260 260"
        className="absolute inset-0 w-full h-full -rotate-90"
      >
        <circle
          cx="130"
          cy="130"
          r="118"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-slate-border"
        />

        <circle
          cx="130"
          cy="130"
          r="118"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-gold transition-all duration-700"
        />
      </svg>

      <div className="text-center">
        <p className="text-cream font-serif text-6xl font-bold tracking-tight">
          {mins}:{secs}
        </p>

        <p className="text-cream-muted text-sm mt-2">
          {label}
        </p>
      </div>
    </div>
  )
}

// Both this widget and the Focus Mode page (/focus) render off one shared
// session — useFocusSession — backed by the same localStorage keys. So
// starting here and continuing on /focus (or the reverse) is the same
// clock, not two, and study minutes get credited to Supabase as they're
// earned rather than only if the whole preset finishes.
function PomodoroSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const navigate = useNavigate()
  const session = useFocusSession(userId)
  const { phase, running, focusMinutes, breakMinutes, mins, secs, setFocusMinutes, toggle, reset, start } = session

  const [todayMinutes, setTodayMinutes] = useState(0)
  const [yesterdayMinutes, setYesterdayMinutes] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [dayMessage, setDayMessage] = useState<{ text: string; ahead: boolean } | null>(null)
  const prevPhaseRef = useRef(phase)

  useEffect(() => {
    getTodayStudyMinutes(userId).then(setTodayMinutes)
    getYesterdayStudyMinutes(userId).then(setYesterdayMinutes)
  }, [userId])

  // Study minutes land in Supabase progressively (see useFocusSession), so
  // keep "today" fresh while a study phase is actually running rather than
  // only refetching once on mount.
  useEffect(() => {
    if (phase !== 'study' || !running) return
    const interval = setInterval(() => { getTodayStudyMinutes(userId).then(setTodayMinutes) }, 15000)
    return () => clearInterval(interval)
  }, [phase, running, userId])

  // study -> break is "session complete" from a study-minutes standpoint —
  // every minute of it is already banked by then — so that's the moment
  // the congratulatory toast and today-vs-yesterday message fire.
  useEffect(() => {
    if (prevPhaseRef.current === 'study' && phase === 'break') {
      showToast(pickMessage(SESSION_COMPLETE_MESSAGES, 'pomodoro_last_complete_msg'), 'success')
      getTodayStudyMinutes(userId).then(async newTotal => {
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
      })
    }
    prevPhaseRef.current = phase
  }, [phase, userId, showToast])

  const handleToggle = () => {
    if (phase === 'idle' || phase === 'done') start(focusMinutes)
    else toggle()
  }

  const handlePreset = (m: number) => setFocusMinutes(m)

  return (
    <div className="flex flex-col gap-3">
      {celebrate && <GoldPaperFall />}
      <TabIntro tab="Pomodoro" />
      <section className="pomodoro-card relative overflow-hidden rounded-3xl border border-slate-border bg-gradient-to-br from-slate-card to-slate-deep p-6 sm:p-8">
        <div className="absolute inset-x-0 bottom-0 h-24 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(13,148,136,0.25),transparent_65%)]" />
        </div>

        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
          <div className="flex justify-center">
            <FocusTimerVisual
              mins={mins}
              secs={secs}
              focusMinutes={phase === 'break' ? breakMinutes : focusMinutes}
              label={phase === 'break' ? 'Break' : 'Focus session'}
            />
          </div>

          <div className="flex flex-col items-center lg:items-start">
            <p className="text-cream-muted text-sm mb-4">
              {phase === 'break' ? "On break — this time isn't counted." : 'One session at a time.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleToggle}
                className="bg-gold hover:bg-gold-muted text-slate-deep font-bold px-7 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors"
              >
                {running
                  ? <><Pause size={16} /> Pause</>
                  : <><Play size={16} /> Start</>
                }
              </button>

              <button
                onClick={reset}
                className="bg-slate-deep border border-slate-border text-cream-muted hover:text-cream font-bold px-4 py-3 rounded-xl transition-colors"
              >
                <RotateCcw size={17} />
              </button>
            </div>

            <div className="mt-8 max-w-sm">
              <p className="text-cream-muted italic text-sm leading-relaxed">
                "Discipline is choosing what matters most and giving it your full attention."
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Timer size={17} className="text-teal-light" />
          <p className="text-cream font-bold text-sm">
            Focus length
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {FOCUS_PRESETS.map(m => (
            <button
              key={m}
              disabled={running}
              onClick={() => handlePreset(m)}
              className={`py-3 rounded-xl text-sm font-bold border transition-all disabled:opacity-40 ${
                focusMinutes === m
                  ? 'bg-teal-primary text-white border-teal-light shadow-lg shadow-teal-primary/20'
                  : 'bg-slate-deep text-cream-muted border-slate-border hover:border-teal-light hover:text-cream'
              }`}
            >
              {m}m
            </button>
          ))}

          <input
            type="number"
            min="1"
            max="180"
            disabled={running}
            value={FOCUS_PRESETS.includes(focusMinutes) ? '' : focusMinutes}
            placeholder="Custom"
            onChange={e =>
              handlePreset(
                Math.max(
                  1,
                  Math.min(180, Number(e.target.value) || 1)
                )
              )
            }
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-3 text-sm text-cream placeholder:text-cream-muted disabled:opacity-40 focus:outline-none focus:border-teal-light"
          />
        </div>
      </SectionCard>

      <div className="grid sm:grid-cols-2 gap-3">
        <SectionCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-cream-muted text-xs mb-2">Today</p>
              <p className="text-teal-light text-3xl font-serif font-bold">
                {todayMinutes} min
              </p>
              <p className="text-cream-muted text-xs mt-2">
                Studied today
              </p>
            </div>

            <div className="w-11 h-11 rounded-full border-4 border-teal-primary/30 border-t-teal-light" />
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-cream-muted text-xs mb-2">Yesterday</p>
              <p className="text-cream text-3xl font-serif font-bold">
                {yesterdayMinutes} min
              </p>
              <p className="text-cream-muted text-xs mt-2">
                Studied yesterday
              </p>
            </div>

            <div className="w-11 h-11 rounded-full border-4 border-sapphire-light/20 border-t-sapphire-light/50" />
          </div>
        </SectionCard>
      </div>

      {dayMessage && (
        <p className={`text-sm text-center ${dayMessage.ahead ? 'text-gold' : 'text-cream-muted'}`}>
          {dayMessage.text}
        </p>
      )}

      <button
        onClick={() => navigate('/focus')}
        className="group w-full flex items-center justify-between bg-gold hover:bg-gold-muted text-slate-deep px-5 py-4 rounded-2xl transition-all shadow-lg shadow-gold/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Sparkles size={19} />
          </div>

          <div className="text-left">
            <p className="font-bold text-sm">
              Enter Focus Mode
            </p>
            <p className="text-xs opacity-70">
              Minimize distractions. Maximize growth.
            </p>
          </div>
        </div>

        <ChevronDown
          size={18}
          className="-rotate-90 group-hover:translate-x-1 transition-transform"
        />
      </button>

      <div className="bg-slate-card rounded-2xl p-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-cream font-bold text-sm sm:text-base">Consistency is your superpower.</p>
          <p className="text-cream-muted text-xs sm:text-sm">Show up today, thank yourself tomorrow.</p>
        </div>
        <div className="w-44 h-28 sm:w-72 sm:h-40 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src="/images/myspace/myspace-snapshot-milestones.png"
            alt="A path winding up a mountain to a flag at the summit"
            className="w-full h-full object-cover"
          />
        </div>
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

// Live, computed fresh from the real date every time — never stored, never
// asked of the user. dayIdx 0=Sunday..6=Saturday, matching DAYS above.
function getDateForDayOfWeek(dayIdx: number): string {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const target = new Date(startOfWeek)
  target.setDate(startOfWeek.getDate() + dayIdx)
  return target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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
          <div key={dayIdx} className="bg-slate-card border border-slate-border rounded-2xl p-3 sm:p-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex items-center gap-3 sm:w-32 md:w-36 sm:flex-shrink-0 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-faint border border-teal-light/25 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-teal-light sm:hidden" />
                  <Calendar size={18} className="text-teal-light hidden sm:block" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-cream font-bold text-xs sm:text-sm truncate">{dayName}</p>
                  <p className="text-teal-light text-[11px] sm:text-xs truncate">{getDateForDayOfWeek(dayIdx)}</p>
                </div>
                {dayCourses.length < 3 && (
                  <button
                    onClick={() => setOpenDayForm(openDayForm === dayIdx ? null : dayIdx)}
                    className="sm:hidden flex-shrink-0 flex items-center gap-1 border border-teal-light/40 text-teal-light hover:bg-teal-light/10 text-[11px] font-bold px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0 w-full">
                {dayCourses.length === 0 ? (
                  <div className="flex items-center gap-3 min-h-10">
                    <div className="w-9 h-9 rounded-full bg-slate-deep border border-slate-border flex items-center justify-center flex-shrink-0">
                      <ClipboardList size={16} className="text-cream-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-cream text-xs sm:text-sm font-bold">No courses planned yet</p>
                      <p className="text-cream-muted text-[11px] sm:text-xs">Small steps add up.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayCourses.map(course => {
                      const note = preps.find(p => p.course_id === course.id)
                      const isExpanded = expanded === course.id
                      return (
                        <div key={course.id} className="bg-slate-deep border border-slate-border rounded-xl px-2.5 sm:px-3 py-2 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => course.prepped ? setExpanded(isExpanded ? null : course.id) : setPrepTarget(course)}
                              className="flex-shrink-0"
                              aria-label={course.prepped ? 'View prep notes' : 'Prep for this session'}
                            >
                              {course.prepped
                                ? <CheckCircle2 size={18} className="text-teal-light sm:hidden" />
                                : <Circle size={18} className="text-cream-muted sm:hidden" />}
                              {course.prepped
                                ? <CheckCircle2 size={20} className="text-teal-light hidden sm:block" />
                                : <Circle size={20} className="text-cream-muted hidden sm:block" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-cream text-xs sm:text-sm font-bold truncate">{course.course_name}</p>
                              <p className="text-cream-muted text-[11px] sm:text-xs">{course.minutes} min</p>
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
                              <p className="text-[11px] sm:text-xs break-words"><span className="text-cream-muted">Focus: </span><span className="text-cream">{note.focus_topic}</span></p>
                              <p className="text-[11px] sm:text-xs break-words"><span className="text-cream-muted">Resource: </span><span className="text-cream">{note.resource}</span></p>
                              <p className="text-[11px] sm:text-xs break-words"><span className="text-cream-muted">Goal: </span><span className="text-cream">{note.goal}</span></p>
                              {note.clarification_question && (
                                <button
                                  onClick={() => handleClarifiedToggle(note)}
                                  className="flex items-start gap-2 mt-1.5 text-left"
                                >
                                  {note.clarified
                                    ? <CheckCircle2 size={16} className="text-teal-light flex-shrink-0 mt-0.5" />
                                    : <Circle size={16} className="text-cream-muted flex-shrink-0 mt-0.5" />}
                                  <span className={`text-[11px] sm:text-xs break-words ${note.clarified ? 'text-cream-muted line-through' : 'text-cream'}`}>
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
                )}
              </div>

              {dayCourses.length < 3 && (
                <button
                  onClick={() => setOpenDayForm(openDayForm === dayIdx ? null : dayIdx)}
                  className="hidden sm:flex flex-shrink-0 items-center gap-1.5 border border-teal-light/40 text-teal-light hover:bg-teal-light/10 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                >
                  <Plus size={14} /> Add course
                </button>
              )}
            </div>

            {totalMinutes > 0 && (
              <p className="text-cream-muted text-[11px] sm:text-xs mt-2 sm:ml-[60px]">{totalMinutes} min planned</p>
            )}

            {openDayForm === dayIdx && (
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-border">
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
            )}
          </div>
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
      <div className="relative flex items-stretch gap-3">
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="mb-3">
            <p className="text-cream font-serif text-lg mb-1">Hey {firstName} 👋</p>
            <p className="text-cream-muted text-xs">Stay consistent, your future self is counting on you.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 bg-slate-deep border border-slate-border rounded-xl px-1.5 sm:px-2.5 py-1.5">
              <CalendarClock size={13} className="text-cream-muted flex-shrink-0 sm:w-[15px] sm:h-[15px]" />
              <div className="min-w-0">
                <p className="text-cream text-[10px] sm:text-[11px] font-bold truncate">{nextDeadline ? `${daysUntil}d left` : 'No deadlines'}</p>
                <p className="text-cream-muted text-[8px] sm:text-[9px] truncate">Upcoming</p>
              </div>
            </div>
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 bg-slate-deep border border-slate-border rounded-xl px-1.5 sm:px-2.5 py-1.5">
              <Timer size={13} className="text-cream-muted flex-shrink-0 sm:w-[15px] sm:h-[15px]" />
              <div className="min-w-0">
                <p className="text-cream text-[10px] sm:text-[11px] font-bold truncate">{todayMinutes} min</p>
                <p className="text-cream-muted text-[8px] sm:text-[9px] truncate">Focused today</p>
              </div>
            </div>
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 bg-slate-deep border border-slate-border rounded-xl px-1.5 sm:px-2.5 py-1.5">
              <Wallet size={13} className="text-cream-muted flex-shrink-0 sm:w-[15px] sm:h-[15px]" />
              <div className="min-w-0">
                <p className="text-cream text-[10px] sm:text-[11px] font-bold truncate">R{balance.toFixed(0)}</p>
                <p className="text-cream-muted text-[8px] sm:text-[9px] truncate">Left in budget</p>
              </div>
            </div>
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 bg-slate-deep border border-slate-border rounded-xl px-1.5 sm:px-2.5 py-1.5">
              <Eye size={13} className="text-cream-muted flex-shrink-0 sm:w-[15px] sm:h-[15px]" />
              <div className="min-w-0">
                <p className="text-cream text-[10px] sm:text-[11px] font-bold truncate">{watchCount}</p>
                <p className="text-cream-muted text-[8px] sm:text-[9px] truncate">Watching</p>
              </div>
            </div>
          </div>
        </div>
        <img
          src="/images/myspace/myspace-hero-desk.png"
          alt="A cosy study desk with books, a lamp, coffee, and a laptop"
          className="w-32 sm:w-56 md:w-64 object-contain object-right flex-shrink-0 self-center"
        />
      </div>
    </div>
  )
}

export default function MySpace() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [tab, setTab] = useState<Tab>('Deadlines')
  const [showIntro, setShowIntro] = useState(false)
  const [unreadGroups, setUnreadGroups] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    getSeenMySpaceIntro(currentUser.id).then(seen => {
      if (!seen) {
        setShowIntro(true)
        markSeenMySpaceIntro(currentUser.id)
      }
    })
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    getUnreadStudyGroupCount(currentUser.id).then(setUnreadGroups)
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
        <span className="text-cream font-bold flex-1">My Space</span>
        <button onClick={() => navigate('/groups')} className="relative text-cream-muted hover:text-cream transition-colors">
          <Users size={20} />
          {unreadGroups > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-slate-deep">
              {unreadGroups > 9 ? '9+' : unreadGroups}
            </span>
          )}
        </button>
        <NotificationBell />
        <button
          onClick={() => navigate(`/profile/${currentUser.id}`)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: currentUser.avatar_color }}
        >
          {currentUser.avatar_initials}
        </button>
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
                    ? 'bg-teal-primary border-teal-primary text-white'
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
