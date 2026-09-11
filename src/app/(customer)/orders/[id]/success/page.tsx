'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './success.module.css'

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', id)
        .single()
      if (data) setOrderNumber(data.order_number)
    }
    load()
    // Auto redirect after 8 seconds
    const t = setTimeout(() => router.push('/home'), 8000)
    return () => clearTimeout(t)
  }, [id, router])

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* Animated checkmark */}
        <div className={styles.checkCircle}>
          <div className={styles.checkMark}>✓</div>
        </div>

        <h1 className={styles.title}>Đặt hàng thành công!</h1>
        <p className={styles.subtitle}>
          Đơn hàng của bạn đã được ghi nhận.<br />
          Quầy sẽ chuẩn bị ngay!
        </p>

        {orderNumber && (
          <div className={styles.orderNumCard}>
            <p className={styles.orderNumLabel}>Mã đơn hàng</p>
            <p className={styles.orderNum}>{orderNumber}</p>
          </div>
        )}

        <div className={styles.estimateCard}>
          <span className={styles.estimateIcon}>⏱️</span>
          <div>
            <p className={styles.estimateTitle}>Thời gian dự kiến</p>
            <p className={styles.estimateTime}>15 — 20 phút</p>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/orders/${id}`} className="btn btn-primary btn-full">
            Theo dõi đơn hàng
          </Link>
          <Link href="/home" className="btn btn-outline btn-full">
            Về trang chủ
          </Link>
        </div>

        <p className={styles.autoRedirect}>Tự động chuyển về trang chủ sau 8 giây...</p>
      </div>
    </div>
  )
}
