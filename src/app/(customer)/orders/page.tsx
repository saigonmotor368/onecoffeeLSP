'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/providers'
import { formatPrice, getStatusLabel, timeAgo } from '@/lib/utils'
import styles from './orders.module.css'
import type { Database } from '@/lib/supabase/database.types'
import type { Language } from '@/lib/i18n'

type Order = Database['public']['Tables']['orders']['Row']
type Tab = 'all' | 'ongoing' | 'completed'

const ONGOING = ['pending', 'confirmed', 'preparing', 'delivering']
const COMPLETED = ['delivered', 'cancelled']

export default function OrdersPage() {
  const { lang } = useLang()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      setOrders(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = orders.filter(o => {
    if (tab === 'ongoing')   return ONGOING.includes(o.order_status)
    if (tab === 'completed') return COMPLETED.includes(o.order_status)
    return true
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Đơn hàng</h1>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['all', 'ongoing', 'completed'] as Tab[]).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'all' ? 'Tất cả' : t === 'ongoing' ? 'Đang xử lý' : 'Hoàn thành'}
            {t === 'ongoing' && orders.filter(o => ONGOING.includes(o.order_status)).length > 0 && (
              <span className={styles.tabBadge}>
                {orders.filter(o => ONGOING.includes(o.order_status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📦</span>
          <p className="empty-state-title">Chưa có đơn hàng</p>
          <p className="empty-state-desc">Đặt đồ uống đầu tiên nào!</p>
          <Link href="/menu" className="btn btn-primary" style={{ marginTop: 8 }}>Xem Menu</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, lang }: { order: Order; lang: Language }) {
  const statusLabel = getStatusLabel(order.order_status, lang)
  const statusClass = `status-${order.order_status}`

  return (
    <Link href={`/orders/${order.id}`} className={styles.orderCard}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.orderNum}>{order.order_number}</p>
          <p className={styles.orderTime}>{timeAgo(order.created_at, lang)}</p>
        </div>
        <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className={styles.cardBottom}>
        <p className={styles.orderAddr}>📍 {order.delivery_address}</p>
        <p className={styles.orderTotal}>{formatPrice(order.final_amount)}</p>
      </div>
      <div className={styles.cardChevron}>›</div>
    </Link>
  )
}
