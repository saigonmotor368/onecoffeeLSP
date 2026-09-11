'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import { playAdminNewOrderSound, sendDeviceNotification } from '@/lib/notifications'
import { useToast } from '@/lib/providers'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']

export default function AdminDashboard() {
  const router = useRouter()
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [newOrderAlert, setNewOrderAlert] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()

    // Realtime: new orders
    const supabase = createClient()
    const sub = supabase
      .channel('admin-orders-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          loadOrders()
          setNewOrderAlert(true)
          playAdminNewOrderSound()
          const o = payload.new
          sendDeviceNotification(`🔔 CÓ ĐƠN HÀNG MỚI #${o?.order_number || ''}!`, {
            body: `Khách: ${o?.recipient_name || ''} - ${formatPrice(o?.final_amount || 0)}. Bấm xem đơn!`,
            tag: `admin-new-order-${o?.id || Date.now()}`,
            data: { url: '/admin/orders' },
          })
          setTimeout(() => setNewOrderAlert(false), 6000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          loadOrders()
        }
      )
      .subscribe()

    return () => {
      sub.unsubscribe()
    }
  }, [loadOrders])

  const pendingOrders = orders.filter(o => o.order_status === 'pending')
  const preparingOrders = orders.filter(o => o.order_status === 'preparing')
  const deliveringOrders = orders.filter(o => o.order_status === 'delivering')
  const deliveredOrders = orders.filter(o => o.order_status === 'delivered')
  const revenueToday = orders
    .filter(o => o.order_status !== 'cancelled')
    .reduce((s, o) => s + (o.final_amount || 0), 0)

  const updateStatus = async (orderId: string, newStatus: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId)
    if (!error) {
      showToast(`Đã chuyển trạng thái sang "${getStatusLabel(newStatus, 'vi')}"`, 'success')
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, order_status: newStatus as Order['order_status'] } : o)))
    } else {
      showToast('Lỗi cập nhật trạng thái', 'error')
    }
  }

  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn #${order.order_number}?`)) return
    try {
      const res = await fetch('/api/admin/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      if (res.ok) {
        showToast(`Đã xóa đơn #${order.order_number}!`, 'success')
        setOrders(prev => prev.filter(o => o.id !== order.id))
      }
    } catch {
      showToast('Lỗi khi xóa đơn', 'error')
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar pendingCount={pendingOrders.length} />

      <main className="admin-main">
        {/* Floating live alert */}
        {newOrderAlert && (
          <div
            style={{
              position: 'fixed',
              top: 20,
              right: 20,
              zIndex: 9999,
              background: '#15803D',
              color: '#FFFFFF',
              padding: '14px 22px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(21, 128, 61, 0.4)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '15px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🔔</span>
            <span>CÓ ĐƠN HÀNG MỚI VỪA ĐẶT!</span>
          </div>
        )}

        {/* Dashboard Top Header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Trung Tâm Điều Hành One Coffee</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/admin/reports" className="btn btn-primary btn-sm" style={{ background: '#15803D', borderColor: '#15803D' }}>
              📊 Báo cáo & Xuất Excel
            </Link>
            <Link href="/admin/orders" className="btn btn-outline btn-sm">
              Xem tất cả đơn →
            </Link>
          </div>
        </div>

        {/* Urgent Pending Alert Queue */}
        {pendingOrders.length > 0 && (
          <div
            style={{
              background: '#FFFBEB',
              border: '1.5px solid #FCD34D',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span style={{ fontWeight: 800, color: '#92400E', fontSize: '15px' }}>
                  Có {pendingOrders.length} đơn hàng mới đang chờ Quản trị viên duyệt:
                </span>
              </div>
              <Link href="/admin/orders?filter=pending" style={{ fontSize: '13px', fontWeight: 700, color: '#B45309' }}>
                Xem toàn bộ đơn chờ ({pendingOrders.length}) →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingOrders.slice(0, 3).map(po => (
                <div
                  key={po.id}
                  style={{
                    background: '#FFFFFF',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)', marginRight: 10 }}>
                      #{po.order_number}
                    </span>
                    <span style={{ fontWeight: 700, color: '#1E293B', marginRight: 10 }}>
                      {po.recipient_name} ({po.recipient_phone})
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B', marginRight: 10 }}>
                      📍 {po.delivery_address}
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatPrice(po.final_amount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => updateStatus(po.id, 'confirmed')}
                      style={{ fontSize: 12, padding: '5px 12px' }}
                    >
                      ✓ Xác nhận đơn
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => updateStatus(po.id, 'cancelled')}
                      style={{ fontSize: 12, padding: '5px 8px', color: '#EF4444', borderColor: '#FECACA' }}
                    >
                      ❌ Hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeleteOrder(po)}
                      style={{ fontSize: 12, padding: '5px 8px', color: '#DC2626' }}
                      title="Xóa đơn nếu gian lận"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 Stats Cards */}
        <div className="admin-stats" style={{ marginBottom: 24 }}>
          <div className="admin-stat-card" style={{ borderLeft: '4px solid #F59E0B' }}>
            <span className="admin-stat-icon">⏳</span>
            <span className="admin-stat-value" style={{ color: '#D97706' }}>{pendingOrders.length}</span>
            <span className="admin-stat-label">Chờ xác nhận</span>
          </div>

          <div className="admin-stat-card" style={{ borderLeft: '4px solid #6D28D9' }}>
            <span className="admin-stat-icon">☕</span>
            <span className="admin-stat-value" style={{ color: '#6D28D9' }}>{preparingOrders.length}</span>
            <span className="admin-stat-label">Đang pha chế</span>
          </div>

          <div className="admin-stat-card" style={{ borderLeft: '4px solid #0284C7' }}>
            <span className="admin-stat-icon">🛵</span>
            <span className="admin-stat-value" style={{ color: '#0284C7' }}>{deliveringOrders.length}</span>
            <span className="admin-stat-label">Đang giao hàng</span>
          </div>

          <div className="admin-stat-card" style={{ borderLeft: '4px solid #16A34A' }}>
            <span className="admin-stat-icon">💰</span>
            <span className="admin-stat-value" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
              {formatPrice(revenueToday)}
            </span>
            <span className="admin-stat-label">Doanh thu hôm nay ({orders.length} đơn)</span>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h2 style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>
              Đơn hàng gần đây
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={loadOrders}>
              🔄 Làm mới
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">☕</span>
              <p className="empty-state-title">Chưa có đơn hàng nào</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Địa chỉ nhận</th>
                  <th>Tổng thu</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 15).map(order => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        style={{ color: 'var(--color-primary)', fontWeight: 800 }}
                      >
                        #{order.order_number}
                      </Link>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {new Date(order.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#1E293B' }}>{order.recipient_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {order.recipient_phone}
                      </div>
                    </td>

                    <td
                      style={{
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 13,
                      }}
                      title={order.delivery_address}
                    >
                      📍 {order.delivery_address}
                    </td>

                    <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatPrice(order.final_amount)}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          order.payment_method === 'cash' ? 'badge-warning' : 'badge-info'
                        }`}
                        style={{ fontSize: 11 }}
                      >
                        {order.payment_method === 'cash' ? '💵 Tiền mặt' : '📱 Chuyển khoản'}
                      </span>
                    </td>

                    <td>
                      <span className={`status-badge status-${order.order_status}`}>
                        {getStatusLabel(order.order_status, 'vi')}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {order.order_status === 'pending' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => updateStatus(order.id, 'confirmed')}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                          >
                            ✓ Xác nhận
                          </button>
                        )}
                        {order.order_status === 'confirmed' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => updateStatus(order.id, 'preparing')}
                            style={{ fontSize: 11, padding: '4px 8px', background: '#6D28D9', borderColor: '#6D28D9' }}
                          >
                            ☕ Pha chế
                          </button>
                        )}
                        {order.order_status === 'preparing' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => updateStatus(order.id, 'delivering')}
                            style={{ fontSize: 11, padding: '4px 8px', background: '#D97706', borderColor: '#D97706' }}
                          >
                            🛵 Giao hàng
                          </button>
                        )}
                        {order.order_status === 'delivering' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => updateStatus(order.id, 'delivered')}
                            style={{ fontSize: 11, padding: '4px 8px', background: '#16A34A', borderColor: '#16A34A' }}
                          >
                            🎉 Hoàn tất
                          </button>
                        )}
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          Chi tiết →
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteOrder(order)}
                          style={{ color: '#DC2626', fontSize: 11, padding: '4px 6px' }}
                          title="Xóa đơn"
                        >
                          🗑️
                        </button>
                      </div>
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
