// supabase/functions/send-message-push/index.ts
//
// Generic "push these user ids a notification" endpoint. Invoked
// immediately via pg_net the moment a message (trade or study group) is
// inserted — see notify_on_message / notify_on_group_message in
// migration 035. The trigger composes the title/body/url itself, since
// it already has the sender name and conversation/group context from the
// same lookups that build the in-app bell notification. This function's
// only job is delivering that as a real Web Push — it never decides what
// the notification says.
//
// Secured the same way as send-group-deadline-reminders: a shared secret
// header checked against the CRON_SECRET Edge Function secret. Reused
// rather than a new secret, even though this isn't cron-triggered — it's
// serving the same purpose (prove the caller is our own trusted Postgres,
// not an arbitrary request), so one secret to manage instead of two.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!
// Must exactly match VAPID_PUBLIC_KEY in src/services/push.ts — it's the
// client half of the same key pair.
const VAPID_PUBLIC_KEY = 'BBfLBJBGq75gnRPQma-JrZFUvwF18ktiqX0p0kmMH1J4ArMB6Vb0HtH2expFP9tz2rk7rUy8-dz7lYD7lLlwD_Q'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:support@atriumx.co.za'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface Payload {
  recipient_ids: string[]
  title: string
  body: string
  url: string
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { recipient_ids, title, body, url } = payload
  if (!Array.isArray(recipient_ids) || recipient_ids.length === 0 || !body) {
    return new Response(JSON.stringify({ error: 'recipient_ids (non-empty array) and body are required' }), { status: 400 })
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', recipient_ids)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: title || 'AtriumX', body, url: url || '/' })
      )
      sent++
    } catch (err) {
      // 404/410 = the browser unsubscribed or the endpoint expired.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return new Response(JSON.stringify({ recipients: recipient_ids.length, devices: subs?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
