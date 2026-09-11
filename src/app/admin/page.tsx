'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, getStatusLabel, playNotificationSound } from '@/lib/utils'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']

// ── Dashboard Page ───────────────────────────────────────────
export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [newOrderAlert, setNewOrderAlert] = useState(false)

  const loadOrders = useCallback(async () => {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()

    // Realtime: new orders
    const supabase = createClient()
    const sub = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
      }, () => {
        loadOrders()
        setNewOrderAlert(true)
        playNotificationSound()
        setTimeout(() => setNewOrderAlert(false), 5000)
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
      }, () => {
        loadOrders()
      })
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [loadOrders])

  const pending   = orders.filter(o => o.order_status === 'pending').length
  const today     = orders.length
  const revenue   = orders.filter(o => o.order_status !== 'cancelled').reduce((s, o) => s + o.final_amount, 0)
  const delivered = orders.filter(o => o.order_status === 'delivered').length

  const recentOrders = orders.slice(0, 10)

  const updateStatus = async (orderId: string, newStatus: string) => {
    const supabase = createClient()
    await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId)
  }

  return (
    <div className="admin-layout">
      <AdminSidebar pendingCount={pending} />

      <main className="admin-main">
        {/* New order alert */}
        {newOrderAlert && (
          <div style={{
            position: 'fixed', top: 16, right: 16, zIndex: 999,
            background: 'var(--color-primary)', color: 'white',
            padding: '12px 20px', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', animation: 'fade-in-up 300ms ease',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            🔔 Có đơn hàng mới!
          </div>
        )}

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Dashboard</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/admin/orders" className="btn btn-primary btn-sm">
            Xem tất cả đơn →
          </Link>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat-card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
            <span className="admin-stat-icon">⏳</span>
            <span className="admin-stat-value">{pending}</span>
            <span className="admin-stat-label">Đơn chờ xử lý</span>
          </div>
          <div className="admin-stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <span className="admin-stat-icon">📦</span>
            <span className="admin-stat-value">{today}</span>
            <span className="admin-stat-label">Đơn hôm nay</span>
          </div>
          <div className="admin-stat-card" style={{ borderLeft: '4px solid var(--status-delivered)' }}>
            <span className="admin-stat-icon">✅</span>
            <span className="admin-stat-value">{delivered}</span>
            <span className="admin-stat-label">Đã giao</span>
          </div>
          <div className="admin-stat-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <span className="admin-stat-icon">💰</span>
            <span className="admin-stat-value" style={{ fontSize: 'var(--text-lg)' }}>{formatPrice(revenue)}</span>
            <span className="admin-stat-label">Doanh thu hôm nay</span>
          </div>
        </div>

        {/* Recent orders */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h2 style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
              Đơn hàng gần đây {pending > 0 && <span style={{ color: 'var(--color-error)' }}>({pending} chờ xác nhận)</span>}
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={loadOrders}>🔄 Làm mới</button>
          </div>

          {loading ? (
            <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">☕</span>
              <p className="empty-state-title">Chưa có đơn hàng hôm nay</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Địa chỉ giao</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        {order.order_number}
                      </Link>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.recipient_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{order.recipient_phone}</div>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.delivery_address}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatPrice(order.final_amount)}
                    </td>
                    <td>
                      <span className={`badge ${order.payment_method === 'cash' ? 'badge-warning' : 'badge-info'}`}>
                        {order.payment_method === 'cash' ? '💵 Tiền mặt' : '📱 Chuyển khoản'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${order.order_status}`}>
                        {getStatusLabel(order.order_status, 'vi')}
                      </span>
                    </td>
                    <td>
                      <StatusActions
                        current={order.order_status}
                        onUpdate={(status) => updateStatus(order.id, status)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

function StatusActions({ current, onUpdate }: { current: string; onUpdate: (s: string) => void }) {
  const next: Record<string, { label: string; status: string; color: string }> = {
    pending:    { label: 'Xác nhận', status: 'confirmed',  color: 'var(--status-confirmed)' },
    confirmed:  { label: 'Chuẩn bị', status: 'preparing', color: 'var(--status-preparing)' },
    preparing:  { label: 'Giao hàng', status: 'delivering', color: 'var(--status-delivering)' },
    delivering: { label: 'Đã giao',  status: 'delivered',  color: 'var(--status-delivered)' },
  }
  const action = next[current]
  if (!action) return <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>—</span>

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        onClick={() => onUpdate(action.status)}
        style={{
          padding: '5px 12px', borderRadius: 'var(--radius-full)',
          border: `1.5px solid ${action.color}`, background: 'transparent',
          color: action.color, fontSize: 'var(--text-xs)', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          transition: 'all 150ms ease',
        }}
        onMouseOver={e => { (e.target as HTMLButtonElement).style.background = action.color; (e.target as HTMLButtonElement).style.color = 'white' }}
        onMouseOut={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = action.color }}
      >
        {action.label}
      </button>
      {current === 'pending' && (
        <button
          onClick={() => onUpdate('cancelled')}
          style={{
            padding: '5px 10px', borderRadius: 'var(--radius-full)',
            border: '1.5px solid var(--color-error)', background: 'transparent',
            color: 'var(--color-error)', fontSize: 'var(--text-xs)', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          Hủy
        </button>
      )}
    </div>
  )
}
