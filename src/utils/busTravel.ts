export interface BusListing {
  id: string
  company_name: string
  website_url: string
  origin: string | null
  destination: string | null
  origin_aliases: string[]
  destination_aliases: string[]
  boarding_points: string[]
  dropoff_points: string[]
  price: number | null
  price_type: 'fixed' | 'from'
  journey_type: 'unknown' | 'one_way' | 'return'
  connection_type: 'unknown' | 'direct' | 'connecting'
  connection_details: string | null
  departure_time: string | null
  arrival_time: string | null
  duration_minutes: number | null
  operating_days: number[]
  travel_date: string | null
  valid_from: string | null
  valid_until: string | null
  information_date: string | null
  student_discount: string | null
  baggage_allowance: string | null
  notes: string | null
  is_outdated: boolean
  created_at: string
  updated_at: string
}

export type BusListingInput = Omit<BusListing, 'id' | 'created_at' | 'updated_at'>
export type BusSort = 'price_low' | 'price_high' | 'duration' | 'departure' | 'updated'
export interface BusFilters {
  from: string
  to: string
  company: string
  maxPrice: string
  date: string
  departure: string
  journey: string
  connection: string
  studentDiscount: boolean
  sort: BusSort
}
export const emptyBusFilters: BusFilters = {
  from: '', to: '', company: '', maxPrice: '', date: '', departure: '',
  journey: '', connection: '', studentDiscount: false, sort: 'price_low',
}
export const operatingDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function normalisePlace(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

// Damerau-Levenshtein includes swapped neighbouring letters, a common typing error.
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) rows[i][0] = i
  for (let j = 0; j <= b.length; j++) rows[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1)
      }
    }
  }
  return rows[a.length][b.length]
}

export function placeScore(query: string, place: string): number {
  const q = normalisePlace(query), p = normalisePlace(place)
  if (!q) return 0
  if (!p) return Infinity
  if (p === q) return 0
  const words = p.split(' ')
  let score = 0
  for (const token of q.split(' ')) {
    if (words.includes(token)) continue
    if (token.length >= 2 && words.some(word => word.startsWith(token))) { score += 0.1; continue }
    const tolerance = token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0
    if (!tolerance) return Infinity
    const distance = Math.min(...words.map(word => Math.abs(word.length - token.length) <= tolerance
      ? editDistance(token, word) : Infinity))
    if (distance > tolerance) return Infinity
    score += distance
  }
  return score
}

export function listingPlaces(listing: BusListing, side: 'from' | 'to'): string[] {
  return (side === 'from'
    ? [listing.origin, ...listing.origin_aliases, ...listing.boarding_points]
    : [listing.destination, ...listing.destination_aliases, ...listing.dropoff_points])
    .filter((place): place is string => !!place?.trim())
}

export function placeOptions(listings: BusListing[], side: 'from' | 'to', query = ''): string[] {
  return [...new Set(listings.flatMap(listing => listingPlaces(listing, side)))]
    .map(place => ({ place, score: placeScore(query, place) }))
    .filter(option => Number.isFinite(option.score))
    .sort((a, b) => a.score - b.score || a.place.localeCompare(b.place))
    .map(option => option.place)
}

export function southAfricanToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}

export function isBusOutdated(listing: BusListing, today = southAfricanToday()): boolean {
  return listing.is_outdated || !!(listing.valid_until && listing.valid_until < today)
    || !!(listing.travel_date && listing.travel_date < today)
}

export function safeBusWebsite(value: string): string | null {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password
      ? url.href : null
  } catch { return null }
}

export function filterBusListings(listings: BusListing[], filters: BusFilters): BusListing[] {
  const result = listings.filter(listing => {
    if (filters.from.trim() && !listingPlaces(listing, 'from').some(place => Number.isFinite(placeScore(filters.from, place)))) return false
    if (filters.to.trim() && !listingPlaces(listing, 'to').some(place => Number.isFinite(placeScore(filters.to, place)))) return false
    if (filters.company && listing.company_name !== filters.company) return false
    if (filters.maxPrice !== '' && (listing.price == null || listing.price > Number(filters.maxPrice))) return false
    if (filters.journey && listing.journey_type !== filters.journey) return false
    if (filters.connection && listing.connection_type !== filters.connection) return false
    if (filters.studentDiscount && !listing.student_discount?.trim()) return false
    if (filters.date) {
      if (listing.travel_date && listing.travel_date !== filters.date) return false
      const day = new Date(`${filters.date}T12:00:00Z`).getUTCDay()
      if (!listing.travel_date && listing.operating_days.length && !listing.operating_days.includes(day)) return false
      // Unknown dates stay discoverable; validity dates mark information age, not live seat availability.
    }
    if (filters.departure) {
      if (!listing.departure_time) return false
      const hour = Number(listing.departure_time.slice(0, 2))
      const period = hour < 6 ? 'overnight' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
      if (period !== filters.departure) return false
    }
    return true
  })
  const compareKnown = (a: number | null, b: number | null, descending = false): number => {
    if (a == null) return b == null ? 0 : 1
    if (b == null) return -1
    return descending ? b - a : a - b
  }
  const timeValue = (time: string | null) => time == null ? null : Number(time.replace(/:/g, ''))
  return result.sort((a, b) => {
    const comparison = filters.sort === 'price_low' ? compareKnown(a.price, b.price)
      : filters.sort === 'price_high' ? compareKnown(a.price, b.price, true)
      : filters.sort === 'duration' ? compareKnown(a.duration_minutes, b.duration_minutes)
      : filters.sort === 'departure' ? compareKnown(timeValue(a.departure_time), timeValue(b.departure_time))
      : b.updated_at.localeCompare(a.updated_at)
    return comparison || a.company_name.localeCompare(b.company_name) || a.id.localeCompare(b.id)
  })
}

export function formatBusPrice(listing: BusListing): string {
  return listing.price == null ? 'Check fare with company'
    : `${listing.price_type === 'from' ? 'From ' : ''}${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(listing.price)}`
}

export function formatTravelDate(value: string): string {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Johannesburg' })
}
