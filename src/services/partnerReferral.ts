import { supabase } from './supabaseClient'
import { capturePartnerReferral, clearPartnerReferral } from '../utils/partnerReferral'

export async function attachPartnerReferral(): Promise<void> {
  const code = capturePartnerReferral()
  if (!code) return
  // Never accept a user ID from the browser: the RPC binds only auth.uid().
  const { data, error } = await supabase.rpc('attach_partner_referral', { p_code: code })
  if (!error && data !== 'signed_out') clearPartnerReferral()
}

export interface PartnerOverview {
  referredCount: number
  activityCount: number
  totals: { pending: number; approved: number; paid: number }
  activities: { id: string; kind: string; title: string; created_at: string }[]
  commissions: { id: string; amount: number; cash_amount: number; rate: number; status: string; created_at: string }[]
  terms: { rate: number; starts_at: string; ends_at: string; agreement_reference: string } | null
}
export async function getPartnerOverview(): Promise<PartnerOverview> {
  const { data, error } = await supabase.rpc('get_partner_overview')
  if (error) throw error
  return data as PartnerOverview
}
