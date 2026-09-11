import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'

const ORDER_STATUSES = new Set([
  'pending',
  'confirmed',
  'preparing',
  'delivering',
  'delivered',
  'cancelled',
])

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')

    if (orderId) {
      if (!isUuid(orderId)) {
        return NextResponse.json({ error: 'ID đơn hàng không hợp lệ' }, { status: 400 })
      }

      const [orderResult, itemsResult] = await Promise.all([
        auth.supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
        auth.supabase.from('order_items').select('*').eq('order_id', orderId),
      ])

      if (orderResult.error) {
        return NextResponse.json({ error: orderResult.error.message }, { status: 500 })
      }
      if (!orderResult.data) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
      }
      if (itemsResult.error) {
        return NextResponse.json({ error: itemsResult.error.message }, { status: 500 })
      }

      return NextResponse.json({ order: orderResult.data, items: itemsResult.data || [] })
    }

    const status = searchParams.get('status')
    if (status && !ORDER_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Trạng thái đơn hàng không hợp lệ' }, { status: 400 })
    }

    const requestedLimit = Number.parseInt(searchParams.get('limit') || '200', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 200

    let query = auth.supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('order_status', status)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data || [] })
  } catch (error) {
    console.error('Admin orders API error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ khi tải đơn hàng' }, { status: 500 })
  }
}
