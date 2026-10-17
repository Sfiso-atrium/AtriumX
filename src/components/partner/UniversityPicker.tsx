import { useState } from 'react'
import { SOUTH_AFRICAN_UNIVERSITIES } from '../../data/universities'
import { workspaceInput } from '../../services/partnerWorkspace'
export default function UniversityPicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
 const [search, setSearch] = useState('')
 return <details className="rounded-xl border border-slate-border bg-slate-deep text-cream">
  <summary className="p-3 cursor-pointer">Universities · {value.length ? `${value.length} selected` : 'Choose universities'}</summary>
  <div className="p-3 pt-0"><input aria-label="Search universities" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search universities" className={workspaceInput} />
  <div className="max-h-56 overflow-y-auto mt-2">{SOUTH_AFRICAN_UNIVERSITIES.filter(u => u.toLowerCase().includes(search.toLowerCase())).map(u => <label key={u} className="flex items-start gap-3 py-3 text-sm"><input type="checkbox" className="mt-0.5 w-4 h-4 accent-teal-primary" checked={value.includes(u)} onChange={e => onChange(e.target.checked ? [...value, u] : value.filter(v => v !== u))} />{u}</label>)}</div></div>
 </details>
}
