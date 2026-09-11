'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { adminFetch } from '@/lib/admin-api-client'
import { formatPrice } from '@/lib/utils'
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
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (filter !== 'all') params.set('status', filter)
      const response = await adminFetch(`/api/admin/orders?${params.toString()}`)
      const data = await response.json()
      if (response.ok) {
        setOrders((data.orders || []) as Order[])
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOrders])

  // Realtime updates
  useEffect(() => {
    const supabase = createClient('admin')
    const sub = supabase
      .channel('admin-orders-live-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadOrders()
      })
      .subscribe()

    const pollingTimer = window.setInterval(() => {
      void loadOrders()
    }, 5000)

    return () => {
      window.clearInterval(pollingTimer)
      void supabase.removeChannel(sub)
    }
  }, [loadOrders])

  const openOrderDetailModal = async (order: Order) => {
    setSelectedOrder(order)
    setModalLoading(true)
    try {
      const response = await adminFetch(`/api/admin/orders?id=${encodeURIComponent(order.id)}`)
      const data = await response.json()
      if (response.ok) setSelectedItems((data.items || []) as OrderItem[])
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
              Xem đầy đủ chi tiết đơn trước khi xác nhận hoặc thay đổi trạng thái
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
              onClick={() => void loadOrders()}
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
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ background: '#1E4D3B', fontSize: 12, padding: '6px 11px', textDecoration: 'none' }}
                          >
                            🔍 Xem chi tiết & xử lý
                          </Link>
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
                          className="btn btn-primary"
                          style={{ background: '#1E4D3B', fontSize: 13, flex: 1, padding: '10px 14px', fontWeight: 800, textDecoration: 'none', textAlign: 'center' }}
                        >
                          🔍 Xem chi tiết & xử lý
                        </Link>
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

            {/* Read-only status summary. All processing happens on the full detail page. */}
            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Trạng thái hiện tại:</span>
                <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 14 }}>
                  {STATUS_LABELS[selectedOrder.order_status]}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#64748B', textAlign: 'right' }}>
                Mở trang chi tiết để xử lý đơn
              </span>
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
              <Link
                href={`/admin/orders/${selectedOrder.id}`}
                className="btn btn-primary btn-sm"
              >
                Xem chi tiết & xử lý →
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
