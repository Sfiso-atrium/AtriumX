// src/pages/EventsPage.tsx
//
// The Events board. Its own route rather than a fourth tab in the feed —
// see the note in BottomNav.tsx for why.

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Plus, Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getEvents, cancelEvent, CampusEvent, EVENT_CATEGORIES } from '../services/dataService'
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
  const { currentUser, showToast } = useApp()
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getEvents().then(data => { setEvents(data); setLoading(false) }).catch(() => setLoading(false))
  }, [currentUser])

  const visible = useMemo(() => {
    let list = filter === 'all' ? events : events.filter(e => e.category === filter)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(e => 
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        e.location.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [events, filter, searchQuery])

  const handleCancel = async (ev: CampusEvent) => {
    await cancelEvent(ev.id)
    setEvents(prev => prev.filter(e => e.id !== ev.id))
    showToast('Event cancelled.', 'success')
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-20 pb-28">
          {/* Discover header - same as Feed */}
          <div className="mb-5">
            <h1 className="font-serif text-2xl text-cream">Discover</h1>
            <p className="text-cream-muted text-sm mt-1">Explore the existing marketplace and events.</p>
          </div>

          {/* TOP NAVIGATION - Marketplace / Events toggle + Search (matches Panel 3) */}
          <div className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Toggle - fixed height to prevent layout shift */}
              <div className="flex bg-slate-card border border-slate-border rounded-xl p-1 h-10 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/feed')}
                  className="min-w-[110px] text-cream-muted hover:text-cream rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                >
                  Marketplace
                </button>
                <button
                  type="button"
                  className="min-w-[90px] bg-teal-primary border border-teal-light text-cream rounded-lg text-sm font-bold flex items-center justify-center"
                >
                  Events
                </button>
              </div>

              {/* Unified search - searches listings and events - same line */}
              <div className="flex-1 relative h-10">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search listings and events..."
                  className="w-full h-10 bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1 mt-2">
            <h1 className="font-serif text-2xl text-cream">Events</h1>
            <button
              onClick={() => navigate('/post-event')}
              className="flex items-center gap-1.5 bg-gold text-slate-deep font-bold text-xs px-3 py-2 rounded-xl h-9"
            >
              <Plus size={14} /> Post
            </button>
          </div>
          <p className="text-cream-muted text-sm mb-5">What&apos;s happening at your university.</p>

          <div className="-mx-4">
            <CategoryChips categories={EVENT_FILTER_OPTIONS} active={filter} onSelect={setFilter} />
          </div>

          {loading ? (
            <p className="text-cream-muted text-sm">Loading events…</p>
          ) : visible.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays size={32} className="text-cream-muted mx-auto mb-3 opacity-50" />
              <p className="text-cream font-bold text-sm mb-1">Nothing coming up yet</p>
              <p className="text-cream-muted text-xs mb-5">Be the first to put something on the board.</p>
              <button
                onClick={() => navigate('/post-event')}
                className="bg-gold text-slate-deep font-bold text-xs px-5 py-2.5 rounded-xl"
              >
                Post an event
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map(ev => (
                <div key={ev.id} className="bg-slate-card border border-slate-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-cream font-bold text-sm">{ev.title}</p>
                      <p className="text-gold text-xs font-bold mt-0.5">{formatWhen(ev.starts_at)}</p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] font-bold text-cream-muted border border-slate-border rounded-full px-2 py-0.5">
                      {ev.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-cream-muted text-xs mb-2">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>

                  {ev.description && (
                    <p className="text-cream-muted text-xs leading-relaxed mb-3">{ev.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-cream text-xs font-bold">
                      {ev.price == null ? 'Free entry' : `R${Number(ev.price).toFixed(2)}`}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-cream-muted text-[11px]">
                        by {ev.host?.full_name ?? 'a student'}
                      </span>
                      {currentUser?.id === ev.host_id && (
                        <button
                          onClick={() => handleCancel(ev)}
                          className="text-ember text-[11px] font-bold hover:opacity-80"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <LegalFooter />
      </div>
      <BottomNav />
    </>
  )
}
