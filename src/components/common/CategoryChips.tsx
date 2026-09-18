// src/components/common/CategoryChips.tsx
import { useApp } from '../../context/AppContext'

export interface CategoryOption {
  id: string
  label: string
}

export const STUDENT_CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All' },
  { id: 'textbooks', label: 'Textbooks' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'food', label: 'Food' },
  { id: 'services', label: 'Services' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'other', label: 'Other' },
]

export default function CategoryChips({
  categories, active, onSelect,
}: {
  categories?: CategoryOption[]
  active?: string
  onSelect?: (id: string) => void
} = {}) {
  const { activeCategory, setActiveCategory } = useApp()

  const options = categories ?? STUDENT_CATEGORIES
  const current = categories ? active : activeCategory
  const select = categories ? (onSelect ?? (() => {})) : setActiveCategory

  return (
    <div className="overflow-x-auto scrollbar-hide px-0 py-2">
      <div className="flex gap-2 w-max">
        {options.map(cat => (
          <button
            key={cat.id}
            onClick={() => select(cat.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              current === cat.id
                ? 'bg-teal-primary text-white'
                : 'bg-slate-card/50 text-cream-muted hover:bg-slate-card/70 hover:text-cream'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
