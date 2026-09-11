'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import { useToast } from '@/lib/providers'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']
type FilterStatus = 'all' | 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

const STATUSES: FilterStatus[] = ['all', 'pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled']

const STATUS_LABELS: Record<string, string> = {
  all: 'Tất cả',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang pha chế',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
}

export default function AdminOrdersPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    const supabase = createClient()
    let q = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filter !== 'all') {
      q = q.eq('order_status', filter)
    }

    const { data, error } = await q
    if (!error) {
      setOrders(data ?? [])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Realtime updates
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase
      .channel('admin-orders-live-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()
    return () => {
      sub.unsubscribe()
    }
  }, [loadOrders])

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast(`Đã chuyển: ${STATUS_LABELS[newStatus] || newStatus}`, 'success')
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? { ...o, order_status: newStatus as Order['order_status'] } : o))
        )
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => (prev ? { ...prev, order_status: newStatus as Order['order_status'] } : null))
        }
      } else {
        showToast(data.error || 'Lỗi cập nhật trạng thái đơn hàng', 'error')
      }
    } catch {
      showToast('Lỗi kết nối khi cập nhật trạng thái', 'error')
    }
  }

  const handleDeleteOrder = async (order: Order) => {
    const ok = window.confirm(
      `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng #${order.order_number}?\n\nThao tác này dùng khi phát hiện đơn hàng gian lận/spam. Dữ liệu sẽ không thể khôi phục.`
    )
    if (!ok) return

    setDeletingId(order.id)
    try {
      const res = await fetch('/api/admin/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast(`Đã xóa vĩnh viễn đơn hàng #${order.order_number}!`, 'success')
        setOrders(prev => prev.filter(o => o.id !== order.id))
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(null)
        }
      } else {
        showToast(data.error || 'Lỗi khi xóa đơn hàng', 'error')
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi xóa đơn', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const openOrderDetailModal = async (order: Order) => {
    setSelectedOrder(order)
    setModalLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
      setSelectedItems(data || [])
    } finally {
      setModalLoading(false)
    }
  }

  const filtered = orders.filter(o => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.recipient_name.toLowerCase().includes(q) ||
      o.recipient_phone.includes(q) ||
      o.delivery_address.toLowerCase().includes(q)
    )
  })

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Top Header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Quản lý Đơn Hàng</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Xác nhận đơn mới, theo dõi tiến độ pha chế & giao hàng, xóa đơn gian lận
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              className="input"
              style={{ width: 280 }}
              placeholder="🔍 Tìm mã đơn, tên KH, SĐT, vị trí..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadOrders}
              title="Tải lại danh sách"
            >
              🔄 Làm mới
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {STATUSES.map(s => {
            const count = s === 'all' ? orders.length : statusCounts[s] || 0
            const isActive = filter === s
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '999px',
                  border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isActive ? 'var(--color-primary)' : 'white',
                  color: isActive ? 'white' : 'var(--color-text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{STATUS_LABELS[s]}</span>
                {count > 0 && (
                  <span
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.3)' : '#E2E8F0',
                      color: isActive ? 'white' : '#475569',
                      borderRadius: '999px',
                      padding: '1px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Orders Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div style={{ padding: 64, display: 'flex', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📭</span>
              <p className="empty-state-title">
                {searchQuery ? 'Không tìm thấy đơn hàng phù hợp' : 'Không có đơn hàng nào'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {filter !== 'all' ? `Hiện không có đơn nào ở trạng thái "${STATUS_LABELS[filter]}"` : ''}
              </p>
            </div>
          ) : (
            
            <>
              {/* Desktop Table View (hidden on <768px via CSS) */}
              <div className="admin-desktop-table">
                <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn / Thời gian</th>
                  <th>Khách hàng & SĐT</th>
                  <th>Địa chỉ nhận hàng</th>
                  <th>Chi tiết món</th>
                  <th>Tổng thu</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th style={{ minWidth: 200, textAlign: 'right' }}>Thao tác xử lý</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const isPending = order.order_status === 'pending'
                  const isConfirmed = order.order_status === 'confirmed'
                  const isPreparing = order.order_status === 'preparing'
                  const isDelivering = order.order_status === 'delivering'

                  return (
                    <tr
                      key={order.id}
                      style={{
                        background: isPending ? '#FFFBEB' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Order number & timestamp */}
                      <td>
                        <button
                          type="button"
                          onClick={() => openOrderDetailModal(order)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: 0,
                            textAlign: 'left',
                          }}
                        >
                          #{order.order_number}
                        </button>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {new Date(order.created_at).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Recipient */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{order.recipient_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          <a href={`tel:${order.recipient_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            📞 {order.recipient_phone}
                          </a>
                        </div>
                      </td>

                      {/* Delivery address */}
                      <td style={{ maxWidth: 200, fontSize: 13, color: '#334155' }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={order.delivery_address}
                        >
                          📍 {order.delivery_address}
                        </div>
                      </td>

                      {/* View Items button */}
                      <td>
                        <button
                          type="button"
                          onClick={() => openOrderDetailModal(order)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                        >
                          🔍 Xem món
                        </button>
                      </td>

                      {/* Final Amount */}
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 14 }}>
                          {formatPrice(order.final_amount)}
                        </div>
                        {order.discount_amount > 0 && (
                          <div style={{ fontSize: 11, color: '#16A34A' }}>
                            Giảm {formatPrice(order.discount_amount)}
                          </div>
                        )}
                      </td>

                      {/* Payment method */}
                      <td>
                        <span
                          className={`badge ${
                            order.payment_method === 'cash' ? 'badge-warning' : 'badge-info'
                          }`}
                          style={{ fontSize: 11 }}
                        >
                          {order.payment_method === 'cash' ? '💵 Tiền mặt' : '📱 Chuyển khoản QR'}
                        </span>
                        <div style={{ fontSize: 10, marginTop: 2, color: order.payment_status === 'paid' ? '#16A34A' : '#D97706', fontWeight: 600 }}>
                          {order.payment_status === 'paid' ? '✓ Đã TT' : '⏳ Chưa TT'}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-badge status-${order.order_status}`} style={{ fontSize: 12 }}>
                          {STATUS_LABELS[order.order_status] || order.order_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* Step Transitions */}
                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => updateStatus(order.id, 'confirmed')}
                              style={{ background: '#1E4D3B', fontSize: 12, padding: '5px 10px' }}
                              title="Xác nhận đơn hàng và chuyển cho pha chế"
                            >
                              ✓ Xác nhận
                            </button>
                          )}

                          {isConfirmed && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => updateStatus(order.id, 'preparing')}
                              style={{ background: '#6D28D9', borderColor: '#6D28D9', fontSize: 12, padding: '5px 10px' }}
                              title="Bắt đầu chuẩn bị đồ uống"
                            >
                              ☕ Pha chế
                            </button>
                          )}

                          {isPreparing && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => updateStatus(order.id, 'delivering')}
                              style={{ background: '#D97706', borderColor: '#D97706', fontSize: 12, padding: '5px 10px' }}
                              title="Giao cho shipper / nhân viên giao"
                            >
                              🛵 Giao hàng
                            </button>
                          )}

                          {isDelivering && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => updateStatus(order.id, 'delivered')}
                              style={{ background: '#16A34A', borderColor: '#16A34A', fontSize: 12, padding: '5px 10px' }}
                              title="Khách đã nhận đồ uống thành công"
                            >
                              🎉 Hoàn tất
                            </button>
                          )}

                          {/* Cancel button if not delivered or cancelled */}
                          {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                if (window.confirm(`Hủy đơn hàng #${order.order_number}?`)) {
                                  updateStatus(order.id, 'cancelled')
                                }
                              }}
                              style={{ color: '#EF4444', borderColor: '#FECACA', fontSize: 12, padding: '5px 8px' }}
                              title="Hủy đơn hàng"
                            >
                              ❌ Hủy
                            </button>
                          )}

                          {/* Delete button (for fraud / spam) */}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={deletingId === order.id}
                            onClick={() => handleDeleteOrder(order)}
                            style={{ color: '#DC2626', fontSize: 12, padding: '5px 8px' }}
                            title="Xóa vĩnh viễn đơn nếu gian lận hoặc spam"
                          >
                            {deletingId === order.id ? '⏳' : '🗑️ Xóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
              </div>
              
              {/* Mobile Order Cards View (shown on <768px via CSS) */}
              <div className="admin-mobile-cards">
                {filtered.map(order => {
                  const isPending = order.order_status === 'pending'
                  const isConfirmed = order.order_status === 'confirmed'
                  const isPreparing = order.order_status === 'preparing'
                  const isDelivering = order.order_status === 'delivering'

                  return (
                    <div
                      key={order.id}
                      className="admin-order-card"
                      style={{
                        background: isPending ? '#FFFBEB' : 'white',
                        borderColor: isPending ? '#FCD34D' : '#E2E8F0',
                      }}
                    >
                      <div className="admin-order-card-header">
                        <div>
                          <Link
                            href={`/admin/orders/${order.id}`}
                            style={{
                              fontWeight: 800,
                              color: 'var(--color-primary)',
                              fontSize: '15px',
                              textDecoration: 'none',
                            }}
                          >
                            #{order.order_number}
                          </Link>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: 2 }}>
                            🕒 {new Date(order.created_at).toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <span className={`status-badge status-${order.order_status}`} style={{ fontSize: '12px', padding: '4px 10px' }}>
                          {STATUS_LABELS[order.order_status] || order.order_status}
                        </span>
                      </div>

                      <div className="admin-order-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '14px' }}>
                            👤 {order.recipient_name}
                          </span>
                          <a
                            href={`tel:${order.recipient_phone}`}
                            style={{
                              background: '#EAF2ED',
                              color: '#1E4D3B',
                              fontWeight: 700,
                              fontSize: '12px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            📞 {order.recipient_phone}
                          </a>
                        </div>

                        <div style={{ color: '#475569', fontSize: '13px' }}>
                          📍 {order.delivery_address}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: isPending ? 'rgba(254, 243, 199, 0.6)' : '#F8FAFC',
                            padding: '8px 12px',
                            borderRadius: '10px',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '15px' }}>
                              {formatPrice(order.final_amount)}
                            </div>
                            {order.discount_amount > 0 && (
                              <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                                Giảm {formatPrice(order.discount_amount)}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span
                              className={`badge ${order.payment_method === 'cash' ? 'badge-warning' : 'badge-info'}`}
                              style={{ fontSize: '11px' }}
                            >
                              {order.payment_method === 'cash' ? '💵 Tiền mặt' : '📱 CK QR'}
                            </span>
                            <div
                              style={{
                                fontSize: '11px',
                                marginTop: 2,
                                fontWeight: 700,
                                color: order.payment_status === 'paid' ? '#16A34A' : '#D97706',
                              }}
                            >
                              {order.payment_status === 'paid' ? '✓ Đã TT' : '⏳ Chưa TT'}
                            </div>
                          </div>
                        </div>

                        {order.notes && (
                          <div style={{ fontSize: '11px', color: '#1E4D3B', background: '#EAF2ED', padding: '6px 10px', borderRadius: '8px' }}>
                            📝 {order.notes}
                          </div>
                        )}
                      </div>

                      {/* Action buttons on card */}
                      <div className="admin-order-card-footer">
                        {isPending && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => updateStatus(order.id, 'confirmed')}
                            style={{ background: '#1E4D3B', fontSize: 13, flex: 1, padding: '10px 14px', fontWeight: 800 }}
                          >
                            ✓ Xác nhận
                          </button>
                        )}
                        {isConfirmed && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => updateStatus(order.id, 'preparing')}
                            style={{ background: '#6D28D9', borderColor: '#6D28D9', fontSize: 13, flex: 1, padding: '10px 14px', fontWeight: 800 }}
                          >
                            ☕ Pha chế
                          </button>
                        )}
                        {isPreparing && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => updateStatus(order.id, 'delivering')}
                            style={{ background: '#D97706', borderColor: '#D97706', fontSize: 13, flex: 1, padding: '10px 14px', fontWeight: 800 }}
                          >
                            🛵 Giao hàng
                          </button>
                        )}
                        {isDelivering && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => updateStatus(order.id, 'delivered')}
                            style={{ background: '#16A34A', borderColor: '#16A34A', fontSize: 13, flex: 1, padding: '10px 14px', fontWeight: 800 }}
                          >
                            🎉 Hoàn tất
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => openOrderDetailModal(order)}
                          style={{ fontSize: 12, padding: '8px 12px' }}
                        >
                          🔍 Xem món
                        </button>

                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: '8px 12px', textDecoration: 'none' }}
                        >
                          📄 Chi tiết
                        </Link>

                        {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              if (window.confirm(`Hủy đơn hàng #${order.order_number}?`)) {
                                updateStatus(order.id, 'cancelled')
                              }
                            }}
                            style={{ color: '#EF4444', borderColor: '#FECACA', fontSize: 12, padding: '8px 10px' }}
                            title="Hủy đơn"
                          >
                            ❌
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={deletingId === order.id}
                          onClick={() => handleDeleteOrder(order)}
                          style={{ color: '#DC2626', borderColor: '#FECACA', fontSize: 12, padding: '8px 10px' }}
                          title="Xóa đơn"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  Đơn Hàng #{selectedOrder.order_number}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2 }}>
                  Đặt lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Status & Quick Change */}
            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Trạng thái hiện tại:</span>
                <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 14 }}>
                  {STATUS_LABELS[selectedOrder.order_status]}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  value={selectedOrder.order_status}
                  onChange={e => updateStatus(selectedOrder.id, e.target.value)}
                  className="input"
                  style={{ fontSize: 12, padding: '6px 10px', height: 'auto', width: 'auto' }}
                >
                  {STATUSES.filter(s => s !== 'all').map(s => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Info */}
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 14 }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase' }}>
                Thông tin người nhận
              </h3>
              <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#1E293B' }}>
                <div><strong>Khách hàng:</strong> {selectedOrder.recipient_name}</div>
                <div><strong>Số điện thoại:</strong> <a href={`tel:${selectedOrder.recipient_phone}`} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{selectedOrder.recipient_phone}</a></div>
                <div><strong>Địa chỉ giao:</strong> {selectedOrder.delivery_address}</div>
                {selectedOrder.notes && (
                  <div style={{ background: '#FEF3C7', padding: '6px 10px', borderRadius: '8px', marginTop: 6, fontSize: 12, color: '#92400E' }}>
                    📝 <strong>Ghi chú:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 14 }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', margin: '0 0 10px', textTransform: 'uppercase' }}>
                Danh sách món đặt ({selectedItems.reduce((s, i) => s + i.quantity, 0)} ly)
              </h3>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: 16 }}><span className="spinner spinner-sm" /></div>
              ) : selectedItems.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94A3B8' }}>Không có chi tiết từng món</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedItems.map((item, i) => (
                    <div
                      key={item.id || i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#F8FAFC',
                        padding: '10px 12px',
                        borderRadius: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>
                          {item.product_name_vi}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          Size {item.size} • {formatPrice(item.unit_price)} × <strong>{item.quantity} ly</strong>
                          {item.notes ? ` • (${item.notes})` : ''}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 13 }}>
                        {formatPrice(item.unit_price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 4 }}>
                <span>Tiền hàng</span>
                <span>{formatPrice(selectedOrder.total_amount)}</span>
              </div>
              {selectedOrder.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16A34A', marginBottom: 4 }}>
                  <span>Khuyến mãi / Giảm giá</span>
                  <span>-{formatPrice(selectedOrder.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 6 }}>
                <span>Phí giao hàng</span>
                <span>{selectedOrder.shipping_fee ? formatPrice(selectedOrder.shipping_fee) : 'Miễn phí'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#0F172A', borderTop: '1px dashed #CBD5E1', paddingTop: 8 }}>
                <span>Tổng thanh toán</span>
                <span style={{ color: 'var(--color-primary)' }}>{formatPrice(selectedOrder.final_amount)}</span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleDeleteOrder(selectedOrder)}
                style={{ color: '#DC2626', borderColor: '#FECACA' }}
              >
                🗑️ Xóa đơn vĩnh viễn (Gian lận)
              </button>
              <Link
                href={`/admin/orders/${selectedOrder.id}`}
                className="btn btn-ghost btn-sm"
              >
                Trang chi tiết đầy đủ →
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedOrder(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
