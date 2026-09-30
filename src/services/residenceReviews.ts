import { supabase } from './supabaseClient'
import type { AccommodationReview } from './dataService'

export interface Residence {
  id: string
  name: string
  university: string
  listing_id: string | null
  submission_id: string | null
  public_listing_id?: string | null
  listing?: { id: string; universities: string[]; status: string } | null
  reviews?: { stars: number }[]
}
export async function getResidences(): Promise<Residence[]> {
  const { data, error } = await supabase.from('accommodation_residences').select('id,name,university,listing_id,submission_id,listing:accommodation_listings(id,universities,status),reviews:accommodation_reviews(stars)').order('name')
  if (error) throw new Error('Could not load residence names. Please try again.')
  return (data ?? []) as unknown as Residence[]
}
export async function getResidence(id: string): Promise<Residence | null> {
  const { data, error } = await supabase.from('accommodation_residences').select('id,name,university,listing_id,submission_id,listing:accommodation_listings(id,universities,status)').eq('id', id).maybeSingle()
  if (error) throw new Error('Could not load this residence.')
  if (!data) return null
  const residence = data as unknown as Residence
  residence.public_listing_id = residence.listing?.status === 'active' ? residence.listing.id : null
  if (!residence.public_listing_id && residence.submission_id) {
    const {data: submissions, error: submissionError} = await supabase.rpc('get_public_accommodation_submissions', {p_id: residence.submission_id})
    if (submissionError) throw new Error('Could not load this residence listing.')
    if (submissions?.[0] && !submissions[0].redirect_listing_id) residence.public_listing_id = residence.submission_id
  }
  return residence
}
export async function getResidenceForListing(id: string): Promise<Residence | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await supabase.from('accommodation_residences').select('id,name,university,listing_id,submission_id').or(`listing_id.eq.${id},submission_id.eq.${id}`).maybeSingle()
  if (error) throw new Error('Could not load residence reviews.')
  return data
}
export async function getResidenceReviews(id: string): Promise<AccommodationReview[]> {
  const { data, error } = await supabase.from('accommodation_reviews').select('*').eq('residence_id',id).order('created_at',{ascending:false})
  if (error) throw new Error('Could not load reviews. Please try again.')
  return data ?? []
}
export async function postResidenceReview(input: { residenceId: string | null; name: string; university: string; stars: number; comment: string }): Promise<string> {
  const {data,error}=await supabase.rpc('submit_residence_review',{p_residence_id:input.residenceId,p_name:input.name,p_university:input.university,p_stars:input.stars,p_comment:input.comment})
  if(error) throw new Error(error.message)
  return data
}
