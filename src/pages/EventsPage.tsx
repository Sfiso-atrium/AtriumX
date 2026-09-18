// src/pages/EventsPage.tsx
//
// The Events board. Its own route rather than a fourth tab in the feed â€”
// see the note in BottomNav.tsx for why.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Plus, Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getEvents, cancelEvent, CampusEvent, EVENT_CATEGORIES } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import LegalFooter from '../components/common/LegalFooter'
import CategoryChips, { CategoryOption } from '../components/common/CategoryChips'

// Same shape as the feed's filter â€” always shows every category, not just
// ones that already have a posted event. Data-derived chips would make
// the filter row empty (or missing) on a mostly-empty board, exactly
// when someone would most want to see what kinds of events they COULD
// filter to.
const EVENT_FILTER_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'All' },
  ...EVENT_CATEGORIES.map(c => ({ id: c, label: c })),
]

function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <CalendarDays size={28} className="text-teal-primary" />
      </div>
      <p className="text-cream-muted text-sm mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-ember hover:bg-ember-dark text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

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
  const [search, setSearch] = useState('')

  useEffect(() => {
    getEvents().then(data => { setEvents(data); setLoading(false) }).catch(() => setLoading(false))
  }, [currentUser])

  const visible = events.filter(e => {
    const matchesCategory = filter === 'all' || e.category === filter
    const q = search.trim().toLowerCase()
    const matchesSearch = !q ||
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      (e.host?.full_name ?? '').toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  const handleCancel = async (ev: CampusEvent) => {
    await cancelEvent(ev.id)
    setEvents(prev => prev.filter(e => e.id !== ev.id))
    showToast('Event cancelled.', 'success')
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />

        <div className="max-w-4xl mx-auto">
          <div className="px-4 pt-4 pb-2">
            <h1 className="font-serif text-2xl text-cream">Discover</h1>
            <p className="text-cream-muted text-sm mt-1">Explore the existing marketplace and events.</p>
          </div>

          <div className="px-4 pt-2 pb-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1.7fr)_minmax(220px,1fr)] gap-2 items-stretch">
            <div className="flex h-12 bg-slate-card border border-slate-border rounded-lg p-1">
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="flex-1 h-full text-cream-muted hover:text-cream hover:border-teal-primary rounded-md text-sm font-medium transition-colors"
              >
                Marketplace
              </button>
              <button
                type="button"
                className="flex-1 h-full bg-teal-primary border border-teal-light text-cream rounded-md text-sm font-bold"
              >
                Events
              </button>
            </div>

            <div className="relative h-12">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full h-full bg-slate-card border border-slate-border rounded-lg pl-9 pr-9 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>



          <div className="px-4 pt-3">
            <CategoryChips categories={EVENT_FILTER_OPTIONS} active={filter} onSelect={setFilter} />
          </div>

          <div className="px-4 pt-2 pb-2">
            <p className="text-cream-muted text-xs">
              {loading ? 'Loading...' : `${visible.length} event${visible.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {loading ? (
            <p className="px-4 text-cream-muted text-sm">Loading events...</p>
          ) : visible.length === 0 ? (
            <EmptyState
              message={search.trim() || filter !== 'all' ? 'No events match your search.' : 'Nothing here yet. Be the first to post.'}
              actionLabel="Post an Event"
              onAction={() => navigate('/post-event')}
            />
          ) : (
            <div className="px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.map(ev => (
                <div
                  key={ev.id}
                  className="relative bg-slate-card rounded-2xl overflow-hidden transition-colors border border-slate-border hover:border-teal-primary"
                >
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-cream font-bold text-base leading-snug break-words flex-1 min-w-0">
                        {ev.title}
                      </h3>
                      <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-deep/90 text-gold border border-gold/40">
                        {ev.category}
                      </span>
                    </div>

                    <p className="text-gold text-xs font-bold">
                      {formatWhen(ev.starts_at)}
                    </p>

                    <div className="flex items-center gap-1.5 text-cream-muted text-xs">
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>

                    {ev.description && (
                      <p className="text-cream-muted text-xs leading-relaxed">{ev.description}</p>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-cream text-xs font-bold">
                        {ev.price == null ? 'Free entry' : `R${Number(ev.price).toFixed(2)}`}
                      </span>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-cream-muted text-[11px] truncate">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <LegalFooter />
      <BottomNav />
    </>
  )
}
