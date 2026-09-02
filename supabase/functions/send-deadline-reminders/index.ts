// supabase/functions/send-deadline-reminders/index.ts
//
// Personal-deadline counterpart to send-group-deadline-reminders. Invoked
// every 5 minutes by pg_cron via pg_net (see supabase/cron.sql). Checks
// every deadline in the `deadlines` table (personal, migration 023)
// against the same four reminder tiers used for group deadlines (2 days,
// 1 day, 10 hours, 2 hours before due_at), and for whichever tier a
// deadline has just entered, sends an in-app notification plus a real Web
// Push notification — then logs it in study_notification_log (same
// dedupe table group deadlines already use, new target_type
// 'personal_deadline') so the next tick never double-sends.
//
// This supersedes the old single-tier send_deadline_reminders() SQL
// function from migration 023 (24-hours-out, bell-only, no push). That
// function is left in place but should no longer be scheduled via
// pg_cron — this Edge Function replaces it.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!
// Must exactly match VAPID_PUBLIC_KEY in src/services/push.ts — it's the
// client half of the same key pair. Public by nature, so hardcoding here
// is fine; it's already shipped in the browser bundle either way.
const VAPID_PUBLIC_KEY = 'BBfLBJBGq75gnRPQma-JrZFUvwF18ktiqX0p0kmMH1J4ArMB6Vb0HtH2expFP9tz2rk7rUy8-dz7lYD7lLlwD_Q'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:support@atriumx.co.za'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Same four tiers as group deadlines, kept identical on purpose so the
// two feel consistent to the user.
const TIERS: { minutes: number; wording: (title: string) => string }[] = [
  { minutes: 2880, wording: t => `⏳ 2 days left on "${t}". Plenty of time, just don't forget.` },
  { minutes: 1440, wording: t => `📌 "${t}" is due tomorrow. Worth locking in today.` },
  { minutes: 600, wording: t => `⏰ 10 hours left on "${t}" — how's it looking?` },
  { minutes: 120, wording: t => `🚨 2 hours left on "${t}". Last call.` },
]

interface DeadlineRow {
  id: string
  user_id: string
  title: string
  due_at: string
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: rows, error } = await supabase
    .from('deadlines')
    .select('id, user_id, title, due_at')
    .gt('due_at', new Date().toISOString())
    .returns<DeadlineRow[]>()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const now = Date.now()
  let sent = 0

  for (const row of rows ?? []) {
    const dueAt = new Date(row.due_at).getTime()
    const minutesUntilDue = (dueAt - now) / 60000

    // Which tier (if any) does this deadline fall into right now? A
    // 5-minute window matching the cron's own tick interval, so each
    // tier fires exactly once as the countdown crosses it.
    const tier = TIERS.find(t => minutesUntilDue <= t.minutes && minutesUntilDue > t.minutes - 5)
    if (!tier) continue

    const notifyDate = new Date(row.due_at).toISOString().slice(0, 10)

    // Dedupe via the same log group deadlines already use. ignoreDuplicates
    // means a conflicting row (already sent) comes back empty — that's how
    // we know to skip it.
    const { data: logged } = await supabase
      .from('study_notification_log')
      .upsert(
        { target_type: 'personal_deadline', target_id: row.id, offset_minutes: tier.minutes, notify_date: notifyDate },
        { onConflict: 'target_type,target_id,offset_minutes,notify_date', ignoreDuplicates: true }
      )
      .select()

    if (!logged || logged.length === 0) continue // already sent this tier

    const message = tier.wording(row.title)

    await supabase.from('notifications').insert({
      user_id: row.user_id,
      type: 'deadline_reminder',
      message,
    })

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', row.user_id)

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: 'AtriumX', body: message, url: '/#/space' })
        )
      } catch (err) {
        // 404/410 = the browser unsubscribed or the endpoint expired.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    sent++
  }

  return new Response(JSON.stringify({ checked: rows?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
