'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { adminFetch } from '@/lib/admin-api-client'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import { useToast } from '@/lib/providers'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

const STATUS_OPTIONS = [
  { value: 'pending',    label: '⏳ Chờ xác nhận',  color: '#E8A020', bg: '#FEF3C7' },
  { value: 'confirmed',  label: '✓ Đã xác nhận',    color: '#3D7BB8', bg: '#DBEAFE' },
  { value: 'preparing',  label: '☕ Đang pha chế',  color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'delivering', label: '🛵 Đang giao',      color: '#F97316', bg: '#FFEDD5' },
  { value: 'delivered',  label: '✅ Đã giao',         color: '#10B981', bg: '#D1FAE5' },
  { value: 'cancelled',  label: '❌ Đã hủy',         color: '#EF4444', bg: '#FEE2E2' },
]

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { showToast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [statusNoteInput, setStatusNoteInput] = useState('')

  useEffect(() => {
    const load = async () => {
      const response = await adminFetch(`/api/admin/orders?id=${encodeURIComponent(id)}`)
      const data = await response.json()
      if (response.ok) {
        const orderData = data.order as Order
        setOrder(orderData)
        if ((orderData as any).status_note !== undefined) {
          setStatusNoteInput((orderData as any).status_note || '')
        }
        setItems((data.items || []) as OrderItem[])
      }
      setLoading(false)
    }
    const initialTimer = window.setTimeout(() => {
      void load()
    }, 0)

    // Realtime subscription
    const supabase = createClient('admin')
    const sub = supabase
      .channel(`admin-order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        payload => {
          const newOrder = payload.new as Order
          setOrder(newOrder)
          if ((newOrder as any).status_note !== undefined) {
            setStatusNoteInput((newOrder as any).status_note || '')
          }
        }
      )
      .subscribe()

    const pollingTimer = window.setInterval(() => {
      void load()
    }, 5000)

    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(pollingTimer)
      void supabase.removeChannel(sub)
    }
  }, [id])

  const updateStatus = async (newStatus: string) => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await adminFetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, status: newStatus, statusNote: statusNoteInput }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setOrder(prev => (prev ? { ...prev, order_status: newStatus as Order['order_status'] } : null))
        showToast(`Đã chuyển: ${getStatusLabel(newStatus, 'vi')}`, 'success')
      } else {
        showToast(data.error || 'Lỗi cập nhật trạng thái', 'error')
      }
    } catch {
      showToast('Lỗi kết nối khi cập nhật trạng thái', 'error')
    }
    setUpdating(false)
  }

  const updatePayment = async (paid: boolean) => {
    if (!order) return
    try {
      const res = await adminFetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, paymentStatus: paid ? 'paid' : 'pending' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setOrder(prev => (prev ? { ...prev, payment_status: paid ? 'paid' : 'pending' } : null))
        showToast(paid ? 'Đã đánh dấu: ĐÃ THANH TOÁN' : 'Đã đánh dấu: CHƯA THANH TOÁN', 'success')
      } else {
        showToast(data.error || 'Lỗi cập nhật thanh toán', 'error')
      }
    } catch {
      showToast('Lỗi kết nối khi cập nhật thanh toán', 'error')
    }
  }

  const handleDelete = async () => {
    if (!order) return
    if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng #${order.order_number}?\n\nThao tác này dùng khi phát hiện đơn hàng gian lận/spam. Dữ liệu sẽ không thể khôi phục.`)) {
      return
    }

    try {
      const res = await adminFetch('/api/admin/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast(`Đã xóa vĩnh viễn đơn hàng #${order.order_number}!`, 'success')
        router.replace('/admin/orders')
      } else {
        showToast(data.error || 'Lỗi khi xóa đơn hàng', 'error')
      }
    } catch {
      showToast('Lỗi kết nối khi xóa đơn hàng', 'error')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <span className="spinner" />
        </main>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main" style={{ textAlign: 'center', padding: 48 }}>
          <h2>Không tìm thấy đơn hàng</h2>
          <button onClick={() => router.push('/admin/orders')} className="btn btn-primary" style={{ marginTop: 16 }}>
            ← Quay lại danh sách
          </button>
        </main>
      </div>
    )
  }

  const isPending = order.order_status === 'pending'
  const isConfirmed = order.order_status === 'confirmed'
  const isPreparing = order.order_status === 'preparing'
  const isDelivering = order.order_status === 'delivering'
  const isDelivered = order.order_status === 'delivered'
  const isCancelled = order.order_status === 'cancelled'

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <section className="thermal-receipt" aria-label={`Hóa đơn ${order.order_number}`}>
          <div className="thermal-receipt-brand">ONE COFFEE</div>
          <div className="thermal-receipt-subtitle">LSP COFFEE DELIVERY</div>
          <div className="thermal-receipt-divider" />

          <div className="thermal-receipt-order">ĐƠN #{order.order_number}</div>
          <div className="thermal-receipt-meta">
            <span>Ngày:</span>
            <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
          </div>
          <div className="thermal-receipt-meta">
            <span>Khách:</span>
            <span>{order.recipient_name}</span>
          </div>
          <div className="thermal-receipt-meta">
            <span>SĐT:</span>
            <span>{order.recipient_phone}</span>
          </div>
          <div className="thermal-receipt-address">Giao: {order.delivery_address}</div>
          <div className="thermal-receipt-divider" />

          <div className="thermal-receipt-items">
            {items.map(item => (
              <div className="thermal-receipt-item" key={item.id}>
                <div className="thermal-receipt-item-main">
                  <span>{item.quantity}x {item.product_name_vi} ({item.size})</span>
                  <strong>{formatPrice(item.unit_price * item.quantity)}</strong>
                </div>
                {item.notes && <div className="thermal-receipt-note">Ghi chú: {item.notes}</div>}
              </div>
            ))}
          </div>

          <div className="thermal-receipt-divider" />
          <div className="thermal-receipt-total-row">
            <span>Tạm tính</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="thermal-receipt-total-row">
              <span>Giảm giá</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="thermal-receipt-total-row">
            <span>Phí giao</span>
            <span>{(order as { shipping_fee?: number }).shipping_fee ? formatPrice((order as { shipping_fee?: number }).shipping_fee) : '0đ'}</span>
          </div>
          <div className="thermal-receipt-grand-total">
            <span>TỔNG CỘNG</span>
            <strong>{formatPrice(order.final_amount)}</strong>
          </div>

          <div className="thermal-receipt-divider" />
          <div className="thermal-receipt-payment">
            {order.payment_method === 'cash' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'} ·{' '}
            {order.payment_status === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
          </div>
          {order.notes && <div className="thermal-receipt-order-note">{order.notes}</div>}
          <div className="thermal-receipt-thanks">Cảm ơn quý khách!</div>
        </section>

        {/* Header with Back Link */}
        <div className="admin-page-header">
          <div>
            <button
              onClick={() => router.push('/admin/orders')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-primary)',
                fontWeight: 700,
                fontSize: '14px',
                marginBottom: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: 0,
              }}
            >
              ← Danh sách đơn hàng
            </button>
            <h1 className="admin-page-title">Chi tiết đơn: #{order.order_number}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline" onClick={handlePrint}>
              🧾 In bill 80 mm
            </button>
            <span className={`status-badge status-${order.order_status}`} style={{ fontSize: '15px', padding: '8px 16px', fontWeight: 800 }}>
              {getStatusLabel(order.order_status, 'vi')}
            </span>
          </div>
        </div>

        {/* ⚡ PROMINENT QUICK ACTION BANNER (Shown at Top so mobile admins see it immediately) */}
        <div
          style={{
            background: isPending
              ? '#FFFBEB'
              : isConfirmed
              ? '#EFF6FF'
              : isPreparing
              ? '#F5F3FF'
              : isDelivering
              ? '#FFF7ED'
              : isDelivered
              ? '#ECFDF5'
              : '#FEF2F2',
            border: `2px solid ${
              isPending
                ? '#F59E0B'
                : isConfirmed
                ? '#3B82F6'
                : isPreparing
                ? '#8B5CF6'
                : isDelivering
                ? '#F97316'
                : isDelivered
                ? '#10B981'
                : '#EF4444'
            }`,
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '22px' }}>
                {isPending ? '⏳' : isConfirmed ? '✓' : isPreparing ? '☕' : isDelivering ? '🛵' : isDelivered ? '🎉' : '❌'}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1E293B' }}>
                  {isPending && 'Đơn hàng mới — Cần xác nhận ngay!'}
                  {isConfirmed && 'Đơn đã xác nhận — Sẵn sàng pha chế'}
                  {isPreparing && 'Đang pha chế đồ uống'}
                  {isDelivering && 'Đang giao hàng tới người nhận'}
                  {isDelivered && 'Đơn hàng đã hoàn tất giao thành công!'}
                  {isCancelled && 'Đơn hàng này đã bị hủy'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                  Mã đơn: #{order.order_number} · Đặt lúc: {new Date(order.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Status Note Input */}
            <div style={{ margin: '16px 0', width: '100%', maxWidth: '600px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                📝 Lời nhắn cho khách hàng (Sẽ hiển thị trên app đặt hàng của khách)
              </label>
              <textarea
                value={statusNoteInput}
                onChange={e => setStatusNoteInput(e.target.value)}
                placeholder="VD: Đơn hàng đang quá tải nên thời gian giao sẽ lâu hơn bình thường..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setStatusNoteInput('Đơn hàng đang quá tải nên thời gian pha chế và giao hàng sẽ lâu hơn bình thường một chút. Mong quý khách thông cảm ạ!')}
                  style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}
                >
                  + Mẫu: Quá tải
                </button>
                <button
                  type="button"
                  onClick={() => setStatusNoteInput('Shipper đang trên đường giao đến điểm nhận. Vui lòng để ý điện thoại nhé!')}
                  style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}
                >
                  + Mẫu: Shipper đang đến
                </button>
                <button
                  type="button"
                  onClick={() => setStatusNoteInput('')}
                  style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', color: '#991B1B' }}
                >
                  Xóa trắng
                </button>
              </div>
            </div>

            {/* Quick Action Button */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isPending && (
                <button
                  type="button"
                  onClick={() => updateStatus('confirmed')}
                  disabled={updating}
                  className="btn"
                  style={{
                    background: '#1E4D3B',
                    color: 'white',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(30, 77, 59, 0.3)',
                  }}
                >
                  ✓ XÁC NHẬN ĐƠN NGAY
                </button>
              )}

              {isConfirmed && (
                <button
                  type="button"
                  onClick={() => updateStatus('preparing')}
                  disabled={updating}
                  className="btn"
                  style={{
                    background: '#6D28D9',
                    color: 'white',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ☕ BẮT ĐẦU PHA CHẾ
                </button>
              )}

              {isPreparing && (
                <button
                  type="button"
                  onClick={() => updateStatus('delivering')}
                  disabled={updating}
                  className="btn"
                  style={{
                    background: '#D97706',
                    color: 'white',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  🛵 GIAO HÀNG
                </button>
              )}

              {isDelivering && (
                <button
                  type="button"
                  onClick={() => updateStatus('delivered')}
                  disabled={updating}
                  className="btn"
                  style={{
                    background: '#16A34A',
                    color: 'white',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  🎉 ĐÃ GIAO THÀNH CÔNG
                </button>
              )}

              {!isDelivered && !isCancelled && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc muốn HỦY đơn hàng #${order.order_number}?`)) {
                      updateStatus('cancelled')
                    }
                  }}
                  disabled={updating}
                  className="btn"
                  style={{
                    background: 'white',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ❌ Hủy đơn
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Info, Right Actions */}
        <div className="admin-order-detail-grid">
          {/* Left Column: Order details & items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Delivery Info Box */}
            <div className="admin-table-wrap" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 16, fontSize: '15px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                📍 Thông tin giao hàng & Người nhận
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Địa chỉ nhận hàng</p>
                  <p style={{ fontWeight: 800, fontSize: '14px', color: '#1E293B', margin: 0 }}>📍 {order.delivery_address}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Người nhận</p>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B', margin: 0 }}>👤 {order.recipient_name}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Số điện thoại</p>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>
                    <a href={`tel:${order.recipient_phone}`} style={{ color: '#1E4D3B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      📞 {order.recipient_phone}
                    </a>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Hình thức thanh toán</p>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>
                    {order.payment_method === 'cash' ? '💵 Tiền mặt khi nhận' : '📱 Chuyển khoản QR'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Thời gian đặt</p>
                  <p style={{ fontWeight: 600, fontSize: '13px', margin: 0, color: '#475569' }}>
                    🕒 {new Date(order.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Mã đơn hàng</p>
                  <p style={{ fontWeight: 800, fontSize: '14px', margin: 0, color: '#1E4D3B' }}>
                    #{order.order_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table Box */}
            <div className="admin-table-wrap">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)', fontWeight: 800, fontSize: '15px', color: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>☕ Danh sách đồ uống ({items.length} loại)</span>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                  Tổng SL: {items.reduce((sum, i) => sum + i.quantity, 0)} ly
                </span>
              </div>

              {items.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                  Không có chi tiết món hoặc đơn hàng chưa có danh sách món.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="admin-table" style={{ minWidth: 520, margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Tên món</th>
                        <th style={{ textAlign: 'center' }}>Size</th>
                        <th style={{ textAlign: 'center' }}>SL</th>
                        <th style={{ textAlign: 'right' }}>Đơn giá</th>
                        <th style={{ textAlign: 'right' }}>Thành tiền</th>
                        <th>Ghi chú món</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700, color: '#1E293B' }}>{item.product_name_vi}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-primary" style={{ padding: '2px 8px', fontSize: 11 }}>
                              {item.size}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--color-primary)', fontSize: 14 }}>
                            {item.quantity}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatPrice(item.unit_price)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#1E293B' }}>
                            {formatPrice(item.unit_price * item.quantity)}
                          </td>
                          <td style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                            {item.notes ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Price Breakdown Footer */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 8, background: '#FAFAFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  <span>Tạm tính tiền món</span>
                  <span style={{ fontWeight: 600 }}>{formatPrice(order.total_amount)}</span>
                </div>

                {order.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#16A34A', fontWeight: 700 }}>
                    <span>Giảm giá & Khuyến mãi (LSP 20% / Voucher)</span>
                    <span>-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  <span>Phí giao hàng</span>
                  <span>{(order as { shipping_fee?: number }).shipping_fee ? formatPrice((order as { shipping_fee?: number }).shipping_fee) : 'Miễn phí (0đ)'}</span>
                </div>

                {order.notes && (
                  <div style={{ fontSize: '12px', color: '#1E4D3B', background: '#EAF2ED', padding: '8px 12px', borderRadius: '8px', marginTop: 4, fontWeight: 600 }}>
                    📝 {order.notes}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4, borderTop: '1px dashed #CBD5E1' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>Tổng thanh toán thực thu</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-primary)' }}>
                    {formatPrice(order.final_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Status Switcher, Payment Control & Danger Zone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status Switcher Box */}
            <div className="admin-table-wrap" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 14, fontSize: '15px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                🔄 Chuyển Trạng Thái Đơn Hàng
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
                Bấm vào một trong các trạng thái dưới đây để cập nhật ngay:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATUS_OPTIONS.map(opt => {
                  const isCurrent = order.order_status === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateStatus(opt.value)}
                      disabled={isCurrent || updating}
                      style={{
                        padding: '11px 16px',
                        borderRadius: '12px',
                        border: `2px solid ${isCurrent ? opt.color : '#E2E8F0'}`,
                        background: isCurrent ? opt.bg : 'white',
                        color: isCurrent ? opt.color : '#334155',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: isCurrent ? 'default' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 150ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{opt.label}</span>
                      {isCurrent && (
                        <span style={{ fontSize: 11, background: opt.color, color: 'white', padding: '2px 8px', borderRadius: 999 }}>
                          Hiện tại
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Payment Status Box */}
            <div className="admin-table-wrap" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 12, fontSize: '15px', color: '#1E293B' }}>
                💳 Trạng Thái Thanh Toán
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span
                  className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}
                  style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 800 }}
                >
                  {order.payment_status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
                </span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '16px' }}>
                  {formatPrice(order.final_amount)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 10,
                    background: order.payment_status === 'paid' ? '#10B981' : '#E2E8F0',
                    color: order.payment_status === 'paid' ? 'white' : '#475569',
                    border: 'none',
                    cursor: order.payment_status === 'paid' ? 'default' : 'pointer',
                  }}
                  onClick={() => updatePayment(true)}
                  disabled={order.payment_status === 'paid'}
                >
                  ✓ Đánh dấu đã TT
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 10,
                    background: order.payment_status !== 'paid' ? '#F59E0B' : '#E2E8F0',
                    color: order.payment_status !== 'paid' ? 'white' : '#475569',
                    border: 'none',
                    cursor: order.payment_status !== 'paid' ? 'default' : 'pointer',
                  }}
                  onClick={() => updatePayment(false)}
                  disabled={order.payment_status !== 'paid'}
                >
                  Chưa thanh toán
                </button>
              </div>
            </div>

            {/* Danger Zone: Delete Order */}
            <div className="admin-table-wrap" style={{ padding: 20, borderColor: '#FECACA', background: '#FFF5F5' }}>
              <h3 style={{ fontWeight: 800, marginBottom: 6, fontSize: '14px', color: '#DC2626' }}>
                ⚠️ Xóa Đơn (Gian lận / Spam)
              </h3>
              <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '0 0 12px', lineHeight: 1.4 }}>
                Sử dụng khi phát hiện đơn hàng ảo hoặc gian lận. Đơn hàng và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
              <button
                type="button"
                className="btn"
                onClick={handleDelete}
                style={{
                  width: '100%',
                  color: '#DC2626',
                  borderColor: '#DC2626',
                  background: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  padding: '10px 14px',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                🗑️ Xóa Vĩnh Viễn Đơn Hàng Này
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
