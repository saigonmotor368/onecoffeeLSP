import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/admin-auth'

type SubscriptionInput = {
  endpoint?: unknown
  keys?: { p256dh?: unknown; auth?: unknown }
}

async function authenticatedUser(req: Request, role: 'customer' | 'admin') {
  if (role === 'admin') {
    const auth = await requireAdmin(req)
    return auth.authorized
      ? { userId: auth.user.id, response: null }
      : { userId: null, response: auth.response }
  }

  const header = req.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return { userId: null, response: NextResponse.json({ error: 'Vui lòng đăng nhập để bật thông báo' }, { status: 401 }) }
  }

  const { data, error } = await getAdminClient().auth.getUser(token)
  if (error || !data.user) {
    return { userId: null, response: NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn' }, { status: 401 }) }
  }
  return { userId: data.user.id, response: null }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const role = body.role === 'admin' ? 'admin' : 'customer'
    const auth = await authenticatedUser(req, role)
    if (auth.response) return auth.response

    const subscription = body.subscription as SubscriptionInput | undefined
    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const authKey = subscription?.keys?.auth
    if (
      typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 2048 ||
      typeof p256dh !== 'string' || !p256dh ||
      typeof authKey !== 'string' || !authKey
    ) {
      return NextResponse.json({ error: 'Thông tin đăng ký thông báo không hợp lệ' }, { status: 400 })
    }

    const { error } = await getAdminClient().from('push_subscriptions').upsert({
      user_id: auth.userId,
      endpoint,
      p256dh,
      auth_key: authKey,
      role,
      device_info: typeof body.deviceInfo === 'string' ? body.deviceInfo.slice(0, 200) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('Push subscription save failed:', error)
      return NextResponse.json({ error: 'Không lưu được thiết bị nhận thông báo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscription failed:', error)
    return NextResponse.json({ error: 'Không đăng ký được thông báo' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const role = body.role === 'admin' ? 'admin' : 'customer'
    const auth = await authenticatedUser(req, role)
    if (auth.response) return auth.response
    if (typeof body.endpoint !== 'string' || !body.endpoint) {
      return NextResponse.json({ error: 'Thiếu thiết bị nhận thông báo' }, { status: 400 })
    }

    const { error } = await getAdminClient().from('push_subscriptions')
      .delete()
      .eq('endpoint', body.endpoint)
      .eq('user_id', auth.userId!)
      .eq('role', role)
    if (error) {
      console.error('Push subscription delete failed:', error)
      return NextResponse.json({ error: 'Không tắt được thông báo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe failed:', error)
    return NextResponse.json({ error: 'Không tắt được thông báo' }, { status: 500 })
  }
}
