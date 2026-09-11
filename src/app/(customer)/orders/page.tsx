'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import styles from './orders.module.css'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type Tab = 'all' | 'ongoing' | 'completed'

const ONGOING = ['pending', 'confirmed', 'preparing', 'delivering']
const COMPLETED = ['delivered', 'cancelled']

export default function OrdersPage() {
  const router = useRouter()
  const { lang } = useLang()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      let fetched: Order[] = []
      if (session) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
        if (data && data.length > 0) fetched = data
      } else {
        // Guest mode: attempt loading orders placed by this phone
        const guestPhone = localStorage.getItem('oc_customer_phone')
        if (guestPhone) {
          const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('recipient_phone', guestPhone)
            .order('created_at', { ascending: false })
          if (data && data.length > 0) fetched = data
        }
      }

      setOrders(fetched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = orders.filter(o => {
    if (tab === 'ongoing') return ONGOING.includes(o.order_status)
    if (tab === 'completed') return COMPLETED.includes(o.order_status)
    return true
  })

  return (
    <div className={styles.pageContainer}>
      {/* Header matching Screen 9 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push('/home')}
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className={styles.title}>
          {lang === 'vi' ? 'Lịch sử đơn hàng' : 'Order History'}
        </h1>
        <div style={{ width: '28px' }} />
      </header>

      {/* Filter Tabs matching Screen 9: [ All ] [ Ongoing ] [ Completed ] */}
      <div className={styles.tabsGrid}>
        {(['all', 'ongoing', 'completed'] as Tab[]).map(t => {
          const labels = {
            all: lang === 'vi' ? 'Tất cả' : 'All',
            ongoing: lang === 'vi' ? 'Đang thực hiện' : 'Ongoing',
            completed: lang === 'vi' ? 'Hoàn thành' : 'Completed',
          }
          return (
            <button
              key={t}
              className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ''}`}
              onClick={() => setTab(t)}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* Orders List matching Screen 9 */}
      {loading ? (
        <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <span style={{ fontSize: '36px', marginBottom: '8px' }}>📦</span>
          <p style={{ fontWeight: 700, color: '#1A202C' }}>
            {lang === 'vi' ? 'Chưa có đơn hàng nào' : 'No orders found'}
          </p>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {filtered.map(order => {
            const isDelivering = ONGOING.includes(order.order_status)
            const dateObj = new Date(order.created_at)
            const formattedTime = isDelivering
              ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

            // Thumbnail image based on order
            const thumb = order.order_number.includes('015')
              ? 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80'
              : 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80'

            const badge = (() => {
              switch (order.order_status) {
                case 'pending':
                  return { cls: styles.pillPending, txt: lang === 'vi' ? 'Chờ xác nhận' : 'Pending' }
                case 'confirmed':
                  return { cls: styles.pillConfirmed, txt: lang === 'vi' ? 'Đã xác nhận' : 'Confirmed' }
                case 'preparing':
                  return { cls: styles.pillPreparing, txt: lang === 'vi' ? 'Đang pha chế' : 'Preparing' }
                case 'delivering':
                  return { cls: styles.pillDelivering, txt: lang === 'vi' ? 'Đang giao' : 'Delivering' }
                case 'delivered':
                  return { cls: styles.pillCompleted, txt: lang === 'vi' ? 'Đã giao' : 'Delivered' }
                case 'cancelled':
                  return { cls: styles.pillCancelled, txt: lang === 'vi' ? 'Đã hủy' : 'Cancelled' }
                default:
                  return { cls: styles.pillCompleted, txt: order.order_status }
              }
            })()

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className={styles.orderCard}
              >
                {/* Drink Thumbnail */}
                <div className={styles.thumbnailWrap}>
                  <img src={thumb} alt="Drink" className={styles.thumbnail} />
                </div>

                {/* Center Details */}
                <div className={styles.orderMain}>
                  <div className={styles.orderCode}>{order.order_number}</div>
                  <div className={styles.orderPricing}>
                    {formatPrice(order.final_amount)}
                  </div>
                  <div className={styles.orderLocation}>
                    {order.delivery_address.split('\n')[0]}
                  </div>
                </div>

                {/* Right Status Badge & Time */}
                <div className={styles.orderStatusCol}>
                  <span className={`${styles.statusPill} ${badge.cls}`}>
                    {badge.txt}
                  </span>
                  <span className={styles.orderTime}>{formattedTime}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
