'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type FilterStatus = 'all' | 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

const STATUSES: FilterStatus[] = ['all', 'pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadOrders = useCallback(async () => {
    const supabase = createClient()
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100)
    if (filter !== 'all') q = q.eq('order_status', filter)
    const { data } = await q
    setOrders(data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { loadOrders() }, [loadOrders])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase
      .channel('admin-orders-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [loadOrders])

  const updateStatus = async (orderId: string, newStatus: string) => {
    const supabase = createClient()
    await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId)
  }

  const filtered = orders.filter(o => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return o.order_number.toLowerCase().includes(q) ||
      o.recipient_name.toLowerCase().includes(q) ||
      o.recipient_phone.includes(q) ||
      o.delivery_address.toLowerCase().includes(q)
  })

  const STATUS_LABELS: Record<string, string> = {
    all: 'Tất cả', pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
    preparing: 'Đang chuẩn bị', delivering: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
  }

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Quản lý đơn hàng</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="input"
              style={{ width: 280 }}
              placeholder="Tìm mã đơn, tên KH, SĐT..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-ghost btn-sm" onClick={loadOrders}>🔄</button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${filter === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: filter === s ? 'var(--color-primary)' : 'white',
                color: filter === s ? 'white' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 600,
                cursor: 'pointer', transition: 'all 150ms ease',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {STATUS_LABELS[s]}
              {s !== 'all' && statusCounts[s] > 0 && (
                <span style={{
                  background: filter === s ? 'rgba(255,255,255,0.3)' : 'var(--color-border)',
                  borderRadius: 'var(--radius-full)', padding: '0 6px',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {statusCounts[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="admin-table-wrap">
          {loading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📭</span>
              <p className="empty-state-title">Không có đơn hàng</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn / Giờ</th>
                  <th>Khách hàng</th>
                  <th>Địa chỉ giao</th>
                  <th>Món đặt</th>
                  <th>Tổng tiền</th>
                  <th>TT Tiền</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        {order.order_number}
                      </Link>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {new Date(order.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.recipient_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{order.recipient_phone}</div>
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {order.delivery_address}
                    </td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} style={{ color: 'var(--color-primary)', fontSize: 12 }}>
                        Xem chi tiết →
                      </Link>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatPrice(order.final_amount)}
                    </td>
                    <td>
                      <span className={`badge ${order.payment_method === 'cash' ? 'badge-warning' : 'badge-info'}`}>
                        {order.payment_method === 'cash' ? '💵 Mặt' : '📱 CK'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${order.order_status}`}>
                        {getStatusLabel(order.order_status, 'vi')}
                      </span>
                    </td>
                    <td>
                      <QuickStatusUpdate current={order.order_status} onUpdate={s => updateStatus(order.id, s)} />
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

function QuickStatusUpdate({ current, onUpdate }: { current: string; onUpdate: (s: string) => void }) {
  const next: Record<string, { label: string; status: string }> = {
    pending:    { label: '✓ Xác nhận', status: 'confirmed' },
    confirmed:  { label: '🍳 Chuẩn bị', status: 'preparing' },
    preparing:  { label: '🛵 Giao hàng', status: 'delivering' },
    delivering: { label: '✅ Đã giao', status: 'delivered' },
  }
  const action = next[current]
  if (!action) return <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>
  return (
    <button
      onClick={() => onUpdate(action.status)}
      className="btn btn-primary btn-sm"
      style={{ fontSize: 12, padding: '6px 12px' }}
    >
      {action.label}
    </button>
  )
}
