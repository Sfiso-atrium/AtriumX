import { recordVisitSubmission } from './visitMonitor'
import { supabase } from './supabaseClient'
import type { AccommodationListing } from './dataService'

const RECEIPT_KEY = 'atriumx-accommodation-submission'
export type SubmissionReceipt = { receipt: string; id?: string }
export function getSubmissionReceipt(): SubmissionReceipt {
  try { const saved=JSON.parse(localStorage.getItem(RECEIPT_KEY)||'null'); if(saved && /^[a-f0-9]{64}$/.test(saved.receipt))return saved } catch {}
  const receipt=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')
  const result={receipt}; saveSubmissionReceipt(result); return result
}
export function saveSubmissionReceipt(receipt: SubmissionReceipt) {
  try { localStorage.setItem(RECEIPT_KEY,JSON.stringify(receipt)) } catch {}
}
export type AccommodationAccountContext = {
  id: string
  email: string
  phone: string
  website: string | null
  title: string
  address: string
  university: string
}

export async function intakeRequest(body: Record<string,unknown>): Promise<{id?:string;status?:string;context?:AccommodationAccountContext;error?:string}> {
  try {
    const {data,error}=await supabase.functions.invoke('accommodation-intake',{body})
    if(error){try { const response=await error.context.json();return {error:response.error||'Could not submit. Please try again.'} }catch{return {error:'Could not connect. Your form is kept; please try again.'}}}
    if (body.action === 'submit' && data?.id && !data?.error) void recordVisitSubmission('submission', data.id, body.receipt as string)
    return data
  }catch{return {error:'Could not connect. Your form is kept; please try again.'}}
}
export async function getSubmissionAccountContext(): Promise<{ context: AccommodationAccountContext | null; error: string | null }> {
  const receipt = getSubmissionReceipt()
  if (!receipt.id) return { context: null, error: 'This submission link is missing. Return to the accommodation form and use the same browser.' }
  const result = await intakeRequest({ action: 'account_context', id: receipt.id, receipt: receipt.receipt })
  if (result.error || !result.context) return { context: null, error: result.error || 'Could not load the submitted accommodation details.' }
  return { context: result.context, error: null }
}

export async function getGuestAccommodationListings(id?:string): Promise<(AccommodationListing & {redirect_listing_id?:string})[]> {
  const {data,error}=await supabase.rpc('get_public_accommodation_submissions',{p_id:id??null})
  if(error)throw new Error('Could not load submitted accommodation. Please try again.')
  return data??[]
}
export interface AccommodationSubmission {
  id:string; email:string; contact_number:string; website:string|null;
  status:'pending'|'approved'|'rejected'; created_at:string; image_urls:string[];
  payload:Pick<AccommodationListing,'title'|'address'|'description'|'building_count'|'universities'|'amenities'|'room_pricing'>;
}
export async function getAccommodationSubmissions():Promise<AccommodationSubmission[]> {
  const {data,error}=await supabase.rpc('get_accommodation_submissions_admin')
  if(error)throw error;return data??[]
}
export async function reviewAccommodationSubmission(id:string,approve:boolean) {
  const {error}=await supabase.rpc('review_accommodation_submission',{p_id:id,p_approve:approve})
  if(error)throw error
}
