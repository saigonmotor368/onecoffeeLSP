import webpush from 'web-push'
import { getAdminClient } from '@/lib/supabase/admin'

let vapidConfigured = false

function configureVapid(): boolean {
  if (vapidConfigured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL || 'mailto:admin@onecoffee.lspvn.com'
  if (!publicKey || !privateKey) {
    console.error('Web Push VAPID keys are not configured')
    return false
  }
  webpush.setVapidDetails(email, publicKey, privateKey)
  vapidConfigured = true
  return true
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  role?: 'admin' | 'customer'
  data?: Record<string, unknown>
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string }>
  vibrate?: number[]
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth_key: string }

async function sendToSubscriptions(subs: SubRow[], payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (subs.length === 0) return { sent: 0, failed: 0 }
  if (!configureVapid()) return { sent: 0, failed: subs.length }

  let sent = 0
  let failed = 0
  await Promise.all(subs.map(async sub => {
    const result = await sendPushToSubscription(sub, payload)
    if (result.success) {
      sent++
    } else {
      failed++
      if (result.expired) {
        const { error } = await getAdminClient().from('push_subscriptions').delete().eq('id', sub.id)
        if (error) console.error('Could not remove expired push subscription:', error)
      }
    }
  }))
  return { sent, failed }
}

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
        role: payload.role || 'customer',
        data: payload.data || {},
        requireInteraction: payload.requireInteraction ?? false,
        actions: payload.actions || [],
        vibrate: payload.vibrate || [200, 100, 200],
      }),
      { TTL: 24 * 60 * 60, urgency: 'high' }
    )
    return { success: true }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, expired: true }
    }
    console.error('Web Push delivery failed:', statusCode || err)
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
  const { data, error } = await getAdminClient().from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', userId)
    .eq('role', 'customer')
  if (error) {
    console.error('Could not load customer push subscriptions:', error)
    throw error
  }
  return sendToSubscriptions((data || []) as SubRow[], payload)
}

/**
 * Send push to all admin subscriptions
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  // Always force role='admin' so SW uses aggressive notification style
  const adminPayload: PushPayload = { ...payload, role: 'admin' }
  const { data, error } = await getAdminClient().from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('role', 'admin')
  if (error) {
    console.error('Could not load admin push subscriptions:', error)
    throw error
  }
  console.log(`[Push] Found ${(data || []).length} admin subscriptions`)
  return sendToSubscriptions((data || []) as SubRow[], adminPayload)
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
): Promise<{ sent: number; failed: number }> {
  if (!userId) return { sent: 0, failed: 0 }

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
  if (!config) return { sent: 0, failed: 0 }

  return sendPushToCustomer(userId, {
    ...config,
    icon: '/logo-192.png',
    badge: '/logo-circle.png',
    tag: `order-${status}-${orderId}`,
    url: `/orders/${orderId}`,
    data: { orderId, orderNumber, status },
  })
}
