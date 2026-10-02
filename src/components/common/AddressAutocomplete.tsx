import { useEffect, useRef, useState } from 'react'

type PhotonFeature = {
  properties?: {
    name?: string
    housenumber?: string
    street?: string
    district?: string
    city?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
  }
}

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function formatAddress(feature: PhotonFeature): string {
  const p = feature.properties ?? {}
  const first = [p.housenumber, p.street].filter(Boolean).join(' ').trim() || p.name || ''
  const parts = [first, p.district, p.city, p.county, p.state, p.postcode, p.country]
    .filter((part): part is string => !!part?.trim())
  return [...new Set(parts)].join(', ')
}

export default function AddressAutocomplete({ value, onChange, placeholder = 'Address', className = '', disabled = false }: Props) {
  const inputClass = className || 'w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors'
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const skipNextSearch = useRef(false)

  useEffect(() => {
    if (disabled || skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }

    const query = value.trim()
    if (query.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const params = new URLSearchParams({
          q: `${query}, South Africa`,
          limit: '6',
          lang: 'en',
          // South Africa bounding box keeps suggestions relevant to AtriumX users.
          bbox: '16.3449768409,-34.8191663551,32.8301204770,-22.0913127581',
        })
        const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Address lookup failed')
        const data = await response.json() as { features?: PhotonFeature[] }
        const next = [...new Set((data.features ?? []).map(formatAddress).filter(Boolean))].slice(0, 6)
        setSuggestions(next)
        setOpen(next.length > 0)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSuggestions([])
          setOpen(false)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [value, disabled])

  const choose = (address: string) => {
    skipNextSearch.current = true
    onChange(address)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={inputClass}
        disabled={disabled}
        autoComplete="street-address"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-border bg-slate-card shadow-xl">
          {suggestions.map(address => (
            <button
              key={address}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => choose(address)}
              className="block w-full border-b border-slate-border px-4 py-3 text-left text-sm text-cream last:border-b-0 hover:bg-slate-deep"
            >
              {address}
            </button>
          ))}
          <div className="px-4 py-2 text-[10px] text-cream-muted">
            {loading ? 'Finding addresses…' : 'Address suggestions © OpenStreetMap contributors'}
          </div>
        </div>
      )}
    </div>
  )
}
