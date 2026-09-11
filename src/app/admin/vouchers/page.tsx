'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { adminFetch } from '@/lib/admin-api-client'
import { useToast } from '@/lib/providers'
import type { Database } from '@/lib/supabase/database.types'
import { formatPrice } from '@/lib/utils'

type Voucher = Database['public']['Tables']['vouchers']['Row']
type VoucherType = Voucher['type']

interface VoucherForm {
  code: string
  type: VoucherType
  value: string
  min_order_amount: string
  max_discount: string
  usage_limit: string
  expires_at: string
  is_active: boolean
}

const EMPTY_FORM: VoucherForm = {
  code: '',
  type: 'percent',
  value: '',
  min_order_amount: '0',
  max_discount: '',
  usage_limit: '',
  expires_at: '',
  is_active: true,
}

function normalizeLegacyMoney(value: number | null) {
  if (!value) return 0
  return value < 1000 ? value * 1000 : value
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function getVoucherState(voucher: Voucher) {
  if (!voucher.is_active) return { label: 'Đã tắt', className: 'badge-error' }
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return { label: 'Hết hạn', className: 'badge-warning' }
  }
  if (voucher.usage_limit !== null && voucher.used_count >= voucher.usage_limit) {
    return { label: 'Hết lượt', className: 'badge-warning' }
  }
  return { label: 'Đang hoạt động', className: 'badge-success' }
}

function getBenefit(voucher: Voucher) {
  if (voucher.type === 'fixed') {
    return `Giảm ${formatPrice(normalizeLegacyMoney(voucher.value))}`
  }
  const maxDiscount = normalizeLegacyMoney(voucher.max_discount)
  return `Giảm ${voucher.value}%${maxDiscount ? `, tối đa ${formatPrice(maxDiscount)}` : ''}`
}

export default function AdminVouchersPage() {
  const { showToast } = useToast()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [form, setForm] = useState<VoucherForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadVouchers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminFetch('/api/admin/vouchers')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể tải danh sách voucher')
      setVouchers((data.vouchers || []) as Voucher[])
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải danh sách voucher', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVouchers()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadVouchers])

  const filteredVouchers = useMemo(() => {
    const query = search.trim().toUpperCase()
    if (!query) return vouchers
    return vouchers.filter(voucher =>
      voucher.code.includes(query) || getBenefit(voucher).toUpperCase().includes(query)
    )
  }, [search, vouchers])

  const openCreateModal = () => {
    setEditingVoucher(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setForm({
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.type === 'fixed' ? normalizeLegacyMoney(voucher.value) : voucher.value),
      min_order_amount: String(normalizeLegacyMoney(voucher.min_order_amount)),
      max_discount: voucher.max_discount ? String(normalizeLegacyMoney(voucher.max_discount)) : '',
      usage_limit: voucher.usage_limit === null ? '' : String(voucher.usage_limit),
      expires_at: toDateTimeLocal(voucher.expires_at),
      is_active: voucher.is_active,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditingVoucher(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(form.value)
    const minOrderAmount = Number(form.min_order_amount || 0)
    const maxDiscount = form.max_discount ? Number(form.max_discount) : null
    const usageLimit = form.usage_limit ? Number(form.usage_limit) : null

    if (!Number.isInteger(value) || value <= 0) {
      showToast('Giá trị giảm phải là số nguyên lớn hơn 0', 'warning')
      return
    }
    if (form.type === 'percent' && value > 100) {
      showToast('Mức giảm phần trăm không được vượt quá 100%', 'warning')
      return
    }
    if (editingVoucher && usageLimit !== null && usageLimit < editingVoucher.used_count) {
      showToast(`Giới hạn không thể thấp hơn ${editingVoucher.used_count} lượt đã dùng`, 'warning')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...(editingVoucher ? { id: editingVoucher.id } : {}),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value,
        min_order_amount: minOrderAmount,
        max_discount: form.type === 'percent' ? maxDiscount : null,
        usage_limit: usageLimit,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: form.is_active,
      }
      const response = await adminFetch('/api/admin/vouchers', {
        method: editingVoucher ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể lưu voucher')

      const saved = data.voucher as Voucher
      setVouchers(current => editingVoucher
        ? current.map(voucher => voucher.id === saved.id ? saved : voucher)
        : [saved, ...current]
      )
      showToast(editingVoucher ? 'Đã cập nhật voucher thành công' : 'Đã tạo voucher thành công', 'success')
      setShowModal(false)
      setEditingVoucher(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu voucher', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (voucher: Voucher) => {
    try {
      const response = await adminFetch('/api/admin/vouchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voucher.id, is_active: !voucher.is_active }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể đổi trạng thái voucher')
      const updated = data.voucher as Voucher
      setVouchers(current => current.map(item => item.id === updated.id ? updated : item))
      showToast(updated.is_active ? 'Đã bật voucher' : 'Đã tắt voucher', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đổi trạng thái voucher', 'error')
    }
  }

  const deleteVoucher = async (voucher: Voucher) => {
    if (!window.confirm(`Xóa vĩnh viễn voucher ${voucher.code}?\n\nVoucher đã có lịch sử sử dụng sẽ được hệ thống bảo vệ và không cho xóa.`)) return

    setDeletingId(voucher.id)
    try {
      const response = await adminFetch(`/api/admin/vouchers?id=${encodeURIComponent(voucher.id)}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể xóa voucher')
      setVouchers(current => current.filter(item => item.id !== voucher.id))
      showToast(`Đã xóa voucher ${voucher.code}`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể xóa voucher', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Quản lý Voucher</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              Tạo, chỉnh sửa nội dung, điều kiện áp dụng, thời hạn và trạng thái voucher
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="🔍 Tìm mã voucher..."
              aria-label="Tìm mã voucher"
              style={{ width: 230 }}
            />
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              + Tạo Voucher
            </button>
          </div>
        </div>

        <div className="admin-stats" style={{ marginBottom: 20 }}>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">🎫</span>
            <div><strong>{vouchers.length}</strong><span>Tổng voucher</span></div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">✅</span>
            <div><strong>{vouchers.filter(voucher => getVoucherState(voucher).label === 'Đang hoạt động').length}</strong><span>Đang hoạt động</span></div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">🧾</span>
            <div><strong>{vouchers.reduce((sum, voucher) => sum + voucher.used_count, 0)}</strong><span>Lượt đã dùng</span></div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 64 }}><span className="spinner" /></div>
        ) : filteredVouchers.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 48 }}>🎫</span>
            <p style={{ fontWeight: 700, margin: '12px 0 4px' }}>
              {search ? 'Không tìm thấy voucher phù hợp' : 'Chưa có voucher nào'}
            </p>
            {!search && <button type="button" className="btn btn-primary" onClick={openCreateModal}>Tạo voucher đầu tiên</button>}
          </div>
        ) : (
          <>
            <div className="admin-table-wrap admin-desktop-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã & nội dung</th>
                    <th>Điều kiện</th>
                    <th>Đã dùng / Giới hạn</th>
                    <th>Hạn sử dụng</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVouchers.map(voucher => {
                    const state = getVoucherState(voucher)
                    return (
                      <tr key={voucher.id}>
                        <td>
                          <div style={{ fontWeight: 900, letterSpacing: '0.05em', color: 'var(--color-primary)' }}>{voucher.code}</div>
                          <div style={{ marginTop: 3, fontSize: 12, color: '#475569' }}>{getBenefit(voucher)}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          Đơn từ <strong>{formatPrice(normalizeLegacyMoney(voucher.min_order_amount))}</strong>
                        </td>
                        <td>{voucher.used_count} / {voucher.usage_limit ?? '∞'}</td>
                        <td style={{ fontSize: 12 }}>{voucher.expires_at ? new Date(voucher.expires_at).toLocaleString('vi-VN') : 'Không giới hạn'}</td>
                        <td><span className={`badge ${state.className}`}>{state.label}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditModal(voucher)}>✏️ Sửa</button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => void toggleActive(voucher)}>
                              {voucher.is_active ? '⏸ Tắt' : '▶ Bật'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={deletingId === voucher.id}
                              onClick={() => void deleteVoucher(voucher)}
                              style={{ color: '#DC2626' }}
                            >
                              {deletingId === voucher.id ? '⏳' : '🗑️ Xóa'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-mobile-cards">
              {filteredVouchers.map(voucher => {
                const state = getVoucherState(voucher)
                return (
                  <article key={voucher.id} className="admin-order-card">
                    <div className="admin-order-card-header">
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: '0.06em', color: 'var(--color-primary)' }}>{voucher.code}</div>
                        <div style={{ marginTop: 3, fontSize: 13, fontWeight: 700 }}>{getBenefit(voucher)}</div>
                      </div>
                      <span className={`badge ${state.className}`}>{state.label}</span>
                    </div>
                    <div className="admin-order-card-body" style={{ fontSize: 13, color: '#475569' }}>
                      <div>🛒 Đơn tối thiểu: <strong>{formatPrice(normalizeLegacyMoney(voucher.min_order_amount))}</strong></div>
                      <div>🧾 Đã dùng: <strong>{voucher.used_count} / {voucher.usage_limit ?? '∞'}</strong></div>
                      <div>🕒 Hạn: <strong>{voucher.expires_at ? new Date(voucher.expires_at).toLocaleString('vi-VN') : 'Không giới hạn'}</strong></div>
                    </div>
                    <div className="admin-order-card-footer">
                      <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => openEditModal(voucher)}>✏️ Chỉnh sửa</button>
                      <button type="button" className="btn btn-outline" onClick={() => void toggleActive(voucher)}>{voucher.is_active ? 'Tắt' : 'Bật'}</button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        aria-label={`Xóa voucher ${voucher.code}`}
                        disabled={deletingId === voucher.id}
                        onClick={() => void deleteVoucher(voucher)}
                        style={{ color: '#DC2626', borderColor: '#FECACA' }}
                      >
                        {deletingId === voucher.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}

        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" style={{ maxWidth: 680 }} onClick={event => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">{editingVoucher ? `Chỉnh sửa ${editingVoucher.code}` : 'Tạo Voucher mới'}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>Nhập số tiền theo đơn vị đồng (VD: 50000 là 50.000đ)</p>
                </div>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Đóng">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="voucher-code">Mã voucher *</label>
                    <input
                      id="voucher-code"
                      className="input"
                      value={form.code}
                      onChange={event => setForm(current => ({ ...current, code: event.target.value.toUpperCase() }))}
                      placeholder="VD: WELCOME10"
                      maxLength={50}
                      pattern="[A-Za-z0-9_-]+"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="voucher-type">Loại ưu đãi *</label>
                    <select id="voucher-type" className="input" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as VoucherType }))}>
                      <option value="percent">Giảm theo phần trăm (%)</option>
                      <option value="fixed">Giảm số tiền cố định (đ)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="voucher-value">{form.type === 'percent' ? 'Mức giảm (%) *' : 'Số tiền giảm (đ) *'}</label>
                    <input
                      id="voucher-value"
                      className="input"
                      type="number"
                      min={1}
                      max={form.type === 'percent' ? 100 : undefined}
                      step={form.type === 'percent' ? 1 : 1000}
                      value={form.value}
                      onChange={event => setForm(current => ({ ...current, value: event.target.value }))}
                      placeholder={form.type === 'percent' ? '10' : '50000'}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="voucher-min-order">Đơn hàng tối thiểu (đ)</label>
                    <input id="voucher-min-order" className="input" type="number" min={0} step={1000} value={form.min_order_amount} onChange={event => setForm(current => ({ ...current, min_order_amount: event.target.value }))} />
                  </div>
                  {form.type === 'percent' && (
                    <div className="input-group">
                      <label className="input-label" htmlFor="voucher-max-discount">Giảm tối đa (đ)</label>
                      <input id="voucher-max-discount" className="input" type="number" min={1000} step={1000} value={form.max_discount} onChange={event => setForm(current => ({ ...current, max_discount: event.target.value }))} placeholder="Trống = không giới hạn" />
                    </div>
                  )}
                  <div className="input-group">
                    <label className="input-label" htmlFor="voucher-usage-limit">Tổng lượt sử dụng</label>
                    <input
                      id="voucher-usage-limit"
                      className="input"
                      type="number"
                      min={editingVoucher ? Math.max(1, editingVoucher.used_count) : 1}
                      step={1}
                      value={form.usage_limit}
                      onChange={event => setForm(current => ({ ...current, usage_limit: event.target.value }))}
                      placeholder="Trống = không giới hạn"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="voucher-expiry">Hạn sử dụng</label>
                    <input id="voucher-expiry" className="input" type="datetime-local" value={form.expires_at} onChange={event => setForm(current => ({ ...current, expires_at: event.target.value }))} />
                  </div>
                </div>

                <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>Nội dung voucher xem trước</div>
                  <div style={{ marginTop: 4, color: '#14532D', fontWeight: 800 }}>
                    {form.code || 'MÃ VOUCHER'} — {form.type === 'percent' ? `Giảm ${form.value || 0}%` : `Giảm ${formatPrice(Number(form.value || 0))}`}
                    {form.type === 'percent' && form.max_discount ? `, tối đa ${formatPrice(Number(form.max_discount))}` : ''}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12, color: '#166534' }}>Áp dụng cho đơn từ {formatPrice(Number(form.min_order_amount || 0))}</div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  <input type="checkbox" checked={form.is_active} onChange={event => setForm(current => ({ ...current, is_active: event.target.checked }))} style={{ width: 18, height: 18 }} />
                  Cho phép khách sử dụng voucher này
                </label>

                <div className="modal-footer" style={{ marginTop: 20 }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : editingVoucher ? 'Lưu thay đổi' : 'Tạo Voucher'}
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
