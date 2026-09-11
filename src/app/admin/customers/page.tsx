'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api-client'
import { useToast } from '@/lib/providers'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import AdminSidebar from '@/components/AdminSidebar'
import type { Database } from '@/lib/supabase/database.types'

type CustomerOrder = Database['public']['Tables']['orders']['Row']

interface CustomerProfile {
  id: string
  phone: string
  full_name: string
  default_delivery_address: string | null
  language: 'vi' | 'en'
  created_at: string
  role?: 'customer' | 'admin'
  total_orders?: number
  total_spent?: number
  last_order_at?: string
  email?: string | null
}

export default function AdminCustomersPage() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<CustomerProfile | null>(null)
  const [resetPwdCustomer, setResetPwdCustomer] = useState<CustomerProfile | null>(null)
  const [ordersCustomer, setOrdersCustomer] = useState<CustomerProfile | null>(null)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingCustomerOrders, setLoadingCustomerOrders] = useState(false)

  // Create User Form
  const [createName, setCreateName] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createPassword, setCreatePassword] = useState('123456')
  const [createAddress, setCreateAddress] = useState('')
  const [createRole, setCreateRole] = useState<'customer' | 'admin'>('customer')
  const [submittingCreate, setSubmittingCreate] = useState(false)

  // Edit User Form
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editRole, setEditRole] = useState<'customer' | 'admin'>('customer')
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Reset Password Form
  const [newPassword, setNewPassword] = useState('123456')
  const [confirmPassword, setConfirmPassword] = useState('123456')
  const [resettingPwd, setResettingPwd] = useState(false)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/customers')
      const data = await res.json()
      if (!res.ok) {
        console.error('Error loading customers:', data.error)
        setCustomers([])
        return
      }
      setCustomers((data.customers || []) as CustomerProfile[])
    } catch (err) {
      console.error('Error loading customers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadCustomers])

  // Create User Action
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim() || !createPhone.trim() || !createPassword.trim()) {
      showToast('Vui lòng điền đủ tên, số điện thoại và mật khẩu!', 'error')
      return
    }

    setSubmittingCreate(true)
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: createName.trim(),
          phone: createPhone.trim(),
          password: createPassword.trim(),
          address: createAddress.trim(),
          role: createRole,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast(`Đã tạo tài khoản cho ${createName} thành công!`, 'success')
        setCreateModalOpen(false)
        setCreateName('')
        setCreatePhone('')
        setCreateAddress('')
        setCreatePassword('123456')
        void loadCustomers()
      } else {
        showToast(data.error || 'Lỗi khi tạo người dùng', 'error')
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error')
    } finally {
      setSubmittingCreate(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (c: CustomerProfile) => {
    setEditCustomer(c)
    setEditName(c.full_name)
    setEditPhone(c.phone)
    setEditAddress(c.default_delivery_address || '')
    setEditRole(c.role || 'customer')
  }

  // Update User Action
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCustomer) return
    if (!editName.trim() || editPhone.replace(/\D/g, '').length < 9) {
      showToast('Vui lòng nhập họ tên và số điện thoại hợp lệ', 'error')
      return
    }

    setSubmittingEdit(true)
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editCustomer.id,
          fullName: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          role: editRole,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast('Cập nhật thông tin người dùng thành công!', 'success')
        setEditCustomer(null)
        void loadCustomers()
      } else {
        showToast(data.error || 'Lỗi khi cập nhật người dùng', 'error')
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Delete User Action
  const handleDeleteUser = async (c: CustomerProfile) => {
    if (!window.confirm(`⚠️ Bạn có chắc muốn XÓA VĨNH VIỄN người dùng "${c.full_name}" (${c.phone})?`)) {
      return
    }

    try {
      const res = await adminFetch(`/api/admin/users?userId=${c.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast(`Đã xóa tài khoản ${c.full_name}!`, 'success')
        setCustomers(prev => prev.filter(item => item.id !== c.id))
      } else {
        showToast(data.error || 'Lỗi khi xóa người dùng', 'error')
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error')
    }
  }

  // Reset Password Action
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPwdCustomer) return
    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu tối thiểu 6 ký tự', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Hai lần nhập mật khẩu chưa khớp', 'error')
      return
    }
    setResettingPwd(true)
    try {
      const res = await adminFetch('/api/admin/reset-customer-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetPwdCustomer.id, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Lỗi đặt lại mật khẩu', 'error')
      } else {
        showToast(`Đã đổi mật khẩu cho ${resetPwdCustomer.full_name} thành công!`, 'success')
        setResetPwdCustomer(null)
        setNewPassword('123456')
        setConfirmPassword('123456')
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error')
    } finally {
      setResettingPwd(false)
    }
  }

  const openCustomerOrders = async (customer: CustomerProfile) => {
    setOrdersCustomer(customer)
    setCustomerOrders([])
    setLoadingCustomerOrders(true)
    try {
      const res = await adminFetch(`/api/admin/customers?userId=${encodeURIComponent(customer.id)}`)
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Không thể tải lịch sử đơn hàng', 'error')
        return
      }
      setCustomerOrders((data.orders || []) as CustomerOrder[])
    } catch {
      showToast('Lỗi kết nối khi tải lịch sử đơn hàng', 'error')
    } finally {
      setLoadingCustomerOrders(false)
    }
  }

  const filtered = useMemo(() => {
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
        {/* Header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Quản lý Người Dùng & Khách Hàng</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Chỉnh sửa hồ sơ, đặt lại mật khẩu và quản lý lịch sử đơn theo từng người dùng
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="input"
              style={{ width: 260 }}
              placeholder="🔍 Tìm tên, SĐT, địa chỉ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCreateModalOpen(true)}
              style={{ background: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>➕</span>
              <span>Thêm Người Dùng</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => void loadCustomers()} title="Làm mới">
              🔄
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">👥</span>
              <p className="empty-state-title">
                {searchQuery ? 'Không tìm thấy người dùng' : 'Chưa có người dùng nào'}
              </p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Khách hàng & SĐT</th>
                  <th>Địa chỉ nhận hàng mặc định</th>
                  <th>Phân quyền</th>
                  <th>Tổng đơn hàng</th>
                  <th>Tổng chi tiêu</th>
                  <th>Ngày đăng ký</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{c.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        <a href={`tel:${c.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          📞 {c.phone}
                        </a>
                      </div>
                    </td>
                    <td style={{ maxWidth: 220, fontSize: 13, color: '#334155' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.default_delivery_address || ''}>
                        {c.default_delivery_address ? `📍 ${c.default_delivery_address}` : <span style={{ color: '#94A3B8' }}>Chưa thiết lập</span>}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${c.role === 'admin' ? 'badge-info' : 'badge-neutral'}`}
                        style={{ fontSize: 11, fontWeight: 700 }}
                      >
                        {c.role === 'admin' ? '👑 Quản trị viên' : '👤 Khách hàng'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void openCustomerOrders(c)}
                        style={{
                          border: 0,
                          background: 'transparent',
                          color: 'var(--color-primary)',
                          font: 'inherit',
                          fontWeight: 800,
                          padding: 0,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                        }}
                      >
                        {c.total_orders || 0} đơn
                      </button>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatPrice(c.total_spent || 0)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => void openCustomerOrders(c)}
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          title="Xem và quản lý đơn hàng"
                        >
                          📋 Đơn hàng
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditModal(c)}
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          title="Sửa thông tin"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setResetPwdCustomer(c)
                            setNewPassword('123456')
                            setConfirmPassword('123456')
                          }}
                          style={{ fontSize: 12, padding: '4px 8px', color: '#B45309', borderColor: '#FDE68A' }}
                          title="Đổi mật khẩu"
                        >
                          🔑 Đổi MK
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteUser(c)}
                          style={{ fontSize: 12, padding: '4px 8px', color: '#DC2626' }}
                          title="Xóa người dùng"
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

      {/* Modal: Customer order history */}
      {ordersCustomer && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
          }}
          onClick={() => setOrdersCustomer(null)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: 20, maxWidth: 980, width: '100%', maxHeight: '88vh',
              overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={event => event.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0F172A' }}>
                  📋 Đơn hàng của {ordersCustomer.full_name}
                </h2>
                <p style={{ margin: '5px 0 0', color: '#64748B', fontSize: 13 }}>
                  {ordersCustomer.phone} · {customerOrders.length} đơn · Tổng chi tiêu{' '}
                  <strong style={{ color: 'var(--color-primary)' }}>
                    {formatPrice(customerOrders.reduce((sum, order) => sum + (order.order_status === 'cancelled' ? 0 : order.final_amount), 0))}
                  </strong>
                </p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setOrdersCustomer(null)} aria-label="Đóng">
                ✕
              </button>
            </div>

            <div style={{ maxHeight: 'calc(88vh - 90px)', overflow: 'auto' }}>
              {loadingCustomerOrders ? (
                <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                  <span className="spinner" />
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="empty-state" style={{ padding: 48 }}>
                  <span className="empty-state-icon">☕</span>
                  <p className="empty-state-title">Người dùng chưa có đơn hàng</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ minWidth: 760 }}>
                    <thead>
                      <tr>
                        <th>Mã đơn / Thời gian</th>
                        <th>Điểm nhận</th>
                        <th>Thanh toán</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                        <th style={{ textAlign: 'right' }}>Quản lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <strong style={{ color: 'var(--color-primary)' }}>#{order.order_number}</strong>
                            <div style={{ marginTop: 3, fontSize: 11, color: '#94A3B8' }}>
                              {new Date(order.created_at).toLocaleString('vi-VN')}
                            </div>
                          </td>
                          <td style={{ maxWidth: 220, color: '#334155' }}>{order.delivery_address}</td>
                          <td>
                            <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                              {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge status-${order.order_status}`}>
                              {getStatusLabel(order.order_status, 'vi')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatPrice(order.final_amount)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Link href={`/admin/orders/${order.id}`} className="btn btn-outline btn-sm">
                              Xem / cập nhật →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
          }}
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: 20, maxWidth: 480, width: '100%', padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              ➕ Thêm Người Dùng Mới
            </h2>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Họ và tên *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Số điện thoại *</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="0977999948"
                  value={createPhone}
                  onChange={e => setCreatePhone(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Mật khẩu khởi tạo * (tối thiểu 6 ký tự)</label>
                <input
                  type="text"
                  className="input"
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Địa chỉ nhận hàng mặc định</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: Xưởng PP - Tầng 2..."
                  value={createAddress}
                  onChange={e => setCreateAddress(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Phân quyền</label>
                <select
                  className="input"
                  value={createRole}
                  onChange={e => setCreateRole(e.target.value as 'customer' | 'admin')}
                >
                  <option value="customer">👤 Khách hàng (Được giảm 20% nếu là NV)</option>
                  <option value="admin">👑 Quản trị viên (Truy cập được trang Admin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreateModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingCreate}>
                  {submittingCreate ? 'Đang tạo...' : 'Tạo Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editCustomer && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
          }}
          onClick={() => setEditCustomer(null)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: 20, maxWidth: 480, width: '100%', padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              ✏️ Chỉnh Sửa Thông Tin Người Dùng
            </h2>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Họ và tên</label>
                <input
                  type="text"
                  className="input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Số điện thoại</label>
                <input
                  type="tel"
                  className="input"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Địa chỉ nhận hàng</label>
                <input
                  type="text"
                  className="input"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Vai trò / Quyền hạn</label>
                <select
                  className="input"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as 'customer' | 'admin')}
                >
                  <option value="customer">👤 Khách hàng</option>
                  <option value="admin">👑 Quản trị viên (Admin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditCustomer(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingEdit}>
                  {submittingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetPwdCustomer && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
          }}
          onClick={() => setResetPwdCustomer(null)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: 20, maxWidth: 440, width: '100%', padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              🔑 Đặt Lại Mật Khẩu
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
              Người dùng: <strong>{resetPwdCustomer.full_name}</strong> ({resetPwdCustomer.phone})
            </p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Mật khẩu mới</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Nhập lại mật khẩu mới</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetPwdCustomer(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={resettingPwd}>
                  {resettingPwd ? 'Đang đặt lại...' : 'Xác Nhận Đổi Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
