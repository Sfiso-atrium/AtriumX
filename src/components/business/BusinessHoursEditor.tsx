import { useState } from 'react'
import { DAYS, TIME_OPTIONS, summarizeHours, type BusinessHours } from '../../utils/businessHours'
export default function BusinessHoursEditor({ value, onChange, disabled = false }: { value: BusinessHours | null; onChange: (hours: BusinessHours | null) => void; disabled?: boolean }) {
  const [day, setDay] = useState('0')
  const selected = value?.[day]
  const field = 'min-w-0 rounded-lg border border-slate-border bg-slate-card px-2 py-2 text-sm text-cream'
  const update = (key: 'open' | 'close', time: string) => onChange({ ...value, [day]: { open: selected?.open ?? '09:00', close: selected?.close ?? '17:00', [key]: time } })
  return <details className="rounded-xl border border-slate-border p-3">
    <summary className="cursor-pointer text-sm font-medium text-cream">Operating hours {value === null ? '(optional)' : '· Edit'}</summary>
    <fieldset disabled={disabled} className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select aria-label="Day" className={field} value={day} onChange={e => setDay(e.target.value)}>{DAYS.map((name, i) => <option key={name} value={i}>{name}</option>)}</select>
        <select aria-label="Day availability" className={field} value={selected ? 'open' : 'closed'} onChange={e => { const next = { ...value }; if (e.target.value === 'closed') delete next[day]; else next[day] = { open: '09:00', close: '17:00' }; onChange(next) }}><option value="closed">Closed</option><option value="open">Open</option></select>
        {selected && <><select aria-label="Opening time" className={field} value={selected.open} onChange={e => update('open', e.target.value)}>{Array.from(new Set([...TIME_OPTIONS, selected.open])).sort().map(t => <option key={t}>{t}</option>)}</select><span className="text-cream-muted text-sm">to</span><select aria-label="Closing time" className={field} value={selected.close} onChange={e => update('close', e.target.value)}>{Array.from(new Set([...TIME_OPTIONS, selected.close])).sort().map(t => <option key={t}>{t}</option>)}</select></>}
      </div>
      {selected && <button type="button" className="text-xs text-teal-light" onClick={() => onChange({ ...value, ...Object.fromEntries([0, 1, 2, 3, 4].map(d => [d, { ...selected }])) })}>Apply these hours to Mon–Fri</button>}
      <p className="text-xs text-cream-muted">South African time. Unselected days are closed. A closing time earlier than opening means the next day.</p>
      {selected?.open === selected?.close && selected && <p role="alert" className="text-xs text-red-400">Opening and closing times must differ.</p>}
      {value !== null && <><div className="text-xs text-cream-muted space-y-1">{summarizeHours(value).map(line => <p key={line}>{line}</p>)}</div><button type="button" className="text-xs text-cream-muted underline" onClick={() => onChange(null)}>Remove operating hours</button></>}
    </fieldset>
  </details>
}
