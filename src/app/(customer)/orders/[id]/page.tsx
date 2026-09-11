'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import { addRecentOrder, playDeliveringSound, playCompletedSound } from '@/lib/notifications'
import styles from './order-detail.module.css'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useLang()
  const { showToast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showItemsList, setShowItemsList] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      let foundOrder: Order | null = null
      let foundItems: OrderItem[] = []

      // Try finding by UUID
      const [{ data: byId }, { data: itemsById }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).maybeSingle(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])

      if (byId) {
        foundOrder = byId
        foundItems = itemsById || []
      } else {
        // Try finding by order_number
        const { data: byNum } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', id)
          .maybeSingle()
        if (byNum) {
          foundOrder = byNum
          const { data: itemsByNum } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', byNum.id)
          foundItems = itemsByNum || []
        }
      }

      if (foundOrder) {
        addRecentOrder(foundOrder.id, foundOrder.order_number)
      }
      setOrder(foundOrder)
      setItems(foundItems)
      setLoading(false)
    }
    load()

    // Realtime subscription
    const supabase = createClient()
    const sub = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
      }, payload => {
        const updated = payload.new as Order
        if (updated && (updated.id === id || updated.order_number === id)) {
          setOrder(prev => {
            if (prev) {
              if (prev.order_status !== 'delivering' && updated.order_status === 'delivering') {
                playDeliveringSound()
                showToast(lang === 'vi' ? '🛵 Đơn hàng đang được giao đến bạn!' : '🛵 Order is on the way!', 'info')
              } else if (prev.order_status !== 'delivered' && updated.order_status === 'delivered') {
                playCompletedSound()
                showToast(lang === 'vi' ? '🎉 Đơn hàng đã giao thành công! Chúc bạn ngon miệng ❤️' : '🎉 Order delivered! Enjoy ❤️', 'success')
              }
            }
            return updated
          })
        }
      })
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [id, lang, showToast])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <span className="spinner" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className={styles.pageContainer} style={{ textAlign: 'center', padding: '60px 20px' }}>
        <span style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>🔍</span>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1A202C' }}>
          {lang === 'vi' ? 'Không tìm thấy đơn hàng' : 'Order Not Found'}
        </h2>
        <p style={{ fontSize: '13px', color: '#718096', margin: '8px 0 20px' }}>
          {lang === 'vi' ? 'Mã đơn hàng không tồn tại hoặc đã được xử lý.' : 'This order could not be located.'}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => router.push('/orders')}
          style={{ padding: '10px 20px', borderRadius: '12px' }}
        >
          {lang === 'vi' ? 'Xem danh sách đơn hàng' : 'View Orders'}
        </button>
      </div>
    )
  }

  const createdDate = new Date(order.created_at)
  const createdTimeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const createdDateStr = createdDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  const orderTimeLabel = `${createdTimeStr} - ${createdDateStr}`

  const isPending = order.order_status === 'pending'
  const isConfirmed = order.order_status === 'confirmed'
  const isPreparing = order.order_status === 'preparing'
  const isDelivering = order.order_status === 'delivering'
  const isDelivered = order.order_status === 'delivered'
  const isCancelled = order.order_status === 'cancelled'

  // Dynamic Timeline steps matching real order status
  const steps = [
    {
      title_vi: 'Đã nhận đơn',
      title_en: 'Order Placed',
      time: orderTimeLabel,
      desc_vi: isPending
        ? 'Quầy One Coffee đã nhận được đơn, đang chờ xác nhận.'
        : 'Quầy One Coffee đã tiếp nhận đơn hàng.',
      desc_en: isPending
        ? 'Order received, waiting for confirmation.'
        : 'Order received by counter.',
      icon: isPending ? '⏳' : '✓',
      isCompleted: !isPending,
      isActive: isPending,
    },
    {
      title_vi: 'Xác nhận & Pha chế',
      title_en: 'Confirmed & Preparing',
      time: isPending
        ? (lang === 'vi' ? 'Chờ xác nhận' : 'Pending')
        : (lang === 'vi' ? 'Đang thực hiện' : 'In progress'),
      desc_vi: isPreparing || isConfirmed
        ? 'Barista One Coffee đang chuẩn bị thức uống của bạn.'
        : ['delivering', 'delivered'].includes(order.order_status)
        ? 'Đã pha chế xong, thức uống sẵn sàng giao.'
        : 'Sẽ pha chế ngay sau khi xác nhận đơn.',
      desc_en: isPreparing || isConfirmed
        ? 'Barista is crafting your beverage.'
        : ['delivering', 'delivered'].includes(order.order_status)
        ? 'Beverages prepared and ready.'
        : 'Will prepare after order confirmation.',
      icon: ['delivering', 'delivered'].includes(order.order_status) ? '✓' : '☕',
      isCompleted: ['delivering', 'delivered'].includes(order.order_status),
      isActive: isConfirmed || isPreparing,
    },
    {
      title_vi: 'Đang giao hàng',
      title_en: 'Out for Delivery',
      time: isDelivering
        ? (lang === 'vi' ? 'Đang trên đường giao' : 'On the way')
        : isDelivered
        ? (lang === 'vi' ? 'Đã giao' : 'Delivered')
        : (lang === 'vi' ? 'Dự kiến sau khi pha chế' : 'Est. after prep'),
      desc_vi: isDelivering
        ? 'Nước đang trên đường chuyển đến vị trí của bạn!'
        : isDelivered
        ? 'Đã vận chuyển đến điểm nhận.'
        : 'Nhân viên sẽ giao ngay sau khi chuẩn bị xong.',
      desc_en: isDelivering
        ? 'Your drinks are on the way!'
        : isDelivered
        ? 'Delivered to your location.'
        : 'Drinks will be dispatched once prepared.',
      icon: isDelivered ? '✓' : '🛵',
      isCompleted: isDelivered,
      isActive: isDelivering,
    },
    {
      title_vi: 'Đã giao thành công',
      title_en: 'Delivered',
      time: isDelivered
        ? (lang === 'vi' ? 'Hoàn tất' : 'Completed')
        : (lang === 'vi' ? 'Bước cuối' : 'Final step'),
      desc_vi: isDelivered
        ? 'Cảm ơn bạn! Chúc bạn thưởng thức đồ uống ngon miệng ❤️'
        : 'Hoàn tất đơn hàng và thưởng thức đồ uống.',
      desc_en: isDelivered
        ? 'Thank you! Enjoy your delicious coffee ❤️'
        : 'Complete order and enjoy drinks.',
      icon: isDelivered ? '🎉' : '○',
      isCompleted: isDelivered,
      isActive: isDelivered,
    },
  ]

  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className={styles.pageContainer}>
      {/* Header matching Screen 8 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push('/orders')}
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className={styles.title}>
          {lang === 'vi' ? 'Theo dõi đơn hàng' : 'Order Tracking'}
        </h1>
        <div style={{ width: '28px' }} />
      </header>

      {isCancelled && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>❌</span>
          <span>{lang === 'vi' ? 'Đơn hàng này đã bị hủy. Quý khách vui lòng liên hệ quầy hoặc đặt lại đơn mới.' : 'This order has been cancelled.'}</span>
        </div>
      )}

      {/* Vertical Stepper matching Screen 8 */}
      <div className={styles.timelineCard}>
        {steps.map((step, idx) => (
          <div key={idx} className={styles.stepItem}>
            {/* Left node & connector line */}
            <div className={styles.nodeColumn}>
              <div className={`${styles.nodeCircle} ${step.isCompleted ? styles.nodeCompleted : ''} ${step.isActive ? styles.nodeActive : ''}`}>
                <span>{step.icon}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`${styles.connectorLine} ${step.isCompleted ? styles.connectorActive : ''}`} />
              )}
            </div>

            {/* Right step details */}
            <div className={styles.stepDetails}>
              <div className={styles.stepHeader}>
                <h3 className={`${styles.stepTitle} ${step.isActive ? styles.stepTitleActive : ''}`}>
                  {lang === 'vi' ? step.title_vi : step.title_en}
                </h3>
              </div>
              <p className={styles.stepTime}>{step.time}</p>
              {step.isActive && (
                <p className={styles.stepActiveNotice}>
                  {lang === 'vi' ? step.desc_vi : step.desc_en}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Order Info Card at bottom matching Screen 8 */}
      <div className={styles.orderSummaryCard}>
        <div className={styles.summaryTop}>
          <div className={styles.orderId}>
            Order #{order.order_number}
          </div>
          <div className={styles.itemsSummary}>
            {totalItemsCount} {lang === 'vi' ? 'món' : 'items'} • {formatPrice(order.final_amount)}
          </div>
        </div>

        <div className={styles.deliveryLocationRow}>
          <span style={{ fontSize: '18px', color: '#1E4D3B' }}>📍</span>
          <div className={styles.locationText}>
            {order.delivery_address}
          </div>
        </div>

        <button
          className={styles.btnViewDetails}
          onClick={() => setShowItemsList(!showItemsList)}
        >
          <span>{lang === 'vi' ? 'Xem chi tiết món' : 'View Details'}</span>
          <span>{showItemsList ? '▴' : '›'}</span>
        </button>

        {/* Expandable item list */}
        {showItemsList && (
          <div className={styles.itemsDropdown}>
            {items.map(item => (
              <div key={item.id} className={styles.itemMiniRow}>
                <span>{item.quantity}x {lang === 'vi' ? item.product_name_vi : item.product_name_en} (Size {item.size})</span>
                <span style={{ fontWeight: 700 }}>{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
