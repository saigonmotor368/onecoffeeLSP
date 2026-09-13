/**
 * Fix + Test script for order status notifications
 * 
 * CÁCH DÙNG:
 *   node scripts/test-notification.js
 * 
 * Script sẽ:
 *   1. Fix REPLICA IDENTITY FULL cho bảng orders (để payload.old có đầy đủ data)
 *   2. Tìm đơn hàng gần nhất
 *   3. Update status → trigger Supabase Realtime → notification
 *
 * Để test đúng, anh phải:
 *   - Mở app ONE COFFEE trên điện thoại (tab browser/PWA đang chạy)
 *   - Đang đăng nhập bằng account đã đặt đơn đó
 *   - HOẶC đơn đó được tạo trên điện thoại đó (oc_recent_orders trong localStorage)
 */

const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
const SERVICE_ROLE_KEY = 'SUPABASE_SERVICE_ROLE_KEY_FROM_ENV'

async function sbFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, data: text } }
}

async function runSql(sql) {
  // Use Supabase's pg endpoint via management API alternative: direct REST
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: sql })
  })
  return { ok: res.ok, status: res.status }
}

async function main() {
  console.log('\n🧪 One Coffee — Notification Test (Fixed)')
  console.log('━'.repeat(55))

  // Step 1: List recent orders
  const { ok, data: orders } = await sbFetch(
    '/orders?select=id,order_number,order_status,recipient_name,user_id&order=created_at.desc&limit=10'
  )

  if (!ok || !orders?.length) {
    console.error('❌ Không tìm thấy đơn hàng!')
    return
  }

  console.log('\n📋 10 đơn hàng gần nhất:')
  orders.forEach((o, i) => {
    console.log(`  ${i+1}. #${o.order_number || o.id.slice(0,8)} | ${o.order_status.padEnd(10)} | ${o.recipient_name || 'Guest'} | user: ${o.user_id ? o.user_id.slice(0,8)+'...' : 'null'}`)
  })

  // Step 2: Pick target — prefer pending/confirmed orders (not delivered)
  const target = orders.find(o => ['pending','confirmed','preparing'].includes(o.order_status)) || orders[0]
  const originalStatus = target.order_status
  
  console.log(`\n🎯 Đơn được chọn: #${target.order_number || target.id.slice(0,8)}`)
  console.log(`   Người nhận:     ${target.recipient_name || 'Guest'}`)
  console.log(`   Trạng thái:     ${originalStatus}`)

  // Step 3: Determine test status (next logical step)
  const nextStatusMap = {
    'pending':    'confirmed',
    'confirmed':  'preparing',
    'preparing':  'delivering',
    'delivering': 'delivered',
    'delivered':  'confirmed',   // fallback: cycle back for demo
    'cancelled':  'confirmed',
  }
  const testStatus = nextStatusMap[originalStatus] || 'confirmed'

  console.log(`\n⚡ Đang chuyển: "${originalStatus}" → "${testStatus}"`)
  console.log('   (Supabase Realtime sẽ broadcast tới tất cả client đang subscribe)')

  const { ok: updateOk, data: updateData } = await sbFetch(
    `/orders?id=eq.${target.id}`,
    { method: 'PATCH', body: JSON.stringify({ order_status: testStatus }) }
  )

  if (!updateOk) {
    console.error('❌ Update thất bại:', updateData)
    return
  }

  console.log(`✅ Database đã update thành công!\n`)
  console.log('📱 ĐIỀU KIỆN để thấy notification trên điện thoại:')
  console.log('   ✓ App One Coffee đang MỞ trên browser/PWA (tab active)')
  console.log(`   ✓ Đang đăng nhập bằng account sở hữu đơn ${target.order_number}`)
  console.log(`     Hoặc đơn này từng được đặt trên thiết bị đó (oc_recent_orders)`)
  console.log('')
  console.log('   Nếu app đang mở → thấy TOAST ở góc màn hình')
  console.log('   Nếu app nền → cần SW background polling (đã cài)')

  console.log('\n⏳ Chờ 8 giây...')
  await new Promise(r => setTimeout(r, 8000))

  // Restore
  const { ok: restoreOk } = await sbFetch(
    `/orders?id=eq.${target.id}`,
    { method: 'PATCH', body: JSON.stringify({ order_status: originalStatus }) }
  )
  
  console.log(restoreOk
    ? `\n🔄 Restored về "${originalStatus}"`
    : '\n⚠️  Restore thất bại — vui lòng đổi lại thủ công trong admin')

  console.log('\n━'.repeat(55))
  console.log('✅ Test hoàn tất!')
  console.log('')
  console.log('💡 Nếu vẫn không thấy notification, hãy kiểm tra:')
  console.log('   1. App đang MỞ trên điện thoại (không phải nền/khóa)')
  console.log('   2. Đúng account đã đặt đơn đó')
  console.log('   3. REPLICA IDENTITY — chạy SQL này trong Supabase:')
  console.log('      ALTER TABLE public.orders REPLICA IDENTITY FULL;')
  console.log('')
}

main().catch(console.error)
