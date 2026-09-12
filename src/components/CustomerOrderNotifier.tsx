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

const POLL_INTERVAL_MS = 15_000  // poll every 15 seconds
const STATUS_STORAGE_KEY = 'oc_order_statuses'

type StatusMap = Record<string, string>  // orderId → last known status

function loadStatusMap(): StatusMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveStatusMap(map: StatusMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(map))
  } catch {}
}

function getStatusLabel(status: string, lang: string): { title: string; body: string; type: 'success' | 'info' | 'error' } {
  const vi = lang === 'vi'
  switch (status) {
    case 'confirmed':
      return {
        title: vi ? '✅ Đơn hàng đã được xác nhận!' : '✅ Order Confirmed!',
        body:  vi ? 'Đơn hàng đã được nhận và đang trong hàng đợi pha chế.' : 'Your order has been received and is queued for preparation.',
        type: 'success',
      }
    case 'preparing':
      return {
        title: vi ? '👨‍🍳 Đang pha chế đơn của bạn!' : '👨‍🍳 Preparing Your Order!',
        body:  vi ? 'Đơn hàng đang được pha chế, chờ xíu nhé! ☕' : 'Your order is being prepared. Almost ready! ☕',
        type: 'info',
      }
    case 'delivering':
      return {
        title: vi ? '🛵 Đơn hàng đang được giao!' : '🛵 Order On The Way!',
        body:  vi ? 'Đơn hàng đang được vận chuyển đến địa chỉ của bạn.' : 'Your order is en route to your delivery address.',
        type: 'info',
      }
    case 'delivered':
      return {
        title: vi ? '🎉 Đơn hàng đã giao thành công!' : '🎉 Order Delivered!',
        body:  vi ? 'Đơn hàng đã hoàn tất. Cảm ơn bạn đã chọn One Coffee! ❤️' : 'Order completed. Thank you for choosing One Coffee! ❤️',
        type: 'success',
      }
    case 'cancelled':
      return {
        title: vi ? '❌ Đơn hàng đã bị hủy' : '❌ Order Cancelled',
        body:  vi ? 'Đơn hàng đã bị hủy. Liên hệ 0828 687 321 nếu cần hỗ trợ.' : 'Order cancelled. Contact 0828 687 321 for support.',
        type: 'error',
      }
    default:
      return { title: '', body: '', type: 'info' }
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

  // Keep refs up-to-date to avoid stale closures
  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { showToastRef.current = showToast }, [showToast])

  const handleStatusChange = useCallback((orderId: string, orderNumber: string, newStatus: string) => {
    const currentLang = langRef.current
    const label = getStatusLabel(newStatus, currentLang)
    if (!label.title) return

    const num = orderNumber || orderId.slice(0, 8)
    const fullTitle = label.title.replace('Đơn hàng', `Đơn hàng #${num}`).replace('Order', `Order #${num}`)

    // In-app toast
    showToastRef.current(`${label.title} — #${num}`, label.type)

    // System notification
    sendDeviceNotification(fullTitle, {
      body: label.body,
      tag: `${newStatus}-${orderId}`,
      data: { url: `/orders/${orderId}` },
    })

    // Play sound for key events
    if (newStatus === 'delivering') playDeliveringSound()
    if (newStatus === 'delivered') playCompletedSound()
  }, [])

  const pollOrderStatuses = useCallback(async () => {
    const supabase = createClient()

    // Collect order IDs to check: recent device orders + logged-in user orders
    const recent = getRecentOrders()
    const recentIds = recent.map(r => r.id)

    // If logged in, also fetch user's active orders
    let userOrderIds: string[] = []
    if (userIdRef.current) {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, order_status')
          .eq('user_id', userIdRef.current)
          .not('order_status', 'in', '("delivered","cancelled")')
          .order('created_at', { ascending: false })
          .limit(20)
        if (data && data.length > 0) {
          // Add to recent orders list for future tracking
          data.forEach(o => addRecentOrder(o.id, o.order_number))
          userOrderIds = data.map(o => o.id)

          // Detect changes for user orders
          data.forEach(o => {
            const prev = statusMapRef.current[o.id]
            if (prev !== undefined && prev !== o.order_status) {
              handleStatusChange(o.id, o.order_number, o.order_status)
            }
            statusMapRef.current[o.id] = o.order_status
          })
          saveStatusMap(statusMapRef.current)
          return  // done — user orders polled successfully
        }
      } catch {
        // fallback to recent orders below
      }
    }

    // Fallback: poll by recent order IDs from localStorage
    const idsToCheck = [...new Set([...recentIds, ...userOrderIds])].filter(Boolean)
    if (idsToCheck.length === 0) return

    try {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, order_status')
        .in('id', idsToCheck)
      
      if (!data) return

      data.forEach(o => {
        const prev = statusMapRef.current[o.id]
        if (prev !== undefined && prev !== o.order_status) {
          handleStatusChange(o.id, o.order_number, o.order_status)
        }
        statusMapRef.current[o.id] = o.order_status
      })
      saveStatusMap(statusMapRef.current)
    } catch {
      // Network error — retry next poll
    }
  }, [handleStatusChange])

  useEffect(() => {
    const supabase = createClient()

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id || null
      // Immediately seed status map on load (no notification for initial state)
      pollOrderStatuses()
    })

    // Track auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id || null
      if (session) pollOrderStatuses()
    })

    // Start polling
    timerRef.current = setInterval(pollOrderStatuses, POLL_INTERVAL_MS)

    // Also try Supabase Realtime as a bonus (if REPLICA IDENTITY FULL is set, this will fire instantly)
    const channel = supabase
      .channel('order-status-rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as { id: string; order_number: string; order_status: string; user_id: string }
          if (!updated?.id || !updated?.order_status) return

          const recent = getRecentOrders()
          const isRecent = recent.some(r => r.id === updated.id)
          const isOwn = Boolean(userIdRef.current && updated.user_id === userIdRef.current)

          if (!isRecent && !isOwn) return

          const prev = statusMapRef.current[updated.id]
          if (prev !== undefined && prev === updated.order_status) return

          if (prev !== undefined && prev !== updated.order_status) {
            handleStatusChange(updated.id, updated.order_number, updated.order_status)
          }
          statusMapRef.current[updated.id] = updated.order_status
          saveStatusMap(statusMapRef.current)
        }
      )
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
