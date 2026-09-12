/**
 * One Coffee LSP — Telegram Bot Notification System
 * Sends rich order notifications to the admin Telegram group.
 *
 * Setup:
 *  1. Create bot via @BotFather → get BOT_TOKEN
 *  2. Add bot to admin group → get CHAT_ID (negative number like -1001234567890)
 *  3. Set env vars in Vercel: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

const TELEGRAM_API = 'https://api.telegram.org'

function getTelegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

/**
 * Format Vietnamese price
 */
function fmtPrice(amount: number | null | undefined): string {
  if (!amount) return '—'
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

/**
 * Format order payment method
 */
function fmtPayment(method: string | null | undefined): string {
  const map: Record<string, string> = {
    cash: '💵 Tiền mặt',
    qr: '📱 QR Code',
    transfer: '🏦 Chuyển khoản',
  }
  return map[method ?? ''] ?? method ?? 'Chưa rõ'
}

/**
 * Escape characters special to Telegram MarkdownV2
 */
function esc(text: string | null | undefined): string {
  if (!text) return ''
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

export interface TelegramOrderPayload {
  orderId: string
  orderNumber: string | null
  recipientName: string | null
  recipientPhone: string | null
  deliveryAddress: string | null
  totalAmount: number | null
  discountAmount: number | null
  shippingFee: number | null
  finalAmount: number | null
  paymentMethod: string | null
  notes: string | null
  items: Array<{
    name: string
    name_en?: string | null
    quantity: number
    unit_price: number
    options?: string | null
  }>
  voucherCode?: string | null
}

/**
 * Build a rich Telegram MarkdownV2 message for a new order
 */
function buildOrderMessage(order: TelegramOrderPayload): string {
  const orderUrl = `https://onecafe.lspvn.com/admin/orders/${order.orderId}`
  const orderNum = esc(order.orderNumber || order.orderId.slice(0, 8).toUpperCase())

  // Items list
  const itemLines = (order.items || [])
    .map(item => {
      const opts = item.options ? ` \\(${esc(item.options)}\\)` : ''
      return `  • ${esc(item.name)}${opts} × ${item.quantity} — ${esc(fmtPrice(item.unit_price * item.quantity))}`
    })
    .join('\n')

  // Price breakdown
  const hasDiscount = order.discountAmount && order.discountAmount > 0
  const hasShipping = order.shippingFee && order.shippingFee > 0
  const hasFinal = order.finalAmount && order.finalAmount !== order.totalAmount

  let priceBlock = `💰 Tạm tính: *${esc(fmtPrice(order.totalAmount))}*`
  if (hasDiscount) {
    priceBlock += `\n🎟 Giảm giá: \\-${esc(fmtPrice(order.discountAmount))}`
    if (order.voucherCode) priceBlock += ` \\(${esc(order.voucherCode)}\\)`
  }
  if (hasShipping) {
    priceBlock += `\n🛵 Phí giao: ${esc(fmtPrice(order.shippingFee))}`
  }
  if (hasFinal) {
    priceBlock += `\n💳 *TỔNG THANH TOÁN: ${esc(fmtPrice(order.finalAmount))}*`
  }

  const notesLine = order.notes ? `\n📝 Ghi chú: _${esc(order.notes)}_` : ''

  return [
    `🔔 *ĐƠN HÀNG MỚI \\#${orderNum}*`,
    ``,
    `👤 *${esc(order.recipientName || 'Khách')}*${order.recipientPhone ? ` — ${esc(order.recipientPhone)}` : ''}`,
    `📍 ${esc(order.deliveryAddress || 'Chưa có địa chỉ')}`,
    ``,
    `📦 *CHI TIẾT ĐƠN:*`,
    itemLines || '  \\(không có sản phẩm\\)',
    ``,
    priceBlock,
    ``,
    `💳 Thanh toán: ${esc(fmtPayment(order.paymentMethod))}${notesLine}`,
    ``,
    `[👉 Xem \\& Xử lý Đơn](${orderUrl})`,
  ].join('\n')
}

/**
 * Send a message to the Telegram admin group
 */
async function sendTelegramMessage(text: string, parseMode: 'MarkdownV2' | 'HTML' = 'MarkdownV2'): Promise<boolean> {
  const config = getTelegramConfig()
  if (!config) {
    // Telegram not configured — silently skip
    return false
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
        disable_notification: false,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[Telegram] sendMessage failed:', res.status, err)
      return false
    }
    return true
  } catch (err) {
    console.error('[Telegram] sendMessage error:', err)
    return false
  }
}

/**
 * Notify admin Telegram group about a new order.
 * Called server-side after successful order creation.
 */
export async function notifyNewOrder(order: TelegramOrderPayload): Promise<void> {
  const message = buildOrderMessage(order)
  await sendTelegramMessage(message)
}

/**
 * Notify admin about order status change
 */
export async function notifyOrderStatusChange(
  orderNumber: string,
  orderId: string,
  oldStatus: string,
  newStatus: string,
  customerName?: string | null,
): Promise<void> {
  const statusMap: Record<string, string> = {
    pending:    '⏳ Chờ xác nhận',
    confirmed:  '✅ Đã xác nhận',
    preparing:  '👨‍🍳 Đang pha chế',
    delivering: '🛵 Đang giao',
    delivered:  '🎉 Đã giao',
    cancelled:  '❌ Đã huỷ',
  }
  const orderUrl = `https://onecafe.lspvn.com/admin/orders/${orderId}`
  const num = esc(orderNumber || orderId.slice(0, 8).toUpperCase())
  const customer = customerName ? ` — ${esc(customerName)}` : ''
  const old = esc(statusMap[oldStatus] || oldStatus)
  const next = esc(statusMap[newStatus] || newStatus)

  const message = [
    `📋 *Cập nhật \\#${num}*${customer}`,
    `${old} → *${next}*`,
    `[Xem đơn](${orderUrl})`,
  ].join('\n')

  await sendTelegramMessage(message)
}

/**
 * Send a simple test message to verify bot config
 */
export async function sendTelegramTestMessage(): Promise<{ ok: boolean; error?: string }> {
  const config = getTelegramConfig()
  if (!config) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được cấu hình trong Vercel env' }
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: '✅ *One Coffee LSP Bot hoạt động tốt\\!*\nThông báo đơn hàng mới sẽ được gửi vào đây tự động\\.',
        parse_mode: 'MarkdownV2',
      }),
    })
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
