import { useNavigate } from 'react-router-dom'
import { X, ShoppingBag, CalendarDays, Package } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function PostTypeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  // Business accounts post through a separate plan/listing flow
  // (BusinessPlanSelect -> BusinessPostListing) - this was lost when this
  // component was redesigned, which sent every account down /post
  // regardless of type.
  const listingPath = currentUser?.account_type === 'business' ? '/business/plan-select' : '/post'
  const options = [
    { id: 'listing', label: 'Sell an item', desc: 'Books, electronics, furniture...', icon: ShoppingBag, color: 'bg-ember', path: listingPath },
    { id: 'wanted', label: 'Looking for', desc: 'Request what you need', icon: Package, color: 'bg-teal-primary', path: '/post?mode=wanted' },
    { id: 'event', label: 'Post an event', desc: 'Study groups, parties, sales', icon: CalendarDays, color: 'bg-gold', path: '/post-event' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 px-4 pb-24 md:pb-0" onClick={onClose}>
      <div className="bg-slate-card border border-slate-border rounded-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-cream font-bold text-lg">What do you want to post?</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-deep border border-slate-border flex items-center justify-center text-cream-muted hover:text-cream"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3">
          {options.map(opt => {
            const Icon = opt.icon
            return (
              <button key={opt.id} onClick={() => { onClose(); navigate(opt.path) }} className="flex items-center gap-3 w-full text-left p-3 rounded-2xl bg-slate-deep border border-slate-border hover:border-teal-light/30 hover:bg-slate-deep/80 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${opt.color} flex items-center justify-center text-white flex-shrink-0`}><Icon size={18} /></div>
                <div className="min-w-0 flex-1"><p className="text-cream font-bold text-sm">{opt.label}</p><p className="text-cream-muted text-xs">{opt.desc}</p></div>
              </button>
            )
          })}
        </div>
        <p className="text-cream-muted text-[11px] text-center mt-4">Choose a type to continue. You can change it later.</p>
      </div>
    </div>
  )
}

// Compact inline version for the top of a post flow, so someone who picked
// wrong can swap without backing out and starting again. Still imported by
// PostListing.tsx and PostEvent.tsx - it was deleted when this file was
// redesigned, which broke both of those pages' builds (they import a name
// that no longer existed). Restored here in the new visual language, with
// the business-account routing carried over the same way as PostTypeModal.
export function PostTypeSwitcher({ current }: { current: 'listing' | 'event' }) {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const listingPath = currentUser?.account_type === 'business' ? '/business/plan-select' : '/post'

  const tab = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
      active
        ? 'bg-teal-primary border-teal-light text-cream'
        : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
    }`

  return (
    <div className="flex gap-2 mb-5">
      <button onClick={() => current !== 'listing' && navigate(listingPath)} className={tab(current === 'listing')}>
        <ShoppingBag size={13} /> Listing
      </button>
      <button onClick={() => current !== 'event' && navigate('/post-event')} className={tab(current === 'event')}>
        <CalendarDays size={13} /> Event
      </button>
    </div>
  )
}
