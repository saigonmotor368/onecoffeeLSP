'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  playAdminNewOrderSound,
  sendDeviceNotification,
  requestNotificationPermission,
  getNotificationPermission,
} from '@/lib/notifications'
import { formatPrice } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin',           icon: '📊', label: 'Dashboard' },
  { href: '/admin/orders',    icon: '📋', label: 'Đơn hàng' },
  { href: '/admin/menu',      icon: '☕', label: 'Quản lý Menu' },
  { href: '/admin/banners',   icon: '🎨', label: 'Quản lý Banner' },
  { href: '/admin/customers', icon: '👥', label: 'Khách hàng' },
  { href: '/admin/vouchers',  icon: '🎫', label: 'Voucher' },
  { href: '/admin/settings',  icon: '⚙️', label: 'Cài đặt hệ thống' },
  { href: '/admin/reports',   icon: '📈', label: 'Báo cáo doanh thu' },
]

export default function AdminSidebar({ pendingCount: propPendingCount }: { pendingCount?: number } = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState(propPendingCount ?? 0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationActive, setNotificationActive] = useState(false)

  useEffect(() => {
    if (getNotificationPermission() === 'granted') {
      setNotificationActive(true)
    }
  }, [])

  useEffect(() => {
    if (propPendingCount !== undefined) {
      setPendingCount(propPendingCount)
    }
  }, [propPendingCount])

  // Fetch pending count and listen for new orders
  useEffect(() => {
    const supabase = createClient()
    const fetchPending = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_status', 'pending')
      setPendingCount(count ?? 0)
    }

    fetchPending()

    const channel = supabase
      .channel('admin-sidebar-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        fetchPending()
        if (payload.eventType === 'INSERT') {
          playAdminNewOrderSound()
          const order = payload.new
          const orderNum = order?.order_number || ''
          const amt = order?.final_amount ? ` (${formatPrice(order.final_amount)})` : ''
          const name = order?.recipient_name ? ` - KH: ${order.recipient_name}` : ''
          sendDeviceNotification(`🔔 CÓ ĐƠN HÀNG MỚI #${orderNum}!`, {
            body: `Đơn mới nhận${amt}${name}. Bấm để xem chi tiết!`,
            tag: `admin-order-${order?.id || Date.now()}`,
            data: { url: '/admin/orders' },
          })
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleTestSoundAndNotification = async () => {
    playAdminNewOrderSound()
    const granted = await requestNotificationPermission()
    if (granted) {
      setNotificationActive(true)
      sendDeviceNotification('🔔 Chuông & Thông Báo Sẵn Sàng!', {
        body: 'Âm thanh chuông báo và thông báo hệ thống đã được bật cho tài khoản Admin One Coffee.',
      })
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <>
      {/* Mobile hamburger header */}
      <header className="admin-mobile-header">
        <button
          className="admin-hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <span className="admin-mobile-title">One Coffee Admin</span>
        {pendingCount > 0 && (
          <span className="admin-nav-badge" style={{ marginLeft: 'auto' }}>
            {pendingCount} đơn mới
          </span>
        )}
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div className="admin-sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar navigation */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-logo">
          <span className="admin-sidebar-logo-icon">☕</span>
          <div>
            <div className="admin-sidebar-logo-text">ONE COFFEE</div>
            <div className="admin-sidebar-logo-sub">LSP Management</div>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/admin/orders' && pendingCount > 0 && (
                  <span className="admin-nav-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
                )}
              </Link>
            )
          })}

          <div style={{ margin: '16px 0 8px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Khách hàng
          </div>

          <Link href="/home" target="_blank" className="admin-nav-item" style={{ opacity: 0.85 }}>
            <span className="admin-nav-icon">📱</span>
            <span>Mở App Khách</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px' }}>↗</span>
          </Link>
        </nav>

        {/* Notification & Sound quick toggle */}
        <div style={{ padding: '12px 12px 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
          <button
            type="button"
            onClick={handleTestSoundAndNotification}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              background: notificationActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              border: notificationActive ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.15)',
              color: notificationActive ? '#4ade80' : '#E2E8F0',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{notificationActive ? '🔔' : '🔕'}</span>
            <div style={{ flex: 1 }}>
              <div>{notificationActive ? 'Chuông & Thông Báo: BẬT' : 'Bật Chuông & Thông Báo'}</div>
              <div style={{ fontSize: '10px', opacity: 0.75, fontWeight: 400 }}>
                {notificationActive ? 'Bấm để nghe thử chuông' : 'Bấm để cấp quyền & test'}
              </div>
            </div>
          </button>
        </div>

        <div style={{ padding: '10px 12px 16px' }}>
          <button className="admin-nav-item" onClick={handleLogout} style={{ width: '100%', color: '#FFA8A8' }}>
            <span className="admin-nav-icon">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  )
}
