// src/services/push.ts
import { supabase } from './supabaseClient'

// Public key only - safe to ship in client code. Its matching private key
// lives wherever the actual sending happens (a server, never the browser)
// and is what proves a push claiming to be from AtriumX really is.
const VAPID_PUBLIC_KEY = 'BKowMMqh3359P6StafHyQvVkMpAU0qqlSf50AKffms2DWuTBDs39CWzoxe0HG1B5cIOeiH1puomM51K1Zj8BiS4'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// Call this from a real button click, not automatically on page load -
// browsers increasingly ignore or penalize permission prompts that aren't
// tied to a direct user gesture.
export async function subscribeToPush(userId: string): Promise<{ error: string | null }> {
  if (!pushSupported()) return { error: 'Push notifications are not supported in this browser.' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { error: 'Notification permission was not granted.' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // cast needed: TS's DOM lib treats Uint8Array<ArrayBufferLike> as not
      // strictly assignable to BufferSource, even though this is exactly
      // the shape the Push API expects at runtime
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    const json = subscription.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    }, { onConflict: 'endpoint' })

    if (error) return { error: error.message }

    await supabase.from('push_preferences').upsert({
      user_id: userId, push_enabled: true, updated_at: new Date().toISOString(),
    })

    return { error: null }
  } catch (e: any) {
    return { error: e?.message || 'Could not enable push notifications.' }
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe()
  }
  await supabase.from('push_preferences').upsert({
    user_id: userId, push_enabled: false, updated_at: new Date().toISOString(),
  })
}
