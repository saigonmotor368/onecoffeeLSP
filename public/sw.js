// One Coffee LSP Service Worker v4 — with Web Push support
const CACHE_NAME = 'one-coffee-lsp-v4'
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

// ─────────────────────────────────────────────────────────────
// Install & Activate
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Fetch handler
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
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

// ─────────────────────────────────────────────────────────────
// WEB PUSH — Receive server-sent push notifications
// This fires even when the app is COMPLETELY CLOSED (like banking apps)
// ─────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'One Coffee', body: event.data.text() }
  }

  const title = payload.title || 'One Coffee'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo-192.png',
    badge: payload.badge || '/logo-circle.png',
    tag: payload.tag || 'one-coffee-push',
    data: { url: payload.url || '/', ...(payload.data || {}) },
    vibrate: payload.vibrate || [200, 100, 200],
    requireInteraction: payload.requireInteraction || false,
    silent: false,
    actions: payload.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─────────────────────────────────────────────────────────────
// Notification click — handle action buttons
// ─────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action  // 'view', 'dismiss', 'review', 'contact', ''

  // Dismiss — close and do nothing
  if (action === 'dismiss') return

  // Contact — open phone dial
  if (action === 'contact') {
    event.waitUntil(clients.openWindow('tel:0828687321'))
    return
  }

  // Review — go to order page (review section)
  // View or default tap — open the order URL
  const targetUrl = action === 'review'
    ? (data.url ? data.url + '#review' : '/orders')
    : (data.url || '/orders')

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Try to focus & navigate an existing window
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // No existing window — open new
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})


// ─────────────────────────────────────────────────────────────
// Background Order Polling (runs in SW scope — works when app minimized on Android)
// State stored in SW memory between poll cycles
// ─────────────────────────────────────────────────────────────
let adminPollingActive = false
let adminPollingTimer = null
let seenOrderIds = new Set()
let adminSessionToken = null
let lastKnownOrderCount = 0

// Receive messages from the admin React app
self.addEventListener('message', event => {
  const { type, payload } = event.data || {}

  if (type === 'ADMIN_START_POLLING') {
    // Admin page sends its session token so SW can call API
    adminSessionToken = payload?.token || null
    if (!adminPollingActive) {
      adminPollingActive = true
      // Seed seen IDs to avoid firing on existing orders
      if (payload?.seenIds) {
        payload.seenIds.forEach(id => seenOrderIds.add(id))
      }
      startBackgroundPolling()
    }
  }

  if (type === 'ADMIN_STOP_POLLING') {
    adminPollingActive = false
    if (adminPollingTimer) {
      clearInterval(adminPollingTimer)
      adminPollingTimer = null
    }
  }

  if (type === 'ADMIN_UPDATE_TOKEN') {
    adminSessionToken = payload?.token || null
  }

  if (type === 'ADMIN_MARK_SEEN') {
    if (payload?.ids) {
      payload.ids.forEach(id => seenOrderIds.add(id))
    }
  }
})

function startBackgroundPolling() {
  if (adminPollingTimer) clearInterval(adminPollingTimer)

  // Poll every 8 seconds from SW background
  adminPollingTimer = setInterval(async () => {
    if (!adminPollingActive) {
      clearInterval(adminPollingTimer)
      return
    }
    await pollForNewOrders()
  }, 8000)
}

async function pollForNewOrders() {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (adminSessionToken) {
      headers['Authorization'] = `Bearer ${adminSessionToken}`
    }

    const response = await fetch('/api/admin/orders?status=pending&limit=50', {
      headers,
      credentials: 'include',
    })

    if (!response.ok) return

    const result = await response.json()
    const orders = result.orders || []
    const newOrders = orders.filter(o => o.id && !seenOrderIds.has(o.id))

    if (newOrders.length > 0) {
      // Mark as seen immediately to avoid duplicate notifications
      newOrders.forEach(o => seenOrderIds.add(o.id))

      // Check if any admin client is active and visible
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const hasVisibleAdminClient = clientList.some(c =>
        c.url.includes('/admin') && c.visibilityState === 'visible'
      )

      // Only show system notification if admin tab is NOT visible (background/minimized)
      // When visible, the React component handles it with in-app toast + sound
      if (!hasVisibleAdminClient) {
        for (const order of newOrders) {
          await showOrderNotification(order)
        }
      }

      // Always notify all admin clients to update their UI
      clientList.forEach(client => {
        if (client.url.includes('/admin')) {
          client.postMessage({
            type: 'NEW_ORDER_FROM_SW',
            payload: { orders: newOrders }
          })
        }
      })
    }
  } catch {
    // Network error — silently ignore, will retry next interval
  }
}

async function showOrderNotification(order) {
  try {
    const orderNum = order.order_number || order.id?.slice(0, 8) || '???'
    const name = order.recipient_name ? ` · KH: ${order.recipient_name}` : ''
    const location = order.delivery_address ? ` → ${order.delivery_address}` : ''
    const amount = order.final_amount
      ? ` · ${new Intl.NumberFormat('vi-VN').format(order.final_amount)}đ`
      : ''

    // Get items summary if available
    const items = order.items_summary || ''

    await self.registration.showNotification(`🔔 ĐƠN MỚI #${orderNum}!`, {
      body: `${name}${amount}${location}${items ? '\n📦 ' + items : ''}\nBấm để xem & soạn hàng →`,
      icon: '/icon-admin-192.png',
      badge: '/logo-circle.png',
      tag: `new-order-${order.id}`,
      data: { url: `/admin/orders/${order.id}`, orderId: order.id },
      vibrate: [300, 100, 300, 100, 600],
      requireInteraction: true,   // Stays on screen until tapped (Android)
      silent: false,
      actions: [
        { action: 'view', title: '👁 Xem đơn' },
        { action: 'dismiss', title: 'Bỏ qua' },
      ],
    })
  } catch {
    // Notification API not available in this context
  }
}

