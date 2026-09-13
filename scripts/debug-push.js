const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

async function testAdminPush() {
  const env = fs.readFileSync('.env.local', 'utf8')
  
  const supUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
  const supKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
  const pubKey = env.match(/NEXT_PUBLIC_VAPID_PUBLIC_KEY=(.+)/)?.[1]?.trim()
  const privKey = env.match(/VAPID_PRIVATE_KEY=(.+)/)?.[1]?.trim()
  const email = env.match(/VAPID_EMAIL=(.+)/)?.[1]?.trim() || 'mailto:admin@onecoffee.lspvn.com'
  
  if (!pubKey || !privKey) {
    console.error('Missing VAPID keys')
    return
  }
  
  webpush.setVapidDetails(email, pubKey, privKey)
  
  const supabase = createClient(supUrl, supKey)
  
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('role', 'admin')
  
  if (error) {
    console.error('DB error', error)
    return
  }
  
  console.log(`Found ${subs.length} admin subscriptions`)
  
  let sent = 0
  let failed = 0
  
  for (const sub of subs) {
    try {
      console.log(`Sending to ${sub.endpoint.slice(0, 50)}...`)
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        },
        JSON.stringify({
          title: '‼️ TEST ĐƠN MỚI ‼️',
          body: 'This is a test notification for admin',
          icon: '/icon-admin-192.png',
          badge: '/icon-admin-192.png',
          tag: `admin-test-${Date.now()}`,
          url: `/admin/orders`,
          role: 'admin',
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 1000, 500],
        })
      )
      console.log('Success!')
      sent++
    } catch (err) {
      console.error('Failed to send:', err.statusCode || err.message)
      failed++
    }
  }
  
  console.log(`Result: ${sent} sent, ${failed} failed`)
}

testAdminPush()
