import { supabase } from './supabaseClient'
export interface PartnerContact { id: string; partner_id: string | null; name: string; kind: 'accommodation' | 'tutor' | 'business' | 'student'; email: string | null; phone: string | null; universities: string[]; revision: number }
export interface PartnerTask { id: string; partner_id: string; contact_id: string | null; title: string; steps: { label: string; done: boolean }[]; revision: number }
export interface ProgressEvent { id: number; partner_id: string; task_title: string; step_label: string; checked: boolean; created_at: string }
export interface SupportThread { partner_id: string; name: string; preview: string | null; last_at: string | null; unread: number }
export interface SupportMessage { id: number; content: string; sent_at: string; from_admin: boolean; sender_name: string }
export const workspaceInput = 'w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-3 text-cream text-base focus:outline-none focus:ring-2 focus:ring-teal-light'
export const workspaceButton = 'rounded-xl bg-teal-primary text-white px-4 py-3 text-sm font-bold disabled:opacity-50'
export const workspaceError = (e: unknown) => e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Could not save. Please try again.'
export async function joinPartner() { const { error } = await supabase.rpc('join_partner'); if (error) throw error }
export async function loadWorkspace(admin = false) {
 const results = await Promise.all([
  supabase.from('partner_contacts').select('*').order('created_at', { ascending: false }),
  supabase.from('partner_tasks').select('*').order('created_at', { ascending: false }),
  admin ? supabase.from('partner_progress_events').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
 ])
 for (const r of results) if (r.error) throw r.error
 return { contacts: results[0].data as PartnerContact[], tasks: results[1].data as PartnerTask[], progress: results[2].data as ProgressEvent[] }
}
export async function workspaceAction(action: 'contact' | 'task' | 'tick', data: Record<string, unknown>) {
 const result = await supabase.rpc('partner_workspace_action', { p_action: action, p_data: data }); if (result.error) throw result.error; return result.data
}
export async function support<T>(action: 'inbox' | 'messages' | 'send' | 'read' | 'unread', params: Record<string, unknown> = {}): Promise<T> {
 const { data, error } = await supabase.rpc('partner_support', { p_action: action, ...params }); if (error) throw error; return data as T
}
