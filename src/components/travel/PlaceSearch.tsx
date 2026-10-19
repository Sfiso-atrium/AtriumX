import { useId, useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { placeScore } from '../../utils/busTravel'

export default function PlaceSearch({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const suggestions = options.map(place => ({ place, score: placeScore(value, place) }))
    .filter(item => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score || a.place.localeCompare(b.place))
    .slice(0, 100).map(item => item.place)
  function choose(place: string) { onChange(place); setOpen(false); setActive(-1) }
  return <div className="relative min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setActive(-1) }
  }}>
    <label htmlFor={id} className="block text-sm font-semibold text-cream mb-2">{label}</label>
    <div className="relative">
      <MapPin size={18} aria-hidden="true" className="absolute left-3 top-3.5 text-teal-light pointer-events-none" />
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={`${id}-options`} aria-activedescendant={open && active >= 0 && suggestions[active] ? `${id}-${active}` : undefined}
        autoComplete="off" maxLength={120} value={value} placeholder="Choose or type a place"
        className="w-full rounded-xl border border-slate-border bg-slate-deep pl-10 pr-11 py-3 text-base text-cream focus:outline-none focus:ring-2 focus:ring-teal-light"
        onFocus={() => setOpen(true)} onChange={event => { onChange(event.target.value); setActive(-1); setOpen(true) }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, suggestions.length - 1)) }
          else if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => Math.max(index - 1, 0)) }
          else if (event.key === 'Enter' && open && active >= 0 && suggestions[active]) { event.preventDefault(); choose(suggestions[active]) }
          else if (event.key === 'Escape') { setOpen(false); setActive(-1) }
        }} />
      <button type="button" aria-label={`Show ${label.toLowerCase()} places`} aria-expanded={open}
        onClick={() => { setOpen(previous => !previous); setActive(-1) }} className="absolute right-0 top-0 h-full px-3 text-cream-muted">
        <ChevronDown size={18} />
      </button>
    </div>
    {open && <div className="absolute top-full mt-1 z-30 w-full rounded-xl border border-slate-border bg-slate-card shadow-xl max-h-60 overflow-y-auto">
      <ul id={`${id}-options`} role="listbox" aria-label={`${label} places`}>
        {suggestions.map((place, index) => <li key={place} id={`${id}-${index}`} role="option" aria-selected={active === index}
          className={`px-3 py-3 text-sm text-cream cursor-pointer break-words ${active === index ? 'bg-teal-faint' : 'hover:bg-slate-deep'}`}
          onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(place)}>{place}</li>)}
      </ul>
      {!suggestions.length && <p className="px-3 py-3 text-xs text-cream-muted">{options.length ? 'No matching place in the supplied routes. Try a nearby town or another spelling.' : 'Places will appear as company routes are added.'}</p>}
    </div>}
  </div>
}
