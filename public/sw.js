// One Coffee LSP Service Worker
const CACHE_NAME = 'one-coffee-lsp-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/manifest-admin.json',
  '/icon-order-192.png',
  '/icon-order-512.png',
  '/icon-admin-192.png',
  '/icon-admin-512.png',
  '/logo-circle.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Network first with cache fallback for HTML navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (event.request.url.includes('/admin')) {
          return caches.match('/admin')
        }
        return caches.match('/')
      })
    )
    return
  }

  // Cache first for static images and assets
  if (
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    event.request.destination === 'style'
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          if (response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
          }
          return response
        }).catch(() => cached)
      })
    )
  }
})

// Handle Mobile & Desktop Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
