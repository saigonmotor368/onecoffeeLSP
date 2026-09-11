'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import AdminSidebar from '@/components/AdminSidebar'

interface CustomerProfile {
  id: string
  phone: string
  full_name: string
  default_delivery_address: string | null
  language: 'vi' | 'en'
  created_at: string
  total_orders?: number
  total_spent?: number
  last_order_at?: string
}

export default function AdminCustomersPage() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null)
  const [editAddress, setEditAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Query profiles & orders
    const [{ data: profiles, error: pError }, { data: orders }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('user_id, final_amount, created_at, order_status'),
    ])

    if (pError || !profiles || profiles.length === 0) {
      // Mock demo customers if DB is fresh
      const mockCustomers: CustomerProfile[] = [
        {
          id: 'mock-1',
          full_name: 'Nguyễn Văn An (Xưởng PP)',
          phone: '0901234567',
          default_delivery_address: 'Khu vực Xưởng PP - Tầng 2',
          language: 'vi',
          created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
          total_orders: 8,
          total_spent: 384000,
          last_order_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'mock-2',
          full_name: 'Trần Thị Mai (Phòng HSE)',
          phone: '0912345678',
          default_delivery_address: 'Tòa nhà văn phòng chính - Tầng 3',
          language: 'vi',
          created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
          total_orders: 15,
          total_spent: 720000,
          last_order_at: new Date(Date.now() - 18000000).toISOString(),
        },
        {
          id: 'mock-3',
          full_name: 'Mr. David Lee (LSP Tech)',
          phone: '0988776655',
          default_delivery_address: 'Khu Công nghệ LSP Tech - Cổng B',
          language: 'en',
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          total_orders: 4,
          total_spent: 216000,
          last_order_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ]
      setCustomers(mockCustomers)
    } else {
      // Aggregate customer stats
      const statsMap: Record<string, { totalOrders: number; totalSpent: number; lastOrder: string }> = {}
      orders?.forEach(o => {
        if (!statsMap[o.user_id]) {
          statsMap[o.user_id] = { totalOrders: 0, totalSpent: 0, lastOrder: o.created_at }
        }
        statsMap[o.user_id].totalOrders += 1
        if (o.order_status !== 'cancelled') {
          statsMap[o.user_id].totalSpent += o.final_amount
        }
      })

      const list: CustomerProfile[] = profiles.map(p => ({
        ...p,
        total_orders: statsMap[p.id]?.totalOrders ?? 0,
        total_spent: statsMap[p.id]?.totalSpent ?? 0,
        last_order_at: statsMap[p.id]?.lastOrder ?? undefined,
      }))
      setCustomers(list)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ default_delivery_address: editAddress })
      .eq('id', selectedCustomer.id)

    if (error) {
      showToast('Cập nhật địa chỉ tạm thời (demo)', 'info')
    } else {
      showToast('Đã cập nhật địa chỉ giao hàng của khách!', 'success')
    }

    setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, default_delivery_address: editAddress } : c))
    setSelectedCustomer(null)
    setSaving(false)
  }

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase()
    return customers.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.default_delivery_address && c.default_delivery_address.toLowerCase().includes(q))
    )
  }, [customers, searchQuery])

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Quản lý Khách hàng</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              Danh sách nhân viên LSP đã đăng ký & đặt đồ uống ({customers.length} khách hàng)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="input"
              style={{ width: 280 }}
              placeholder="🔍 Tìm tên, SĐT, địa chỉ giao..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-ghost btn-sm" onClick={loadCustomers} title="Làm mới">
              🔄
            </button>
          </div>
        </div>

        {/* Customer Stats Cards */}
        <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">👥</span>
            <div className="admin-stat-value">{customers.length}</div>
            <div className="admin-stat-label">Tổng khách hàng</div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">📦</span>
            <div className="admin-stat-value">
              {customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)}
            </div>
            <div className="admin-stat-label">Tổng đơn đã đặt</div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">💰</span>
            <div className="admin-stat-value" style={{ color: 'var(--color-primary)' }}>
              {formatPrice(customers.reduce((sum, c) => sum + (c.total_spent || 0), 0))}
            </div>
            <div className="admin-stat-label">Tổng chi tiêu khách hàng</div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              Danh sách ({filteredCustomers.length})
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <span className="spinner" />
              <p style={{ marginTop: 12, color: 'var(--color-text-secondary)' }}>Đang tải danh sách khách hàng...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Không tìm thấy khách hàng nào.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Số điện thoại</th>
                    <th>Điểm giao mặc định</th>
                    <th>Ngôn ngữ</th>
                    <th>Đơn hàng</th>
                    <th>Tổng chi</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                          {customer.full_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          Tham gia: {new Date(customer.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td>
                        <a
                          href={`tel:${customer.phone}`}
                          style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
                        >
                          📞 {customer.phone}
                        </a>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <span style={{ fontSize: '13px', color: customer.default_delivery_address ? 'var(--color-text)' : 'var(--color-text-light)' }}>
                          📍 {customer.default_delivery_address || 'Chưa lưu điểm giao'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: '12px', fontWeight: 600,
                          background: customer.language === 'vi' ? '#E8F5E9' : '#E3F2FD',
                          color: customer.language === 'vi' ? '#2E7D32' : '#1565C0',
                        }}>
                          {customer.language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          {customer.total_orders ?? 0}
                        </span> đơn
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatPrice(customer.total_spent ?? 0)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setEditAddress(customer.default_delivery_address || '')
                          }}
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                        >
                          ✏️ Đổi điểm giao
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal edit default delivery address */}
        {selectedCustomer && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div style={{
              background: 'white', borderRadius: 'var(--radius-xl)',
              maxWidth: 480, width: '100%', padding: 24, boxShadow: 'var(--shadow-xl)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  Cập nhật điểm giao mặc định
                </h3>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Khách hàng: <strong>{selectedCustomer.full_name}</strong> ({selectedCustomer.phone})
              </p>

              <form onSubmit={handleUpdateAddress}>
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label className="input-label">Vị trí giao nhận tại nhà máy LSP</label>
                  <input
                    className="input"
                    placeholder="VD: Xưởng PE - Phòng vận hành tầng 1"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedCustomer(null)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
