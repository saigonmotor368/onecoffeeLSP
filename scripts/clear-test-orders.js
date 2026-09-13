const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const env = fs.readFileSync('.env.local', 'utf8')
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function clearTestOrders() {
  console.log('Bắt đầu dọn dẹp các đơn hàng test cũ...')
  
  console.log('1. Xóa chi tiết đơn hàng (order_items)...')
  const { error: itemsErr } = await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (itemsErr) console.error(' Lỗi xóa order_items:', itemsErr.message)
  
  console.log('2. Xóa lịch sử dùng voucher (voucher_usage)...')
  const { error: usageErr } = await supabase.from('voucher_usage').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (usageErr) console.error(' Lỗi xóa voucher_usage:', usageErr.message)
  
  console.log('3. Xóa các đơn hàng (orders)...')
  const { data: orders, error: getErr } = await supabase.from('orders').select('id')
  if (getErr) {
    console.error(' Lỗi lấy orders:', getErr.message)
  } else if (orders && orders.length > 0) {
    const ids = orders.map(o => o.id)
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50)
      const { error: delErr } = await supabase.from('orders').delete().in('id', chunk)
      if (delErr) console.error(` Lỗi xóa orders chunk ${i}:`, delErr.message)
    }
    console.log(` Đã xóa ${orders.length} đơn hàng.`)
  } else {
    console.log(' Không có đơn hàng nào để xóa.')
  }

  console.log('4. Reset số lượt sử dụng voucher...')
  const { error: resetVoucherErr } = await supabase.from('vouchers').update({ used_count: 0 }).gt('used_count', 0)
  if (resetVoucherErr) console.error(' Lỗi reset voucher:', resetVoucherErr.message)
  
  console.log('\n✅ Xong! Database (phần Đơn Hàng) đã sạch sẽ.')
}

clearTestOrders().catch(console.error)
