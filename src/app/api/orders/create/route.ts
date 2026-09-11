import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

function normalizeVoucherMoney(value: number | null | undefined) {
  if (!value) return 0
  return value < 1000 ? value * 1000 : value
}

/**
 * POST /api/orders/create
 * Creates a new order with order items using service role key to bypass RLS.
 * Ownership and voucher eligibility are verified from the authenticated session.
 */
export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization')
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập trước khi đặt hàng' }, { status: 401 })
    }

    const supabase = getAdminClient()
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }, { status: 401 })
    }

    const body = await request.json()
    const { order, items } = body

    if (!order || typeof order !== 'object') {
      return NextResponse.json({ error: 'Order data is required' }, { status: 400 })
    }

    const voucherId = typeof order.voucher_id === 'string' ? order.voucher_id : ''
    let voucher: {
      id: string
      is_active: boolean
      expires_at: string | null
      usage_limit: number | null
      used_count: number
      min_order_amount: number
    } | null = null

    if (voucherId) {
      const { data, error } = await supabase
        .from('vouchers')
        .select('id, is_active, expires_at, usage_limit, used_count, min_order_amount')
        .eq('id', voucherId)
        .maybeSingle()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || !data.is_active) {
        return NextResponse.json({ error: 'Voucher không tồn tại hoặc đã bị tắt' }, { status: 400 })
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Voucher đã hết hạn sử dụng' }, { status: 400 })
      }
      if (data.usage_limit !== null && data.used_count >= data.usage_limit) {
        return NextResponse.json({ error: 'Voucher đã hết lượt sử dụng' }, { status: 400 })
      }

      const totalAmount = Number(order.total_amount)
      if (!Number.isFinite(totalAmount) || totalAmount < normalizeVoucherMoney(data.min_order_amount)) {
        return NextResponse.json({ error: 'Đơn hàng chưa đạt giá trị tối thiểu của voucher' }, { status: 400 })
      }

      const { data: previousUsage, error: usageCheckError } = await supabase
        .from('voucher_usage')
        .select('id')
        .eq('voucher_id', data.id)
        .eq('user_id', authData.user.id)
        .maybeSingle()

      if (usageCheckError) return NextResponse.json({ error: usageCheckError.message }, { status: 500 })
      if (previousUsage) {
        return NextResponse.json({ error: 'Tài khoản này đã sử dụng voucher trước đó' }, { status: 409 })
      }
      voucher = data
    }

    // Never trust a user_id supplied by the browser. The authenticated customer
    // owns the order regardless of the request body.
    const authenticatedOrder = { ...order, user_id: authData.user.id }

    // Insert the order
    let { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert(authenticatedOrder)
      .select('id')
      .single()

    if (orderErr) {
      if (voucher) {
        console.error('Order insert error:', orderErr)
        return NextResponse.json({ error: orderErr.message }, { status: 500 })
      }

      // Retry without optional fields
      const fallbackOrder = { ...authenticatedOrder }
      delete fallbackOrder.shipping_fee
      delete fallbackOrder.voucher_id

      const fallbackResult = await supabase
        .from('orders')
        .insert(fallbackOrder)
        .select('id')
        .single()

      if (fallbackResult.error) {
        console.error('Order insert error:', fallbackResult.error)
        return NextResponse.json({ error: fallbackResult.error.message }, { status: 500 })
      }
      orderData = fallbackResult.data
      orderErr = null
    }

    const createdId = orderData?.id

    if (createdId && voucher) {
      const { error: usageError } = await supabase.from('voucher_usage').insert({
        voucher_id: voucher.id,
        user_id: authData.user.id,
        order_id: createdId,
      })

      if (usageError) {
        // Roll back the newly-created order when the same customer redeemed the
        // voucher concurrently, so no unpaid/invalid order is left behind.
        await supabase.from('orders').delete().eq('id', createdId)
        const message = usageError.code === '23505'
          ? 'Tài khoản này đã sử dụng voucher trước đó'
          : usageError.message
        return NextResponse.json({ error: message }, { status: usageError.code === '23505' ? 409 : 500 })
      }

      const { error: countError } = await supabase
        .from('vouchers')
        .update({ used_count: voucher.used_count + 1 })
        .eq('id', voucher.id)
      if (countError) console.error('Voucher usage count update error:', countError)
    }

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
