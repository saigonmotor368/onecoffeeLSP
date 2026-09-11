import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.authorized) return auth.response

    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // 1. Delete associated order_items first
    await auth.supabase.from('order_items').delete().eq('order_id', orderId)

    // 2. Delete the order itself
    const { error } = await auth.supabase.from('orders').delete().eq('id', orderId)

    if (error) {
      console.error('Delete order error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Server error deleting order:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
