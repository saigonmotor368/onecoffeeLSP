'use client'

import { useEffect, useRef, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function subscribeToPush(role: 'customer' | 'admin'): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported in this browser')
    return false
  }

  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('your_')) {
    console.warn('VAPID public key not configured')
    return false
  }

  try {
    const reg = await navigator.serviceWorker.ready
    
    // Check if already subscribed
    let sub = await reg.pushManager.getSubscription()
    
    if (!sub) {
      // Subscribe with VAPID key
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })
    }

    // Register with our server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        role,
        deviceInfo: navigator.userAgent.slice(0, 200),
      }),
    })

    return true
  } catch (err) {
    console.error('Push subscription error:', err)
    return false
  }
}

/**
 * Hook to request notification permission and subscribe to Web Push.
 * Should be called early in the app lifecycle (e.g., after user interaction or login).
 * 
 * @param role - 'customer' or 'admin'
 * @param enabled - whether to attempt subscription (e.g., only when logged in for admin)
 */
export function usePushSubscription(role: 'customer' | 'admin', enabled = true) {
  const subscribedRef = useRef(false)

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (subscribedRef.current) return
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return

    // Already granted — subscribe immediately
    if (Notification.permission === 'granted') {
      subscribedRef.current = true
      await subscribeToPush(role)
      return
    }

    // Not yet asked — request permission
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        subscribedRef.current = true
        await subscribeToPush(role)
      }
    }
  }, [role])

  useEffect(() => {
    if (!enabled) return
    
    // Small delay to not block first render
    const timer = setTimeout(() => {
      requestPermissionAndSubscribe()
    }, 2000)

    return () => clearTimeout(timer)
  }, [enabled, requestPermissionAndSubscribe])

  return { requestPermissionAndSubscribe }
}
