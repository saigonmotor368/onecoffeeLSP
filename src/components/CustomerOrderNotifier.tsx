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

          // Case A: Đã xác nhận đơn (Confirmed)
          if (updated.order_status === 'confirmed') {
            const msg = lang === 'vi'
              ? `✅ Đơn hàng #${orderNum} đã được xác nhận!`
              : `✅ Order #${orderNum} has been confirmed!`
            showToast(msg, 'success')

            sendDeviceNotification(
              lang === 'vi' ? '✅ Đơn hàng đã xác nhận!' : '✅ Order Confirmed!',
              {
                body: lang === 'vi'
                  ? `Đơn hàng #${orderNum} đã được nhận và đang trong hàng đợi pha chế.`
                  : `Order #${orderNum} has been received and queued for preparation.`,
                tag: `confirmed-${updated.id}`,
                data: { url: `/orders/${updated.id}` },
              }
            )
          }

          // Case B: Đang pha chế (Preparing)
          else if (updated.order_status === 'preparing') {
            const msg = lang === 'vi'
              ? `👨‍🍳 Đơn hàng #${orderNum} đang được pha chế!`
              : `👨‍🍳 Order #${orderNum} is being prepared!`
            showToast(msg, 'info')

            sendDeviceNotification(
              lang === 'vi' ? '👨‍🍳 Đang pha chế đơn của bạn!' : '👨‍🍳 Preparing Your Order!',
              {
                body: lang === 'vi'
                  ? `Đơn hàng #${orderNum} đang được pha chế, chờ xíu nhé! ☕`
                  : `Order #${orderNum} is being prepared. Almost ready! ☕`,
                tag: `preparing-${updated.id}`,
                data: { url: `/orders/${updated.id}` },
              }
            )
          }

          // Case C: Đang giao hàng (Delivering)
          else if (updated.order_status === 'delivering') {
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

          // Case D: Hoàn tất đơn hàng (Delivered)
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

          // Case E: Đơn bị hủy (Cancelled)
          else if (updated.order_status === 'cancelled') {
            const msg = lang === 'vi'
              ? `❌ Đơn hàng #${orderNum} đã bị hủy`
              : `❌ Order #${orderNum} has been cancelled`
            showToast(msg, 'error')

            sendDeviceNotification(
              lang === 'vi' ? '❌ Đơn hàng đã bị hủy' : '❌ Order Cancelled',
              {
                body: lang === 'vi'
                  ? `Đơn hàng #${orderNum} đã bị hủy. Liên hệ hotline 0828 687 321 nếu cần hỗ trợ.`
                  : `Order #${orderNum} was cancelled. Contact 0828 687 321 if you need help.`,
                tag: `cancelled-${updated.id}`,
                data: { url: `/orders/${updated.id}` },
              }
            )
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
