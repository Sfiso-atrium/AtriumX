// supabase/functions/send-group-deadline-reminders/index.ts
//
// Invoked every 5 minutes by pg_cron via pg_net (see supabase/cron.sql),
// the same way send-study-reminders already runs. Checks every pending
// group-deadline status row against four reminder tiers (2 days, 1 day,
// 10 hours, 1 hour before due_at), and for whichever tier a row has just
// entered, sends an in-app notification plus a real Web Push notification
// — then logs it in study_notification_log so the next tick never
// double-sends. Rows that are 'done' or 'not_affected' are never touched.

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
// Not a secret — just a contact point push services can use if something's
// wrong with what's being sent. Safe to hardcode, unlike the private key.
const VAPID_SUBJECT = 'mailto:support@atriumx.co.za'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// [offset in minutes before due_at, notifications.type-friendly label]
const TIERS: { minutes: number; wording: (title: string) => string }[] = [
  { minutes: 2880, wording: t => `⏳ 2 days left on "${t}". Plenty of time, just don't forget.` },
  { minutes: 1440, wording: t => `📌 "${t}" is due tomorrow. Worth locking in today.` },
  { minutes: 600, wording: t => `⏰ 10 hours left on "${t}" — how's it looking?` },
  { minutes: 60, wording: t => `🚨 1 hour left on "${t}". Last call.` },
]

interface StatusRow {
  id: string
  user_id: string
  deadline: { id: string; title: string; due_at: string; group_id: string } | null
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: rows, error } = await supabase
    .from('study_group_deadline_status')
    .select('id, user_id, deadline:study_group_deadlines(id, title, due_at, group_id)')
    .eq('status', 'pending')
    .returns<StatusRow[]>()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const now = Date.now()
  let sent = 0

  for (const row of rows ?? []) {
    if (!row.deadline) continue
    const dueAt = new Date(row.deadline.due_at).getTime()
    const minutesUntilDue = (dueAt - now) / 60000
    if (minutesUntilDue <= 0) continue

    // Which tier (if any) does this row fall into right now? A 5-minute
    // window matching the cron's own tick interval, so each tier fires
    // exactly once as the countdown crosses it.
    const tier = TIERS.find(t => minutesUntilDue <= t.minutes && minutesUntilDue > t.minutes - 5)
    if (!tier) continue

    const notifyDate = new Date(row.deadline.due_at).toISOString().slice(0, 10)

    // Dedupe via the same log the live study-time reminders already use.
    // ignoreDuplicates means a conflicting row (already sent) comes back
    // empty — that's how we know to skip it.
    const { data: logged } = await supabase
      .from('study_notification_log')
      .upsert(
        { target_type: 'group_deadline_member', target_id: row.id, offset_minutes: tier.minutes, notify_date: notifyDate },
        { onConflict: 'target_type,target_id,offset_minutes,notify_date', ignoreDuplicates: true }
      )
      .select()

    if (!logged || logged.length === 0) continue // already sent this tier

    const message = tier.wording(row.deadline.title)

    await supabase.from('notifications').insert({
      user_id: row.user_id,
      type: 'group_deadline_reminder',
      message,
      group_id: row.deadline.group_id,
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
