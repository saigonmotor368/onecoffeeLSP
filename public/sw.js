// One Coffee LSP Service Worker v5 — Admin Push + Aggressive Alerts
const CACHE_NAME = 'one-coffee-lsp-v5'
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

  const isAdminOrder = payload.role === 'admin' || (payload.tag || '').startsWith('admin-new-order')

  const title = payload.title || 'One Coffee'

  let options

  if (isAdminOrder) {
    // ── ADMIN: ĐƠN MỚI → cực kỳ dữ dội ────────────────────────────────────
    // Rung pattern: 3 đợt × [500ms ON, 200ms OFF, 500ms ON, 300ms OFF, 1000ms ON]
    // Tổng: ~8 giây rung
    const VIBRATE_BURST = [500, 200, 500, 200, 1000, 500]
    const VIBRATE_ADMIN = [
      ...VIBRATE_BURST, 400,
      ...VIBRATE_BURST, 400,
      ...VIBRATE_BURST,
    ]

    options = {
      body: payload.body || '',
      icon: payload.icon || '/icon-admin-192.png',
      badge: payload.badge || '/icon-admin-192.png',
      tag: payload.tag || 'admin-new-order',
      renotify: true,          // Re-alert even if same tag still showing
      data: { url: payload.url || '/admin/orders', ...(payload.data || {}) },
      vibrate: payload.vibrate || VIBRATE_ADMIN,
      requireInteraction: true, // STAYS on screen until admin taps
      silent: false,
      actions: payload.actions || [
        { action: 'view', title: '📋 Xem đơn ngay' },
        { action: 'dismiss', title: 'Sau' },
      ],
    }

    // Show first notification immediately
    event.waitUntil(
      self.registration.showNotification(title, options).then(() => {
        // Show a SECOND notification 4 seconds later to really grab attention
        return new Promise(resolve => {
          setTimeout(async () => {
            try {
              await self.registration.showNotification(
                title.replace('🔔', '‼️').replace('ĐƠN MỚI', '‼️ ĐƠN MỚI ‼️'),
                { ...options, tag: (payload.tag || 'admin-new-order') + '-repeat', vibrate: VIBRATE_ADMIN }
              )
            } catch {}
            resolve()
          }, 4000)
        })
      })
    )
  } else {
    // ── CUSTOMER: trạng thái đơn hàng → bình thường ────────────────────────
    options = {
      body: payload.body || '',
      icon: payload.icon || '/logo-192.png',
      badge: payload.badge || '/logo-circle.png',
      tag: payload.tag || 'one-coffee-push',
      renotify: false,
      data: { url: payload.url || '/', ...(payload.data || {}) },
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction || false,
      silent: false,
      actions: payload.actions || [],
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  }
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
    const name = order.recipient_name ? `KH: ${order.recipient_name}` : ''
    const location = order.delivery_address ? `📍 ${order.delivery_address}` : ''
    const amount = order.final_amount
      ? `💰 ${new Intl.NumberFormat('vi-VN').format(order.final_amount)}đ`
      : ''
    const items = order.items_summary || ''

    // Aggressive vibrate: 3 bursts
    const VIBRATE_BURST = [500, 200, 500, 200, 1000, 500]
    const VIBRATE_ADMIN = [...VIBRATE_BURST, 400, ...VIBRATE_BURST, 400, ...VIBRATE_BURST]

    const body = [
      name,
      amount,
      location,
      items ? `📦 ${items}` : '',
      '👆 Bấm để xem & soạn hàng ngay!',
    ].filter(Boolean).join('\n')

    await self.registration.showNotification(`‼️ ĐƠN MỚI #${orderNum} ‼️`, {
      body,
      icon: '/icon-admin-192.png',
      badge: '/icon-admin-192.png',
      tag: `new-order-${order.id}`,
      renotify: true,
      data: { url: `/admin/orders/${order.id}`, orderId: order.id },
      vibrate: VIBRATE_ADMIN,
      requireInteraction: true,
      silent: false,
      actions: [
        { action: 'view', title: '📋 Xem đơn ngay' },
        { action: 'dismiss', title: 'Sau' },
      ],
    })

    // Repeat notification after 5s if admin hasn't responded
    setTimeout(async () => {
      const notiList = await self.registration.getNotifications({ tag: `new-order-${order.id}` })
      if (notiList.length > 0) {
        // Notification still showing = admin hasn't tapped → re-alert
        await self.registration.showNotification(`🚨 NHẮC LẠI: ĐƠN #${orderNum} chưa xử lý!`, {
          body: `${body}\n⏰ Đơn đang chờ ${Math.floor(Date.now() / 1000 % 3600)}s`,
          icon: '/icon-admin-192.png',
          badge: '/icon-admin-192.png',
          tag: `new-order-${order.id}-remind`,
          renotify: true,
          data: { url: `/admin/orders/${order.id}`, orderId: order.id },
          vibrate: VIBRATE_ADMIN,
          requireInteraction: true,
          silent: false,
          actions: [
            { action: 'view', title: '📋 Xem đơn ngay' },
            { action: 'dismiss', title: 'Bỏ qua' },
          ],
        })
      }
    }, 5000)
  } catch {
    // Notification API not available in this context
  }
}

