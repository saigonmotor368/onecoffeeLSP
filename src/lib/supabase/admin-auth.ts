import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getAdminClient } from './admin'

type AdminClient = ReturnType<typeof getAdminClient>

type AdminAuthResult =
  | { authorized: true; supabase: AdminClient; user: User }
  | { authorized: false; response: NextResponse }

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''

  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Phiên quản trị không hợp lệ' }, { status: 401 }),
    }
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  const user = data.user

  if (error || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Phiên quản trị đã hết hạn' }, { status: 401 }),
    }
  }

  const isAdmin =
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin' ||
    user.email === 'admin@onecoffee.vn' ||
    user.email?.startsWith('admin@')

  if (!isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Tài khoản không có quyền quản trị' }, { status: 403 }),
    }
  }

  return { authorized: true, supabase, user }
}
