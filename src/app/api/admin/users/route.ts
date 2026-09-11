import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'

function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

function isValidPhone(phone: string) {
  return phone.length >= 9 && phone.length <= 11
}

function normalizeRole(value: unknown): 'admin' | 'customer' {
  return value === 'admin' ? 'admin' : 'customer'
}

// POST: Create a new user / customer / admin
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const { fullName, phone, password, address, role } = await request.json()
    const cleanName = typeof fullName === 'string' ? fullName.trim() : ''
    const cleanPhone = normalizePhone(phone)
    const cleanPassword = typeof password === 'string' ? password.trim() : ''
    const cleanAddress = typeof address === 'string' ? address.trim() : ''
    const userRole = normalizeRole(role)

    if (!cleanName || !isValidPhone(cleanPhone)) {
      return NextResponse.json({ error: 'Họ tên hoặc số điện thoại không hợp lệ' }, { status: 400 })
    }
    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có tối thiểu 6 ký tự' }, { status: 400 })
    }

    const { supabase } = auth
    const email = `${cleanPhone}@onecoffee.vn`
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: cleanPassword,
      email_confirm: true,
      app_metadata: { role: userRole },
      user_metadata: {
        full_name: cleanName,
        phone: cleanPhone,
        role: userRole,
        default_delivery_address: cleanAddress || null,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Không thể tạo tài khoản' }, { status: 400 })
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      phone: cleanPhone,
      full_name: cleanName,
      default_delivery_address: cleanAddress || null,
      language: 'vi',
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ khi tạo tài khoản' }, { status: 500 })
  }
}

// PUT: Update profile, login phone and role.
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const { userId, fullName, phone, address, role } = await request.json()
    const cleanName = typeof fullName === 'string' ? fullName.trim() : ''
    const cleanPhone = normalizePhone(phone)
    const cleanAddress = typeof address === 'string' ? address.trim() : ''
    const userRole = normalizeRole(role)

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 })
    }
    if (!cleanName || !isValidPhone(cleanPhone)) {
      return NextResponse.json({ error: 'Họ tên hoặc số điện thoại không hợp lệ' }, { status: 400 })
    }
    if (userId === auth.user.id && userRole !== 'admin') {
      return NextResponse.json({ error: 'Không thể tự gỡ quyền Admin của tài khoản đang đăng nhập' }, { status: 400 })
    }

    const { supabase } = auth
    const { data: currentUserData, error: currentUserError } = await supabase.auth.admin.getUserById(userId)
    if (currentUserError || !currentUserData.user) {
      return NextResponse.json({ error: currentUserError?.message || 'Không tìm thấy tài khoản Auth' }, { status: 404 })
    }

    const currentUser = currentUserData.user
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      email: `${cleanPhone}@onecoffee.vn`,
      email_confirm: true,
      app_metadata: { ...currentUser.app_metadata, role: userRole },
      user_metadata: {
        ...currentUser.user_metadata,
        full_name: cleanName,
        phone: cleanPhone,
        role: userRole,
        default_delivery_address: cleanAddress || null,
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      phone: cleanPhone,
      full_name: cleanName,
      default_delivery_address: cleanAddress || null,
      language: 'vi',
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: userId,
        phone: cleanPhone,
        full_name: cleanName,
        default_delivery_address: cleanAddress || null,
        role: userRole,
      },
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ khi cập nhật tài khoản' }, { status: 500 })
  }
}

// DELETE: Delete a user. The current admin cannot delete itself.
export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 })
    }
    if (userId === auth.user.id) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản Admin đang đăng nhập' }, { status: 400 })
    }

    const { supabase } = auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId)
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ khi xóa tài khoản' }, { status: 500 })
  }
}
