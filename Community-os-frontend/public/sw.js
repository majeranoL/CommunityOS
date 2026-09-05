/* CommunityOS service worker — handles web push + notification clicks. */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'CommunityOS', message: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'CommunityOS'
  const options = {
    body: payload.message || '',
    data: { link: payload.link || '/app/notifications', url: payload.link || '/app/notifications' },
    icon: '/favicon.svg',
    badge: '/favicon.svg',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = (event.notification.data && event.notification.data.url) || '/app/notifications'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification:clicked' })
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})