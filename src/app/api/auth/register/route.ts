import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone: rawPhone, password, full_name, default_delivery_address } = body

    const cleanPhone = (rawPhone || '').replace(/\s+/g, '').replace(/[^0-9]/g, '')
    const trimmedName = (full_name || '').trim()

    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 11) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ (cần 10 chữ số)' }, { status: 400 })
    }

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json({ error: 'Vui lòng nhập họ và tên đầy đủ' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có tối thiểu 6 ký tự' }, { status: 400 })
    }

    const email = `${cleanPhone}@onecoffee.vn`
    const supabaseAdmin = createAdminClient()

    // 1. Check if profile / phone already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        {
          error: 'Số điện thoại này đã được đăng ký. Quý khách vui lòng chọn Đăng nhập hoặc liên hệ Hotline 0828 687 321 (Ngọc) nếu quên mật khẩu.',
          alreadyRegistered: true,
        },
        { status: 409 }
      )
    }

    // 2. Create user with admin privileges and confirmed email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        phone: cleanPhone,
        full_name: trimmedName,
        default_delivery_address: default_delivery_address || null,
        language: 'vi',
      },
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json(
          {
            error: 'Số điện thoại này đã được đăng ký trong hệ thống. Vui lòng chọn Đăng nhập.',
            alreadyRegistered: true,
          },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 3. Ensure profile row is upserted cleanly
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      phone: cleanPhone,
      full_name: trimmedName,
      default_delivery_address: default_delivery_address || null,
      language: 'vi',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        phone: cleanPhone,
        full_name: trimmedName,
        default_delivery_address: default_delivery_address || null,
      },
      email,
    })
  } catch (err: unknown) {
    console.error('Register API error:', err)
    const msg = err instanceof Error ? err.message : 'Lỗi tạo tài khoản'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
