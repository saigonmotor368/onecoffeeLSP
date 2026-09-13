'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PushRole = 'customer' | 'admin'
export type PushState = 'loading' | 'prompt' | 'enabled' | 'denied' | 'unsupported' | 'install_required' | 'login_required' | 'error'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function supportState(): PushState | null {
  if (typeof window === 'undefined') return 'loading'
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const installed = window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  if (isIos && !installed) return 'install_required'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (!publicKey || publicKey.startsWith('your_')) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return null
}

function publicKeyBytes(base64String: string): Uint8Array<ArrayBuffer> {
  const padded = base64String + '='.repeat((4 - (base64String.length % 4)) % 4)
  const raw = window.atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function currentToken(role: PushRole): Promise<string | null> {
  const { data: { session } } = await createClient(role).auth.getSession()
  return session?.access_token || null
}

async function saveSubscription(role: PushRole): Promise<PushState> {
  const token = await currentToken(role)
  if (!token) return 'login_required'

  const registration = await navigator.serviceWorker.register('/sw.js')
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKeyBytes(publicKey),
    })
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      role,
      deviceInfo: navigator.userAgent.slice(0, 200),
    }),
  })
  if (response.status === 401 || response.status === 403) return 'login_required'
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Không lưu được thiết bị nhận thông báo')
  }
  return 'enabled'
}

/** Remove this device before signing out so another account cannot receive its order updates. */
export async function unsubscribeFromPush(role: PushRole = 'customer'): Promise<void> {
  if (supportState() === 'unsupported' || !('serviceWorker' in navigator)) return
  const token = await currentToken(role)
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  try {
    if (token) {
      const response = await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: subscription.endpoint, role }),
      })
      if (!response.ok) throw new Error('Không xóa được thiết bị nhận thông báo')
    }
  } finally {
    // Invalidating the browser endpoint also prevents a stale server row from
    // notifying someone who has signed out on a shared device.
    await subscription.unsubscribe()
  }
}

/** Permission prompt is only called from a button click; iOS requires that user gesture. */
export function usePushSubscription(role: PushRole, enabled = true) {
  const [state, setState] = useState<PushState>('loading')
  const [error, setError] = useState('')

  const refresh = useCallback(async (): Promise<boolean> => {
    const support = supportState()
    if (support) {
      setState(support)
      return false
    }
    if (Notification.permission !== 'granted') {
      setState('prompt')
      return false
    }
    try {
      setState('loading')
      setError('')
      const result = await saveSubscription(role)
      setState(result)
      return result === 'enabled'
    } catch (cause) {
      console.error('Push registration failed:', cause)
      setError(cause instanceof Error ? cause.message : 'Không đăng ký được thông báo')
      setState('error')
      return false
    }
  }, [role])

  const requestPermissionAndSubscribe = useCallback(async (): Promise<boolean> => {
    const support = supportState()
    if (support) {
      setState(support)
      return false
    }

    // Keep this request before the first await; mobile Safari requires a user gesture.
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'prompt')
        return false
      }
    }
    return refresh()
  }, [refresh])

  useEffect(() => {
    if (!enabled) return
    const initialTimer = setTimeout(() => { void refresh() }, 0)
    const client = createClient(role)
    const { data: listener } = client.auth.onAuthStateChange(() => {
      // Supabase auth callbacks must not synchronously call getSession().
      setTimeout(() => { void refresh() }, 0)
    })
    return () => {
      clearTimeout(initialTimer)
      listener.subscription.unsubscribe()
    }
  }, [enabled, role, refresh])

  return { state, error, refresh, requestPermissionAndSubscribe }
}
