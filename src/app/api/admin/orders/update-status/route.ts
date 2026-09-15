import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { notifyCustomerOrderStatus } from '@/lib/push'

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.authorized) return auth.response

    const { orderId, status, paymentStatus, statusNote } = await req.json()

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

    if (statusNote !== undefined) {
      updatePayload.status_note = statusNote
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: previousOrder, error: readError } = await auth.supabase
      .from('orders')
      .select('order_status')
      .eq('id', orderId)
      .single()
    if (readError || !previousOrder) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
    }

    const { data: order, error } = await auth.supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select('order_number, user_id, recipient_name, final_amount, order_status')
      .single()

    if (error) {
      console.error('Update order error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Await delivery: an unawaited promise can be frozen after a serverless response.
    if (status !== undefined && status !== previousOrder.order_status && order) {
      try {
        const result = await notifyCustomerOrderStatus(
          orderId,
          order.order_number,
          status,
          order.recipient_name,
          order.final_amount,
          order.user_id
        )
        console.info('Customer order push result:', { orderId, status, ...result })
      } catch (pushError) {
        // The order is already saved; push failure must not roll it back.
        console.error('Customer order push failed:', { orderId, status, pushError })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Server error updating order:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
