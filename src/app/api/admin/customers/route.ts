import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/customers
 * Returns all customer profiles with order stats.
 * Uses service role key to bypass RLS.
 */
export async function GET() {
  try {
    const supabase = getAdminClient()

    const [{ data: profiles, error: pError }, { data: orders }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('user_id, final_amount, created_at, order_status'),
    ])

    if (pError) {
      console.error('Error loading profiles:', pError)
      return NextResponse.json({ error: pError.message }, { status: 500 })
    }

    const orderStats = (orders || []).reduce((acc, order) => {
      if (!order.user_id) return acc
      if (!acc[order.user_id]) {
        acc[order.user_id] = { count: 0, total: 0, lastAt: order.created_at }
      }
      acc[order.user_id].count += 1
      if (order.order_status !== 'cancelled') {
        acc[order.user_id].total += order.final_amount || 0
      }
      if (order.created_at > acc[order.user_id].lastAt) {
        acc[order.user_id].lastAt = order.created_at
      }
      return acc
    }, {} as Record<string, { count: number; total: number; lastAt: string }>)

    const enhanced = (profiles || []).map(c => ({
      ...c,
      total_orders: orderStats[c.id]?.count ?? 0,
      total_spent: orderStats[c.id]?.total ?? 0,
      last_order_at: orderStats[c.id]?.lastAt ?? null,
    }))

    return NextResponse.json({ customers: enhanced })
  } catch (err) {
    console.error('Admin customers API error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
