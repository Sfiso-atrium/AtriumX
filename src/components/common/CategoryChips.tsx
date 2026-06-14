// src/components/common/CategoryChips.tsx
import { useApp } from '../../context/AppContext'
import { CATEGORIES } from '../../data/mockListings'

export default function CategoryChips() {
  const { activeCategory, setActiveCategory } = useApp()

  return (
    <div className="overflow-x-auto scrollbar-hide px-4 py-3">
      <div className="flex gap-2 w-max">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
              activeCategory === cat.id
                ? 'bg-teal-primary text-cream border-teal-light'
                : 'bg-slate-card text-cream-muted border-slate-border hover:border-teal-primary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
