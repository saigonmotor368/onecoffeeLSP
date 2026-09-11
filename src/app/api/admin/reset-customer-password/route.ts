import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 })
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
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
