// src/pages/EventDetails.tsx
// Event detail page styled in the same visual language as ListingDetail.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock3, MapPin, University, UserRound, Image as ImageIcon, Trash2 } from 'lucide-react'
import {
  CampusEvent,
  EventComment,
  getEventById,
  getEventComments,
  addEventComment,
  deleteEventComment,
} from '../services/dataService'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/common/BottomNav'
import LegalFooter from '../components/common/LegalFooter'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, setAuthPromptOpen, showToast } = useApp()
  const [event, setEvent] = useState<CampusEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<EventComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    getEventById(id)
      .then(data => {
        setEvent(data)
        setLoading(false)
      })
      .catch(() => {
        setEvent(null)
        setLoading(false)
      })
  }, [id])

  const loadComments = () => {
    if (!id) return
    setCommentsLoading(true)
    getEventComments(id)
      .then(data => {
        setComments(data)
        setCommentsLoading(false)
      })
      .catch(() => setCommentsLoading(false))
  }

  useEffect(() => {
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSubmitComment = async () => {
    if (!currentUser) { setAuthPromptOpen(true); return }
    if (!id || !commentText.trim()) return

    setSubmitting(true)
    const { error } = await addEventComment(id, currentUser.id, commentText.trim())
    setSubmitting(false)

    if (error) { showToast(error, 'error'); return }
    setCommentText('')
    loadComments()
  }

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await deleteEventComment(commentId)
    if (error) { showToast(error, 'error'); return }
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-deep flex items-center justify-center">
        <p className="text-cream-muted text-sm">Loading event...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-cream font-bold text-lg">Event not found.</p>
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="bg-ember hover:bg-ember-dark text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          Back to Events
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <div className="sticky top-0 z-50 bg-slate-deep/95 backdrop-blur border-b border-slate-border h-14 flex items-center px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-cream-muted hover:text-cream hover:bg-slate-card transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <main className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pt-5 pb-28">
          <section className="bg-slate-card border border-slate-border rounded-2xl overflow-hidden md:flex md:items-stretch md:gap-6">
            <div className="relative w-full aspect-[4/3] md:w-[440px] md:flex-shrink-0 md:aspect-[4/3] bg-slate-deep overflow-hidden">
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-cream-muted">
                  <ImageIcon size={34} strokeWidth={1.5} />
                  <span className="text-sm">No event poster</span>
                </div>
              )}

              <span className="absolute top-3 left-3 bg-white/95 text-blue-600 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm">
                {event.category}
              </span>
            </div>

            <div className="px-4 py-5 md:px-0 md:py-7 md:pr-6 md:flex-1 flex flex-col justify-center gap-3 min-w-0">
              <h1 className="font-serif text-2xl md:text-3xl text-cream leading-tight break-words">
                {event.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-deep border border-slate-border p-3">
                  <div className="flex items-center gap-2 text-teal-light mb-1">
                    <CalendarDays size={15} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-cream-muted">Date</span>
                  </div>
                  <p className="text-cream text-sm font-semibold">{formatDate(event.starts_at)}</p>
                </div>

                <div className="rounded-xl bg-slate-deep border border-slate-border p-3">
                  <div className="flex items-center gap-2 text-teal-light mb-1">
                    <Clock3 size={15} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-cream-muted">Time</span>
                  </div>
                  <p className="text-cream text-sm font-semibold">
                    {formatTime(event.starts_at)}
                    {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-deep border border-slate-border p-3">
                  <div className="flex items-center gap-2 text-teal-light mb-1">
                    <MapPin size={15} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-cream-muted">Location</span>
                  </div>
                  <p className="text-cream text-sm font-semibold break-words">{event.location}</p>
                </div>

                <div className="rounded-xl bg-slate-deep border border-slate-border p-3">
                  <div className="flex items-center gap-2 text-teal-light mb-1">
                    <span className="text-sm font-bold">R</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-cream-muted">Entry</span>
                  </div>
                  <p className="text-cream text-sm font-semibold">
                    {event.price == null ? 'Free entry' : `R${Number(event.price).toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-sm">
                <p className="text-cream-muted flex items-center gap-2">
                  <UserRound size={15} className="text-teal-light flex-shrink-0" />
                  <span>Hosted by <span className="text-cream font-semibold">{event.host?.full_name ?? 'a student'}</span></span>
                </p>
                {event.university && (
                  <p className="text-cream-muted flex items-center gap-2">
                    <University size={15} className="text-teal-light flex-shrink-0" />
                    <span>{event.university}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-5 bg-slate-card border border-slate-border rounded-2xl p-4 md:p-5">
            <h2 className="text-cream font-bold text-sm mb-2">About this event</h2>
            <p className="text-cream-muted text-sm leading-relaxed whitespace-pre-wrap">
              {event.description || 'No description has been added for this event.'}
            </p>
          </section>

          <section className="mt-5 bg-slate-card border border-slate-border rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-cream font-bold text-sm">Comments</h2>
              {comments.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-cream-muted">
                  {comments.length}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={currentUser ? 'Share your thoughts on this event...' : 'Log in to comment on this event.'}
                onFocus={() => { if (!currentUser) setAuthPromptOpen(true) }}
                rows={3}
                maxLength={1000}
                className="w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={submitting || !commentText.trim()}
                  className="bg-ember hover:bg-ember-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post comment'}
                </button>
              </div>
            </div>

            {commentsLoading ? (
              <p className="text-cream-muted text-sm">Loading comments...</p>
            ) : comments.length === 0 ? (
              <div className="border border-dashed border-slate-border rounded-xl py-8 px-4 text-center">
                <p className="text-cream-muted text-sm">No comments yet.</p>
                <p className="text-cream-muted/70 text-xs mt-1">Be the first to say something about this event.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-slate-deep border border-slate-border rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: c.author?.avatar_color || '#0D9488' }}
                        >
                          {c.author?.avatar_initials || '?'}
                        </div>
                        <span className="text-cream text-sm font-medium truncate">
                          {c.author?.full_name || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-cream-muted text-[11px]">
                          {new Date(c.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </span>
                        {currentUser?.id === c.author_id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            aria-label="Delete comment"
                            className="text-cream-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-cream-muted text-xs leading-relaxed whitespace-pre-wrap">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <LegalFooter />
      </div>
      <BottomNav />
    </>
  )
}
