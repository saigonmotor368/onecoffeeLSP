'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/providers'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import styles from './order-detail.module.css'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered']

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useLang()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: o }, { data: oi }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])
      setOrder(o)
      setItems(oi ?? [])
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
      }, (payload) => {
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

  if (!order) return (
    <div className="empty-state">
      <span className="empty-state-icon">😔</span>
      <p className="empty-state-title">Không tìm thấy đơn hàng</p>
      <button className="btn btn-primary" onClick={() => router.back()}>Quay lại</button>
    </div>
  )

  const currentStep = order.order_status === 'cancelled' ? -1 : STATUS_STEPS.indexOf(order.order_status)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>←</button>
        <h1 className={styles.title}>Theo dõi đơn</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className={styles.content}>
        {/* Order number & status */}
        <div className={styles.topCard}>
          <div>
            <p className={styles.orderNum}>{order.order_number}</p>
            <p className={styles.orderDate}>{new Date(order.created_at).toLocaleString('vi-VN')}</p>
          </div>
          <span className={`status-badge status-${order.order_status}`}>
            {getStatusLabel(order.order_status, lang)}
          </span>
        </div>

        {/* Progress tracker */}
        {order.order_status !== 'cancelled' && (
          <div className={styles.tracker}>
            <p className={styles.sectionLabel}>Trạng thái đơn hàng</p>
            <div className={styles.steps}>
              {STATUS_STEPS.map((step, i) => {
                const isDone = i < currentStep
                const isActive = i === currentStep
                return (
                  <div key={step} className={`${styles.step} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''}`}>
                    <div className={styles.stepDot}>
                      {isDone ? '✓' : isActive ? '●' : '○'}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`${styles.stepLine} ${isDone ? styles.stepLineDone : ''}`} />
                    )}
                    <p className={styles.stepLabel}>
                      {step === 'pending'    ? 'Chờ xác nhận' :
                       step === 'confirmed'  ? 'Đã xác nhận' :
                       step === 'preparing'  ? 'Đang chuẩn bị' :
                       step === 'delivering' ? 'Đang giao' :
                       'Đã giao'}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className={styles.estimateText}>⏱️ Dự kiến 15–20 phút</p>
          </div>
        )}

        {/* Delivery info */}
        <div className={styles.card}>
          <p className={styles.sectionLabel}>📍 Thông tin giao hàng</p>
          <div className={styles.infoRow}>
            <span>Địa chỉ</span>
            <span>{order.delivery_address}</span>
          </div>
          <div className={styles.infoRow}>
            <span>Người nhận</span>
            <span>{order.recipient_name}</span>
          </div>
          <div className={styles.infoRow}>
            <span>SĐT</span>
            <span>{order.recipient_phone}</span>
          </div>
          <div className={styles.infoRow}>
            <span>Thanh toán</span>
            <span>{order.payment_method === 'cash' ? '💵 Tiền mặt' : '📱 Chuyển khoản'}</span>
          </div>
        </div>

        {/* Items */}
        <div className={styles.card}>
          <p className={styles.sectionLabel}>☕ Đồ uống đã đặt</p>
          {items.map(item => (
            <div key={item.id} className={styles.item}>
              <span className={styles.itemQty}>{item.quantity}x</span>
              <span className={styles.itemName}>
                {lang === 'vi' ? item.product_name_vi : item.product_name_en}
                {' '}(Size {item.size})
              </span>
              <span className={styles.itemPrice}>{formatPrice(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div className={styles.divider} />
          <div className={`${styles.item} ${styles.itemTotal}`}>
            <span>Tổng cộng</span>
            <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--text-lg)' }}>
              {formatPrice(order.final_amount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
