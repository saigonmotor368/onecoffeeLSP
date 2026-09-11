// Notification & Audio Chime System for One Coffee LSP
// Provides real-time sounds and device push/system notifications for Customer & Admin

let globalAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!globalAudioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass()
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {})
    }
    return globalAudioCtx
  } catch {
    return null
  }
}

// Auto-unlock AudioContext on first user interaction
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    window.removeEventListener('click', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('click', unlock, { once: true, passive: true })
  window.addEventListener('touchstart', unlock, { once: true, passive: true })
}

/**
 * Play a synthesized tone with smooth attack and decay
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.25
) {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + duration)
  } catch {
    // ignore
  }
}

/**
 * 1. Customer: Order Placed Successfully
 * Joyous 3-tone ascending chord (C5 -> E5 -> G5)
 */
export function playOrderPlacedSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  playTone(ctx, 523.25, now, 0.18, 'sine', 0.25)         // C5
  playTone(ctx, 659.25, now + 0.12, 0.18, 'sine', 0.25)  // E5
  playTone(ctx, 783.99, now + 0.24, 0.45, 'sine', 0.3)   // G5
}

/**
 * 2. Customer: Drink is Being Delivered (Shipper En Route)
 * Cheerful doorbell / arrival chime (A5 -> D6)
 */
export function playDeliveringSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  playTone(ctx, 880.0, now, 0.22, 'sine', 0.3)          // A5
  playTone(ctx, 1174.66, now + 0.16, 0.5, 'sine', 0.32) // D6
}

/**
 * 3. Customer: Order Completed / Delivered
 * Celebratory 4-note ascending fanfare
 */
export function playCompletedSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  playTone(ctx, 523.25, now, 0.15, 'triangle', 0.25)      // C5
  playTone(ctx, 659.25, now + 0.12, 0.15, 'triangle', 0.25) // E5
  playTone(ctx, 783.99, now + 0.24, 0.18, 'triangle', 0.28) // G5
  playTone(ctx, 1046.5, now + 0.38, 0.55, 'triangle', 0.32) // C6
}

/**
 * 4. Admin: New Order Received
 * Loud, distinct repeating chime (E5 -> A5 -> E5 -> A5) to alert staff even from a distance
 */
export function playAdminNewOrderSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  // First ding-dong
  playTone(ctx, 659.25, now, 0.2, 'sine', 0.35)
  playTone(ctx, 880.0, now + 0.15, 0.3, 'sine', 0.4)
  // Second ding-dong for attention
  playTone(ctx, 659.25, now + 0.45, 0.2, 'sine', 0.35)
  playTone(ctx, 880.0, now + 0.6, 0.45, 'sine', 0.45)
}

/**
 * Legacy sound alias
 */
export function playNotificationSound() {
  playAdminNewOrderSound()
}

// ─────────────────────────────────────────────────────────────
// Web Notifications (Desktop & Mobile Push / System Alerts)
// ─────────────────────────────────────────────────────────────

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  try {
    if (Notification.permission === 'granted') return true
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  } catch {
    return false
  }
}

export interface DeviceNotificationOptions {
  body?: string
  icon?: string
  tag?: string
  badge?: string
  data?: Record<string, unknown>
  vibrate?: number[]
}

/**
 * Sends a native system notification to mobile phone or desktop
 */
export async function sendDeviceNotification(
  title: string,
  options?: DeviceNotificationOptions
) {
  if (typeof window === 'undefined' || !isNotificationSupported()) return

  if (Notification.permission !== 'granted') {
    return
  }

  const defaultIcon = '/logo-192.png'
  const defaultBadge = '/logo-circle.png'
  const vibratePattern = options?.vibrate || [200, 100, 200]

  // Try using ServiceWorkerRegistration first (most reliable on mobile & PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && 'showNotification' in reg) {
        await (reg as any).showNotification(title, {
          icon: options?.icon || defaultIcon,
          badge: options?.badge || defaultBadge,
          body: options?.body || '',
          tag: options?.tag,
          data: options?.data,
          vibrate: vibratePattern,
        })
        return
      }
    } catch {
      // fallback to new Notification
    }
  }

  // Fallback to standard Window Notification
  try {
    new Notification(title, {
      icon: options?.icon || defaultIcon,
      badge: options?.badge || defaultBadge,
      body: options?.body || '',
      tag: options?.tag,
      data: options?.data,
    })
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────
// Recent Orders Storage Helpers (Customer device tracking)
// ─────────────────────────────────────────────────────────────

const RECENT_ORDERS_KEY = 'oc_recent_orders'

export function addRecentOrder(orderId: string, orderNumber?: string) {
  if (typeof window === 'undefined') return
  try {
    const list = getRecentOrders()
    const item = { id: orderId, number: orderNumber || orderId, createdAt: Date.now() }
    const filtered = list.filter(o => o.id !== orderId)
    filtered.unshift(item)
    // Keep last 10 orders
    localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(filtered.slice(0, 10)))
  } catch {
    // ignore
  }
}

export function getRecentOrders(): Array<{ id: string; number: string; createdAt: number }> {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_ORDERS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}
