import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@onecoffee.lspvn.com'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string }>
  vibrate?: number[]
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth_key: string }

/**
 * Send push notification to a single subscription
 */
async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: PushPayload
): Promise<{ success: boolean; expired?: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_key,
        },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/logo-192.png',
        badge: payload.badge || '/logo-circle.png',
        tag: payload.tag,
        url: payload.url || '/',
        data: payload.data || {},
        requireInteraction: payload.requireInteraction ?? false,
        actions: payload.actions || [],
        vibrate: payload.vibrate || [200, 100, 200],
      })
    )
    return { success: true }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, expired: true }
    }
    return { success: false }
  }
}

/**
 * Send push to customer by user_id using Supabase service role
 */
export async function sendPushToCustomer(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  // Use inline fetch to avoid async createClient import issues
  const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&role=eq.customer&select=id,endpoint,p256dh,auth_key`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
  )

  if (!res.ok) return { sent: 0, failed: 0 }
  const subs: SubRow[] = await res.json()
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 }

  const expiredEndpoints: string[] = []
  let sent = 0, failed = 0

  await Promise.allSettled(
    subs.map(async (sub) => {
      const result = await sendPushToSubscription(sub, payload)
      if (result.success) sent++
      else if (result.expired) expiredEndpoints.push(sub.endpoint)
      else failed++
    })
  )

  // Clean up expired subs
  if (expiredEndpoints.length > 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=in.(${expiredEndpoints.map(e => `"${e}"`).join(',')})`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    })
  }

  return { sent, failed }
}

/**
 * Send push to all admin subscriptions
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?role=eq.admin&select=id,endpoint,p256dh,auth_key`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
  )

  if (!res.ok) return { sent: 0, failed: 0 }
  const subs: SubRow[] = await res.json()
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 }

  let sent = 0, failed = 0
  await Promise.allSettled(
    subs.map(async (sub) => {
      const result = await sendPushToSubscription(sub, payload)
      if (result.success) sent++
      else failed++
    })
  )

  return { sent, failed }
}

/**
 * Send status change push to customer — called when admin updates order status
 */
export async function notifyCustomerOrderStatus(
  orderId: string,
  orderNumber: string,
  status: string,
  recipientName: string | null,
  finalAmount: number | null,
  userId: string | null
): Promise<void> {
  if (!userId) return

  const num = orderNumber || orderId.slice(0, 8)
  const amount = finalAmount
    ? new Intl.NumberFormat('vi-VN').format(finalAmount) + 'đ'
    : null

  type StatusConfig = {
    title: string
    body: string
    vibrate: number[]
    requireInteraction: boolean
    actions: Array<{ action: string; title: string }>
  }

  const configs: Record<string, StatusConfig> = {
    confirmed: {
      title: `✅ Đơn hàng #${num} đã xác nhận`,
      body: ['One Coffee đã nhận đơn của bạn.', amount && `Tổng: ${amount}`, 'Đang trong hàng đợi pha chế ☕'].filter(Boolean).join('\n'),
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [{ action: 'view', title: '👁 Xem đơn' }],
    },
    preparing: {
      title: `👨‍🍳 Đang pha chế đơn #${num}`,
      body: ['Barista đang pha chế đồ uống của bạn.', amount && `Tổng: ${amount}`, 'Sắp xong rồi! ☕'].filter(Boolean).join('\n'),
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [{ action: 'view', title: '👁 Xem đơn' }],
    },
    delivering: {
      title: `🛵 Đơn hàng #${num} đang được giao`,
      body: [
        'Shipper đang mang đồ uống đến cho bạn.',
        recipientName && `Giao cho: ${recipientName}`,
        amount && `Tổng: ${amount}`,
      ].filter(Boolean).join('\n'),
      vibrate: [300, 100, 300, 100, 600],
      requireInteraction: true,
      actions: [{ action: 'view', title: '👁 Xem đơn' }, { action: 'dismiss', title: 'Đã biết' }],
    },
    delivered: {
      title: `🎉 Đơn hàng #${num} đã giao thành công!`,
      body: [
        'Cảm ơn bạn đã tin dùng One Coffee! ❤️',
        amount && `Tổng thanh toán: ${amount}`,
        'Hãy để lại đánh giá nhé ⭐',
      ].filter(Boolean).join('\n'),
      vibrate: [200, 100, 200, 100, 400, 100, 400],
      requireInteraction: true,
      actions: [{ action: 'view', title: '👁 Xem đơn' }, { action: 'review', title: '⭐ Đánh giá' }],
    },
    cancelled: {
      title: `❌ Đơn hàng #${num} đã bị hủy`,
      body: 'Đơn hàng của bạn đã bị hủy.\nLiên hệ 0828 687 321 nếu cần hỗ trợ.',
      vibrate: [400, 200, 400],
      requireInteraction: true,
      actions: [{ action: 'view', title: '👁 Xem đơn' }, { action: 'contact', title: '📞 Liên hệ' }],
    },
  }

  const config = configs[status]
  if (!config) return

  await sendPushToCustomer(userId, {
    ...config,
    icon: '/logo-192.png',
    badge: '/logo-circle.png',
    tag: `order-${status}-${orderId}`,
    url: `/orders/${orderId}`,
    data: { orderId, orderNumber, status },
  })
}
