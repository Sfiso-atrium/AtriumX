// src/pages/EventsPage.tsx
// Events board: image-led cards, horizontal sections, and an event details route.

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Plus, Image as ImageIcon, Search, X, Heart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  getAllEvents,
  cancelEvent,
  CampusEvent,
  EVENT_CATEGORIES,
  incrementEventLikes,
  decrementEventLikes,
} from '../services/dataService'
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

// There is no dedicated campus/off-campus column in the current event model,
// so locations are classified conservatively using common campus-place terms.
function isCampusLocation(location: string): boolean {
  const value = location.toLowerCase()
  const campusTerms = [
    'campus', 'student centre', 'student center', 'science block', 'lecture hall',
    'sports ground', 'sports grounds', 'university grounds', 'quad', 'courtyard',
    'residence', 'res', 'library', 'main hall', 'student village',
  ]
  return campusTerms.some(term => value.includes(term))
}

const likedEventsStorageKey = 'atriumx-liked-events'

function EventCard({ event, canCancel, onCancel }: { event: CampusEvent; canCancel: boolean; onCancel: () => void }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(event.like_count ?? 0)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(likedEventsStorageKey) || '[]')
      setLiked(Array.isArray(stored) && stored.includes(event.id))
    } catch {
      setLiked(false)
    }
  }, [event.id])

  useEffect(() => {
    setLikeCount(event.like_count ?? 0)
  }, [event.like_count])

  const toggleLike = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setLiked(current => {
      const next = !current
      try {
        const stored = JSON.parse(localStorage.getItem(likedEventsStorageKey) || '[]')
        const currentIds = Array.isArray(stored) ? stored : []
        const updated = next
          ? Array.from(new Set([...currentIds, event.id]))
          : currentIds.filter((id: string) => id !== event.id)
        localStorage.setItem(likedEventsStorageKey, JSON.stringify(updated))
      } catch {
        // Keep the visual like state even if localStorage is unavailable.
      }

      setLikeCount(count => Math.max(0, count + (next ? 1 : -1)))
      if (next) incrementEventLikes(event.id)
      else decrementEventLikes(event.id)

      return next
    })
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/event/${event.id}`)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/event/${event.id}`)
      }}
      className="group w-[290px] sm:w-[320px] flex-shrink-0 snap-start bg-white border border-[#e5ebf3] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#d7e1ee] hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    >
      <div className="relative aspect-[4/3] bg-[#f5f8fc] overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:text-slate-400">
            <ImageIcon size={30} strokeWidth={1.5} />
            <span className="text-xs">No event poster</span>
          </div>
        )}

        <span className="absolute top-3 left-3 bg-white/95 text-blue-600 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm">
          {event.category}
        </span>

        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className="bg-white/95 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            {event.price == null ? 'Free' : `R${Number(event.price).toFixed(2)}`}
          </span>
          <div className="flex items-center gap-1.5">
            {likeCount > 0 && (
              <span className="bg-white/95 backdrop-blur-sm border border-white/80 text-slate-600 text-[11px] font-bold px-2 py-1 rounded-full shadow-sm">
                {likeCount}
              </span>
            )}
            <button
              type="button"
              aria-label={liked ? 'Unlike event' : 'Like event'}
              aria-pressed={liked}
              onClick={toggleLike}
              className={`w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-white/80 flex items-center justify-center shadow-sm transition-all hover:scale-105 ${
                liked ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              <Heart size={18} className={liked ? 'fill-current' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2.5">
        <div>
          <h3 className="text-slate-900 font-bold text-base leading-snug break-words line-clamp-2 transition-colors group-hover:text-blue-600">
            {event.title}
          </h3>
          <p className="text-blue-600 text-xs font-bold mt-1">{formatWhen(event.starts_at)}</p>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <MapPin size={13} className="flex-shrink-0 text-blue-500" />
          <span className="truncate">{event.location}</span>
        </div>

        {event.description && (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{event.description}</p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-slate-500 text-[11px] truncate">by {event.host?.full_name ?? 'a student'}</span>
          {canCancel && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onCancel()
              }}
              className="text-blue-600 text-[11px] font-bold hover:text-blue-700 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function HorizontalSection({ title, icon, events, currentUserId, onCancel }: {
  title: string
  icon?: ReactNode
  events: CampusEvent[]
  currentUserId?: string
  onCancel: (event: CampusEvent) => void
}) {
  if (events.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h2 className="text-cream font-bold text-base truncate">{title}</h2>
        </div>
        <span className="text-cream-muted text-[11px] flex-shrink-0">Swipe to explore</span>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            canCancel={currentUserId === event.host_id}
            onCancel={() => onCancel(event)}
          />
        ))}
      </div>
    </section>
  )
}

export default function EventsPage() {
  const navigate = useNavigate()
  const { currentUser, showToast } = useApp()
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getAllEvents()
      .then(data => {
        setEvents(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentUser])

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const categoryFiltered = filter === 'all' ? events : events.filter(e => e.category === filter)
    if (!query) return categoryFiltered
    return categoryFiltered.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      (event.description ?? '').toLowerCase().includes(query)
    )
  }, [events, filter, searchQuery])

  const now = Date.now()
  const weekFromNow = now + 7 * 86400000
  const twoWeeksFromNow = now + 14 * 86400000

  const upcomingSoon = visible.filter(e => {
    const starts = new Date(e.starts_at).getTime()
    return starts >= now && starts <= weekFromNow && isCampusLocation(e.location)
  })

  const nextWeek = visible.filter(e => {
    const starts = new Date(e.starts_at).getTime()
    return starts > weekFromNow && starts <= twoWeeksFromNow && isCampusLocation(e.location)
  })

  const laterCampus = visible.filter(e => {
    const starts = new Date(e.starts_at).getTime()
    return starts > twoWeeksFromNow && isCampusLocation(e.location)
  })

  const outsideCampus = visible.filter(e => {
    const starts = new Date(e.starts_at).getTime()
    return starts >= now && !isCampusLocation(e.location)
  })

  const past = visible
    .filter(e => new Date(e.starts_at).getTime() < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())

  const handleCancel = async (event: CampusEvent) => {
    await cancelEvent(event.id)
    setEvents(prev => prev.filter(e => e.id !== event.id))
    showToast('Event cancelled.', 'success')
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-4xl mx-auto pb-28">
          <div className="px-4 pt-4 pb-2">
            <h1 className="font-serif text-2xl text-cream">Discover</h1>
            <p className="text-cream-muted text-sm mt-1">Explore the existing marketplace and events.</p>
          </div>

          <div className="px-4 pt-2 pb-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1.7fr)_minmax(220px,1fr)] gap-2 items-stretch border-b border-[#e8eef6]">
            <div className="flex h-12 bg-white border border-slate-border rounded-xl p-1">
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="flex-1 h-full text-cream-muted hover:text-blue-600 hover:bg-blue-50/60 rounded-lg text-sm font-medium transition-colors"
              >
                Marketplace
              </button>
              <button
                type="button"
                className="flex-1 h-full bg-blue-50 text-blue-600 border-b-2 border-blue-600 rounded-lg text-sm font-bold transition-colors"
              >
                Events
              </button>
            </div>

            <div className="relative h-12">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full h-full bg-slate-card border border-slate-border rounded-lg pl-9 pr-9 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>



          <div className="-mx-4 mt-2 mb-6">
            <CategoryChips categories={EVENT_FILTER_OPTIONS} active={filter} onSelect={setFilter} />
          </div>

          {loading ? (
            <p className="text-cream-muted text-sm">Loading events…</p>
          ) : visible.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays size={34} className="text-cream-muted mx-auto mb-3 opacity-50" />
              <p className="text-cream font-bold text-sm mb-1">No events match this filter</p>
              <p className="text-cream-muted text-xs mb-5">Be the first to put something on the board.</p>
              <button
                type="button"
                onClick={() => navigate('/post-event')}
                className="bg-ember hover:bg-ember-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                Post an event
              </button>
            </div>
          ) : (
            <>
              <HorizontalSection
                title="Happening soon"
                events={upcomingSoon}
                currentUserId={currentUser?.id}
                onCancel={handleCancel}
              />

              <HorizontalSection
                title="Next week"
                events={nextWeek}
                currentUserId={currentUser?.id}
                onCancel={handleCancel}
              />

              <HorizontalSection
                title="More on campus"
                events={laterCampus}
                currentUserId={currentUser?.id}
                onCancel={handleCancel}
              />

              <HorizontalSection
                title="Outside campus"
                events={outsideCampus}
                currentUserId={currentUser?.id}
                onCancel={handleCancel}
              />

              <HorizontalSection
                title="Past events"
                events={past}
                currentUserId={currentUser?.id}
                onCancel={handleCancel}
              />
            </>
          )}
        </div>
        <LegalFooter />
      </div>
      <BottomNav />
    </>
  )
}
