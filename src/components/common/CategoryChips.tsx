import { useRef } from 'react'

export type CategoryOption = { id: string; label: string }

export const STUDENT_CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'books', label: 'Books' },
  { id: 'services', label: 'Services' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'other', label: 'More' },
]

export default function CategoryChips({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryOption[]
  active: string
  onSelect: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={scrollRef} className="overflow-x-auto scrollbar-hide px-4 py-2">
      <div className="flex gap-2 w-max">
        {categories.map(cat => {
          const isActive = active === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                isActive
                  ? 'bg-[#2563EB] border-[#2563EB] text-white'
                  : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-light hover:text-cream'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
