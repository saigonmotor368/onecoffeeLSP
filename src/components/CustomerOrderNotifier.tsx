'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast, useLang } from '@/lib/providers'
import {
  playDeliveringSound,
  playCompletedSound,
  sendDeviceNotification,
  getRecentOrders,
} from '@/lib/notifications'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']

export default function CustomerOrderNotifier() {
  const { showToast } = useToast()
  const { lang } = useLang()
  const lastStatusesRef = useRef<Record<string, string>>({})
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // 1. Get current user id if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        userIdRef.current = session.user.id
      }
    })

    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id || null
    })

    // 2. Realtime listener for order status changes
    const channel = supabase
      .channel('customer-order-notifier')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order
          if (!updated || !updated.id) return

          // Determine if order belongs to this device/user
          const recent = getRecentOrders()
          const isRecentDeviceOrder = recent.some(r => r.id === updated.id || r.number === updated.order_number)
          const isMyUserOrder = Boolean(userIdRef.current && updated.user_id === userIdRef.current)

          if (!isRecentDeviceOrder && !isMyUserOrder) {
            return
          }

          const previousStatus = lastStatusesRef.current[updated.id] || (payload.old as Order)?.order_status
          lastStatusesRef.current[updated.id] = updated.order_status

          // If status hasn't changed, ignore
          if (previousStatus === updated.order_status) {
            return
          }

          const orderNum = updated.order_number || updated.id.slice(0, 8)

          // Case A: Đang giao hàng (Delivering)
          if (updated.order_status === 'delivering') {
            playDeliveringSound()
            const msg = lang === 'vi'
              ? `🛵 Đơn hàng #${orderNum} đang được giao đến bạn!`
              : `🛵 Order #${orderNum} is on the way!`
            showToast(msg, 'info')

            sendDeviceNotification(
              lang === 'vi' ? '🛵 Đơn hàng đang được giao!' : '🛵 Order On The Way!',
              {
                body: lang === 'vi'
                  ? `Đơn hàng #${orderNum} của One Coffee đang được vận chuyển đến địa chỉ của bạn.`
                  : `Your One Coffee order #${orderNum} is en route.`,
                tag: `delivery-${updated.id}`,
                data: { url: `/orders/${updated.id}` },
              }
            )
          }

          // Case B: Hoàn tất đơn hàng (Delivered)
          else if (updated.order_status === 'delivered') {
            playCompletedSound()
            const msg = lang === 'vi'
              ? `🎉 Đơn hàng #${orderNum} đã giao thành công! Chúc bạn ngon miệng ❤️`
              : `🎉 Order #${orderNum} delivered! Enjoy your drinks ❤️`
            showToast(msg, 'success')

            sendDeviceNotification(
              lang === 'vi' ? '🎉 Đơn hàng đã giao thành công!' : '🎉 Order Delivered Successfully!',
              {
                body: lang === 'vi'
                  ? `Đơn hàng #${orderNum} đã hoàn tất. Cảm ơn bạn đã lựa chọn One Coffee!`
                  : `Order #${orderNum} completed. Thank you for choosing One Coffee!`,
                tag: `completed-${updated.id}`,
                data: { url: `/orders/${updated.id}` },
              }
            )
          }

          // Case C: Đơn bị hủy (Cancelled)
          else if (updated.order_status === 'cancelled') {
            const msg = lang === 'vi'
              ? `Đơn hàng #${orderNum} đã bị hủy`
              : `Order #${orderNum} has been cancelled`
            showToast(msg, 'error')
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
      authListener.data.subscription.unsubscribe()
    }
  }, [lang, showToast])

  return null
}
