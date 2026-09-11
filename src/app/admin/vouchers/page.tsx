'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import AdminSidebar from '@/components/AdminSidebar'

interface Voucher {
  id: string; code: string; type: 'percent' | 'fixed'; value: number
  min_order_amount: number; max_discount: number | null
  usage_limit: number | null; used_count: number
  expires_at: string | null; is_active: boolean; created_at: string
}

export default function AdminVouchersPage() {
  const { showToast } = useToast()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: '', type: 'percent' as 'percent' | 'fixed', value: '',
    min_order_amount: '', max_discount: '', usage_limit: '', expires_at: '',
  })

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false })
    setVouchers((data ?? []) as Voucher[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.from('vouchers').insert({
      code: form.code.toUpperCase(),
      type: form.type,
      value: parseInt(form.value),
      min_order_amount: parseInt(form.min_order_amount) || 0,
      max_discount: form.max_discount ? parseInt(form.max_discount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      expires_at: form.expires_at || null,
      is_active: true,
    })
    if (error) {
      showToast('Lỗi tạo voucher: ' + error.message, 'error')
    } else {
      showToast('Tạo voucher thành công!', 'success')
      setShowForm(false)
      setForm({ code: '', type: 'percent', value: '', min_order_amount: '', max_discount: '', usage_limit: '', expires_at: '' })
      load()
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const supabase = createClient()
    await supabase.from('vouchers').update({ is_active: !isActive }).eq('id', id)
    showToast(isActive ? 'Đã tắt voucher' : 'Đã bật voucher', 'success')
    load()
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Quản lý Voucher</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            + Tạo Voucher mới
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="admin-table-wrap" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 'var(--text-base)' }}>Tạo Voucher mới</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Mã voucher *</label>
                <input className="input" placeholder="VD: SUMMER20" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Loại giảm *</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))}>
                  <option value="percent">Phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (đ)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Giá trị * {form.type === 'percent' ? '(%)' : '(1000đ)'}</label>
                <input className="input" type="number" placeholder={form.type === 'percent' ? 'VD: 10' : 'VD: 50'} value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required min={1} />
              </div>
              <div className="input-group">
                <label className="input-label">Đơn tối thiểu (1000đ)</label>
                <input className="input" type="number" placeholder="VD: 100" value={form.min_order_amount}
                  onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} min={0} />
              </div>
              <div className="input-group">
                <label className="input-label">Giảm tối đa (1000đ)</label>
                <input className="input" type="number" placeholder="Để trống = không giới hạn" value={form.max_discount}
                  onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))} min={0} />
              </div>
              <div className="input-group">
                <label className="input-label">Số lần sử dụng</label>
                <input className="input" type="number" placeholder="Để trống = không giới hạn" value={form.usage_limit}
                  onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} min={1} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Hạn sử dụng</label>
                <input className="input" type="datetime-local" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary">Tạo Voucher</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
              </div>
            </form>
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Mã</th><th>Loại</th><th>Giá trị</th><th>Đơn tối thiểu</th><th>Đã dùng / Giới hạn</th><th>Hạn dùng</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></td></tr>
              ) : vouchers.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 800, letterSpacing: '0.05em', color: 'var(--color-primary)' }}>{v.code}</td>
                  <td>{v.type === 'percent' ? `${v.value}%` : formatPrice(v.value * 1000)}</td>
                  <td>{v.type === 'percent' ? `Giảm ${v.value}%` : `Giảm ${formatPrice(v.value * 1000)}`}</td>
                  <td>{formatPrice(v.min_order_amount * 1000)}</td>
                  <td>{v.used_count} / {v.usage_limit ?? '∞'}</td>
                  <td style={{ fontSize: 12 }}>{v.expires_at ? new Date(v.expires_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td>
                    <span className={`badge ${v.is_active ? 'badge-success' : 'badge-error'}`}>
                      {v.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(v.id, v.is_active)}
                      className={`btn btn-sm ${v.is_active ? 'btn-outline' : 'btn-primary'}`}
                      style={{ fontSize: 12 }}
                    >
                      {v.is_active ? 'Tắt' : 'Bật'}
                    </button>
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
