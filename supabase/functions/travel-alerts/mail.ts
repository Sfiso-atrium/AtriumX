export interface MailJob {
  id: string; lock_token: string; kind: 'confirmation' | 'update'; email: string;
  from_place: string; to_place: string; confirmation_token: string; unsubscribe_token: string;
  payload: Record<string, unknown>;
}

export function travelEmail(job: MailJob): { subject: string; text: string } | null {
  const base = 'https://atriumx.co.za/#/travel'
  const unsubscribe = `${base}/alerts?unsubscribe=${encodeURIComponent(job.unsubscribe_token)}`
  const route = `${job.from_place} to ${job.to_place}`.replace(/[\r\n]/g, ' ')
  if (job.kind === 'confirmation') return {
    subject: 'Confirm your AtriumX bus route updates',
    text: `You requested free bus updates for ${route}.\n\nConfirm your request:\n${base}/alerts?confirm=${encodeURIComponent(job.confirmation_token)}\n\nNo account is created. This confirmation link expires after 7 days. If you did not request this, ignore the message or remove the request:\n${unsubscribe}\n\nAtriumX Team`,
  }
  const listing = job.payload
  const website = typeof listing.website_url === 'string' ? listing.website_url : ''
  try { if (!['https:', 'http:'].includes(new URL(website).protocol)) return null } catch { return null }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date())
  if (listing.is_outdated || (listing.valid_until && String(listing.valid_until) < today) || (listing.travel_date && String(listing.travel_date) < today)) return null
  const params = new URLSearchParams({ from: job.from_place, to: job.to_place, company: String(listing.company_name || '') })
  if (listing.travel_date) params.set('date', String(listing.travel_date))
  if (listing.id) params.set('bus', String(listing.id))
  const fare = listing.price == null ? 'Fare: check the company website.' : `${listing.price_type === 'from' ? 'Starting fare' : 'Listed fare'}: R${Number(listing.price).toFixed(2)}${listing.journey_type === 'return' ? ' (return)' : listing.journey_type === 'one_way' ? ' (one-way)' : ' (confirm fare basis)'}.`
  return {
    subject: `Bus information updated: ${route}`.slice(0, 200),
    text: `${String(listing.company_name || 'A bus company')} has added or updated information matching ${route}.\n\n${fare}\n${listing.travel_date ? `Travel date: ${String(listing.travel_date)}\n` : ''}${listing.departure_time ? `Departure: ${String(listing.departure_time).slice(0, 5)}\n` : ''}\nView the route on AtriumX:\n${base}?${params}\n\nCompany website:\n${website}\n\nConfirm current fares, timetable and seats with the company before booking.\n\nUnsubscribe from these route updates:\n${unsubscribe}\n\nAtriumX Team`,
  }
}
