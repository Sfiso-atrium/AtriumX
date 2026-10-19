import { emptyBusFilters, type BusFilters, type BusListing } from './busTravel'

export function readTravelFilters(params: URLSearchParams): BusFilters {
  const filters = { ...emptyBusFilters }
  for (const key of ['from', 'to', 'company'] as const) filters[key] = (params.get(key) || '').slice(0, 160)
  const price = params.get('maxPrice')
  if (price && Number.isFinite(Number(price)) && Number(price) >= 0) filters.maxPrice = String(Number(price))
  const date = params.get('date') || ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date) filters.date = date
  const departure = params.get('departure') || ''
  if (['overnight', 'morning', 'afternoon', 'evening'].includes(departure)) filters.departure = departure
  const journey = params.get('journey') || ''
  if (['one_way', 'return'].includes(journey)) filters.journey = journey
  const connection = params.get('connection') || ''
  if (['direct', 'connecting'].includes(connection)) filters.connection = connection
  filters.studentDiscount = params.get('studentDiscount') === '1'
  const sort = params.get('sort')
  if (['price_low', 'price_high', 'duration', 'departure', 'updated'].includes(sort || '')) filters.sort = sort as BusFilters['sort']
  return filters
}

export function travelFilterParams(filters: BusFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of ['from', 'to', 'company', 'maxPrice', 'date', 'departure', 'journey', 'connection'] as const) {
    if (filters[key].trim()) params.set(key, filters[key].trim())
  }
  if (filters.studentDiscount) params.set('studentDiscount', '1')
  if (filters.sort !== 'price_low') params.set('sort', filters.sort)
  return params
}

export function travelShareLink(filters: BusFilters, listing?: BusListing, origin = 'https://atriumx.co.za'): string {
  const shared = listing ? {
    ...emptyBusFilters, from: listing.origin || listing.boarding_points[0] || '',
    to: listing.destination || listing.dropoff_points[0] || '', company: listing.company_name, date: listing.travel_date || '',
  } : filters
  const params = travelFilterParams(shared)
  if (listing) params.set('bus', listing.id)
  // Only known filter fields are copied. Email addresses, alert tokens and campaign IDs never enter shared links.
  return `${origin.replace(/\/$/, '')}/#/travel${params.size ? `?${params}` : ''}`
}

export function travelShareText(filters: BusFilters, listing?: BusListing): string {
  const from = listing?.origin || filters.from, to = listing?.destination || filters.to
  return `Find buses${from ? ` from ${from}` : ''}${to ? ` to ${to}` : ''}${listing ? ` with ${listing.company_name}` : ''} on AtriumX. Free to browse; no account needed.`
}
