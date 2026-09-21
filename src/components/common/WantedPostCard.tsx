import { MessageCircle } from 'lucide-react'
import { WantedPost } from '../../services/dataService'

interface WantedPostCardProps {
  post: WantedPost
  isOwnPost?: boolean
  onChat?: (post: WantedPost) => void
}

const URGENCY_STYLES: Record<WantedPost['urgency'], { label: string; className: string }> = {
  no_rush: { label: 'No rush', className: 'bg-slate-100 text-slate-600' },
  this_week: { label: 'This week', className: 'bg-amber-50 text-amber-700' },
  urgent: { label: 'Urgent', className: 'bg-red-50 text-red-600' },
}

export default function WantedPostCard({ post, isOwnPost = false, onChat }: WantedPostCardProps) {
  const urgency = URGENCY_STYLES[post.urgency]

  return (
    <div className="group relative bg-white border border-[#e5ebf3] rounded-2xl overflow-hidden min-h-[220px] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#d7e1ee] hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
      <div className="p-4 flex flex-col gap-2 h-full">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
            Wanted
          </div>
          {!isOwnPost && (
            <button
              type="button"
              aria-label={`Chat about ${post.title}`}
              onClick={e => { e.stopPropagation(); onChat?.(post) }}
              className="w-9 h-9 rounded-full bg-white border border-[#e5ebf3] flex items-center justify-center shadow-sm transition-all hover:scale-105 text-slate-500 hover:text-blue-600"
            >
              <MessageCircle size={18} />
            </button>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-slate-900 font-bold text-base leading-snug break-words flex-1 min-w-0">
            {post.title}
          </h3>
          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${urgency.className}`}>
            {urgency.label}
          </span>
        </div>

        <p className="text-slate-500 text-xs">
          {post.seeker?.full_name || 'A student'}
        </p>

        {post.residence && (
          <p className="text-slate-500 text-xs">{post.residence}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
            {post.category}
          </span>
          {post.max_price != null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Up to R{Number(post.max_price).toLocaleString('en-ZA')}
            </span>
          )}
          {post.price_flexible && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Flexible on price
            </span>
          )}
        </div>

        {post.description && (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 pt-1">
            {post.description}
          </p>
        )}
      </div>
    </div>
  )
}
