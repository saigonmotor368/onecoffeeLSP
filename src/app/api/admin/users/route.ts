import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

// POST: Create a new user / customer / admin
export async function POST(req: Request) {
  try {
    const { fullName, phone, password, address, role } = await req.json()

    if (!fullName || !phone || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ họ tên, SĐT và mật khẩu' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\s+/g, '')
    const email = `${cleanPhone}@onecoffee.vn`
    const userRole = role === 'admin' ? 'admin' : 'customer'

    const supabase = getAdminClient()

    // Create user in Supabase auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: password.trim(),
      email_confirm: true,
      app_metadata: { role: userRole },
      user_metadata: {
        full_name: fullName.trim(),
        phone: cleanPhone,
        role: userRole,
        default_delivery_address: address?.trim() || null,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Không thể tạo tài khoản' }, { status: 400 })
    }

    // Upsert profile in profiles table
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      phone: cleanPhone,
      full_name: fullName.trim(),
      default_delivery_address: address?.trim() || null,
      language: 'vi',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        phone: cleanPhone,
        full_name: fullName.trim(),
        default_delivery_address: address?.trim() || null,
        role: userRole,
      },
    })
  } catch (err: unknown) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: 'Lỗi máy chủ khi tạo tài khoản' }, { status: 500 })
  }
}

// PUT: Update an existing user / customer
export async function PUT(req: Request) {
  try {
    const { userId, fullName, phone, address, role } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const cleanPhone = phone ? phone.replace(/\s+/g, '') : undefined
    const userRole = role === 'admin' ? 'admin' : 'customer'

    // Update auth metadata
    await supabase.auth.admin.updateUserById(userId, {
      ...(cleanPhone ? { email: `${cleanPhone}@onecoffee.vn` } : {}),
      app_metadata: { role: userRole },
      user_metadata: {
        ...(fullName ? { full_name: fullName.trim() } : {}),
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        role: userRole,
        default_delivery_address: address?.trim() || null,
      },
    })

    // Update profile table
    const updatePayload: Record<string, unknown> = {}
    if (fullName) updatePayload.full_name = fullName.trim()
    if (cleanPhone) updatePayload.phone = cleanPhone
    if (address !== undefined) updatePayload.default_delivery_address = address?.trim() || null

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('profiles').update(updatePayload).eq('id', userId)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Update user error:', err)
    return NextResponse.json({ error: 'Lỗi máy chủ khi cập nhật tài khoản' }, { status: 500 })
  }
}

// DELETE: Delete a user
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1. Delete profile
    await supabase.from('profiles').delete().eq('id', userId)

    // 2. Delete auth user
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Delete user error:', err)
    return NextResponse.json({ error: 'Lỗi máy chủ khi xóa tài khoản' }, { status: 500 })
  }
}
