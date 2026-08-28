// src/sw.ts
//
// Custom service worker source for vite-plugin-pwa's `injectManifest`
// strategy. The previous config used `generateSW`, which auto-builds a
// Workbox service worker for offline caching but has NO push event
// handling — so even a perfectly working Edge Function sending real Web
// Push messages would arrive at the browser with nothing listening for
// them. This file keeps the same precaching behaviour and adds the two
// handlers push notifications actually need.

/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()

// skipWaiting() alone only lets this worker finish activating - it
// doesn't hand control of already-open windows to it. For someone who
// installed the app before this worker existed, that means their
// already-open install can keep running the OLD worker (no 'push'
// listener below) indefinitely, since installed PWAs are often reopened
// rather than fully closed. A push arriving at a page with no listening
// worker still has to produce a system notification (Chrome enforces
// this), so Chrome falls back to its own generic one instead of the
// real AtriumX one. clients.claim() takes control of those already-open
// windows the moment this worker activates, so the next push is handled
// here rather than falling through to that generic fallback.
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})

interface PushPayload {
  title: string
  body: string
  url?: string
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: PushPayload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'AtriumX', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    })
  )
})

// Tapping the notification focuses an already-open AtriumX tab and
// navigates it, or opens a new one if none is open.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) (client as WindowClient).navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
