'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days')

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: oData }, { data: oiData }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*'),
    ])

    if (oData && oData.length > 0) {
      setOrders(oData)
      setOrderItems(oiData ?? [])
    } else {
      // Demo mock orders for reports preview if DB is empty
      const now = Date.now()
      const mockOrders: Order[] = [
        {
          id: 'mock-o-1',
          order_number: 'OC20260911-001',
          user_id: 'user-1',
          recipient_name: 'Anh Hùng - Xưởng Olefins',
          recipient_phone: '0908112233',
          delivery_address: 'Xưởng Olefins - Phòng điều khiển trung tâm',
          total_amount: 104000,
          discount_amount: 0,
          final_amount: 104000,
          payment_method: 'transfer',
          payment_status: 'paid',
          order_status: 'delivered',
          voucher_id: null,
          notes: 'Giao trước 10h sáng',
          created_at: new Date(now - 3600000 * 2).toISOString(),
          updated_at: new Date(now - 3600000).toISOString(),
        },
        {
          id: 'mock-o-2',
          order_number: 'OC20260911-002',
          user_id: 'user-2',
          recipient_name: 'Chị Lan - Phòng Kế Toán',
          recipient_phone: '0918334455',
          delivery_address: 'Tòa nhà văn phòng chính - Tầng 2',
          total_amount: 156000,
          discount_amount: 20000,
          final_amount: 136000,
          payment_method: 'transfer',
          payment_status: 'paid',
          order_status: 'delivered',
          voucher_id: 'v-1',
          notes: 'Nhiều đá, ít ngọt',
          created_at: new Date(now - 3600000 * 5).toISOString(),
          updated_at: new Date(now - 3600000 * 4).toISOString(),
        },
        {
          id: 'mock-o-3',
          order_number: 'OC20260911-003',
          user_id: 'user-3',
          recipient_name: 'Kỹ sư Minh - Xưởng Polypropylene',
          recipient_phone: '0977223344',
          delivery_address: 'Xưởng PP - Cổng bảo vệ số 3',
          total_amount: 92000,
          discount_amount: 0,
          final_amount: 92000,
          payment_method: 'cash',
          payment_status: 'paid',
          order_status: 'delivered',
          voucher_id: null,
          notes: null,
          created_at: new Date(now - 3600000 * 26).toISOString(),
          updated_at: new Date(now - 3600000 * 25).toISOString(),
        },
        {
          id: 'mock-o-4',
          order_number: 'OC20260910-004',
          user_id: 'user-4',
          recipient_name: 'Mr. Johnathan - Kho Logistics',
          recipient_phone: '0933556677',
          delivery_address: 'Kho hàng Logistics LSP - Gate A',
          total_amount: 210000,
          discount_amount: 0,
          final_amount: 210000,
          payment_method: 'transfer',
          payment_status: 'paid',
          order_status: 'delivered',
          voucher_id: null,
          notes: 'Hot drinks',
          created_at: new Date(now - 3600000 * 50).toISOString(),
          updated_at: new Date(now - 3600000 * 49).toISOString(),
        },
      ]

      const mockItems: OrderItem[] = [
        { id: 'item-1', order_id: 'mock-o-1', product_id: 'cafe-sua-da-dac-biet', product_name_vi: 'Cà Phê Sữa Đá Đặc Biệt', product_name_en: 'Special Iced Milk Coffee', size: 'M', quantity: 2, unit_price: 50000, addon_ids: [], notes: null },
        { id: 'item-2', order_id: 'mock-o-2', product_id: 'tra-sua-one-coffee', product_name_vi: 'Trà Sữa One Coffee', product_name_en: 'One Coffee Milk Tea', size: 'L', quantity: 2, unit_price: 55000, addon_ids: [], notes: null },
        { id: 'item-3', order_id: 'mock-o-2', product_id: 'cafe-muoi', product_name_vi: 'Cà Phê Muối Kem Béo', product_name_en: 'Salted Cream Coffee', size: 'M', quantity: 1, unit_price: 46000, addon_ids: [], notes: null },
        { id: 'item-4', order_id: 'mock-o-3', product_id: 'cafe-den-da-dac-biet', product_name_vi: 'Cà Phê Đen Đá Đặc Biệt', product_name_en: 'Special Black Coffee', size: 'L', quantity: 2, unit_price: 42000, addon_ids: [], notes: null },
        { id: 'item-5', order_id: 'mock-o-4', product_id: 'matcha-latte', product_name_vi: 'Matcha Latte', product_name_en: 'Matcha Latte', size: 'L', quantity: 3, unit_price: 65000, addon_ids: [], notes: null },
      ]

      setOrders(mockOrders)
      setOrderItems(mockItems)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    const now = new Date()
    return orders.filter(o => {
      const oDate = new Date(o.created_at)
      if (timeRange === 'today') {
        return oDate.toDateString() === now.toDateString()
      }
      if (timeRange === '7days') {
        return (now.getTime() - oDate.getTime()) <= 7 * 86400000
      }
      if (timeRange === '30days') {
        return (now.getTime() - oDate.getTime()) <= 30 * 86400000
      }
      return true
    })
  }, [orders, timeRange])

  // Filtered order IDs
  const filteredOrderIds = useMemo(() => new Set(filteredOrders.map(o => o.id)), [filteredOrders])

  // Key metrics
  const validOrders = filteredOrders.filter(o => o.order_status !== 'cancelled')
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.final_amount, 0)
  const totalOrdersCount = filteredOrders.length
  const deliveredCount = filteredOrders.filter(o => o.order_status === 'delivered').length
  const averageOrderValue = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0

  // Payment method breakdown
  const transferCount = validOrders.filter(o => o.payment_method === 'transfer').length
  const cashCount = validOrders.filter(o => o.payment_method === 'cash').length
  const transferRevenue = validOrders.filter(o => o.payment_method === 'transfer').reduce((s, o) => s + o.final_amount, 0)
  const cashRevenue = validOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + o.final_amount, 0)

  // Top products
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; total: number }> = {}
    orderItems.filter(i => filteredOrderIds.has(i.order_id)).forEach(item => {
      const key = item.product_name_vi
      if (!counts[key]) counts[key] = { name: key, quantity: 0, total: 0 }
      counts[key].quantity += item.quantity
      counts[key].total += item.quantity * item.unit_price
    })
    return Object.values(counts).sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  }, [orderItems, filteredOrderIds])

  // Top delivery locations
  const topLocations = useMemo(() => {
    const counts: Record<string, number> = {}
    validOrders.forEach(o => {
      // Clean location label
      const loc = o.delivery_address.split('-')[0].trim() || o.delivery_address
      counts[loc] = (counts[loc] || 0) + 1
    })
    return Object.entries(counts)
      .map(([loc, count]) => ({ loc, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [validOrders])

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Header & Filter */}
        <div className="admin-page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="admin-page-title">Báo cáo & Phân tích Doanh thu</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              Thống kê đặt đồ uống One Coffee tại nhà máy LSP
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['today', '7days', '30days', 'all'] as const).map(tr => {
              const labels = { today: 'Hôm nay', '7days': '7 ngày qua', '30days': '30 ngày qua', all: 'Tất cả' }
              return (
                <button
                  key={tr}
                  onClick={() => setTimeRange(tr)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${timeRange === tr ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: timeRange === tr ? 'var(--color-primary)' : 'white',
                    color: timeRange === tr ? 'white' : 'var(--color-text)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {labels[tr]}
                </button>
              )
            })}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="admin-stat-icon">💵</span>
            <div className="admin-stat-value" style={{ color: 'var(--color-primary)' }}>
              {formatPrice(totalRevenue)}
            </div>
            <div className="admin-stat-label">Doanh thu thực nhận</div>
          </div>

          <div className="admin-stat-card">
            <span className="admin-stat-icon">📋</span>
            <div className="admin-stat-value">{totalOrdersCount}</div>
            <div className="admin-stat-label">Tổng số đơn hàng ({deliveredCount} đã giao)</div>
          </div>

          <div className="admin-stat-card">
            <span className="admin-stat-icon">🏷️</span>
            <div className="admin-stat-value">{formatPrice(averageOrderValue)}</div>
            <div className="admin-stat-label">Giá trị trung bình/đơn</div>
          </div>

          <div className="admin-stat-card">
            <span className="admin-stat-icon">💳</span>
            <div className="admin-stat-value">
              {validOrders.length > 0 ? Math.round((transferCount / validOrders.length) * 100) : 0}%
            </div>
            <div className="admin-stat-label">Tỷ lệ thanh toán VietQR</div>
          </div>
        </div>

        {/* 2-Column Grid: Top Products & Payment Methods */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Top Products */}
          <div className="admin-table-wrap" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: 16 }}>
              🏆 Top 5 Đồ uống bán chạy nhất
            </h3>

            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Chưa có dữ liệu món bán ra.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topProducts.map((p, idx) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-cream)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 800, color: '#333',
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{p.quantity} ly</span>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{formatPrice(p.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment breakdown */}
          <div className="admin-table-wrap" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: 16 }}>
              💳 Phương thức thanh toán
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: '#0369A1' }}>📲 Chuyển khoản VietQR</span>
                  <span style={{ fontWeight: 800, fontSize: '16px', color: '#0284C7' }}>{transferCount} đơn</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Tổng tiền: <strong>{formatPrice(transferRevenue)}</strong>
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: '#15803D' }}>💵 Tiền mặt khi nhận nước</span>
                  <span style={{ fontWeight: 800, fontSize: '16px', color: '#16A34A' }}>{cashCount} đơn</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Tổng tiền: <strong>{formatPrice(cashRevenue)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery locations breakdown */}
        <div className="admin-table-wrap" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: 16 }}>
            📍 Khu vực & Điểm giao nhận nhiều đơn nhất tại LSP
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {topLocations.map(item => (
              <div
                key={item.loc}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'white',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', maxWidth: '75%' }}>
                  📍 {item.loc}
                </div>
                <span style={{
                  background: 'var(--color-primary)', color: 'white',
                  fontWeight: 700, fontSize: '12px', padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}>
                  {item.count} đơn
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
