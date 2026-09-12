import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { sendTelegramTestMessage } from '@/lib/telegram'

/**
 * POST /api/admin/test-telegram
 * Sends a test message to the configured Telegram group.
 * Admin-only.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const result = await sendTelegramTestMessage()
  if (result.ok) {
    return NextResponse.json({ success: true, message: 'Đã gửi tin test vào Telegram thành công!' })
  }
  return NextResponse.json({ success: false, error: result.error }, { status: 400 })
}
