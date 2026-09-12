'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import AdminSidebar from '@/components/AdminSidebar'

export default function AdminQRCodePage() {
  const [targetApp, setTargetApp] = useState<'customer' | 'admin'>('customer')
  const [domain, setDomain] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const printAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomain(window.location.origin)
    }
  }, [])

  // Generate QR Code with custom logo in center
  useEffect(() => {
    if (!domain) return
    const baseUrl = domain.trim().replace(/\/$/, '')
    const targetUrl = targetApp === 'customer'
      ? `${baseUrl}/?action=install`
      : `${baseUrl}/admin?action=install`

    setGenerating(true)
    QRCode.toDataURL(targetUrl, {
      width: 420,
      margin: 2,
      color: {
        dark: targetApp === 'customer' ? '#184F38' : '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // High error correction to allow center logo
    })
      .then(url => {
        setQrDataUrl(url)
      })
      .catch(err => {
        console.error('QR code generation error:', err)
      })
      .finally(() => {
        setGenerating(false)
      })
  }, [domain, targetApp])

  const handleDownloadQR = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = `OneCoffee_${targetApp === 'customer' ? 'Order' : 'Admin'}_QR.png`
    link.href = qrDataUrl
    link.click()
  }

  const handlePrintStandee = () => {
    window.print()
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>📱</span>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Tạo Mã QR Cài Đặt Ứng Dụng (PWA Standee)
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                Quét mã này trên điện thoại sẽ tự động mở hộp thoại hỏi <strong>"Bạn có muốn cài đặt ứng dụng lên máy không?"</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
          {/* Settings Box */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#184F38', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚙️ Cấu hình Mã QR
            </h2>

            {/* Target App Switcher */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Chọn loại Ứng dụng:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTargetApp('customer')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: targetApp === 'customer' ? '2px solid #184F38' : '1px solid #E2E8F0',
                    background: targetApp === 'customer' ? '#EAF2ED' : '#F8FAFC',
                    color: targetApp === 'customer' ? '#184F38' : '#475569',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>☕</span> App Khách Hàng
                </button>

                <button
                  type="button"
                  onClick={() => setTargetApp('admin')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: targetApp === 'admin' ? '2px solid #0F172A' : '1px solid #E2E8F0',
                    background: targetApp === 'admin' ? '#0F172A' : '#F8FAFC',
                    color: targetApp === 'admin' ? '#FFFFFF' : '#475569',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🔐</span> App Admin Quản Trị
                </button>
              </div>
            </div>

            {/* Domain URL */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Địa chỉ Web (Domain của Quán):
              </label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="https://onecoffeeLSP.vercel.app"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13.5px',
                  color: '#0F172A',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px' }}>
                Đường link QR sẽ trỏ đến: <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', color: '#0F172A' }}>{domain}/{targetApp === 'admin' ? 'admin' : ''}?action=install</code>
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePrintStandee}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #184F38 0%, #103828 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(24, 79, 56, 0.3)'
                }}
              >
                🖨️ In Standee Để Quầy / Treo Xưởng
              </button>

              <button
                type="button"
                onClick={handleDownloadQR}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  color: '#334155',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                📥 Tải Ảnh Mã QR (PNG)
              </button>
            </div>
          </div>

          {/* Standee Preview for Printing */}
          <div
            ref={printAreaRef}
            className="standee-print-card"
            style={{
              background: '#FFFFFF',
              border: '2px solid #E2E8F0',
              borderRadius: '20px',
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Logo Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <img
                src={targetApp === 'customer' ? '/icon-order-192.png' : '/icon-admin-192.png'}
                alt="One Coffee"
                style={{ width: '56px', height: '56px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#184F38', letterSpacing: '0.5px' }}>
                  ONE COFFEE
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#C89B3C', letterSpacing: '1px' }}>
                  {targetApp === 'customer' ? 'LSP PETROCHEMICAL COMPLEX' : 'ADMIN MANAGEMENT PORTAL'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'inline-block',
              background: targetApp === 'customer' ? '#EAF2ED' : '#F1F5F9',
              color: targetApp === 'customer' ? '#184F38' : '#0F172A',
              padding: '5px 14px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}>
              {targetApp === 'customer' ? '✨ QUÉT MÃ CÀI APP ĐẶT NƯỚC 1 CHẠM' : '🔐 QUÉT MÃ CÀI APP QUẢN TRỊ VIÊN'}
            </div>

            {/* QR Frame */}
            <div style={{
              background: '#FFFFFF',
              padding: '14px',
              borderRadius: '20px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
              border: '2px solid #F1F5F9',
              position: 'relative',
              marginBottom: '16px'
            }}>
              {generating ? (
                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Đang tạo mã QR...</span>
                </div>
              ) : qrDataUrl ? (
                <div style={{ position: 'relative', width: '220px', height: '220px' }}>
                  <img src={qrDataUrl} alt="Mã QR Cài App" style={{ width: '100%', height: '100%', display: 'block', borderRadius: '12px' }} />
                  {/* Center Emblem Logo */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    border: '2px solid #FFFFFF'
                  }}>
                    <img
                      src={targetApp === 'customer' ? '/icon-order-192.png' : '/icon-admin-192.png'}
                      alt="Logo"
                      style={{ width: '38px', height: '38px', borderRadius: '50%' }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Instructional steps on standee */}
            <div style={{ maxWidth: '280px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                Mở Camera hoặc Zalo quét mã QR
              </p>
              <p style={{ fontSize: '11.5px', color: '#64748B', lineHeight: '1.45', margin: 0 }}>
                Hệ thống sẽ hiện thông báo hỏi <strong>"Bạn có muốn cài đặt ứng dụng lên máy không?"</strong>. Bấm Đồng ý để cài App tức thì!
              </p>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .standee-print-card, .standee-print-card * {
              visibility: visible;
            }
            .standee-print-card {
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              width: 90% !important;
              max-width: 480px !important;
              box-shadow: none !important;
              border: 2px solid #184F38 !important;
            }
          }
        `}</style>
      </main>
    </div>
  )
}
