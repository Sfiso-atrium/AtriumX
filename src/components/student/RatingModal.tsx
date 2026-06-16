import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { submitRating } from '../../services/dataService'

interface Props {
  sellerId: string
  listingId: string
  listingTitle: string
  onClose: () => void
  onSubmitted: () => void
}

export default function RatingModal({ sellerId, listingId, listingTitle, onClose, onSubmitted }: Props) {
  const { currentUser, showToast } = useApp()
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!currentUser) return
    if (stars === 0) { showToast('Please select a star rating.', 'info'); return }
    setLoading(true)
    const { error } = await submitRating(sellerId, currentUser.id, listingId, stars, comment.trim() || undefined)
    setLoading(false)
    if (error) { showToast(error, 'error'); return }
    showToast('Rating submitted. Thank you!', 'success')
    onSubmitted()
  }

  const display = hovered || stars

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-cream">Rate the Seller</h2>
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>

        <p className="text-cream-muted text-sm mb-5 truncate">
          For: <span className="text-cream">{listingTitle}</span>
        </p>

        <div className="flex gap-2 justify-center mb-5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setStars(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={n <= display ? 'text-gold fill-gold' : 'text-slate-border'}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Leave a comment (optional)"
          rows={3}
          maxLength={300}
          className="w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light resize-none transition-colors mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || stars === 0}
          className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  )
}
