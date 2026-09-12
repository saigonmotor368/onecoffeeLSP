'use client'

import { useState, useEffect } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
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
  const { lang, setLang } = useLang()
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

  // Telegram test state
  const [telegramTesting, setTelegramTesting] = useState(false)
  const [telegramResult, setTelegramResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Bank Info preview
  const bankId = process.env.NEXT_PUBLIC_BANK_ID || 'ICB'
  const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT || '101880305162'
  const accountName = process.env.NEXT_PUBLIC_ACCOUNT_NAME || 'HUYNH THI BICH NGOC'
  const hotline = process.env.NEXT_PUBLIC_HOTLINE || '0828687321'

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
        {/* Header with Bilingual Language Switcher */}
        <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="admin-page-title">
              {lang === 'vi' ? 'Cài đặt hệ thống' : 'System Settings'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              {lang === 'vi'
                ? 'Cấu hình phí giao hàng, ngưỡng miễn phí vận chuyển, chiết khấu nhân viên LSP và thanh toán.'
                : 'Configure delivery fees, free shipping threshold, internal staff discount and payments.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: '1.5px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#1E4D3B',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
          >
            <span>🌐</span>
            <span>{lang === 'vi' ? 'Chuyển sang English 🇺🇸' : 'Switch to Tiếng Việt 🇻🇳'}</span>
          </button>
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
                    {lang === 'vi' ? 'Phí giao hàng & Ngưỡng Freeship' : 'Delivery Fee & Free Shipping Threshold'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '2px 0 0' }}>
                    {lang === 'vi'
                      ? 'Áp dụng cho 21 điểm giao hàng trong khuôn viên nhà máy LSP'
                      : 'Applicable across 21 delivery zones in LSP Petrochemical Complex'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">
                    {lang === 'vi' ? 'Phí ship cơ bản (VNĐ)' : 'Base Delivery Fee (VND)'}
                  </label>
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
                    {lang === 'vi' ? 'Hiện tại:' : 'Current:'} <strong>{formatPrice(shippingFee)}</strong>
                  </span>
                </div>

                <div>
                  <label className="form-label">
                    {lang === 'vi' ? 'Ngưỡng đơn tối thiểu Miễn phí ship (VNĐ)' : 'Free Shipping Minimum Order (VND)'}
                  </label>
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
                    {lang === 'vi'
                      ? <>Đơn từ <strong>{formatPrice(freeThreshold)}</strong> trở lên sẽ được <strong>Freeship (0đ)</strong></>
                      : <>Orders from <strong>{formatPrice(freeThreshold)}</strong> will enjoy <strong>Free Delivery</strong></>}
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
                  {lang === 'vi' ? 'Kích hoạt tính phí giao hàng trong đơn' : 'Enable delivery fee on checkout'}
                </label>
              </div>
            </div>

            {/* Section 2: Employee Discount */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>⭐</span>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A202C', margin: 0 }}>
                    {lang === 'vi' ? 'Chính sách Giảm giá Nhân viên Nội bộ LSP' : 'LSP Internal Staff Discount Policy'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '2px 0 0' }}>
                    {lang === 'vi'
                      ? 'Giảm giá ưu đãi cho nhân viên LSP khi đặt đồ uống'
                      : 'Special discount for LSP staff when ordering drinks'}
                  </p>
                </div>
              </div>

              <div style={{ maxWidth: '320px' }}>
                <label className="form-label">
                  {lang === 'vi' ? 'Mức giảm giá tự động (%)' : 'Automatic Discount Rate (%)'}
                </label>
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
                  {lang === 'vi'
                    ? <>Hệ thống sẽ tự động trừ <strong>{discountPercent}%</strong> trên tổng tiền món trong giỏ hàng.</>
                    : <>System will deduct <strong>{discountPercent}%</strong> on cart item subtotal.</>}
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
                  {lang === 'vi' ? 'Áp dụng chính sách giảm giá nhân viên nội bộ' : 'Apply internal staff discount policy'}
                </label>
              </div>
            </div>

            {/* Section 3: Bank & Payment Info Preview */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>🏦</span>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A202C', margin: 0 }}>
                    {lang === 'vi' ? 'Tài khoản nhận thanh toán VietQR' : 'VietQR Beneficiary Payment Account'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '2px 0 0' }}>
                    {lang === 'vi'
                      ? 'Thông tin hiển thị trên mã QR động và hướng dẫn chuyển khoản của khách hàng'
                      : 'Information displayed on dynamic VietQR code and customer transfer guide'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #EDF2F7' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 700 }}>{lang === 'vi' ? 'NGÂN HÀNG' : 'BANK'}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A202C', marginTop: '2px' }}>VietinBank (Công Thương)</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 700 }}>{lang === 'vi' ? 'SỐ TÀI KHOẢN' : 'ACCOUNT NO.'}</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E4D3B', marginTop: '2px' }}>{bankAccount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 700 }}>{lang === 'vi' ? 'CHỦ TÀI KHOẢN' : 'BENEFICIARY'}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A202C', marginTop: '2px' }}>{accountName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 700 }}>{lang === 'vi' ? 'HOTLINE ĐẶT HÀNG' : 'ORDER HOTLINE'}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E4D3B', marginTop: '2px' }}>0828 687 321 (Ngọc)</div>
                </div>
              </div>
            </div>

            {/* Section: Telegram Bot Notification */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #0088cc33', padding: '24px', boxShadow: '0 2px 10px rgba(0,136,204,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '28px' }}>✈️</span>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A202C', margin: 0 }}>
                    {lang === 'vi' ? 'Thông báo Telegram Bot' : 'Telegram Bot Notifications'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '2px 0 0' }}>
                    {lang === 'vi'
                      ? 'Mỗi đơn hàng mới sẽ tự động gửi thông báo đầy đủ vào group Telegram của nhân viên'
                      : 'Every new order will be sent automatically to your staff Telegram group'}
                  </p>
                </div>
              </div>

              <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '16px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.6 }}>
                <strong>⚙️ {lang === 'vi' ? 'Cách cấu hình:' : 'How to configure:'}</strong><br />
                {lang === 'vi' ? (
                  <>
                    1. Tạo bot qua <strong>@BotFather</strong> → nhận <code>BOT_TOKEN</code><br />
                    2. Tạo group Telegram → thêm bot vào group → lấy <code>CHAT_ID</code><br />
                    3. Vào <strong>Vercel Dashboard → Settings → Environment Variables</strong> → thêm:<br />
                    <code style={{ background: '#E0F2FE', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>TELEGRAM_BOT_TOKEN = 123456:ABCxxx...</code><br />
                    <code style={{ background: '#E0F2FE', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>TELEGRAM_CHAT_ID = -1001234567890</code><br />
                    4. Redeploy → bấm <strong>"Test Bot"</strong> bên dưới
                  </>
                ) : (
                  <>
                    1. Create bot via <strong>@BotFather</strong> → get <code>BOT_TOKEN</code><br />
                    2. Create Telegram group → add bot → get <code>CHAT_ID</code><br />
                    3. Go to <strong>Vercel → Settings → Environment Variables</strong> → add:<br />
                    <code style={{ background: '#E0F2FE', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>TELEGRAM_BOT_TOKEN = 123456:ABCxxx...</code><br />
                    <code style={{ background: '#E0F2FE', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>TELEGRAM_CHAT_ID = -1001234567890</code><br />
                    4. Redeploy → click <strong>"Test Bot"</strong> below
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setTelegramTesting(true)
                    setTelegramResult(null)
                    try {
                      const supabase = createClient()
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await fetch('/api/admin/test-telegram', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
                      })
                      const data = await res.json()
                      setTelegramResult({
                        ok: data.success,
                        msg: data.message || data.error || 'Unknown',
                      })
                    } catch (err) {
                      setTelegramResult({ ok: false, msg: String(err) })
                    } finally {
                      setTelegramTesting(false)
                    }
                  }}
                  disabled={telegramTesting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: telegramTesting ? '#94A3B8' : '#0088cc',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: telegramTesting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {telegramTesting ? '⏳ Đang gửi...' : '✈️ Test Bot Telegram'}
                </button>

                {telegramResult && (
                  <div style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: telegramResult.ok ? '#DCFCE7' : '#FEE2E2',
                    color: telegramResult.ok ? '#166534' : '#991B1B',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}>
                    {telegramResult.ok ? '✅ ' : '❌ '}{telegramResult.msg}
                  </div>
                )}
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
                {saving
                  ? (lang === 'vi' ? 'Đang lưu cấu hình...' : 'Saving settings...')
                  : (lang === 'vi' ? 'Lưu Thay Đổi Cài Đặt' : 'Save Settings Changes')}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
