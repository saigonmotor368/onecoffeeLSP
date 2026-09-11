import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'

function normalizePhone(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '')
}

/**
 * GET /api/admin/customers
 * Returns profiles with real Auth roles and order statistics.
 * GET /api/admin/customers?userId=... returns one customer's order history.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const { supabase } = auth
    const userId = new URL(request.url).searchParams.get('userId')

    if (userId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return NextResponse.json({ error: 'ID người dùng không hợp lệ' }, { status: 400 })
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
      if (!profile) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
      }

      const phone = normalizePhone(profile.phone)
      const orderFilter = phone
        ? `user_id.eq.${userId},recipient_phone.eq.${phone}`
        : `user_id.eq.${userId}`
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .or(orderFilter)
        .order('created_at', { ascending: false })

      if (ordersError) {
        return NextResponse.json({ error: ordersError.message }, { status: 500 })
      }

      const totalSpent = (orders || []).reduce(
        (sum, order) => sum + (order.order_status === 'cancelled' ? 0 : order.final_amount || 0),
        0
      )

      return NextResponse.json({
        customer: profile,
        orders: orders || [],
        stats: {
          total_orders: orders?.length ?? 0,
          total_spent: totalSpent,
          last_order_at: orders?.[0]?.created_at ?? null,
        },
      })
    }

    const [profilesResult, ordersResult, authUsersResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('user_id, recipient_phone, final_amount, created_at, order_status'),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    if (profilesResult.error) {
      return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
    }
    if (ordersResult.error) {
      return NextResponse.json({ error: ordersResult.error.message }, { status: 500 })
    }
    if (authUsersResult.error) {
      return NextResponse.json({ error: authUsersResult.error.message }, { status: 500 })
    }

    const profiles = profilesResult.data || []
    const authUsers = authUsersResult.data.users
    const authById = new Map(authUsers.map(user => [user.id, user]))
    const userIdByPhone = new Map(
      profiles
        .map(profile => [normalizePhone(profile.phone), profile.id] as const)
        .filter(([phone]) => Boolean(phone))
    )

    const orderStats = (ordersResult.data || []).reduce((acc, order) => {
      // Prefer recipient phone for legacy orders that were once attached to the
      // wrong browser session; fall back to user_id for normal linked orders.
      const customerId = userIdByPhone.get(normalizePhone(order.recipient_phone)) || order.user_id
      if (!customerId) return acc
      if (!acc[customerId]) {
        acc[customerId] = { count: 0, total: 0, lastAt: order.created_at }
      }
      acc[customerId].count += 1
      if (order.order_status !== 'cancelled') {
        acc[customerId].total += order.final_amount || 0
      }
      if (order.created_at > acc[customerId].lastAt) {
        acc[customerId].lastAt = order.created_at
      }
      return acc
    }, {} as Record<string, { count: number; total: number; lastAt: string }>)

    const customers = profiles.map(profile => {
      const authUser = authById.get(profile.id)
      const role =
        authUser?.app_metadata?.role === 'admin' ||
        authUser?.user_metadata?.role === 'admin' ||
        authUser?.email === 'admin@onecoffee.vn' ||
        authUser?.email?.startsWith('admin@')
          ? 'admin'
          : 'customer'

      return {
        ...profile,
        role,
        email: authUser?.email ?? null,
        total_orders: orderStats[profile.id]?.count ?? 0,
        total_spent: orderStats[profile.id]?.total ?? 0,
        last_order_at: orderStats[profile.id]?.lastAt ?? null,
      }
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Admin customers API error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ khi tải người dùng' }, { status: 500 })
  }
}
