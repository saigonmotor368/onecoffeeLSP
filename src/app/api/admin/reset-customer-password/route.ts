import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const { userId, newPassword } = await request.json()
    const cleanPassword = typeof newPassword === 'string' ? newPassword.trim() : ''

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 })
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' }, { status: 400 })
    }

    const { data, error } = await auth.supabase.auth.admin.updateUserById(userId, {
      password: cleanPassword,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Đặt lại mật khẩu cho khách hàng thành công!',
      userId: data.user.id,
    })
  } catch (err: unknown) {
    console.error('Reset password API error:', err)
    const msg = err instanceof Error ? err.message : 'Lỗi đặt lại mật khẩu'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
