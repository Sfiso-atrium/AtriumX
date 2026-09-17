import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Clock, Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getEvents, CampusEvent, EVENT_CATEGORIES } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import LegalFooter from '../components/common/LegalFooter'
import CategoryChips, { CategoryOption } from '../components/common/CategoryChips'

const EVENT_FILTER_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'All' },
  ...EVENT_CATEGORIES.map(c => ({ id: c, label: c })),
]

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86400000)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  if (sameDay(d, today)) return `Today, ${time}`
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`
  return `${d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}

export default function EventsPage() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getEvents().then(data => { setEvents(data); setLoading(false) }).catch(() => setLoading(false))
  }, [currentUser])

  const visible = events.filter(e => {
    const matchCat = filter === 'all' || e.category === filter
    const now = new Date()
    const d = new Date(e.starts_at)
    const matchTime = timeFilter === 'upcoming' ? d >= now : d < now
    const q = search.trim().toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)
    return matchCat && matchTime && matchSearch
  }).sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-28 md:ml-64 md:max-w-[calc(100%-16rem)] lg:max-w-5xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-serif text-2xl text-cream">Discover</h1>
          </div>

          {/* Marketplace | Events - keeps Discover as parent, Events as child */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => navigate('/feed')} className="px-5 py-2 rounded-full text-sm font-bold border bg-slate-card border-slate-border text-cream-muted hover:text-cream">Marketplace</button>
            <button className="px-5 py-2 rounded-full text-sm font-bold border bg-[#2563EB] border-[#2563EB] text-white">Events</button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..." className="w-full bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted"><X size={14} /></button>}
          </div>

          <div className="flex gap-2 mb-3">
            <button onClick={() => setTimeFilter('upcoming')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${timeFilter === 'upcoming' ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-slate-card border-slate-border text-cream-muted'}`}>Upcoming</button>
            <button onClick={() => setTimeFilter('past')} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${timeFilter === 'past' ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-slate-card border-slate-border text-cream-muted'}`}>Past</button>
          </div>

          <div className="-mx-4"><CategoryChips categories={EVENT_FILTER_OPTIONS} active={filter} onSelect={setFilter} /></div>

          {loading ? <p className="text-cream-muted text-sm mt-4">Loading events...</p> : visible.length === 0 ? (
            <div className="text-center py-16"><CalendarDays size={32} className="text-cream-muted mx-auto mb-3 opacity-50" /><p className="text-cream font-bold text-sm mb-1">Nothing coming up yet</p><p className="text-cream-muted text-xs mb-5">Be the first to put something on the board.</p><button onClick={() => navigate('/post-event')} className="bg-gold text-slate-deep font-bold text-xs px-5 py-2.5 rounded-xl">Post an event</button></div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {visible.map(ev => {
                const d = new Date(ev.starts_at)
                return (
                  <div key={ev.id} className="bg-slate-card border border-slate-border rounded-2xl p-3 flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-deep border border-slate-border flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-cream font-bold text-sm">{d.getDate()}</span>
                      <span className="text-cream-muted text-[10px] font-bold uppercase">{d.toLocaleDateString('en-ZA', { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-cream font-bold text-sm truncate">{ev.title}</p>
                          <p className="text-gold text-xs font-bold mt-0.5 flex items-center gap-1"><Clock size={10} />{formatWhen(ev.starts_at)}</p>
                        </div>
                        <span className="flex-shrink-0 text-[10px] font-bold text-cream-muted border border-slate-border rounded-full px-2 py-0.5">{ev.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-cream-muted text-xs mt-1.5"><MapPin size={12} /><span className="truncate">{ev.location}</span></div>
                      {ev.description && <p className="text-cream-muted text-xs leading-relaxed mt-1.5 line-clamp-2">{ev.description}</p>}
                      <div className="flex items-center justify-between mt-2"><span className="text-cream text-xs font-bold">{ev.price == null ? 'Free entry' : `R${Number(ev.price).toFixed(2)}`}</span><span className="text-cream-muted text-[11px]">by {ev.host?.full_name ?? 'a student'}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <LegalFooter />
      </div>
      <BottomNav />
    </>
  )
}
