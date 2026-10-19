import { supabase } from './supabaseClient'
import type { BusListing, BusListingInput } from '../utils/busTravel'
import { safeBusWebsite } from '../utils/busTravel'

export async function getBusListings(): Promise<BusListing[]> {
  const rows: BusListing[] = []
  // Page through the data instead of silently dropping routes at the API row limit.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('bus_listings').select('*')
      .order('created_at', { ascending: false }).order('id').range(offset, offset + 499)
    if (error) throw error
    rows.push(...(data as BusListing[]))
    if (data.length < 500) return rows
  }
}

export async function saveBusListing(input: BusListingInput, id?: string): Promise<BusListing> {
  if (!input.company_name.trim()) throw new Error('Enter the bus company name.')
  if (!safeBusWebsite(input.website_url)) throw new Error('Enter a complete http:// or https:// company website address.')
  const query = id ? supabase.from('bus_listings').update(input).eq('id', id)
    : supabase.from('bus_listings').insert(input)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data as BusListing
}

export function busError(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Please try again.'
}
