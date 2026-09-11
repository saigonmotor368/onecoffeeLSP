'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import { useToast } from '@/lib/providers'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

const STATUS_OPTIONS = [
  { value: 'pending',    label: '⏳ Chờ xác nhận',  color: 'var(--status-pending)' },
  { value: 'confirmed',  label: '✓ Đã xác nhận',    color: 'var(--status-confirmed)' },
  { value: 'preparing',  label: '🍳 Đang chuẩn bị', color: 'var(--status-preparing)' },
  { value: 'delivering', label: '🛵 Đang giao',      color: 'var(--status-delivering)' },
  { value: 'delivered',  label: '✅ Đã giao',         color: 'var(--status-delivered)' },
  { value: 'cancelled',  label: '❌ Hủy đơn',         color: 'var(--status-cancelled)' },
]

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { showToast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: o }, { data: oi }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])
      setOrder(o); setItems(oi ?? [])
      setLoading(false)
    }
    load()

    // Realtime
    const supabase = createClient()
    const sub = supabase
      .channel(`admin-order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        payload => setOrder(payload.new as Order))
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [id])

  const updateStatus = async (newStatus: string) => {
    if (!order) return
    setUpdating(true)
    const supabase = createClient()
    const { error } = await supabase.from('orders').update({ order_status: newStatus }).eq('id', id)
    if (error) {
      showToast('Lỗi cập nhật trạng thái', 'error')
    } else {
      showToast(`Cập nhật: ${getStatusLabel(newStatus, 'vi')}`, 'success')
    }
    setUpdating(false)
  }

  const updatePayment = async (paid: boolean) => {
    const supabase = createClient()
    await supabase.from('orders').update({ payment_status: paid ? 'paid' : 'pending' }).eq('id', id)
    showToast(paid ? 'Đánh dấu đã thanh toán' : 'Đánh dấu chưa thanh toán', 'success')
  }

  if (loading) return <div style={{ padding: 64, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
  if (!order) return <div>Không tìm thấy đơn hàng</div>

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Danh sách đơn
            </button>
            <h1 className="admin-page-title">Chi tiết đơn: {order.order_number}</h1>
          </div>
          <span className={`status-badge status-${order.order_status}`} style={{ fontSize: 'var(--text-base)', padding: '8px 16px' }}>
            {getStatusLabel(order.order_status, 'vi')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Left: order info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Delivery info */}
            <div className="admin-table-wrap" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 'var(--text-base)' }}>📍 Thông tin giao hàng</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Địa chỉ', order.delivery_address],
                  ['Người nhận', order.recipient_name],
                  ['SĐT', order.recipient_phone],
                  ['Thanh toán', order.payment_method === 'cash' ? '💵 Tiền mặt' : '📱 Chuyển khoản'],
                  ['Đặt lúc', new Date(order.created_at).toLocaleString('vi-VN')],
                  ['Mã đơn', order.order_number],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{k}</p>
                    <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="admin-table-wrap">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)', fontWeight: 700 }}>
                ☕ Đồ uống ({items.length} loại)
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên món</th><th>Size</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.product_name_vi}</td>
                      <td><span className="badge badge-primary">{item.size}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{item.quantity}</td>
                      <td>{formatPrice(item.unit_price)}</td>
                      <td style={{ fontWeight: 700 }}>{formatPrice(item.unit_price * item.quantity)}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{item.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <span>Tạm tính tiền món</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
                {order.discount_amount ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: '#2F855A', fontWeight: 600 }}>
                    <span>Giảm giá & Khuyến mãi</span>
                    <span>-{formatPrice(order.discount_amount)}</span>
                  </div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <span>Phí giao hàng</span>
                  <span>{(order as { shipping_fee?: number }).shipping_fee ? formatPrice((order as { shipping_fee?: number }).shipping_fee) : 'Miễn phí (0đ)'}</span>
                </div>
                {order.notes && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', marginTop: 4 }}>
                    📝 {order.notes}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 4, borderTop: '1px dashed var(--color-border)' }}>
                  <span style={{ fontWeight: 700 }}>Tổng thanh toán</span>
                  <span style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatPrice(order.final_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status update */}
            <div className="admin-table-wrap" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 'var(--text-base)' }}>🔄 Cập nhật trạng thái</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus(opt.value)}
                    disabled={order.order_status === opt.value || updating}
                    style={{
                      padding: '10px 16px', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${order.order_status === opt.value ? opt.color : 'var(--color-border)'}`,
                      background: order.order_status === opt.value ? opt.color : 'transparent',
                      color: order.order_status === opt.value ? 'white' : 'var(--color-text)',
                      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 600,
                      cursor: order.order_status === opt.value ? 'default' : 'pointer',
                      textAlign: 'left', transition: 'all 150ms ease',
                    }}
                  >
                    {opt.label}
                    {order.order_status === opt.value && ' ← Hiện tại'}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment status */}
            <div className="admin-table-wrap" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 'var(--text-base)' }}>💳 Trạng thái thanh toán</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                  {order.payment_status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatPrice(order.final_amount)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => updatePayment(true)}
                  disabled={order.payment_status === 'paid'}>
                  Đánh dấu đã TT
                </button>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => updatePayment(false)}
                  disabled={order.payment_status !== 'paid'}>
                  Chưa thanh toán
                </button>
              </div>
            </div>

            {/* Danger Zone: Delete Order */}
            <div className="admin-table-wrap" style={{ padding: 20, borderColor: '#FECACA', background: '#FFF5F5' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 'var(--text-base)', color: '#DC2626' }}>
                ⚠️ Xóa đơn (Gian lận / Spam)
              </h3>
              <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '0 0 14px', lineHeight: 1.4 }}>
                Sử dụng khi phát hiện đơn hàng ảo hoặc gian lận. Đơn hàng và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  if (window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng #${order.order_number}?`)) {
                    const res = await fetch('/api/admin/orders/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: order.id }),
                    })
                    if (res.ok) {
                      showToast('Đã xóa đơn hàng thành công', 'success')
                      router.replace('/admin/orders')
                    } else {
                      showToast('Lỗi khi xóa đơn hàng', 'error')
                    }
                  }
                }}
                style={{ width: '100%', color: '#DC2626', borderColor: '#DC2626', background: '#FFFFFF' }}
              >
                🗑️ Xóa đơn hàng này
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
