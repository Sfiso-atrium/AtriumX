import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { submitRating } from '../../services/dataService'

interface Props {
  sellerId: string
  sellerName?: string
  buyerId: string
  listingId: string
  listingTitle: string
  onClose: () => void
  onSubmitted: () => void
}

// Always opened from an invite (see NotificationBell), so it leads with an
// explicit "do you want to rate them?" step before showing the star form —
// the buyer can decline without ever seeing the rating UI.
type Step = 'ask' | 'form'

export default function RatingModal({ sellerId, sellerName, buyerId, listingId, listingTitle, onClose, onSubmitted }: Props) {
  const { currentUser, showToast } = useApp()
  const [step, setStep] = useState<Step>('ask')
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!currentUser) return
    if (stars === 0) { showToast('Please select a star rating.', 'info'); return }
    setLoading(true)
    const { error } = await submitRating(sellerId, buyerId, listingId, stars, comment.trim() || undefined)
    setLoading(false)
    if (error) { showToast(error, 'error'); return }
    showToast('Rating submitted. Thank you!', 'success')
    onSubmitted()
  }

  const display = hovered || stars

  if (step === 'ask') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
        <div className="bg-slate-deep border border-slate-border rounded-2xl w-full max-w-sm p-6 text-center">
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="text-cream-muted hover:text-cream">
              <X size={18} />
            </button>
          </div>
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
            <Star size={22} className="text-gold fill-gold" />
          </div>
          <h2 className="font-serif text-xl text-cream mb-2">Rate Your Experience?</h2>
          <p className="text-cream-muted text-sm mb-6">
            {sellerName ? `${sellerName} would` : 'The seller would'} like you to rate your experience for{' '}
            <span className="text-cream">{listingTitle}</span>. This is completely optional.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('form')}
              className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors"
            >
              Yes, rate them
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-3 rounded-xl transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    )
  }

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
          maxLength={150}
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
