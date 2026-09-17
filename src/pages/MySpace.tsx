import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Play, Pause, RotateCcw, Sparkles, X, ChevronDown, ChevronUp, CheckCircle2, Circle, CalendarClock, BookOpen, Clock, Wallet, Timer, Eye, PartyPopper, Lock, Users, Calendar, ClipboardList, Plus, NotebookText, ArrowLeft } from 'lucide-react'
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
const TABS = ['Deadlines', 'Timetable', 'Schedule', 'Budget', 'Pomodoro', 'Watchlist', 'Notebook'] as const
type Tab = typeof TABS[number]

const TAB_INTRO: Record<Tab, string> = {
  Deadlines: "Every exam and assignment due date lives here, so nothing sneaks up on you. You've got this. 💪",
  Timetable: "Plan your study week course by course — a few minutes now saves a scramble later.",
  Schedule: "Enter your week once and this tab always knows what's next for you.",
  Budget: "Log what comes in and what goes out, and always know what's left. Small habit, big peace of mind.",
  Pomodoro: "Focus in short bursts, log your minutes, and watch your streak grow. One session at a time.",
  Watchlist: "Tell us what you're after and we'll ping you the moment it turns up. No more refreshing the feed.",
  Notebook: "Private notes and files, locked with a passcode only you know. Not even AtriumX can read them.",
}

const TAB_META: Record<Tab, { icon: typeof CalendarClock }> = {
  Deadlines: { icon: CalendarClock },
  Timetable: { icon: BookOpen },
  Schedule: { icon: Clock },
  Budget: { icon: Wallet },
  Pomodoro: { icon: Timer },
  Watchlist: { icon: Eye },
  Notebook: { icon: NotebookText },
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

// --- ORIGINAL SECTIONS KEPT 100% (copied from your backup) ---
// For brevity, I am referencing them via import from the same file? No, we inline them to avoid duplication.
// Below are the exact section components from your original file - unchanged logic.

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
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What is it? (e.g. Math exam)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream focus:outline-none focus:border-teal-light" />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
            className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
          <button onClick={handleAdd} className="bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-sm transition-colors">Add</button>
        </div>
      </SectionCard>
      {loading ? <p className="text-cream-muted text-sm">Loading...</p> : items.map(d => (
        <SectionCard key={d.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-cream font-bold text-sm truncate">{d.title}</p>
              <p className="text-gold text-xs mt-0.5">{new Date(d.due_at).toLocaleString('en-ZA')}</p>
              {d.notes && <p className="text-cream-muted text-xs mt-1">{d.notes}</p>}
            </div>
            <DeleteBtn onClick={() => handleDelete(d.id)} />
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

function TimetableSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [courses, setCourses] = useState<StudyCourse[]>([])
  const [preps, setPreps] = useState<StudyPrepNote[]>([])
  const [day, setDay] = useState('1')
  const [courseName, setCourseName] = useState('')
  const [minutes, setMinutes] = useState('')
  const [openDayForm, setOpenDayForm] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [prepTarget, setPrepTarget] = useState<StudyCourse | null>(null)
  const load = () => {
    getStudyCourses(userId).then(setCourses)
    getStudyPrepNotes(userId).then(setPreps)
  }
  useEffect(() => { load() }, [userId])
  const getDateForDayOfWeek = (dayIdx: number) => {
    const now = new Date()
    const diff = dayIdx - now.getDay()
    const target = new Date(now)
    target.setDate(now.getDate() + diff)
    return target.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
  }
  const handleAddCourse = async (dayIdx: number) => {
    if (!courseName.trim() || !minutes) { showToast('Add a course and minutes.', 'error'); return }
    const { error } = await createStudyCourse(userId, dayIdx, courseName.trim(), Number(minutes))
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
  function PrepModal({ course, onClose, onSubmitted }: { course: StudyCourse, onClose: () => void, onSubmitted: () => void }) {
    const [focus, setFocus] = useState('')
    const [resource, setResource] = useState('')
    const [goal, setGoal] = useState('')
    const [question, setQuestion] = useState('')
    const { showToast } = useApp()
    const handleSubmit = async () => {
      if (!focus.trim() || !resource.trim() || !goal.trim()) { showToast('Fill all prep fields.', 'error'); return }
      const { error } = await createStudyPrepNote(course.id, userId, focus.trim(), resource.trim(), goal.trim(), question.trim())
      if (error) { showToast(error, 'error'); return }
      showToast('Prep saved — you are ready.', 'success')
      onSubmitted()
    }
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
        <div className="bg-slate-card border border-slate-border rounded-2xl w-full max-w-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-cream font-bold">Prep for {course.course_name}</p>
            <button onClick={onClose}><X size={18} className="text-cream-muted" /></button>
          </div>
          <div className="flex flex-col gap-2">
            <input value={focus} onChange={e => setFocus(e.target.value)} placeholder="Focus topic" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" />
            <input value={resource} onChange={e => setResource(e.target.value)} placeholder="Resource" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" />
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Goal" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" />
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Question (optional)" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" />
            <button onClick={handleSubmit} className="bg-teal-primary text-white font-bold py-2 rounded-xl text-sm">Save prep</button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Timetable" />
      {DAYS.map((dayName, dayIdx) => {
        const dayCourses = courses.filter(c => c.day_of_week === dayIdx)
        return (
          <div key={dayIdx} className="bg-slate-card border border-slate-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-cream font-bold text-sm">{dayName}</p>
                <p className="text-teal-light text-xs">{getDateForDayOfWeek(dayIdx)}</p>
              </div>
              <button onClick={() => setOpenDayForm(openDayForm === dayIdx ? null : dayIdx)} className="border border-teal-light/40 text-teal-light text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            {dayCourses.length === 0 ? <p className="text-cream-muted text-xs">No courses planned yet</p> : dayCourses.map(course => {
              const note = preps.find(p => p.course_id === course.id)
              const isExpanded = expanded === course.id
              return (
                <div key={course.id} className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => course.prepped ? setExpanded(isExpanded ? null : course.id) : setPrepTarget(course)}>{course.prepped ? <CheckCircle2 size={18} className="text-teal-light" /> : <Circle size={18} className="text-cream-muted" />}</button>
                    <div className="min-w-0 flex-1"><p className="text-cream text-sm font-bold truncate">{course.course_name}</p><p className="text-cream-muted text-xs">{course.minutes} min</p></div>
                    {course.prepped && <button onClick={() => setExpanded(isExpanded ? null : course.id)} className="text-cream-muted">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>}
                    <DeleteBtn onClick={() => handleDeleteCourse(course.id)} />
                  </div>
                  {isExpanded && note && <div className="mt-2 pt-2 border-t border-slate-border text-xs text-cream"><p>Focus: {note.focus_topic}</p><p>Resource: {note.resource}</p><p>Goal: {note.goal}</p></div>}
                </div>
              )
            })}
            {openDayForm === dayIdx && (
              <div className="mt-3 flex flex-col gap-2">
                <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" />
                <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="Minutes" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" />
                <div className="flex gap-2"><button onClick={() => handleAddCourse(dayIdx)} className="flex-1 bg-ember text-white font-bold py-2 rounded-xl text-sm">Add</button><button onClick={() => setOpenDayForm(null)} className="flex-1 border border-slate-border text-cream-muted py-2 rounded-xl text-sm">Cancel</button></div>
              </div>
            )}
          </div>
        )
      })}
      {prepTarget && <PrepModal course={prepTarget} onClose={() => setPrepTarget(null)} onSubmitted={() => { setPrepTarget(null); load() }} />}
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
      {next && <SectionCard><p className="text-cream-muted text-xs mb-1">Next class</p><p className="text-cream font-bold">{next.entry.module}</p><p className="text-teal-light text-sm">{DAYS[next.entry.day_of_week]} · {next.entry.start_time.slice(0,5)}{next.entry.room ? ` · ${next.entry.room}` : ''}</p></SectionCard>}
      <SectionCard><p className="text-cream font-bold text-sm mb-3">Add a class</p><div className="flex flex-col gap-2"><select value={day} onChange={e => setDay(e.target.value)} className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream">{DAYS.map((d,i) => <option key={i} value={i}>{d}</option>)}</select><input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" /><input value={module} onChange={e => setModule(e.target.value)} placeholder="Module" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" /><input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room (optional)" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" /><button onClick={handleAdd} className="bg-ember text-white font-bold py-2 rounded-xl text-sm">Add</button></div></SectionCard>
      {items.map(s => <SectionCard key={s.id}><div className="flex items-center justify-between gap-3"><div><p className="text-cream font-bold text-sm">{s.module}</p><p className="text-cream-muted text-xs">{DAYS[s.day_of_week]} · {s.start_time.slice(0,5)}{s.room ? ` · ${s.room}` : ''}</p></div><DeleteBtn onClick={() => handleDelete(s.id)} /></div></SectionCard>)}
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
    setAmount(''); setNote(''); load()
  }
  const handleDelete = async (id: string) => { await deleteBudgetEntry(id); setItems(prev => prev.filter(e => e.id !== id)) }
  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Budget" />
      <SectionCard><p className="text-cream-muted text-xs mb-1">Balance</p><p className={`text-2xl font-serif font-bold ${balance >= 0 ? 'text-teal-light' : 'text-red-400'}`}>R{balance.toFixed(2)}</p></SectionCard>
      <SectionCard><p className="text-cream font-bold text-sm mb-3">Log money</p><div className="flex flex-col gap-2"><div className="flex gap-2"><button onClick={() => setDirection('in')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${direction === 'in' ? 'bg-teal-primary text-white' : 'bg-slate-deep text-cream-muted border border-slate-border'}`}>Money in</button><button onClick={() => setDirection('out')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${direction === 'out' ? 'bg-ember text-white' : 'bg-slate-deep text-cream-muted border border-slate-border'}`}>Money out</button></div><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (R)" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" /><input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" /><button onClick={handleAdd} className="bg-ember text-white font-bold py-2 rounded-xl text-sm">Add</button></div></SectionCard>
      {items.map(e => <SectionCard key={e.id}><div className="flex items-center justify-between gap-3"><div><p className={`font-bold text-sm ${e.direction === 'in' ? 'text-teal-light' : 'text-ember'}`}>{e.direction === 'in' ? '+' : '-'}R{e.amount.toFixed(2)}</p>{e.note && <p className="text-cream-muted text-xs truncate">{e.note}</p>}</div><DeleteBtn onClick={() => handleDelete(e.id)} /></div></SectionCard>)}
    </div>
  )
}

function PomodoroSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [yesterdayMinutes, setYesterdayMinutes] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const focus = useFocusSession(userId)
  useEffect(() => { getTodayStudyMinutes(userId).then(setTodayMinutes); getYesterdayStudyMinutes(userId).then(setYesterdayMinutes) }, [userId, focus.totalToday])
  const mins = String(Math.floor(focus.secondsLeft / 60)).padStart(2, '0')
  const secs = String(focus.secondsLeft % 60).padStart(2, '0')
  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Pomodoro" />
      <SectionCard>
        <div className="flex flex-col items-center py-2">
          <div className="relative w-[200px] h-[200px] flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full -rotate-90"><circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-border" /><circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 90} strokeDashoffset={(2 * Math.PI * 90) * (1 - (focus.focusMinutes ? 1 - focus.secondsLeft / (focus.focusMinutes * 60) : 0))} className="text-gold transition-all duration-700" /></svg>
            <div className="text-center"><p className="text-cream font-serif text-4xl font-bold">{mins}:{secs}</p><p className="text-cream-muted text-xs mt-1">{focus.isRunning ? 'Focusing...' : 'Ready'}</p></div>
          </div>
          <div className="flex gap-2 mt-4"><button onClick={focus.isRunning ? focus.pause : focus.start} className="w-12 h-12 rounded-full bg-ember text-white flex items-center justify-center">{focus.isRunning ? <Pause size={18} /> : <Play size={18} />}</button><button onClick={focus.reset} className="w-12 h-12 rounded-full bg-slate-deep border border-slate-border text-cream-muted flex items-center justify-center"><RotateCcw size={18} /></button></div>
          <div className="flex gap-2 mt-3">{[15,25,45,60].map(m => <button key={m} onClick={() => focus.setFocusMinutes(m)} className={`px-3 py-1 rounded-full text-xs border ${focus.focusMinutes === m ? 'bg-teal-primary border-teal-primary text-white' : 'border-slate-border text-cream-muted'}`}>{m}m</button>)}</div>
          <p className="text-cream-muted text-xs mt-3">{todayMinutes} min today • {yesterdayMinutes} min yesterday</p>
        </div>
      </SectionCard>
    </div>
  )
}

function WatchlistSection({ userId }: { userId: string }) {
  const { showToast } = useApp()
  const [items, setItems] = useState<Watchlist[]>([])
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('all')
  const load = () => getWatchlists(userId).then(setItems)
  useEffect(() => { load() }, [userId])
  const handleAdd = async () => {
    if (!keyword.trim()) { showToast('Add a keyword.', 'error'); return }
    const { error } = await createWatchlist(userId, keyword.trim(), category)
    if (error) { showToast(error, 'error'); return }
    setKeyword(''); load(); showToast('Watchlist added.', 'success')
  }
  const handleDelete = async (id: string) => { await deleteWatchlist(id); setItems(prev => prev.filter(w => w.id !== id)) }
  return (
    <div className="flex flex-col gap-3">
      <TabIntro tab="Watchlist" />
      <SectionCard><p className="text-cream font-bold text-sm mb-3">Add watch</p><div className="flex flex-col gap-2"><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. Laptop, Textbook" className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream" /><select value={category} onChange={e => setCategory(e.target.value)} className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream"><option value="all">All categories</option>{STUDENT_CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><button onClick={handleAdd} className="bg-ember text-white font-bold py-2 rounded-xl text-sm">Watch</button></div></SectionCard>
      {items.map(w => <SectionCard key={w.id}><div className="flex items-center justify-between gap-3"><div><p className="text-cream font-bold text-sm">{w.keyword}</p><p className="text-cream-muted text-xs">{w.category}</p></div><DeleteBtn onClick={() => handleDelete(w.id)} /></div></SectionCard>)}
    </div>
  )
}

function NotebookSection() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-4">
      <TabIntro tab="Notebook" />
      <button onClick={() => navigate('/notebook')} className="w-full flex items-center justify-between bg-gold text-slate-deep px-5 py-4 rounded-2xl font-bold">Open Notebook<NotebookText size={18} /></button>
    </div>
  )
}

function TodaySnapshotCards({ userId }: { userId: string }) {
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
    getBudgetEntries(userId).then(entries => setBalance(entries.reduce((s, e) => s + (e.direction === 'in' ? e.amount : -e.amount), 0)))
    getWatchlists(userId).then(w => setWatchCount(w.length))
  }, [userId])
  const daysUntil = nextDeadline ? Math.max(0, Math.ceil((new Date(nextDeadline.due_at).getTime() - Date.now()) / (86400000))) : null
  const cards = [
    { label: 'Upcoming Deadlines', value: nextDeadline ? `${daysUntil} days` : 'No deadlines', sub: nextDeadline?.title?.slice(0, 20) || 'All clear', icon: CalendarClock },
    { label: "Today's Focus", value: `${todayMinutes} min`, sub: 'Keep it up', icon: Timer },
    { label: 'Budget Balance', value: `R${balance.toFixed(0)}`, sub: balance >=0 ? 'On track' : 'Over budget', icon: Wallet },
    { label: 'Watchlist', value: `${watchCount} items`, sub: 'Watching', icon: Eye },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => {
        const Icon = c.icon
        return (
          <div key={c.label} className="bg-slate-card border border-slate-border rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2"><div className="w-8 h-8 rounded-xl bg-slate-deep border border-slate-border flex items-center justify-center"><Icon size={14} className="text-cream-muted" /></div></div>
            <p className="text-cream-muted text-[11px]">{c.label}</p>
            <p className="text-cream font-bold text-sm mt-0.5">{c.value}</p>
            <p className="text-cream-muted text-[11px] truncate mt-1">{c.sub}</p>
          </div>
        )
      })}
    </div>
  )
}

// --- NEW DASHBOARD SHELL ---
export default function MySpace() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [activeTool, setActiveTool] = useState<Tab | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [unreadGroups, setUnreadGroups] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    getSeenMySpaceIntro(currentUser.id).then(seen => {
      if (!seen) { setShowIntro(true); markSeenMySpaceIntro(currentUser.id) }
    })
  }, [currentUser])
  useEffect(() => { if (!currentUser) return; getUnreadStudyGroupCount(currentUser.id).then(setUnreadGroups) }, [currentUser])

  if (!currentUser) { navigate('/student'); return null }
  if (currentUser.account_type === 'business') {
    return (
      <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-card border border-slate-border flex items-center justify-center"><Lock size={24} className="text-cream-muted" /></div>
        <p className="text-cream font-bold text-lg">My Space is only available for students</p>
        <p className="text-cream-muted text-sm max-w-sm">Deadlines, timetables, budgeting and focus sessions are built for student accounts.</p>
        <button onClick={() => navigate(`/profile/${currentUser.id}`)} className="bg-teal-primary text-white font-bold px-5 py-2.5 rounded-xl mt-2">Go to My Profile</button>
      </div>
    )
  }

  const firstName = currentUser.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const grouped = {
    Plan: [
      { id: 'Deadlines' as Tab, label: 'Deadlines', desc: 'Exams & assignments', icon: CalendarClock },
      { id: 'Timetable' as Tab, label: 'Timetable', desc: 'Study week plan', icon: BookOpen },
      { id: 'Schedule' as Tab, label: 'Schedule', desc: 'Class times', icon: Clock },
    ],
    Money: [
      { id: 'Budget' as Tab, label: 'Budget', desc: 'Income & spending', icon: Wallet },
    ],
    Focus: [
      { id: 'Pomodoro' as Tab, label: 'Pomodoro', desc: 'Focus timer', icon: Timer },
    ],
    Personal: [
      { id: 'Watchlist' as Tab, label: 'Watchlist', desc: 'Items you want', icon: Eye },
      { id: 'Notebook' as Tab, label: 'Notebook', desc: 'Private notes', icon: NotebookText },
    ],
  }

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      {showIntro && <MySpaceIntroModal onClose={() => setShowIntro(false)} />}

      {/* Top bar - kept minimal, matches Step 1 shell */}
      <div className="sticky top-0 z-20 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3 md:ml-64">
        <span className="text-cream font-bold flex-1">My Space</span>
        <button onClick={() => navigate('/groups')} className="relative text-cream-muted hover:text-cream"><Users size={20} />{unreadGroups > 0 && <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-slate-deep">{unreadGroups > 9 ? '9+' : unreadGroups}</span>}</button>
        <NotificationBell />
        <button onClick={() => navigate(`/profile/${currentUser.id}`)} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: currentUser.avatar_color }}>{currentUser.avatar_initials}</button>
      </div>

      <div className="md:ml-64 max-w-6xl mx-auto">
        {activeTool ? (
          // Detail view - one tool at a time
          <div className="px-4 pt-4">
            <button onClick={() => setActiveTool(null)} className="flex items-center gap-2 text-cream-muted hover:text-cream text-sm mb-4"><ArrowLeft size={16} /> Back to My Space</button>
            <h2 className="text-cream font-bold text-xl mb-4">{activeTool}</h2>
            {activeTool === 'Deadlines' && <DeadlinesSection userId={currentUser.id} />}
            {activeTool === 'Timetable' && <TimetableSection userId={currentUser.id} />}
            {activeTool === 'Schedule' && <ScheduleSection userId={currentUser.id} />}
            {activeTool === 'Budget' && <BudgetSection userId={currentUser.id} />}
            {activeTool === 'Pomodoro' && <PomodoroSection userId={currentUser.id} />}
            {activeTool === 'Watchlist' && <WatchlistSection userId={currentUser.id} />}
            {activeTool === 'Notebook' && <NotebookSection />}
          </div>
        ) : (
          // Dashboard view - grouped
          <div className="px-4 pt-6 flex flex-col gap-8">
            {/* Greeting */}
            <div>
              <h1 className="text-cream font-serif text-2xl font-bold">{greeting}, {firstName} 👋</h1>
              <p className="text-cream-muted text-sm mt-1">Here's what's happening in your space.</p>
            </div>

            <TodaySnapshotCards userId={currentUser.id} />

            {/* Quick Access + Recent Activity two-column on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-cream font-bold text-sm mb-3">Quick Access</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plan */}
                    <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
                      <p className="text-cream-muted text-[11px] font-bold uppercase tracking-wider mb-3">Plan</p>
                      <div className="flex flex-col gap-2">
                        {grouped.Plan.map(item => {
                          const Icon = item.icon
                          return (
                            <button key={item.id} onClick={() => setActiveTool(item.id)} className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-slate-deep border border-transparent hover:border-slate-border transition-colors">
                              <div className="w-9 h-9 rounded-xl bg-slate-deep border border-slate-border flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-cream-muted" /></div>
                              <div className="min-w-0 flex-1"><p className="text-cream text-sm font-medium">{item.label}</p><p className="text-cream-muted text-xs truncate">{item.desc}</p></div>
                              <ChevronDown size={14} className="text-cream-muted -rotate-90" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {/* Money */}
                    <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
                      <p className="text-cream-muted text-[11px] font-bold uppercase tracking-wider mb-3">Money</p>
                      {grouped.Money.map(item => {
                        const Icon = item.icon
                        return (
                          <button key={item.id} onClick={() => setActiveTool(item.id)} className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-slate-deep border border-transparent hover:border-slate-border transition-colors">
                            <div className="w-9 h-9 rounded-xl bg-slate-deep border border-slate-border flex items-center justify-center"><Icon size={16} className="text-cream-muted" /></div>
                            <div className="flex-1"><p className="text-cream text-sm font-medium">{item.label}</p><p className="text-cream-muted text-xs">{item.desc}</p></div>
                            <ChevronDown size={14} className="text-cream-muted -rotate-90" />
                          </button>
                        )
                      })}
                    </div>
                    {/* Focus */}
                    <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
                      <p className="text-cream-muted text-[11px] font-bold uppercase tracking-wider mb-3">Focus</p>
                      {grouped.Focus.map(item => {
                        const Icon = item.icon
                        return (
                          <button key={item.id} onClick={() => setActiveTool(item.id)} className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-slate-deep border border-transparent hover:border-slate-border transition-colors">
                            <div className="w-9 h-9 rounded-xl bg-slate-deep border border-slate-border flex items-center justify-center"><Icon size={16} className="text-cream-muted" /></div>
                            <div className="flex-1"><p className="text-cream text-sm font-medium">{item.label}</p><p className="text-cream-muted text-xs">{item.desc}</p></div>
                            <ChevronDown size={14} className="text-cream-muted -rotate-90" />
                          </button>
                        )
                      })}
                    </div>
                    {/* Personal */}
                    <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
                      <p className="text-cream-muted text-[11px] font-bold uppercase tracking-wider mb-3">Personal</p>
                      <div className="flex flex-col gap-2">
                        {grouped.Personal.map(item => {
                          const Icon = item.icon
                          return (
                            <button key={item.id} onClick={() => setActiveTool(item.id)} className="flex items-center gap-3 w-full text-left p-2.5 rounded-xl hover:bg-slate-deep border border-transparent hover:border-slate-border transition-colors">
                              <div className="w-9 h-9 rounded-xl bg-slate-deep border border-slate-border flex items-center justify-center"><Icon size={16} className="text-cream-muted" /></div>
                              <div className="flex-1"><p className="text-cream text-sm font-medium">{item.label}</p><p className="text-cream-muted text-xs">{item.desc}</p></div>
                              <ChevronDown size={14} className="text-cream-muted -rotate-90" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity - uses same data as TodaySnapshot, compact list like mock */}
              <div>
                <h2 className="text-cream font-bold text-sm mb-3">Recent Activity</h2>
                <div className="bg-slate-card border border-slate-border rounded-2xl p-3 flex flex-col gap-3">
                  <div className="flex gap-3 p-2 rounded-xl hover:bg-slate-deep">
                    <div className="w-8 h-8 rounded-full bg-slate-deep border border-slate-border flex items-center justify-center flex-shrink-0"><CalendarClock size={14} className="text-cream-muted" /></div>
                    <div className="min-w-0"><p className="text-cream text-xs font-medium truncate">Deadline approaching</p><p className="text-cream-muted text-[11px]">Check your upcoming deadlines</p></div>
                  </div>
                  <div className="flex gap-3 p-2 rounded-xl hover:bg-slate-deep">
                    <div className="w-8 h-8 rounded-full bg-slate-deep border border-slate-border flex items-center justify-center flex-shrink-0"><Timer size={14} className="text-cream-muted" /></div>
                    <div className="min-w-0"><p className="text-cream text-xs font-medium truncate">Focus session ready</p><p className="text-cream-muted text-[11px]">Start a Pomodoro now</p></div>
                  </div>
                  <div className="flex gap-3 p-2 rounded-xl hover:bg-slate-deep">
                    <div className="w-8 h-8 rounded-full bg-slate-deep border border-slate-border flex items-center justify-center flex-shrink-0"><Wallet size={14} className="text-cream-muted" /></div>
                    <div className="min-w-0"><p className="text-cream text-xs font-medium truncate">Budget check</p><p className="text-cream-muted text-[11px]">Review your balance</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
