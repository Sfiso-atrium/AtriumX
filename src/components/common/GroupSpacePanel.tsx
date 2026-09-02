// src/components/common/GroupSpacePanel.tsx
import { useState, useEffect } from 'react'
import { X, Trash2, PartyPopper, Clock, BookOpen, Check, XCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  GroupDeadline, getGroupDeadlines, createGroupDeadline, deleteGroupDeadline,
  respondToGroupDeadline, getMyGroupDeadlineStatuses,
  GroupScheduleEntry, getGroupScheduleEntries, createGroupScheduleEntry, deleteGroupScheduleEntry,
  GroupStudyCourse, getGroupStudyCourses, createGroupStudyCourse, deleteGroupStudyCourse,
  GroupStudyPrepNote, getGroupStudyPrepNotes, createGroupStudyPrepNote, setGroupStudyPrepClarified,
} from '../../services/dataService'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PANEL_TABS = ['Deadlines', 'Schedule', 'Timetable'] as const
type PanelTab = typeof PANEL_TABS[number]

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

export default function GroupSpacePanel({
  groupId, onClose, initialTab = 'Deadlines',
}: { groupId: string; onClose: () => void; initialTab?: PanelTab }) {
  const [tab, setTab] = useState<PanelTab>(initialTab)

  return (
    <div className="fixed inset-0 z-[200] bg-slate-deep flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-border flex-shrink-0">
        <h2 className="font-serif text-lg text-cream">Group Space</h2>
        <button onClick={onClose} className="text-cream-muted hover:text-cream">
          <X size={20} />
        </button>
      </div>

      <div className="flex gap-2 px-4 py-3 border-b border-slate-border flex-shrink-0 overflow-x-auto">
        {PANEL_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              tab === t ? 'bg-ember text-white' : 'bg-slate-card border border-slate-border text-cream-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {tab === 'Deadlines' && <GroupDeadlinesTab groupId={groupId} />}
        {tab === 'Schedule' && <GroupScheduleTab groupId={groupId} />}
        {tab === 'Timetable' && <GroupTimetableTab groupId={groupId} />}
      </div>
    </div>
  )
}

function GroupDeadlinesTab({ groupId }: { groupId: string }) {
  const { currentUser, showToast } = useApp()
  const [items, setItems] = useState<GroupDeadline[]>([])
  const [myStatus, setMyStatus] = useState<Record<string, 'pending' | 'done' | 'not_affected'>>({})
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    getGroupDeadlines(groupId).then(d => { setItems(d); setLoading(false) })
    if (currentUser) getMyGroupDeadlineStatuses(groupId, currentUser.id).then(setMyStatus)
  }
  useEffect(() => { load() }, [groupId])

  const handleRespond = async (deadlineId: string, status: 'done' | 'not_affected') => {
    if (!currentUser) return
    setMyStatus(prev => ({ ...prev, [deadlineId]: status })) // optimistic
    const { error } = await respondToGroupDeadline(deadlineId, currentUser.id, status)
    if (error) { showToast(error, 'error'); setMyStatus(prev => ({ ...prev, [deadlineId]: 'pending' })); return }
    showToast(status === 'done' ? 'Marked as done.' : "Marked as not affecting you.", 'success')
  }
  const handleAdd = async () => {
    if (!currentUser) return
    if (!title.trim() || !dueAt) { showToast('Add a title and a due date.', 'error'); return }
    const { error } = await createGroupDeadline(groupId, currentUser.id, title.trim(), new Date(dueAt).toISOString(), notes)
    if (error) { showToast(error, 'error'); return }
    setTitle(''); setDueAt(''); setNotes('')
    showToast('Deadline added for the group.', 'success')
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteGroupDeadline(id)
    setItems(prev => prev.filter(d => d.id !== id))
  }

  return (
    <>
      <SectionCard>
        <p className="text-cream font-bold text-sm mb-3">Add a group deadline</p>
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
          <p className="text-cream-muted text-sm text-center">No group deadlines yet — add the first one above.</p>
        </div>
      )}

      {items.map(d => {
        const due = new Date(d.due_at)
        const soon = due.getTime() - Date.now() < 24 * 60 * 60 * 1000
        const status = myStatus[d.id] || 'pending'
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

            {status === 'pending' ? (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleRespond(d.id, 'done')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-teal-light/10 hover:bg-teal-light/20 text-teal-light font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  <Check size={14} /> Mark done
                </button>
                <button
                  onClick={() => handleRespond(d.id, 'not_affected')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-deep hover:bg-slate-border text-cream-muted font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  <XCircle size={14} /> Doesn't affect me
                </button>
              </div>
            ) : (
              <p className="text-xs mt-3 text-cream-muted">
                {status === 'done' ? '✓ You marked this done.' : "You marked this as not affecting you."}
              </p>
            )}
          </div>
        )
      })}
    </>
  )
}

function GroupScheduleTab({ groupId }: { groupId: string }) {
  const { currentUser, showToast } = useApp()
  const [items, setItems] = useState<GroupScheduleEntry[]>([])
  const [day, setDay] = useState('1')
  const [time, setTime] = useState('')
  const [module, setModule] = useState('')
  const [room, setRoom] = useState('')

  const load = () => getGroupScheduleEntries(groupId).then(setItems)
  useEffect(() => { load() }, [groupId])

  const handleAdd = async () => {
    if (!currentUser) return
    if (!module.trim() || !time) { showToast('Add a module and a time.', 'error'); return }
    const { error } = await createGroupScheduleEntry(groupId, currentUser.id, Number(day), time, module.trim(), room)
    if (error) { showToast(error, 'error'); return }
    setModule(''); setTime(''); setRoom('')
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteGroupScheduleEntry(id)
    setItems(prev => prev.filter(s => s.id !== id))
  }

  return (
    <>
      <SectionCard>
        <p className="text-cream font-bold text-sm mb-3">Add a class to the group schedule</p>
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

      {items.length === 0 && (
        <p className="text-cream-muted text-sm text-center py-4">No group classes added yet.</p>
      )}

      {DAYS.map((dayName, dayIdx) => {
        const dayItems = items.filter(s => s.day_of_week === dayIdx)
        if (dayItems.length === 0) return null
        return (
          <SectionCard key={dayIdx}>
            <p className="text-cream-muted text-xs font-bold mb-2">{dayName}</p>
            <div className="flex flex-col gap-2">
              {dayItems.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-cream text-sm font-bold truncate">{s.module}</p>
                    <p className="text-cream-muted text-xs">{s.start_time.slice(0, 5)}{s.room ? ` · ${s.room}` : ''}</p>
                  </div>
                  <DeleteBtn onClick={() => handleDelete(s.id)} />
                </div>
              ))}
            </div>
          </SectionCard>
        )
      })}
    </>
  )
}

function GroupTimetableTab({ groupId }: { groupId: string }) {
  const { currentUser, showToast } = useApp()
  const [courses, setCourses] = useState<GroupStudyCourse[]>([])
  const [preps, setPreps] = useState<GroupStudyPrepNote[]>([])
  const [prepTarget, setPrepTarget] = useState<GroupStudyCourse | null>(null)
  const [openDayForm, setOpenDayForm] = useState<number | null>(null)
  const [courseName, setCourseName] = useState('')
  const [minutes, setMinutes] = useState('')

  const load = () => {
    getGroupStudyCourses(groupId).then(setCourses)
    getGroupStudyPrepNotes(groupId).then(setPreps)
  }
  useEffect(() => { load() }, [groupId])

  const handleAddCourse = async (day: number) => {
    if (!currentUser) return
    if (!courseName.trim() || !minutes || Number(minutes) <= 0) {
      showToast('Add a course name and a study time.', 'error'); return
    }
    const { error } = await createGroupStudyCourse(groupId, currentUser.id, day, courseName.trim(), Number(minutes))
    if (error) { showToast(error, 'error'); return }
    setCourseName(''); setMinutes(''); setOpenDayForm(null)
    load()
  }

  const handleDeleteCourse = async (id: string) => {
    await deleteGroupStudyCourse(id)
    setCourses(prev => prev.filter(c => c.id !== id))
    setPreps(prev => prev.filter(p => p.course_id !== id))
  }

  const handleClarifiedToggle = async (note: GroupStudyPrepNote) => {
    await setGroupStudyPrepClarified(note.id, !note.clarified)
    setPreps(prev => prev.map(p => p.id === note.id ? { ...p, clarified: !p.clarified } : p))
  }

  return (
    <>
      {DAYS.map((dayName, dayIdx) => {
        const dayCourses = courses.filter(c => c.day_of_week === dayIdx)
        const totalMinutes = dayCourses.reduce((s, c) => s + c.minutes, 0)
        return (
          <SectionCard key={dayIdx}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-cream-muted text-xs font-bold">{dayName}</p>
              {totalMinutes > 0 && <p className="text-teal-light text-xs">{totalMinutes} min</p>}
            </div>
            <div className="flex flex-col gap-2">
              {dayCourses.map(c => {
                const note = preps.find(p => p.course_id === c.id)
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => !c.prepped && setPrepTarget(c)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <BookOpen size={14} className={c.prepped ? 'text-teal-light flex-shrink-0' : 'text-cream-muted flex-shrink-0'} />
                      <div className="min-w-0">
                        <p className="text-cream text-sm font-bold truncate">{c.course_name}</p>
                        <p className="text-cream-muted text-xs">
                          {c.minutes} min{c.prepped ? ' · prepped' : ' · tap to prep'}
                          {note?.clarified && ' · clarified'}
                        </p>
                      </div>
                    </button>
                    {note && !note.clarified && (
                      <button onClick={() => handleClarifiedToggle(note)} title="Mark clarified"
                        className="text-cream-muted hover:text-teal-light text-xs flex-shrink-0">
                        <Clock size={16} />
                      </button>
                    )}
                    <DeleteBtn onClick={() => handleDeleteCourse(c.id)} />
                  </div>
                )
              })}

              {openDayForm === dayIdx ? (
                <div className="flex flex-col gap-2 mt-1">
                  <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name"
                    className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                  <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="Minutes"
                    className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                  <button onClick={() => handleAddCourse(dayIdx)} className="bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-sm transition-colors">
                    Add
                  </button>
                </div>
              ) : (
                <button onClick={() => setOpenDayForm(dayIdx)} className="text-teal-light text-xs font-bold text-left mt-1">
                  + Add course
                </button>
              )}
            </div>
          </SectionCard>
        )
      })}

      {prepTarget && (
        <GroupPrepModal
          groupId={groupId}
          course={prepTarget}
          onClose={() => setPrepTarget(null)}
          onSubmitted={() => { setPrepTarget(null); load() }}
        />
      )}
    </>
  )
}

// Same three fixed questions + one optional one as the personal PrepModal
// in MySpace.tsx, writing to the group's prep-notes table instead.
function GroupPrepModal({ groupId, course, onClose, onSubmitted }: { groupId: string; course: GroupStudyCourse; onClose: () => void; onSubmitted: () => void }) {
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
    const { error } = await createGroupStudyPrepNote(groupId, currentUser.id, course.id, focusTopic, resource, goal, clarification)
    setLoading(false)
    if (error) { showToast(error, 'error'); return }
    showToast('Locked in — go get it.', 'success')
    onSubmitted()
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 px-4">
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
            <label className="text-cream text-xs font-bold block mb-1.5">Anything to clarify from your lecturer? (optional)</label>
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
