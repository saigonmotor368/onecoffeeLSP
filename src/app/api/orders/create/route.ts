import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/orders/create
 * Creates a new order with order items using service role key to bypass RLS.
 * The user_id is passed explicitly from the client.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order, items } = body

    if (!order) {
      return NextResponse.json({ error: 'Order data is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Insert the order
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert(order)
      .select('id')
      .single()

    if (orderErr) {
      // Retry without optional fields
      const fallbackOrder = { ...order }
      delete fallbackOrder.shipping_fee
      delete fallbackOrder.voucher_id

      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('orders')
        .insert(fallbackOrder)
        .select('id')
        .single()

      if (fallbackErr) {
        console.error('Order insert error:', fallbackErr)
        return NextResponse.json({ error: fallbackErr.message }, { status: 500 })
      }

      const createdId = fallbackData?.id

      // Insert items if present
      if (createdId && items && items.length > 0) {
        const payloadItems = items.map((item: Record<string, unknown>) => ({ ...item, order_id: createdId }))
        await supabase.from('order_items').insert(payloadItems)
      }

      return NextResponse.json({ success: true, orderId: createdId })
    }

    const createdId = orderData?.id

    // Insert order items
    if (createdId && items && items.length > 0) {
      const payloadItems = items.map((item: Record<string, unknown>) => ({ ...item, order_id: createdId }))
      const { error: itemsErr } = await supabase.from('order_items').insert(payloadItems)
      if (itemsErr) {
        console.error('Order items insert error (non-fatal):', itemsErr)
      }
    }

    return NextResponse.json({ success: true, orderId: createdId })
  } catch (err) {
    console.error('Create order API error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
