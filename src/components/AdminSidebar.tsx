'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { playNotificationSound } from '@/lib/utils'

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

  useEffect(() => {
    if (propPendingCount !== undefined) {
      setPendingCount(propPendingCount)
    }
  }, [propPendingCount])

  // Fetch pending count
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: { eventType: string }) => {
        fetchPending()
        if (payload.eventType === 'INSERT') {
          playNotificationSound()
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <>
      {/* Mobile Topbar */}
      <header className="admin-mobile-bar">
        <button
          className="admin-hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
        <div className="admin-mobile-title">
          <span>☕</span> ONE COFFEE ADMIN
        </div>
        {pendingCount > 0 && (
          <Link href="/admin/orders" className="admin-mobile-badge">
            {pendingCount} đơn mới
          </Link>
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

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
          <button className="admin-nav-item" onClick={handleLogout} style={{ width: '100%', color: '#FFA8A8' }}>
            <span className="admin-nav-icon">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  )
}
