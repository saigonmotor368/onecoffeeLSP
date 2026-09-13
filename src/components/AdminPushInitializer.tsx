'use client'

/**
 * AdminPushInitializer — mounts inside AdminAuthGuard
 * Silently requests notification permission and subscribes with role='admin'
 * so server can send Web Push when new orders arrive.
 */
import { useEffect, useRef } from 'react'
import { usePushSubscription } from '@/lib/use-push-subscription'

export default function AdminPushInitializer() {
  const { state, requestPermissionAndSubscribe } = usePushSubscription('admin', true)
  const asked = useRef(false)

  useEffect(() => {
    // Auto-request permission as soon as admin is logged in (only once per session)
    if (asked.current) return
    if (state === 'loading') return
    if (state === 'enabled') return
    if (state === 'denied' || state === 'unsupported' || state === 'install_required') return

    asked.current = true

    // Small delay so the page is fully rendered first
    const t = setTimeout(() => {
      requestPermissionAndSubscribe().catch(() => {})
    }, 1500)

    return () => clearTimeout(t)
  }, [state, requestPermissionAndSubscribe])

  // Renders nothing — purely functional
  return null
}
