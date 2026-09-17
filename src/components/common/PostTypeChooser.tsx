import { useNavigate } from 'react-router-dom'
import { X, ShoppingBag, CalendarDays, Package } from 'lucide-react'

export function PostTypeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const options = [
    { id: 'listing', label: 'Sell an item', desc: 'Books, electronics, furniture...', icon: ShoppingBag, color: 'bg-ember', path: '/post' },
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

export default function PostTypeChooser() {
  return null
}
