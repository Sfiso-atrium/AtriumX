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

// Keyed by the normalized query. A hit skips the network entirely, which is
// what makes retyping or backspacing through an address feel instant instead
// of re-debouncing and re-fetching from the (distant, shared) geocoder every
// time. Module-level, not per-mount, so it also warms up as the person moves
// between every form that uses this component in the same session.
const resultCache = new Map<string, string[]>()
const CACHE_LIMIT = 300

function cacheGet(key: string): string[] | undefined {
  const hit = resultCache.get(key)
  if (hit) {
    // refresh recency so frequently-reused prefixes survive eviction
    resultCache.delete(key)
    resultCache.set(key, hit)
  }
  return hit
}

function cacheSet(key: string, value: string[]) {
  resultCache.set(key, value)
  if (resultCache.size > CACHE_LIMIT) {
    const oldest = resultCache.keys().next().value
    if (oldest !== undefined) resultCache.delete(oldest)
  }
}

export default function AddressAutocomplete({ value, onChange, placeholder = 'Address', className = '', disabled = false }: Props) {
  const inputClass = className || 'w-full bg-slate-deep border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors'
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const skipNextSearch = useRef(false)
  const suggestionsRef = useRef<string[]>([])
  suggestionsRef.current = suggestions

  useEffect(() => {
    if (disabled || skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }

    const query = value.trim()
    const key = query.toLowerCase()

    if (query.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    // Exact cache hit: this exact query has been fetched before in this
    // session — show it immediately, no debounce, no request.
    const cached = cacheGet(key)
    if (cached) {
      setSuggestions(cached)
      setOpen(cached.length > 0)
      setLoading(false)
      return
    }

    // While the real lookup is in flight, narrow whatever is already on
    // screen to what still matches — so continuing to type never blanks
    // the list out and wait; it just gets more precise as results arrive.
    const refined = suggestionsRef.current.filter(s => s.toLowerCase().includes(key))
    if (refined.length > 0) setSuggestions(refined)

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
        cacheSet(key, next)
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
    }, 150)

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
