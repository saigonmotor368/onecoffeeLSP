import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.authorized) return auth.response

    const { orderId, status, paymentStatus } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Build the update payload
    const updatePayload: Record<string, string> = {}

    if (status !== undefined) {
      const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled']
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }
      updatePayload.order_status = status
    }

    if (paymentStatus !== undefined) {
      const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed']
      if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status value' }, { status: 400 })
      }
      updatePayload.payment_status = paymentStatus
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await auth.supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)

    if (error) {
      console.error('Update order error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Server error updating order:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
