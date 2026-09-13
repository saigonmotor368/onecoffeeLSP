'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast, useLang } from '@/lib/providers'
import {
  playDeliveringSound,
  playCompletedSound,
  sendDeviceNotification,
  getRecentOrders,
  addRecentOrder,
} from '@/lib/notifications'

const POLL_INTERVAL_MS = 15_000
const STATUS_STORAGE_KEY = 'oc_order_statuses'

type OrderRow = {
  id: string
  order_number: string
  order_status: string
  user_id: string | null
  recipient_name: string | null
  final_amount: number | null
  delivery_address: string | null
}

type StatusMap = Record<string, string>

function loadStatusMap(): StatusMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveStatusMap(map: StatusMap) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(map)) } catch {}
}

type NotifLevel = 'success' | 'info' | 'error'

function getStatusConfig(status: string, lang: string, order: Partial<OrderRow>): {
  toastMsg: string
  title: string
  body: string
  type: NotifLevel
  requireInteraction: boolean
  vibrate: number[]
  actions: Array<{ action: string; title: string }>
} | null {
  const vi = lang === 'vi'
  const num = order.order_number || order.id?.slice(0, 8) || '???'
  const amount = order.final_amount
    ? new Intl.NumberFormat('vi-VN').format(order.final_amount) + 'đ'
    : null
  const name = order.recipient_name || ''
  const addr = order.delivery_address || ''

  const viewAction = { action: 'view', title: vi ? '👁 Xem đơn' : '👁 View Order' }

  switch (status) {
    case 'confirmed':
      return {
        toastMsg: vi ? `✅ Đơn #${num} đã được xác nhận!` : `✅ Order #${num} confirmed!`,
        title: vi ? `✅ Đơn hàng #${num} đã xác nhận` : `✅ Order #${num} Confirmed`,
        body: [
          vi ? 'One Coffee đã nhận đơn của bạn.' : 'One Coffee received your order.',
          amount && (vi ? `Tổng: ${amount}` : `Total: ${amount}`),
          vi ? 'Đơn đang trong hàng đợi pha chế ☕' : 'Queued for preparation ☕',
        ].filter(Boolean).join('\n'),
        type: 'success',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [viewAction],
      }

    case 'preparing':
      return {
        toastMsg: vi ? `👨‍🍳 Đang pha chế đơn #${num}!` : `👨‍🍳 Preparing order #${num}!`,
        title: vi ? `👨‍🍳 Đang pha chế đơn #${num}` : `👨‍🍳 Preparing Order #${num}`,
        body: [
          vi ? 'Barista đang pha chế đồ uống của bạn.' : 'Your barista is making your drinks.',
          amount && (vi ? `Tổng: ${amount}` : `Total: ${amount}`),
          vi ? 'Sắp xong rồi! ☕' : 'Almost ready! ☕',
        ].filter(Boolean).join('\n'),
        type: 'info',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [viewAction],
      }

    case 'delivering':
      return {
        toastMsg: vi ? `🛵 Đơn #${num} đang trên đường đến!` : `🛵 Order #${num} is on the way!`,
        title: vi ? `🛵 Đơn hàng #${num} đang được giao` : `🛵 Order #${num} Is On Its Way!`,
        body: [
          vi ? 'Shipper đang mang đồ uống đến cho bạn.' : 'Your drinks are on the way.',
          name && (vi ? `Giao cho: ${name}` : `For: ${name}`),
          addr && (vi ? `Địa chỉ: ${addr}` : `Address: ${addr}`),
          amount && (vi ? `Tổng: ${amount}` : `Total: ${amount}`),
        ].filter(Boolean).join('\n'),
        type: 'info',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 600],
        actions: [viewAction, { action: 'dismiss', title: vi ? 'Đã biết' : 'Got it' }],
      }

    case 'delivered':
      return {
        toastMsg: vi ? `🎉 Đơn #${num} giao thành công! Ngon miệng nhé ❤️` : `🎉 Order #${num} delivered! Enjoy! ❤️`,
        title: vi ? `🎉 Đơn hàng #${num} đã giao thành công!` : `🎉 Order #${num} Delivered!`,
        body: [
          vi ? 'Cảm ơn bạn đã tin dùng One Coffee! ❤️' : 'Thank you for choosing One Coffee! ❤️',
          name && (vi ? `Khách hàng: ${name}` : `Customer: ${name}`),
          amount && (vi ? `Tổng thanh toán: ${amount}` : `Total paid: ${amount}`),
          vi ? 'Hãy để lại đánh giá nhé ⭐' : 'Please leave a review ⭐',
        ].filter(Boolean).join('\n'),
        type: 'success',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 400, 100, 400],
        actions: [viewAction, { action: 'review', title: vi ? '⭐ Đánh giá' : '⭐ Review' }],
      }

    case 'cancelled':
      return {
        toastMsg: vi ? `❌ Đơn #${num} đã bị hủy` : `❌ Order #${num} cancelled`,
        title: vi ? `❌ Đơn hàng #${num} đã bị hủy` : `❌ Order #${num} Cancelled`,
        body: [
          vi ? 'Đơn hàng của bạn đã bị hủy.' : 'Your order has been cancelled.',
          vi ? 'Liên hệ 0828 687 321 nếu cần hỗ trợ.' : 'Contact 0828 687 321 for support.',
        ].join('\n'),
        type: 'error',
        requireInteraction: true,
        vibrate: [400, 200, 400],
        actions: [viewAction, { action: 'contact', title: vi ? '📞 Liên hệ' : '📞 Contact' }],
      }

    default:
      return null
  }
}

export default function CustomerOrderNotifier() {
  const { showToast } = useToast()
  const { lang } = useLang()
  const langRef = useRef(lang)
  const showToastRef = useRef(showToast)
  const statusMapRef = useRef<StatusMap>(loadStatusMap())
  const userIdRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { showToastRef.current = showToast }, [showToast])

  const handleStatusChange = useCallback((order: OrderRow, newStatus: string) => {
    const config = getStatusConfig(newStatus, langRef.current, order)
    if (!config) return

    // In-app toast
    showToastRef.current(config.toastMsg, config.type)

    // Sound
    if (newStatus === 'delivering') playDeliveringSound()
    if (newStatus === 'delivered') playCompletedSound()

    // Server Web Push already shows a system notification. Polling is only a
    // fallback for browsers without a registered push subscription.
    void (async () => {
      const registration = 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration('/sw.js').catch(() => undefined)
        : undefined
      const subscription = await registration?.pushManager.getSubscription().catch(() => null)
      if (subscription) return
      sendDeviceNotification(config.title, {
        body: config.body,
        icon: '/logo-192.png',
        badge: '/logo-circle.png',
        tag: `order-${newStatus}-${order.id}`,
        data: { url: `/orders/${order.id}`, orderId: order.id, orderNumber: order.order_number },
        vibrate: config.vibrate,
        requireInteraction: config.requireInteraction,
        actions: config.actions,
      })
    })()
  }, [])

  const pollOrderStatuses = useCallback(async () => {
    const supabase = createClient()

    // Build IDs to poll
    const recent = getRecentOrders()
    const recentIds = recent.map(r => r.id)

    // Logged in: fetch active orders directly
    if (userIdRef.current) {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, order_status, user_id, recipient_name, final_amount, delivery_address')
          .eq('user_id', userIdRef.current)
          .not('order_status', 'in', '("delivered","cancelled")')
          .order('created_at', { ascending: false })
          .limit(20)

        if (data && data.length > 0) {
          data.forEach(o => addRecentOrder(o.id, o.order_number))
          data.forEach(o => {
            const prev = statusMapRef.current[o.id]
            if (prev !== undefined && prev !== o.order_status) {
              handleStatusChange(o as OrderRow, o.order_status)
            }
            statusMapRef.current[o.id] = o.order_status
          })
          saveStatusMap(statusMapRef.current)
          return
        }
      } catch { /* fall through */ }
    }

    // Guest or fallback: poll by recent order IDs
    const idsToCheck = [...new Set(recentIds)].filter(Boolean)
    if (idsToCheck.length === 0) return

    try {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, order_status, user_id, recipient_name, final_amount, delivery_address')
        .in('id', idsToCheck)

      if (!data) return
      data.forEach(o => {
        const prev = statusMapRef.current[o.id]
        if (prev !== undefined && prev !== o.order_status) {
          handleStatusChange(o as OrderRow, o.order_status)
        }
        statusMapRef.current[o.id] = o.order_status
      })
      saveStatusMap(statusMapRef.current)
    } catch { /* retry next poll */ }
  }, [handleStatusChange])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id || null
      pollOrderStatuses()   // seed status map immediately (no notification on first load)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id || null
      if (session) pollOrderStatuses()
    })

    // Poll every 15 seconds
    timerRef.current = setInterval(pollOrderStatuses, POLL_INTERVAL_MS)

    // Supabase Realtime as instant bonus (works if REPLICA IDENTITY FULL is set)
    const channel = supabase
      .channel('order-status-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as OrderRow
        if (!updated?.id || !updated?.order_status) return

        const recent = getRecentOrders()
        const isRecent = recent.some(r => r.id === updated.id)
        const isOwn = Boolean(userIdRef.current && updated.user_id === userIdRef.current)
        if (!isRecent && !isOwn) return

        const prev = statusMapRef.current[updated.id]
        if (prev !== undefined && prev !== updated.order_status) {
          handleStatusChange(updated, updated.order_status)
        }
        statusMapRef.current[updated.id] = updated.order_status
        saveStatusMap(statusMapRef.current)
      })
      .subscribe()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      channel.unsubscribe()
      authListener.subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
