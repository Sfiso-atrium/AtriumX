// src/components/common/PostTypeChooser.tsx
//
// The popup behind the "+" button. Instead of "+" going straight to the
// listing flow, it now asks what's being posted.
//
// This same component is reused as the in-flow switcher at the top of
// both PostListing and PostEvent (compact variant), so someone who picked
// wrong can swap without backing out and starting again — which was the
// explicit ask. Same component, so the two entry points can't drift apart.

import { Tag, CalendarDays, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export function PostTypeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { currentUser } = useApp()

  const listingPath = currentUser?.account_type === 'business'
    ? '/business/plan-select'
    : '/plan-select'

  const go = (path: string) => { onClose(); navigate(path) }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-24 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-slate-card border border-slate-border rounded-3xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-cream font-bold text-base">Create a post</p>
            <p className="text-cream-muted text-xs mt-1">Choose one of the options already available on AtriumX.</p>
          </div>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => go(listingPath)}
            className="group flex flex-col items-start gap-4 p-4 rounded-2xl border border-slate-border hover:border-teal-light transition-colors text-left min-h-[126px]"
          >
            <span className="w-9 h-9 rounded-xl border border-slate-border flex items-center justify-center">
              <Tag size={19} className="text-teal-light flex-shrink-0" />
            </span>
            <div>
              <p className="text-cream font-bold text-sm">A listing</p>
              <p className="text-cream-muted text-xs mt-1 leading-5">Something you're selling</p>
            </div>
          </button>

          <button
            onClick={() => go('/post-event')}
            className="group flex flex-col items-start gap-4 p-4 rounded-2xl border border-slate-border hover:border-gold transition-colors text-left min-h-[126px]"
          >
            <span className="w-9 h-9 rounded-xl border border-slate-border flex items-center justify-center">
              <CalendarDays size={19} className="text-gold flex-shrink-0" />
            </span>
            <div>
              <p className="text-cream font-bold text-sm">An event</p>
              <p className="text-cream-muted text-xs mt-1 leading-5">Something happening on campus</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact inline version for the top of a post flow. `current` is which
// flow you're already in, so it renders as the unselected option being
// the one you can switch to.
export function PostTypeSwitcher({ current }: { current: 'listing' | 'event' }) {
  const navigate = useNavigate()
  const { currentUser } = useApp()

  const listingPath = currentUser?.account_type === 'business'
    ? '/business/plan-select'
    : '/plan-select'

  const tab = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
      active
        ? 'bg-teal-primary border-teal-light text-cream'
        : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
    }`

  return (
    <div className="flex gap-2 mb-5">
      <button
        onClick={() => current !== 'listing' && navigate(listingPath)}
        className={tab(current === 'listing')}
      >
        <Tag size={13} /> Listing
      </button>
      <button
        onClick={() => current !== 'event' && navigate('/post-event')}
        className={tab(current === 'event')}
      >
        <CalendarDays size={13} /> Event
      </button>
    </div>
  )
}
