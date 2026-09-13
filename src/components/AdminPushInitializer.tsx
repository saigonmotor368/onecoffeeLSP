'use client'

/**
 * AdminPushInitializer — mounts inside AdminAuthGuard
 * Shows a prominent banner prompting admin to enable notifications.
 * On Android/iOS, notification permission REQUIRES user gesture (tap/click).
 * So we cannot silently auto-request — must show a visible button.
 */
import { useEffect, useState, useCallback } from 'react'
import { usePushSubscription } from '@/lib/use-push-subscription'

export default function AdminPushInitializer() {
  const { state, requestPermissionAndSubscribe } = usePushSubscription('admin', true)
  const [dismissed, setDismissed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  // Check if already dismissed this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const d = sessionStorage.getItem('admin_push_dismissed')
      if (d === 'true') setDismissed(true)
    }
  }, [])

  const handleEnable = useCallback(async () => {
    setSubscribing(true)
    try {
      const ok = await requestPermissionAndSubscribe()
      if (ok) {
        setDismissed(true)
        sessionStorage.setItem('admin_push_dismissed', 'true')
      }
    } catch {
      // ignore
    } finally {
      setSubscribing(false)
    }
  }, [requestPermissionAndSubscribe])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('admin_push_dismissed', 'true')
  }

  // Don't show if: already enabled, denied, unsupported, or user dismissed
  if (state === 'enabled' || state === 'denied' || state === 'unsupported' || state === 'loading' || dismissed) {
    return null
  }

  // Show nothing on login page
  if (typeof window !== 'undefined' && window.location.pathname === '/admin/login') {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
      color: '#fff',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 4px 24px rgba(220, 38, 38, 0.4)',
      animation: 'admin-push-slide-in 0.4s ease-out',
    }}>
      <style>{`
        @keyframes admin-push-slide-in {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes admin-push-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>

      <span style={{ fontSize: '28px', animation: 'admin-push-pulse 1s infinite' }}>🔔</span>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '2px' }}>
          ⚠️ Chưa bật thông báo đơn hàng!
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.3 }}>
          Bật ngay để nhận thông báo khi có đơn mới — kể cả khi đóng app.
        </div>
      </div>

      <button
        onClick={handleEnable}
        disabled={subscribing}
        style={{
          background: '#fff',
          color: '#dc2626',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 800,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          opacity: subscribing ? 0.7 : 1,
        }}
      >
        {subscribing ? '...' : 'BẬT NGAY'}
      </button>

      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
