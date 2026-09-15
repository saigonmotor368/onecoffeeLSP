'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/lib/providers'
import { categories, menuProducts } from '@/lib/menu-data'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

export default function AdminReportsPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const getLocalYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const [timePreset, setTimePreset] = useState<'today' | 'yesterday' | '7days' | 'month' | 'custom' | 'all'>('7days')
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return getLocalYMD(d)
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return getLocalYMD(new Date())
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const [{ data: oData }, { data: oiData }] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*'),
      ])

      setOrders(oData || [])
      setOrderItems(oiData || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Preset changes
  const handlePresetChange = (preset: typeof timePreset) => {
    setTimePreset(preset)
    const now = new Date()
    const todayStr = getLocalYMD(now)

    if (preset === 'today') {
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (preset === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      const yStr = getLocalYMD(y)
      setStartDate(yStr)
      setEndDate(yStr)
    } else if (preset === '7days') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      setStartDate(getLocalYMD(d))
      setEndDate(todayStr)
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setStartDate(getLocalYMD(firstDay))
      setEndDate(todayStr)
    } else if (preset === 'all') {
      setStartDate('2025-01-01')
      setEndDate(todayStr)
    }
  }

  // Filtered Orders according to Date Range
  const filteredOrders = useMemo(() => {
    if (timePreset === 'all') return orders

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    return orders.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= start && orderDate <= end
    })
  }, [orders, timePreset, startDate, endDate])

  const validOrders = useMemo(() => filteredOrders.filter(o => o.order_status !== 'cancelled'), [filteredOrders])

  // Order Items belonging to valid filtered orders (exclude cancelled)
  const filteredOrderIds = useMemo(() => new Set(validOrders.map(o => o.id)), [validOrders])
  const filteredItems = useMemo(
    () => orderItems.filter(item => filteredOrderIds.has(item.order_id)),
    [orderItems, filteredOrderIds]
  )

  // Overall KPIs
  const totalRevenue = validOrders.reduce((s, o) => s + (o.final_amount || 0), 0)
  const totalRawAmount = validOrders.reduce((s, o) => s + (o.total_amount || 0), 0)
  const totalDiscounts = validOrders.reduce((s, o) => s + (o.discount_amount || 0), 0)
  const totalShippingFees = validOrders.reduce((s, o) => s + (o.shipping_fee || 0), 0)
  const completedOrdersCount = validOrders.filter(o => o.order_status === 'delivered').length
  const avgOrderValue = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0

  // Category Breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, { name_vi: string; name_en: string; count: number; revenue: number }> = {}

    // Init categories
    categories.forEach(c => {
      map[c.slug] = { name_vi: c.name_vi, name_en: c.name_en, count: 0, revenue: 0 }
    })

    filteredItems.forEach(item => {
      const product = menuProducts.find(p => p.id === item.product_id)
      const catSlug = product?.category_slug || 'coffee'
      if (!map[catSlug]) {
        map[catSlug] = { name_vi: catSlug, name_en: catSlug, count: 0, revenue: 0 }
      }
      map[catSlug].count += item.quantity
      map[catSlug].revenue += item.unit_price * item.quantity
    })

    return Object.entries(map)
      .map(([slug, data]) => ({ slug, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredItems])

  // Top Products Breakdown
  const topProducts = useMemo(() => {
    const map: Record<string, { name_vi: string; qtyM: number; qtyL: number; totalQty: number; revenue: number }> = {}

    filteredItems.forEach(item => {
      const key = item.product_name_vi || item.product_id
      if (!map[key]) {
        map[key] = { name_vi: key, qtyM: 0, qtyL: 0, totalQty: 0, revenue: 0 }
      }
      if (item.size === 'M') map[key].qtyM += item.quantity
      if (item.size === 'L') map[key].qtyL += item.quantity
      map[key].totalQty += item.quantity
      map[key].revenue += item.unit_price * item.quantity
    })

    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty)
  }, [filteredItems])

  // Payment Breakdown
  const cashOrders = validOrders.filter(o => o.payment_method === 'cash')
  const transferOrders = validOrders.filter(o => o.payment_method === 'transfer')
  const cashRevenue = cashOrders.reduce((s, o) => s + (o.final_amount || 0), 0)
  const transferRevenue = transferOrders.reduce((s, o) => s + (o.final_amount || 0), 0)

  // EXCEL EXPORT HANDLER (.xlsx)
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      showToast('Không có dữ liệu đơn hàng trong khoảng thời gian này để xuất!', 'error')
      return
    }

    try {
      // 1. Sheet 1: Orders List
      const ordersData = filteredOrders.map(o => {
        // Collect items string for this order
        const its = orderItems.filter(i => i.order_id === o.id)
        const itemsSummary = its
          .map(i => `${i.product_name_vi} (Size ${i.size} × ${i.quantity})`)
          .join(', ')

        const statusLabelsVi: Record<string, string> = {
          pending: 'Chờ xác nhận',
          confirmed: 'Đã xác nhận',
          preparing: 'Đang pha chế',
          delivering: 'Đang giao',
          delivered: 'Đã giao thành công',
          cancelled: 'Đã hủy',
        }

        return {
          'Mã Đơn': o.order_number,
          'Ngày Đặt': new Date(o.created_at).toLocaleString('vi-VN'),
          'Tên Khách Hàng': o.recipient_name,
          'Số Điện Thoại': o.recipient_phone,
          'Địa Chỉ Giao Hàng': o.delivery_address,
          'Món Đặt': itemsSummary,
          'Tiền Hàng (VNĐ)': o.total_amount,
          'Giảm Giá (VNĐ)': o.discount_amount || 0,
          'Phí Ship (VNĐ)': o.shipping_fee || 0,
          'Thực Thu (VNĐ)': o.final_amount,
          'Hình Thức TT': o.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản QR',
          'Trạng Thái TT': o.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
          'Trạng Thái Đơn': statusLabelsVi[o.order_status] || o.order_status,
          'Ghi Chú': o.notes || '',
        }
      })

      // 2. Sheet 2: Category Breakdown
      const categoryData = categoryStats.map(c => ({
        'Chủng Loại / Danh Mục': c.name_vi,
        'Số Ly / Món Bán Ra': c.count,
        'Doanh Thu (VNĐ)': c.revenue,
        'Tỷ Trọng Doanh Thu (%)': totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) + '%' : '0%',
      }))

      // 3. Sheet 3: Top Products
      const productsData = topProducts.map((p, idx) => ({
        'Hạng': idx + 1,
        'Tên Sản Phẩm': p.name_vi,
        'Số Ly Size M': p.qtyM,
        'Số Ly Size L': p.qtyL,
        'Tổng Số Ly Bán': p.totalQty,
        'Doanh Thu (VNĐ)': p.revenue,
      }))

      // Create Workbook
      const wb = XLSX.utils.book_new()

      const wsOrders = XLSX.utils.json_to_sheet(ordersData)
      const wsCategory = XLSX.utils.json_to_sheet(categoryData)
      const wsProducts = XLSX.utils.json_to_sheet(productsData)

      // Set nice column widths
      wsOrders['!cols'] = [
        { wch: 18 }, // Mã Đơn
        { wch: 20 }, // Ngày Đặt
        { wch: 22 }, // Tên Khách
        { wch: 14 }, // SĐT
        { wch: 30 }, // Địa Chỉ
        { wch: 40 }, // Món Đặt
        { wch: 15 }, // Tiền Hàng
        { wch: 14 }, // Giảm Giá
        { wch: 14 }, // Phí Ship
        { wch: 16 }, // Thực Thu
        { wch: 16 }, // HT TT
        { wch: 16 }, // TT TT
        { wch: 18 }, // Trạng Thái Đơn
        { wch: 25 }, // Ghi Chú
      ]

      wsCategory['!cols'] = [
        { wch: 25 },
        { wch: 18 },
        { wch: 20 },
        { wch: 22 },
      ]

      wsProducts['!cols'] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
      ]

      XLSX.utils.book_append_sheet(wb, wsOrders, 'Danh Sách Đơn Hàng')
      XLSX.utils.book_append_sheet(wb, wsCategory, 'Doanh Thu Theo Chủng Loại')
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Sản Phẩm Bán Chạy')

      const dateTag = `${startDate}_den_${endDate}`
      XLSX.writeFile(wb, `Bao_Cao_Doanh_Thu_OneCoffee_${dateTag}.xlsx`)
      showToast('🎉 Đã xuất file Excel báo cáo doanh thu thành công!', 'success')
    } catch (err: unknown) {
      console.error('Export Excel error:', err)
      showToast('Lỗi khi tạo file Excel', 'error')
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Báo Cáo Doanh Thu & Thống Kê</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Phân tích chi tiết theo thời gian, chủng loại đồ uống và xuất file Excel (.xlsx)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleExportExcel}
              className="btn btn-primary"
              style={{
                background: '#15803D',
                borderColor: '#15803D',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)',
              }}
            >
              <span>📥</span>
              <span>Xuất File Excel (.xlsx)</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={loadData} title="Làm mới">
              🔄
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: 'yesterday', label: 'Hôm qua' },
              { key: '7days', label: '7 ngày qua' },
              { key: 'month', label: 'Tháng này' },
              { key: 'all', label: 'Tất cả' },
            ].map(p => {
              const active = timePreset === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetChange(p.key as any)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: `1.5px solid ${active ? 'var(--color-primary)' : '#CBD5E1'}`,
                    background: active ? 'var(--color-primary)' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Custom Date Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px', color: '#475569' }}>
            <span>Từ:</span>
            <input
              type="date"
              className="input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
              value={startDate}
              onChange={e => {
                setTimePreset('custom')
                setStartDate(e.target.value)
              }}
            />
            <span>Đến:</span>
            <input
              type="date"
              className="input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
              value={endDate}
              onChange={e => {
                setTimePreset('custom')
                setEndDate(e.target.value)
              }}
            />
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="admin-table-wrap" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Tổng Doanh Thu Thực
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '8px' }}>
              {formatPrice(totalRevenue)}
            </div>
            <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>
              {validOrders.length} đơn hàng thành công
            </div>
          </div>

          <div className="admin-table-wrap" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Tổng Số Ly Bán Ra
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
              {filteredItems.reduce((s, i) => s + i.quantity, 0)} <span style={{ fontSize: 16, fontWeight: 600 }}>ly/món</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Giá trị TB: {formatPrice(avgOrderValue)} / đơn
            </div>
          </div>

          <div className="admin-table-wrap" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Chiết Khấu & Khuyến Mãi
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#EA580C', marginTop: '8px' }}>
              {formatPrice(totalDiscounts)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Bao gồm giảm 20% NV LSP & Voucher
            </div>
          </div>

          <div className="admin-table-wrap" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Phí Giao Hàng Thu Được
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284C7', marginTop: '8px' }}>
              {formatPrice(totalShippingFees)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {completedOrdersCount} đơn đã giao hoàn tất
            </div>
          </div>
        </div>

        {/* 2 Columns: Category Breakdown & Payment Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
          {/* Category Breakdown */}
          <div className="admin-table-wrap" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              🧋 Doanh Thu Theo Chủng Loại (Danh Mục)
            </h3>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Chủng Loại</th>
                  <th style={{ textAlign: 'center' }}>Số Ly Bán</th>
                  <th style={{ textAlign: 'right' }}>Doanh Thu</th>
                  <th style={{ textAlign: 'right' }}>Tỷ Trọng</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map(cat => {
                  const percent = totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 100) : 0
                  return (
                    <tr key={cat.slug}>
                      <td style={{ fontWeight: 700, color: '#1E293B' }}>{cat.name_vi}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{cat.count} ly</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatPrice(cat.revenue)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{percent}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Payment Method Breakdown */}
          <div className="admin-table-wrap" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              💳 Phân Bổ Phương Thức Thanh Toán
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#F0F9FF',
                  border: '1.5px solid #BAE6FD',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#0369A1', fontSize: 15 }}>
                    📱 Chuyển Khoản VietQR (Tự động)
                  </div>
                  <div style={{ fontSize: 12, color: '#0284C7', marginTop: 4 }}>
                    {transferOrders.length} đơn ({totalRevenue > 0 ? Math.round((transferRevenue / totalRevenue) * 100) : 0}% doanh thu)
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: '#0369A1', fontSize: 18 }}>
                  {formatPrice(transferRevenue)}
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#F0FDF4',
                  border: '1.5px solid #BBF7D0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#15803D', fontSize: 15 }}>
                    💵 Tiền Mặt Khi Nhận Nước
                  </div>
                  <div style={{ fontSize: 12, color: '#16A34A', marginTop: 4 }}>
                    {cashOrders.length} đơn ({totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0}% doanh thu)
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: '#15803D', fontSize: 18 }}>
                  {formatPrice(cashRevenue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="admin-table-wrap" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              🏆 Top Món Bán Chạy Nhất (Chi tiết cỡ ly)
            </h3>
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              {topProducts.length} sản phẩm đã bán
            </span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>Hạng</th>
                <th>Tên Món</th>
                <th style={{ textAlign: 'center' }}>Size M (Vừa)</th>
                <th style={{ textAlign: 'center' }}>Size L (Lớn)</th>
                <th style={{ textAlign: 'center' }}>Tổng Số Ly</th>
                <th style={{ textAlign: 'right' }}>Tổng Doanh Thu</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 15).map((p, idx) => (
                <tr key={p.name_vi}>
                  <td style={{ fontWeight: 800, color: idx < 3 ? 'var(--color-primary)' : '#64748B' }}>
                    #{idx + 1}
                  </td>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>{p.name_vi}</td>
                  <td style={{ textAlign: 'center', color: '#475569' }}>{p.qtyM} ly</td>
                  <td style={{ textAlign: 'center', color: '#475569' }}>{p.qtyL} ly</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#0F172A' }}>
                    {p.totalQty} ly
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatPrice(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
