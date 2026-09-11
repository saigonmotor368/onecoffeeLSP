'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { adminFetch } from '@/lib/admin-api-client'
import {
  playAdminNewOrderSound,
  sendDeviceNotification,
  requestNotificationPermission,
  getNotificationPermission,
} from '@/lib/notifications'
import { formatPrice } from '@/lib/utils'

type RealtimeState = 'connecting' | 'live' | 'fallback'

interface AdminOrderAlert {
  id?: string
  order_number?: string
  final_amount?: number
  recipient_name?: string
}

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
  const [realtimeState, setRealtimeState] = useState<RealtimeState>('connecting')
  const [newOrderNotice, setNewOrderNotice] = useState<AdminOrderAlert | null>(null)
  const noticeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotificationActive(getNotificationPermission() === 'granted')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  // Fetch pending count and listen for new orders
  useEffect(() => {
    const supabase = createClient('admin')
    const seenOrderIds = new Set<string>()
    let hasInitialSnapshot = false
    let active = true

    const notifyNewOrder = (order: AdminOrderAlert) => {
      if (!order.id || seenOrderIds.has(order.id)) return
      seenOrderIds.add(order.id)
      setNewOrderNotice(order)
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = window.setTimeout(() => setNewOrderNotice(null), 10000)
      playAdminNewOrderSound()
      const orderNum = order.order_number || ''
      const amt = order.final_amount ? ` (${formatPrice(order.final_amount)})` : ''
      const name = order.recipient_name ? ` - KH: ${order.recipient_name}` : ''
      sendDeviceNotification(`🔔 CÓ ĐƠN HÀNG MỚI #${orderNum}!`, {
        body: `Đơn mới nhận${amt}${name}. Bấm để xem chi tiết!`,
        tag: `admin-order-${order.id}`,
        data: { url: `/admin/orders/${order.id}` },
      })
    }

    const fetchPending = async (detectNewOrders = false) => {
      let response: Response
      try {
        response = await adminFetch('/api/admin/orders?status=pending&limit=100')
      } catch {
        if (active) setRealtimeState('fallback')
        return
      }

      const result = await response.json()
      const data = (result.orders || []) as AdminOrderAlert[]

      if (!active) return
      if (!response.ok) {
        setRealtimeState('fallback')
        return
      }

      setPendingCount(data.length)
      if (detectNewOrders && hasInitialSnapshot) {
        data.forEach(order => notifyNewOrder(order))
      } else {
        data.forEach(order => {
          if (order.id) seenOrderIds.add(order.id)
        })
      }
      hasInitialSnapshot = true
    }

    void fetchPending()

    const channel = supabase
      .channel('admin-sidebar-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        void fetchPending()
        if (payload.eventType === 'INSERT') {
          notifyNewOrder(payload.new as AdminOrderAlert)
        }
      })
      .subscribe(status => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setRealtimeState('live')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeState('fallback')
        }
      })

    // The industrial network can block WebSockets. Polling keeps the queue and
    // notifications working, while seenOrderIds prevents duplicate alerts.
    const pollingTimer = window.setInterval(() => {
      void fetchPending(true)
    }, 5000)

    return () => {
      active = false
      window.clearInterval(pollingTimer)
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
      void supabase.removeChannel(channel)
    }
  }, [])

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
      {newOrderNotice && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 10000,
            width: 'min(390px, calc(100vw - 36px))',
            padding: '16px 18px',
            borderRadius: 16,
            background: '#166534',
            color: '#FFFFFF',
            boxShadow: '0 18px 45px rgba(20, 83, 45, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 25 }}>🔔</span>
          <button
            type="button"
            onClick={() => router.push(`/admin/orders/${newOrderNotice.id}`)}
            style={{ flex: 1, border: 0, padding: 0, background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
          >
            <strong style={{ display: 'block', fontSize: 14 }}>Có đơn hàng mới #{newOrderNotice.order_number}</strong>
            <span style={{ display: 'block', marginTop: 3, fontSize: 12, opacity: 0.9 }}>
              {newOrderNotice.recipient_name || 'Khách hàng'} · {formatPrice(newOrderNotice.final_amount || 0)} — Bấm để xem
            </span>
          </button>
          <button
            type="button"
            onClick={() => setNewOrderNotice(null)}
            aria-label="Đóng thông báo"
            style={{ border: 0, background: 'transparent', color: '#FFFFFF', fontSize: 16, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile hamburger header */}
      <header className="admin-mobile-header">
        <button
          className="admin-hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <span className="admin-mobile-title">
          <span style={{ fontSize: 18 }}>☕</span> One Coffee Admin
        </span>
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
        <div className="admin-sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="admin-sidebar-logo-icon">☕</span>
            <div>
              <div className="admin-sidebar-logo-text">ONE COFFEE</div>
              <div className="admin-sidebar-logo-sub">LSP Management</div>
            </div>
          </div>
          {mobileOpen && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                width: 32,
                height: 32,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
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
          <div
            title={realtimeState === 'live' ? 'Realtime và đồng bộ dự phòng mỗi 5 giây' : 'Tự động đồng bộ mỗi 5 giây'}
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: realtimeState === 'live' ? '#86EFAC' : '#FDE68A',
              fontSize: 10,
            }}
          >
            <span>{realtimeState === 'live' ? '●' : '◷'}</span>
            <span>{realtimeState === 'live' ? 'Đang đồng bộ đơn hàng' : 'Tự động đồng bộ mỗi 5 giây'}</span>
          </div>
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
