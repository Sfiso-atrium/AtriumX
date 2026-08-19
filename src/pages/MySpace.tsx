import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Play, Pause, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { STUDENT_CATEGORIES } from '../components/common/CategoryChips'
import {
  Deadline, getDeadlines, createDeadline, deleteDeadline,
  ScheduleEntry, getScheduleEntries, createScheduleEntry, deleteScheduleEntry,
  BudgetEntry, getBudgetEntries, createBudgetEntry, deleteBudgetEntry,
  getTodayStudyMinutes, getYesterdayStudyMinutes, addStudyMinutes,
  Watchlist, getWatchlists, createWatchlist, deleteWatchlist,
} from '../services/dataService'
import BottomNav from '../components/common/BottomNav'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TABS = ['Deadlines', 'Schedule', 'Budget', 'Pomodoro', 'Watchlist'] as const
type Tab = typeof TABS[number]

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
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteDeadline(id)
    setItems(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
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
        <p className="text-cream-muted text-sm text-center py-6">No deadlines yet.</p>
      )}

      {items.map(d => {
        const due = new Date(d.due_at)
        const soon = due.getTime() - Date.now() < 24 * 60 * 60 * 1000
        return (
          <SectionCard key={d.id}>
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
          </SectionCard>
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

function PomodoroSection({ userId }: { userId: string }) {
  const [focusMinutes, setFocusMinutes] = useState(() => {
    const saved = Number(localStorage.getItem('pomodoro_focus_minutes'))
    return saved > 0 ? saved : 25
  })
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60)
  const [running, setRunning] = useState(false)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [dayMessage, setDayMessage] = useState<{ text: string; ahead: boolean } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { getTodayStudyMinutes(userId).then(setTodayMinutes) }, [userId])
  useEffect(() => { if (!running) setSecondsLeft(focusMinutes * 60) }, [focusMinutes, running])

  const handleSessionComplete = async () => {
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
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            setRunning(false)
            handleSessionComplete()
            return focusMinutes * 60
          }
          return s - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, userId, focusMinutes])

  const handlePreset = (m: number) => {
    setFocusMinutes(m)
    localStorage.setItem('pomodoro_focus_minutes', String(m))
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="flex flex-col gap-3">
      {celebrate && <GoldPaperFall />}

      <SectionCard>
        <div className="flex flex-col items-center py-6">
          <p className="text-cream font-serif text-5xl font-bold mb-6">{mins}:{secs}</p>
          <div className="flex gap-3">
            <button onClick={() => setRunning(r => !r)}
              className="bg-ember hover:bg-ember-dark text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
            </button>
            <button onClick={() => { setRunning(false); setSecondsLeft(focusMinutes * 60) }}
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
        {dayMessage && (
          <p className={`text-sm mt-2 ${dayMessage.ahead ? 'text-gold' : 'text-cream-muted'}`}>
            {dayMessage.text}
          </p>
        )}
      </SectionCard>
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

export default function MySpace() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [tab, setTab] = useState<Tab>('Deadlines')

  if (!currentUser) {
    navigate('/student')
    return null
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3">
        <button onClick={() => navigate(-1)} className="text-cream-muted hover:text-cream">
          <ArrowLeft size={20} />
        </button>
        <span className="text-cream font-bold">My Space</span>
      </div>

      <div className="overflow-x-auto scrollbar-hide px-4 py-3">
        <div className="flex gap-2 w-max">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                tab === t
                  ? 'bg-ember text-white border-ember'
                  : 'bg-transparent text-cream-muted border-slate-border hover:border-teal-light'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {tab === 'Deadlines' && <DeadlinesSection userId={currentUser.id} />}
        {tab === 'Schedule' && <ScheduleSection userId={currentUser.id} />}
        {tab === 'Budget' && <BudgetSection userId={currentUser.id} />}
        {tab === 'Pomodoro' && <PomodoroSection userId={currentUser.id} />}
        {tab === 'Watchlist' && <WatchlistSection userId={currentUser.id} />}
      </div>

      <BottomNav />
    </div>
  )
}
