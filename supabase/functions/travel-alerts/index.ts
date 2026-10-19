import { createClient } from 'npm:@supabase/supabase-js@2.43.0'
import { travelEmail, type MailJob } from './mail.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
async function worker(action: string, data: Record<string, unknown> = {}) {
  const { data: result, error } = await admin.rpc('travel_alert_worker', { p_action: action, p_data: data })
  if (error) throw new Error('Travel queue unavailable')
  return result
}

Deno.serve(async request => {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || request.headers.get('x-cron-secret') !== secret) return reply({ error: 'Unauthorized' }, 401)
  const key = Deno.env.get('TRAVEL_RESEND_API_KEY')
  const from = Deno.env.get('TRAVEL_MAIL_FROM')
  try {
    if (!key || !from) {
      await worker('health', { ready: false, error: 'sender_not_configured' })
      return reply({ ready: false, sent: 0, reason: 'sender_not_configured' })
    }
    await worker('health', { ready: true })
    const jobs = await worker('claim') as MailJob[]
    let sent = 0
    let ready = true
    for (const job of jobs) {
      const id = { id: job.id, lock_token: job.lock_token }
      try {
        const mail = travelEmail(job)
        const allowed = (await worker('check', id))?.allowed
        if (!mail || !allowed) { await worker('complete', { ...id, outcome: 'cancelled' }); continue }
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(10000),
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `travel-${job.id}` },
          body: JSON.stringify({ from, to: [job.email], subject: mail.subject, text: mail.text }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || typeof result.id !== 'string') {
          const reason = `provider_rejected_${response.status}`
          await worker('complete', { ...id, outcome: 'failed', error: reason })
          if ([401, 403, 429].includes(response.status)) { ready = false; await worker('health', { ready: false, error: reason }); break }
          continue
        }
        await worker('complete', { ...id, outcome: 'sent', provider_id: result.id }); sent++
      } catch { await worker('complete', { ...id, outcome: 'failed', error: 'delivery_retry_needed' }) }
    }
    return reply({ ready, sent, checked: jobs.length })
  } catch { return reply({ error: 'Travel queue unavailable' }, 503) }
})
