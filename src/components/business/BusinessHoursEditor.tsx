import { Plus, X } from 'lucide-react'
import { DAYS, summarizeHours, type BusinessHours } from '../../utils/businessHours'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const field = 'min-w-0 rounded-lg border border-slate-border bg-slate-card px-2 py-2 text-sm text-cream focus:outline-none focus:border-teal-light transition-colors'

function TimePicker({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const [hour, minute] = value.split(':')
  return <div className="flex items-center gap-1">
    <select aria-label={`${label} hour`} className={`${field} w-full`} value={hour} onChange={e => onChange(`${e.target.value}:${minute}`)}>{HOURS.map(h => <option key={h}>{h}</option>)}</select>
    <span className="text-cream-muted">:</span>
    <select aria-label={`${label} minute`} className={`${field} w-full`} value={minute} onChange={e => onChange(`${hour}:${e.target.value}`)}>{MINUTES.map(m => <option key={m}>{m}</option>)}</select>
  </div>
}

export default function BusinessHoursEditor({ value, onChange, disabled = false }: { value: BusinessHours | null; onChange: (hours: BusinessHours | null) => void; disabled?: boolean }) {
  const days = Object.keys(value ?? {}).sort()
  const unused = DAYS.map((_, i) => String(i)).filter(day => !value?.[day])
  const addDay = () => {
    if (!unused.length) return
    onChange({ ...value, [unused[0]]: { open: '09:00', close: '17:00' } })
  }
  const removeDay = (day: string) => { const next = { ...value }; delete next[day]; onChange(Object.keys(next).length ? next : null) }
  const changeDay = (day: string, nextDay: string) => {
    if (day === nextDay || value?.[nextDay] || !value?.[day]) return
    const next = { ...value }; next[nextDay] = next[day]; delete next[day]; onChange(next)
  }
  const update = (day: string, key: 'open' | 'close', time: string) => {
    if (value?.[day]) onChange({ ...value, [day]: { ...value[day], [key]: time } })
  }
  return <details className="sm:col-span-2 bg-slate-card border border-slate-border rounded-2xl group">
    <summary className="list-none cursor-pointer p-4 sm:p-5 flex items-center justify-between gap-4">
      <div><h2 className="text-cream font-bold text-base">Operating hours <span className="text-cream-muted font-normal text-xs">(optional)</span></h2>
        <p className="text-cream-muted text-xs mt-1">{days.length ? `${days.length} day${days.length === 1 ? '' : 's'} added` : 'Add your opening days and times.'}</p></div>
      <span className="text-teal-light text-xs font-bold whitespace-nowrap">Manage ▾</span>
    </summary>
    <fieldset disabled={disabled} className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-border pt-4 space-y-3">
      {days.length === 0 && <p className="text-cream-muted text-xs border border-dashed border-slate-border rounded-xl py-4 text-center">No opening days added.</p>}
      {days.map(day => {
        const hours = value![day]
        return <div key={day} className="bg-slate-deep border border-slate-border rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <select aria-label={`${DAYS[Number(day)]} day`} className={`${field} font-semibold flex-1`} value={day} onChange={e => changeDay(day, e.target.value)}>{DAYS.map((name, i) => <option key={name} value={i} disabled={String(i) !== day && !!value?.[i]}>{name}</option>)}</select>
            <button type="button" onClick={() => removeDay(day)} className="text-cream-muted hover:text-cream p-2" aria-label={`Remove ${DAYS[Number(day)]}`}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-cream-muted mb-1">Opens</p><TimePicker label={`${DAYS[Number(day)]} opening`} value={hours.open} onChange={time => update(day, 'open', time)} /></div>
            <div><p className="text-xs text-cream-muted mb-1">Closes</p><TimePicker label={`${DAYS[Number(day)]} closing`} value={hours.close} onChange={time => update(day, 'close', time)} /></div>
          </div>
          {hours.open === hours.close && <p role="alert" className="text-xs text-red-400">Opening and closing times must differ.</p>}
          {hours.close < hours.open && <p className="text-xs text-cream-muted">Closes the following day.</p>}
          {unused.length > 0 && <button type="button" className="text-teal-light text-xs font-medium hover:text-cream transition-colors" onClick={() => onChange({ ...value, ...Object.fromEntries(unused.map(d => [d, { ...hours }])) })}>Copy to remaining days</button>}
        </div>
      })}
      {unused.length > 0 && <button type="button" onClick={addDay} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-faint text-teal-light text-xs font-bold hover:text-cream transition-colors"><Plus size={14} /> Add day</button>}
      <p className="text-xs text-cream-muted">South African time. Days you haven’t added are closed once hours are saved. Copying fills only days you haven’t added.</p>
      {days.length > 0 && <div className="border-t border-slate-border pt-3 space-y-1 text-xs text-cream-muted">{summarizeHours(value!).map(line => <p key={line}>{line}</p>)}</div>}
    </fieldset>
  </details>
}
