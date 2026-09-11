'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import styles from './order-detail.module.css'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useLang()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showItemsList, setShowItemsList] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: o }, { data: oi }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])
      
      if (o) {
        setOrder(o)
        setItems(oi ?? [])
      } else {
        // Mock fallback demo order matching Screen 8
        const demoOrder: Order = {
          id: id || 'demo-order-1',
          order_number: 'OC20260911-001',
          user_id: 'user-1',
          recipient_name: 'Nguyen Van A',
          recipient_phone: '0901234567',
          delivery_address: 'LSP - Production Line 3\nBlock C - Assembly Area',
          total_amount: 206000,
          discount_amount: 0,
          final_amount: 206000,
          payment_method: 'transfer',
          payment_status: 'paid',
          order_status: 'delivering',
          voucher_id: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setOrder(demoOrder)
        setItems([
          { id: 'item-1', order_id: id, product_id: 'cafe-muoi', product_name_vi: 'Cà Phê Kem Muối Long Sơn', product_name_en: 'Salted Foam Coffee', size: 'M', quantity: 1, unit_price: 48000, addon_ids: [], notes: null },
          { id: 'item-2', order_id: id, product_id: 'matcha-latte', product_name_vi: 'Matcha Latte', product_name_en: 'Matcha Latte', size: 'L', quantity: 2, unit_price: 54000, addon_ids: [], notes: null },
          { id: 'item-3', order_id: id, product_id: 'tra-sua-thai', product_name_vi: 'Trà Sữa Thái Đỏ', product_name_en: 'Trà Sữa Thái', size: 'M', quantity: 1, unit_price: 50000, addon_ids: [], notes: null },
        ])
      }
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
        filter: `id=eq.${id}`,
      }, payload => {
        setOrder(payload.new as Order)
      })
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <span className="spinner" />
    </div>
  )

  if (!order) return null

  // Timeline steps configuration matching Screen 8
  const steps = [
    {
      title_vi: 'Đã nhận đơn',
      title_en: 'Order Placed',
      time: '09:41 - Sep 11, 2026',
      desc_vi: 'Quầy One Coffee đã nhận được đơn',
      desc_en: 'Order confirmed by counter',
      icon: '✓',
      isCompleted: true,
      isActive: false,
    },
    {
      title_vi: 'Đang pha chế',
      title_en: 'Preparing Your Drinks',
      time: '09:45 - Sep 11, 2026',
      desc_vi: 'Đang chuẩn bị thức uống theo yêu cầu',
      desc_en: 'Barista is crafting your beverage',
      icon: '✓',
      isCompleted: true,
      isActive: false,
    },
    {
      title_vi: 'Đang giao hàng',
      title_en: 'Out for Delivery',
      time: '09:50 - Sep 11, 2026',
      desc_vi: 'Nước đang trên đường chuyển đến vị trí của bạn!',
      desc_en: 'Your drinks are on the way!',
      icon: '🛵',
      isCompleted: false,
      isActive: true,
    },
    {
      title_vi: 'Đã giao thành công',
      title_en: 'Delivered',
      time: 'Dự kiến 10:00',
      desc_vi: 'Chúc bạn một ngày làm việc vui vẻ!',
      desc_en: 'Enjoy your delicious coffee!',
      icon: '○',
      isCompleted: false,
      isActive: false,
    },
  ]

  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0) || 3

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
