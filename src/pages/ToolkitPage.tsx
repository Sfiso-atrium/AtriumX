// src/pages/ToolkitPage.tsx
//
// Reference tools reachable from Focus Mode without leaving the app mid
// study-session. Periodic Table and Conversions are tabs on this one page —
// a formula-sheet section is planned to slot in as a third tab later, not
// built yet.
//
// Grid uses CSS grid with an explicit 18-column template (the real
// periodic table's group numbers), wrapped in a horizontally-scrolling
// container so it stays usable on a phone without redesigning the layout
// for small screens.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Search } from 'lucide-react'
import {
  PERIODIC_TABLE, CATEGORY_LABEL, CATEGORY_COLOR, searchElements,
  type PeriodicElement, type ElementCategory,
} from '../data/periodicTable'
import {
  ALL_CATEGORIES, unitsFor, convert,
  type ConversionCategory,
} from '../data/conversions'

const PAGE_BG = '#FDF3E2'
const TEXT = 'text-[#3A2E22]'
const TEXT_MUTED = 'text-[#8A7A5E]'
const ACCENT = '#C98A1D'

const CATEGORIES: ElementCategory[] = ['metal', 'nonmetal', 'metalloid']

function ElementTile({
  element, onSelect,
}: {
  element: PeriodicElement
  onSelect: (el: PeriodicElement) => void
}) {
  const color = CATEGORY_COLOR[element.category]
  return (
    <button
      onClick={() => onSelect(element)}
      className="flex flex-col items-start justify-between rounded-lg border px-1.5 py-1 w-11 h-12 sm:w-14 sm:h-16 shrink-0 transition-transform active:scale-95"
      style={{ background: color.bg, borderColor: color.border }}
    >
      <span className="text-[9px] sm:text-[10px] opacity-70" style={{ color: color.text }}>
        {element.number}
      </span>
      <span className="text-sm sm:text-base font-bold leading-none" style={{ color: color.text }}>
        {element.symbol}
      </span>
      <span className="text-[7px] sm:text-[8px] leading-none truncate w-full" style={{ color: color.text }}>
        {element.name}
      </span>
    </button>
  )
}

function ElementDetail({ element, onClose }: { element: PeriodicElement; onClose: () => void }) {
  const color = CATEGORY_COLOR[element.category]
  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/30 px-4 pb-6 sm:pb-0" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm rounded-3xl border bg-white p-6 flex flex-col gap-3"
        style={{ borderColor: color.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: color.text }}>
              {CATEGORY_LABEL[element.category]}
            </p>
            <h2 className={`font-serif text-3xl font-bold ${TEXT}`}>{element.name}</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${TEXT_MUTED} hover:opacity-70`}>
            <X size={16} />
          </button>
        </div>
        <div
          className="self-start flex items-center justify-center w-20 h-20 rounded-2xl border text-3xl font-bold"
          style={{ background: color.bg, borderColor: color.border, color: color.text }}
        >
          {element.symbol}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <p className={`text-[11px] ${TEXT_MUTED}`}>Atomic number</p>
            <p className={`font-semibold ${TEXT}`}>{element.number}</p>
          </div>
          <div>
            <p className={`text-[11px] ${TEXT_MUTED}`}>Atomic mass</p>
            <p className={`font-semibold ${TEXT}`}>
              {element.approxMass ? '~' : ''}{element.mass}
            </p>
          </div>
        </div>
        {element.approxMass && (
          <p className={`text-[11px] ${TEXT_MUTED}`}>
            No stable isotope — mass shown is the longest-lived known isotope, not a fixed average.
          </p>
        )}
      </div>
    </div>
  )
}

function ConversionsView() {
  const [category, setCategory] = useState<ConversionCategory>('length')
  const units = unitsFor(category)
  const [fromId, setFromId] = useState(units[0].id)
  const [toId, setToId] = useState(units[1].id)
  const [rawValue, setRawValue] = useState('1')

  function selectCategory(next: ConversionCategory) {
    setCategory(next)
    const nextUnits = unitsFor(next)
    setFromId(nextUnits[0].id)
    setToId(nextUnits[1].id)
  }

  const value = parseFloat(rawValue)
  const result = convert(category, fromId, toId, value)
  const resultDisplay = Number.isFinite(result)
    ? (Math.round(result * 1e6) / 1e6).toString()
    : ''

  function swap() {
    setFromId(toId)
    setToId(fromId)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => selectCategory(c.id)}
            className="px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-colors"
            style={
              category === c.id
                ? { background: `${ACCENT}22`, borderColor: `${ACCENT}88`, color: '#8A5E12' }
                : { background: '#FFFFFF99', borderColor: '#EADFC4', color: '#8A7A5E' }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* From */}
      <div className="rounded-2xl border bg-white/90 p-4 flex flex-col gap-2" style={{ borderColor: `${ACCENT}44` }}>
        <label className={`text-[11px] ${TEXT_MUTED}`}>From</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            className={`flex-1 min-w-0 rounded-xl border px-3 py-2 text-lg font-semibold ${TEXT} focus:outline-none`}
            style={{ borderColor: '#EADFC4' }}
          />
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className={`rounded-xl border px-2 py-2 text-sm ${TEXT} bg-white`}
            style={{ borderColor: '#EADFC4' }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap */}
      <button
        onClick={swap}
        className="self-center text-xs font-semibold px-3 py-1 rounded-full border"
        style={{ borderColor: '#EADFC4', color: '#8A7A5E' }}
      >
        ⇅ Swap
      </button>

      {/* To */}
      <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ background: `${ACCENT}14`, borderColor: `${ACCENT}66` }}>
        <label className="text-[11px]" style={{ color: '#8A5E12' }}>To</label>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 rounded-xl border px-3 py-2 text-lg font-semibold bg-white/80 truncate" style={{ borderColor: `${ACCENT}44`, color: '#8A5E12' }}>
            {resultDisplay || '—'}
          </div>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="rounded-xl border px-2 py-2 text-sm bg-white"
            style={{ borderColor: `${ACCENT}44`, color: '#8A5E12' }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default function ToolkitPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'ptable' | 'conversions'>('ptable')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PeriodicElement | null>(null)

  const results = useMemo(() => searchElements(query), [query])
  const matchSet = useMemo(() => new Set(results.map((el) => el.number)), [results])

  const mainGrid = PERIODIC_TABLE.filter((el) => !el.footnoteRow)
  const lanthanides = PERIODIC_TABLE
    .filter((el) => el.footnoteRow === 'lanthanide')
    .sort((a, b) => (a.footnoteIndex ?? 0) - (b.footnoteIndex ?? 0))
  const actinides = PERIODIC_TABLE
    .filter((el) => el.footnoteRow === 'actinide')
    .sort((a, b) => (a.footnoteIndex ?? 0) - (b.footnoteIndex ?? 0))

  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: PAGE_BG }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => navigate('/focus')}
          className={`w-9 h-9 rounded-xl bg-white/90 shadow-sm flex items-center justify-center ${TEXT} hover:opacity-70 transition-opacity`}
        >
          <X size={18} />
        </button>
        <span className={`text-xs font-semibold ${TEXT_MUTED}`}>Focus Mode Toolkit</span>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-10 pt-6 flex flex-col gap-5">
        <div>
          <h1 className={`font-serif text-3xl font-bold ${TEXT}`}>
            {tab === 'ptable' ? 'Periodic Table' : 'Conversions'}
          </h1>
          <p className={`text-sm mt-1 ${TEXT_MUTED}`}>
            {tab === 'ptable' ? 'Tap an element for its full details.' : 'Pick a category, then a unit on each side.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b" style={{ borderColor: '#EADFC4' }}>
          {(['ptable', 'conversions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors"
              style={
                tab === t
                  ? { borderColor: ACCENT, color: '#8A5E12' }
                  : { borderColor: 'transparent', color: '#8A7A5E' }
              }
            >
              {t === 'ptable' ? 'Periodic Table' : 'Conversions'}
            </button>
          ))}
        </div>

        {tab === 'ptable' ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${TEXT_MUTED}`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, symbol, or atomic number"
                className={`w-full rounded-2xl border bg-white/90 pl-9 pr-4 py-2.5 text-sm ${TEXT} placeholder:${TEXT_MUTED} focus:outline-none`}
                style={{ borderColor: `${ACCENT}66` }}
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border" style={{ background: CATEGORY_COLOR[cat].bg, borderColor: CATEGORY_COLOR[cat].border }} />
                  <span className={`text-xs ${TEXT_MUTED}`}>{CATEGORY_LABEL[cat]}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="overflow-x-auto -mx-5 px-5 pb-2">
              <div
                className="grid gap-1 w-max"
                style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}
              >
                {mainGrid.map((el) => (
                  <div
                    key={el.number}
                    style={{ gridColumn: el.group, gridRow: el.period, opacity: query && !matchSet.has(el.number) ? 0.25 : 1 }}
                  >
                    <ElementTile element={el} onSelect={setSelected} />
                  </div>
                ))}
              </div>

              {/* Lanthanide / actinide footnote rows */}
              <div className="flex gap-1 mt-2">
                <div className="w-11 sm:w-14 shrink-0" />
                {lanthanides.map((el) => (
                  <div key={el.number} style={{ opacity: query && !matchSet.has(el.number) ? 0.25 : 1 }}>
                    <ElementTile element={el} onSelect={setSelected} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-1">
                <div className="w-11 sm:w-14 shrink-0" />
                {actinides.map((el) => (
                  <div key={el.number} style={{ opacity: query && !matchSet.has(el.number) ? 0.25 : 1 }}>
                    <ElementTile element={el} onSelect={setSelected} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <ConversionsView />
        )}
      </div>

      {tab === 'ptable' && selected && <ElementDetail element={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
