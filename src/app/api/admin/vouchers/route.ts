import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import type { Database } from '@/lib/supabase/database.types'

type VoucherRow = Database['public']['Tables']['vouchers']['Row']
type VoucherInsert = Database['public']['Tables']['vouchers']['Insert']

const CODE_PATTERN = /^[A-Z0-9_-]+$/

function asInteger(value: unknown, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : Number.NaN
}

function nullableInteger(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  return asInteger(value)
}

function parseVoucherPayload(input: Record<string, unknown>, current?: VoucherRow) {
  const code = String(input.code ?? current?.code ?? '').trim().toUpperCase()
  const type = input.type ?? current?.type
  const value = asInteger(input.value, current?.value)
  const minOrderAmount = asInteger(input.min_order_amount, current?.min_order_amount ?? 0)
  const maxDiscount = input.max_discount === undefined
    ? current?.max_discount ?? null
    : nullableInteger(input.max_discount)
  const usageLimit = input.usage_limit === undefined
    ? current?.usage_limit ?? null
    : nullableInteger(input.usage_limit)
  const isActive = input.is_active === undefined ? current?.is_active ?? true : input.is_active
  const expiresInput = input.expires_at === undefined ? current?.expires_at ?? null : input.expires_at
  const expiresAt = expiresInput ? new Date(String(expiresInput)) : null

  if (!code || code.length > 50 || !CODE_PATTERN.test(code)) {
    return { error: 'Mã voucher chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới (tối đa 50 ký tự)' }
  }
  if (type !== 'percent' && type !== 'fixed') {
    return { error: 'Loại voucher không hợp lệ' }
  }
  if (!Number.isInteger(value) || value <= 0) {
    return { error: 'Giá trị giảm phải là số nguyên lớn hơn 0' }
  }
  if (type === 'percent' && value > 100) {
    return { error: 'Mức giảm phần trăm không được vượt quá 100%' }
  }
  if (!Number.isInteger(minOrderAmount) || minOrderAmount < 0) {
    return { error: 'Giá trị đơn tối thiểu không hợp lệ' }
  }
  if (maxDiscount !== null && (!Number.isInteger(maxDiscount) || maxDiscount <= 0)) {
    return { error: 'Mức giảm tối đa phải lớn hơn 0 hoặc để trống' }
  }
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) {
    return { error: 'Giới hạn lượt dùng phải lớn hơn 0 hoặc để trống' }
  }
  if (current && usageLimit !== null && usageLimit < current.used_count) {
    return { error: `Giới hạn lượt dùng không thể thấp hơn số lượt đã dùng (${current.used_count})` }
  }
  if (typeof isActive !== 'boolean') {
    return { error: 'Trạng thái voucher không hợp lệ' }
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { error: 'Hạn sử dụng không hợp lệ' }
  }

  const payload: VoucherInsert = {
    code,
    type,
    value,
    min_order_amount: minOrderAmount,
    max_discount: type === 'percent' ? maxDiscount : null,
    usage_limit: usageLimit,
    expires_at: expiresAt?.toISOString() ?? null,
    is_active: isActive,
  }

  return { payload }
}

function databaseError(error: { code?: string; message: string }) {
  if (error.code === '23505') {
    return NextResponse.json({ error: 'Mã voucher này đã tồn tại' }, { status: 409 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const { data, error } = await auth.supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return databaseError(error)

  return NextResponse.json(
    { vouchers: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json() as Record<string, unknown>
    const parsed = parseVoucherPayload(body)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('vouchers')
      .insert(parsed.payload)
      .select('*')
      .single()

    if (error) return databaseError(error)
    return NextResponse.json({ success: true, voucher: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Dữ liệu voucher không hợp lệ' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json() as Record<string, unknown>
    const id = String(body.id ?? '')
    if (!id) return NextResponse.json({ error: 'Thiếu ID voucher' }, { status: 400 })

    const { data: current, error: currentError } = await auth.supabase
      .from('vouchers')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (currentError) return databaseError(currentError)
    if (!current) return NextResponse.json({ error: 'Không tìm thấy voucher' }, { status: 404 })

    const parsed = parseVoucherPayload(body, current)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('vouchers')
      .update(parsed.payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return databaseError(error)
    return NextResponse.json({ success: true, voucher: data })
  } catch {
    return NextResponse.json({ error: 'Dữ liệu voucher không hợp lệ' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu ID voucher' }, { status: 400 })

  const [ordersResult, usageResult] = await Promise.all([
    auth.supabase.from('orders').select('id', { count: 'exact', head: true }).eq('voucher_id', id),
    auth.supabase.from('voucher_usage').select('id', { count: 'exact', head: true }).eq('voucher_id', id),
  ])

  if (ordersResult.error) return databaseError(ordersResult.error)
  if (usageResult.error) return databaseError(usageResult.error)
  if ((ordersResult.count ?? 0) > 0 || (usageResult.count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Voucher đã có lịch sử sử dụng nên không thể xóa. Hãy tắt voucher để giữ đúng dữ liệu đơn hàng.' },
      { status: 409 }
    )
  }

  const { data, error } = await auth.supabase
    .from('vouchers')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return databaseError(error)
  if (!data) return NextResponse.json({ error: 'Không tìm thấy voucher' }, { status: 404 })

  return NextResponse.json({ success: true })
}
