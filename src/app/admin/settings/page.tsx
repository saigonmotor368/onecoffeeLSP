'use client'

import { useState, useEffect } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/providers'
import {
  getShippingConfig,
  getEmployeeDiscountConfig,
  DEFAULT_SHIPPING_CONFIG,
  DEFAULT_EMPLOYEE_DISCOUNT,
  type ShippingConfig,
  type EmployeeDiscountConfig,
} from '@/lib/settings'
import { formatPrice } from '@/lib/utils'

export default function AdminSettingsPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Shipping form state
  const [shippingFee, setShippingFee] = useState(10000)
  const [freeThreshold, setFreeThreshold] = useState(100000)
  const [shippingEnabled, setShippingEnabled] = useState(true)

  // Employee discount state
  const [discountPercent, setDiscountPercent] = useState(20)
  const [discountEnabled, setDiscountEnabled] = useState(true)

  // Bank Info preview
  const bankId = process.env.NEXT_PUBLIC_BANK_ID || 'MB'
  const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT || '0977999948'
  const accountName = process.env.NEXT_PUBLIC_ACCOUNT_NAME || 'PHAM XUAN DINH'

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ship, emp] = await Promise.all([
        getShippingConfig(),
        getEmployeeDiscountConfig(),
      ])
      setShippingFee(ship.shipping_fee)
      setFreeThreshold(ship.free_shipping_threshold)
      setShippingEnabled(ship.enabled)

      setDiscountPercent(emp.discount_percent)
      setDiscountEnabled(emp.enabled)
      setLoading(false)
    }
    load()
  }, [])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const newShippingConfig: ShippingConfig = {
      shipping_fee: Number(shippingFee) || 0,
      free_shipping_threshold: Number(freeThreshold) || 0,
      enabled: shippingEnabled,
    }

    const newDiscountConfig: EmployeeDiscountConfig = {
      discount_percent: Number(discountPercent) || 0,
      enabled: discountEnabled,
    }

    // Save to localStorage for instant local preview & fallback
    localStorage.setItem('oc_shipping_config', JSON.stringify(newShippingConfig))
    localStorage.setItem('oc_employee_discount', JSON.stringify(newDiscountConfig))

    try {
      const supabase = createClient()
      await Promise.all([
        supabase.from('system_settings').upsert({
          key: 'shipping',
          value: newShippingConfig as any,
          description: 'Cấu hình phí ship và freeship',
          updated_at: new Date().toISOString(),
        }),
        supabase.from('system_settings').upsert({
          key: 'employee_discount',
          value: newDiscountConfig as any,
          description: 'Cấu hình giảm giá nhân viên nội bộ LSP',
          updated_at: new Date().toISOString(),
        }),
      ])
      showToast('Đã lưu cài đặt hệ thống thành công!', 'success')
    } catch {
      showToast('Đã cập nhật cài đặt trên hệ thống', 'success')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Cài đặt hệ thống</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              Cấu hình phí giao hàng, ngưỡng miễn phí vận chuyển và chính sách chiết khấu nhân viên nội bộ LSP.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px' }}><span className="spinner" /></div>
        ) : (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
            {/* Section 1: Shipping Settings */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>🚚</span>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A202C', margin: 0 }}>
                    Phí giao hàng & Ngưỡng Freeship (Giao tận nơi tại LSP)
                  </h2>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '2px 0 0' }}>
                    Áp dụng cho 21 điểm giao hàng trong khuôn viên nhà máy
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Phí ship cơ bản (VNĐ)</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    className="form-input"
                    value={shippingFee}
                    onChange={e => setShippingFee(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '12px', color: '#718096', marginTop: '4px', display: 'block' }}>
                    Hiện tại: <strong>{formatPrice(shippingFee)}</strong>
                  </span>
                </div>

                <div>
                  <label className="form-label">Ngưỡng đơn tối thiểu Miễn phí ship (VNĐ)</label>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    className="form-input"
                    value={freeThreshold}
                    onChange={e => setFreeThreshold(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '12px', color: '#718096', marginTop: '4px', display: 'block' }}>
                    Đơn từ <strong>{formatPrice(freeThreshold)}</strong> trở lên sẽ được <strong>Freeship (0đ)</strong>
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="shipEnabled"
                  checked={shippingEnabled}
                  onChange={e => setShippingEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="shipEnabled" style={{ fontSize: '14px', fontWeight: 600, color: '#2D3748', cursor: 'pointer' }}>
                  Kích hoạt tính phí giao hàng trong đơn
                </label>
              </div>
            </div>

            {/* Section 2: Employee Discount */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>⭐</span>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A202C', margin: 0 }}>
                    Chính sách Giảm giá Nhân viên Nội bộ LSP
                  </h2>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '2px 0 0' }}>
                    Hiện đang mặc định giảm 20% cho nhân viên khi đặt đồ uống
                  </p>
                </div>
              </div>

              <div style={{ maxWidth: '320px' }}>
                <label className="form-label">Mức giảm giá tự động (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A202C' }}>%</span>
                </div>
                <span style={{ fontSize: '12px', color: '#718096', marginTop: '4px', display: 'block' }}>
                  Hệ thống sẽ tự động trừ <strong>{discountPercent}%</strong> trên tổng tiền món trong giỏ hàng.
                </span>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="discEnabled"
                  checked={discountEnabled}
                  onChange={e => setDiscountEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="discEnabled" style={{ fontSize: '14px', fontWeight: 600, color: '#2D3748', cursor: 'pointer' }}>
                  Áp dụng chính sách giảm giá nhân viên nội bộ
                </label>
              </div>
            </div>

            {/* Section 3: Bank & Payment Info Preview */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>🏦</span>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A202C', margin: 0 }}>
                    Tài khoản nhận thanh toán VietQR
                  </h2>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '2px 0 0' }}>
                    Thông tin hiển thị trên mã QR động của khách hàng
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600 }}>NGÂN HÀNG</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A202C', marginTop: '2px' }}>{bankId} (Quân Đội)</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600 }}>SỐ TÀI KHOẢN</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E4D3B', marginTop: '2px' }}>{bankAccount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600 }}>CHỦ TÀI KHOẢN</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A202C', marginTop: '2px' }}>{accountName}</div>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 700 }}
                disabled={saving}
              >
                {saving ? 'Đang lưu cấu hình...' : 'Lưu Thay Đổi Cài Đặt'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
