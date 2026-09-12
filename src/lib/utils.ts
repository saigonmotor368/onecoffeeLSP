// Normalize price to VND (e.g. 48 -> 48000, 48000 -> 48000)
export function toVndPrice(price: number | null | undefined): number {
  if (!price || isNaN(price)) return 0
  return price < 1000 ? price * 1000 : Math.round(price)
}

// Format price in Vietnamese style: 48.000đ
export function formatPrice(amount: number | null | undefined): string {
  const vnd = toVndPrice(amount)
  return new Intl.NumberFormat('vi-VN').format(vnd) + 'đ'
}

// Generate order number: OC20260911-001
export function generateOrderNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0')
  return `OC${date}-${rand}`
}

// Get greeting by hour
export function getGreeting(lang: 'vi' | 'en'): string {
  const hour = new Date().getHours()
  if (lang === 'vi') {
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  } else {
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }
}

// VietQR URL builder
export function buildVietQRUrl({
  amount,
  orderNumber,
  bankId = process.env.NEXT_PUBLIC_BANK_ID ?? 'ICB',
  accountNo = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '101880305162',
  accountName = process.env.NEXT_PUBLIC_ACCOUNT_NAME ?? 'HUYNH THI BICH NGOC',
}: {
  amount: number
  orderNumber: string
  bankId?: string
  accountNo?: string
  accountName?: string
}): string {
  const addInfo = encodeURIComponent(orderNumber)
  const name = encodeURIComponent(accountName)
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${name}`
}

// Validate Vietnamese phone number
export function isValidPhone(phone: string): boolean {
  return /^(0|\+84)[3-9]\d{8}$/.test(phone.trim())
}

// Status label
export function getStatusLabel(status: string, lang: 'vi' | 'en'): string {
  const map: Record<string, Record<string, string>> = {
    pending:    { vi: 'Chờ xác nhận', en: 'Pending' },
    confirmed:  { vi: 'Đã xác nhận',  en: 'Confirmed' },
    preparing:  { vi: 'Đang chuẩn bị', en: 'Preparing' },
    delivering: { vi: 'Đang giao',    en: 'Out for Delivery' },
    delivered:  { vi: 'Đã giao',      en: 'Delivered' },
    cancelled:  { vi: 'Đã hủy',       en: 'Cancelled' },
  }
  return map[status]?.[lang] ?? status
}

// Time relative
export function timeAgo(dateStr: string, lang: 'vi' | 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return lang === 'vi' ? 'Vừa xong' : 'Just now'
  if (mins < 60) return lang === 'vi' ? `${mins} phút trước` : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return lang === 'vi' ? `${hrs} giờ trước` : `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return lang === 'vi' ? `${days} ngày trước` : `${days}d ago`
}

// Pleasant Web Audio API ding-dong notification chime (no external audio files needed)
export function playNotificationSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.2, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    // First tone (E5: ~659Hz)
    playTone(659.25, now, 0.25)
    // Second tone (A5: 880Hz)
    playTone(880, now + 0.15, 0.4)
  } catch {
    // AudioContext blocked or not supported
  }
}

