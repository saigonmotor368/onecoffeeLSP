'use client'

import { use, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import styles from './success.module.css'

interface OrderDetails {
  order_number: string
  final_amount: number
  delivery_address: string
  recipient_name: string
  recipient_phone: string
  payment_method: string
  payment_status: string
}

function SuccessContent({ orderId }: { orderId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const methodParam = searchParams.get('method') || 'transfer'

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const isCash = (order?.payment_method || methodParam) === 'cash'

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const supabase = createClient()
        // Try finding by UUID id or order_number
        let query = supabase.from('orders').select('*')
        if (orderId.includes('-') && orderId.length > 20) {
          query = query.eq('id', orderId)
        } else {
          query = query.eq('order_number', orderId)
        }

        const { data } = await query.maybeSingle()

        if (data) {
          setOrder({
            order_number: data.order_number,
            final_amount: data.final_amount,
            delivery_address: data.delivery_address,
            recipient_name: data.recipient_name,
            recipient_phone: data.recipient_phone,
            payment_method: data.payment_method,
            payment_status: data.payment_status,
          })
        } else {
          // Fallback to cached customer info
          setOrder({
            order_number: orderId.startsWith('OC') ? orderId : 'OC20260911',
            final_amount: 0,
            delivery_address: localStorage.getItem('oc_delivery_location') || 'Khu phức hợp LSP',
            recipient_name: localStorage.getItem('oc_customer_name') || 'Nhân viên LSP',
            recipient_phone: localStorage.getItem('oc_customer_phone') || '',
            payment_method: methodParam,
            payment_status: methodParam === 'cash' ? 'pending' : 'paid',
          })
        }
      } catch (err) {
        console.warn('Failed to load order info:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()

    // Auto redirect back to home after 15 seconds
    const timer = setTimeout(() => {
      router.push('/home')
    }, 15000)
    return () => clearTimeout(timer)
  }, [orderId, methodParam, router])

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* Animated icon circle */}
        <div className={`${styles.checkCircle} ${isCash ? styles.checkCircleCash : ''}`}>
          <span className={styles.checkMark}>{isCash ? '💵' : '✓'}</span>
        </div>

        {/* Method Badge */}
        <div className={`${styles.methodBadge} ${isCash ? styles.methodBadgeCash : styles.methodBadgeTransfer}`}>
          {isCash ? '💵 Thanh toán Tiền Mặt khi nhận nước' : '✅ Đã xác nhận Chuyển Khoản VietQR'}
        </div>

        <h1 className={styles.title}>
          {isCash ? 'Đặt hàng thành công!' : 'Thanh toán thành công!'}
        </h1>

        <p className={styles.subtitle}>
          {isCash
            ? 'Đơn hàng của Quý khách đã được chuyển tới quầy pha chế One Coffee.'
            : 'One Coffee đã ghi nhận thanh toán chuyển khoản và đang ưu tiên chuẩn bị món.'}
        </p>

        {/* Notice instruction box */}
        <div className={`${styles.noticeBox} ${isCash ? styles.noticeBoxCash : styles.noticeBoxTransfer}`}>
          {isCash ? (
            <div>
              🛵 <b>Ghi chú giao hàng:</b> Barista đang chuẩn bị món. Quý khách vui lòng chuẩn bị đúng{' '}
              {order?.final_amount ? (
                <span className={styles.noticeHighlight}>{formatPrice(order.final_amount)}</span>
              ) : (
                'tiền mặt'
              )}{' '}
              để thanh toán trực tiếp cho nhân viên khi nhận nước tại <b>{order?.delivery_address}</b>.
            </div>
          ) : (
            <div>
              ☕ <b>Đang pha chế:</b> Đơn hàng đã được xác nhận thanh toán thành công. Nhân viên sẽ giao nước nhanh nhất tới <b>{order?.delivery_address}</b>.
            </div>
          )}
        </div>

        {/* Order Details Card */}
        <div className={styles.detailsCard}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Mã đơn hàng</span>
            <span className={styles.detailValueHighlight}>{order?.order_number || orderId}</span>
          </div>

          {order?.recipient_name && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Người nhận</span>
              <span className={styles.detailValue}>
                {order.recipient_name} {order.recipient_phone ? `(${order.recipient_phone})` : ''}
              </span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Điểm nhận hàng</span>
            <span className={styles.detailValue}>{order?.delivery_address}</span>
          </div>

          {order?.final_amount ? (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Tổng tiền</span>
              <span className={styles.detailValueHighlight}>{formatPrice(order.final_amount)}</span>
            </div>
          ) : null}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Phương thức</span>
            <span className={styles.detailValue}>
              {isCash ? 'Tiền mặt (Chưa thu)' : 'VietQR (Đã chuyển khoản)'}
            </span>
          </div>
        </div>

        {/* Estimate card */}
        <div className={styles.estimateCard}>
          <span className={styles.estimateIcon}>⏱️</span>
          <div>
            <p className={styles.estimateTitle}>Thời gian giao dự kiến</p>
            <p className={styles.estimateTime}>15 — 20 phút</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href="/orders" className={styles.primaryBtn}>
            Theo dõi danh sách đơn hàng
          </Link>
          <Link href="/home" className={styles.secondaryBtn}>
            Tiếp tục đặt món
          </Link>
        </div>

        <p className={styles.autoRedirect}>Tự động chuyển về trang chủ sau 15 giây...</p>
      </div>
    </div>
  )
}

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#123326', color: '#fff' }}>
          <span>Đang tải thông tin đơn hàng...</span>
        </div>
      }
    >
      <SuccessContent orderId={id} />
    </Suspense>
  )
}
