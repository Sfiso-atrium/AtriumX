import { SOUTH_AFRICAN_UNIVERSITIES } from './universities.ts'

export function validateSubmission(body: any) {
  const text = (value: unknown, name: string, max: number, required = true) => {
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error(`Enter a valid ${name}.`)
    return value.trim()
  }
  if (body.honeypot || body.consent !== true) throw new Error('Confirm you are authorised to submit these property details.')
  const email = text(body.email, 'email address', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
  const phone = text(body.phone, 'contact number', 30)
  if (!/^[+\d\s()-]{7,30}$/.test(phone)) throw new Error('Enter a valid contact number.')
  const websiteInput = text(body.website ?? '', 'website', 500, false)
  let website: string | null = null
  if (websiteInput) {
    const url = new URL(/^https?:\/\//i.test(websiteInput) ? websiteInput : `https://${websiteInput}`)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error('Enter a valid public website address.')
    website = url.href
  }
  const p = body.property
  if (!p || typeof p !== 'object' || !Number.isInteger(p.building_count) || p.building_count < 1 || p.building_count > 100) throw new Error('Enter a valid building count (1–100).')
  if (!Array.isArray(p.universities) || p.universities.length !== 1) throw new Error('Choose one university for the free listing.')
  const universities = [text(p.universities[0], 'university', 150)]
  if (!SOUTH_AFRICAN_UNIVERSITIES.includes(universities[0])) throw new Error('Choose a university from the list.')
  if (!Array.isArray(p.amenities) || p.amenities.length > 30) throw new Error('Add up to 30 amenities.')
  const amenities = p.amenities.map((a: unknown) => text(a, 'amenity', 100))
  if (!Array.isArray(p.room_pricing) || p.room_pricing.length > 30) throw new Error('Add up to 30 room types.')
  const room_pricing = p.room_pricing.map((r: any) => {
    if (!r || !/^(single|shared_([2-9]|[1-9][0-9]+))$/.test(r.room_type)) throw new Error('Enter a valid room type.')
    const result: Record<string, unknown> = { room_type: r.room_type }
    for (const k of ['bursary','nsfas','self_funded']) {
      if (r[k] != null && (typeof r[k] !== 'number' || !Number.isFinite(r[k]) || r[k] <= 0 || r[k] > 1000000)) throw new Error('Enter a valid room price.')
      result[k] = r[k] ?? null
    }
    return result
  })
  if (new Set(room_pricing.map((r: any) => r.room_type)).size !== room_pricing.length) throw new Error('Each room type can only be added once.')
  if (!Array.isArray(body.photos) || body.photos.length > 3) throw new Error('The free listing allows up to three photos.')
  const photos = body.photos.map((p: any) => {
    if (!p || typeof p.base64 !== 'string' || p.base64.length > 700000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64)) throw new Error('Each photo must be smaller than 500 KB after compression.')
    const bytes = Uint8Array.from(atob(p.base64), c => c.charCodeAt(0))
    const jpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255
    const png = [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)
    const webp = String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP'
    if (bytes.length > 512000 || (!jpeg && !png && !webp)) throw new Error('Use a JPG, PNG or WebP photo under 500 KB.')
    return { bytes, type: jpeg?'image/jpeg':png?'image/png':'image/webp', extension:jpeg?'jpg':png?'png':'webp' }
  })
  return {email,phone,website,photos,payload:{title:text(p.title,'property name',150),address:text(p.address,'property address',500),description:text(p.description,'description',5000),building_count:p.building_count,universities,amenities,room_pricing}}
}
