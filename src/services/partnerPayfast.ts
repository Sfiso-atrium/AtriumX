import { supabase } from './supabaseClient'

export interface PayfastAccount {
  partner_id: string; merchant_id: string; account_name: string; environment: 'live' | 'sandbox'
  status: 'pending' | 'ready' | 'paused'; revision: number; review_reference?: string
}
export interface PayfastSplit {
  payment_id: string; partner_id?: string; amount_cents: number; environment: string
  status: string; pf_payment_id: string | null; created_at: string
}
export interface PayfastState { account: PayfastAccount | null; platformEnabled: boolean; splits: PayfastSplit[] }
export interface SplitSettings { environment: 'live' | 'sandbox'; primary_merchant_id: string; enabled: boolean; verification_reference: string }
export const splitStatusLabel: Record<string, string> = {
  prepared: 'Checkout being prepared', submitted: 'Awaiting customer payment',
  customer_paid: 'Customer paid · receipt awaiting reconciliation', confirmed: 'Received in PayFast',
  review_required: 'Payment needs review', reversed: 'Reversed',
}
export async function getPartnerPayfast(): Promise<PayfastState> {
  const { data, error } = await supabase.rpc('get_partner_payfast_state')
  if (error) throw error
  return data as PayfastState
}
export async function savePartnerPayfast(merchant: string, name: string, environment: string) {
  const { error } = await supabase.rpc('save_partner_payfast', { p_merchant_id: merchant, p_account_name: name, p_environment: environment })
  if (error) throw error
}
export async function partnerPayfastAdminData() {
  const results = await Promise.all([
    supabase.from('partner_payfast_accounts').select('*'),
    supabase.from('payfast_split_settings').select('*'),
    supabase.from('partner_commission_terms').select('*'),
    supabase.from('payment_partner_splits').select('payment_id,partner_id,amount_cents,environment,status,pf_payment_id,created_at').order('created_at', { ascending: false }).limit(100),
  ])
  for (const result of results) if (result.error) throw result.error
  return { accounts: results[0].data as PayfastAccount[], settings: results[1].data as SplitSettings[], terms: results[2].data as { partner_id: string; rate: number; starts_at: string; ends_at: string; agreement_reference: string }[], splits: results[3].data as PayfastSplit[] }
}
export async function payfastAdminAction(name: 'configure_partner_payfast' | 'configure_payfast_splits' | 'reconcile_partner_split', params: Record<string, unknown>) {
  const { error } = await supabase.rpc(name, params)
  if (error) throw error
}
