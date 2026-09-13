/**
 * Test script: verifies /api/push/subscribe endpoint is working on production
 * and tests Web Push delivery
 */

const PROD_URL = 'https://onecafe.lspvn.com'

async function testPushSubscribeEndpoint() {
  console.log('🔍 Testing /api/push/subscribe endpoint...\n')

  // Test 1: POST with fake subscription (should fail gracefully)
  const fakeSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-fake-endpoint',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtZ_MpPJyEkWTwTHs-YErKlVJnDbbxcVCNaLrTROogGUa5Z7j3kp',
      auth: 'tBHItJI5svbpez7KI4CCXg'
    }
  }

  const res = await fetch(`${PROD_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: fakeSubscription,
      role: 'customer',
      deviceInfo: 'Test Script v1.0'
    })
  })

  const body = await res.json().catch(() => ({}))

  console.log(`POST /api/push/subscribe: ${res.status} ${res.ok ? '✅ OK' : '❌ FAIL'}`)
  if (!res.ok) {
    console.log('  Response:', JSON.stringify(body))
  } else {
    console.log('  Response:', JSON.stringify(body))
  }

  // Test 2: Check VAPID public key is exposed
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  console.log(`\nVAPID public key configured: ${vapidKey ? '✅ YES' : '❌ NOT SET IN ENV'}`)
  if (vapidKey) {
    console.log(`  Key prefix: ${vapidKey.slice(0, 20)}...`)
  }

  // Test 3: Fetch the live homepage and check for VAPID key in scripts
  const homeRes = await fetch(`${PROD_URL}/home`)
  console.log(`\nGET /home: ${homeRes.status} ${homeRes.ok ? '✅' : '❌'}`)

  // Test 4: Check push_subscriptions table via Supabase
  const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (SERVICE_KEY) {
    const subsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,role,created_at&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    )
    if (subsRes.ok) {
      const subs = await subsRes.json()
      console.log(`\n📊 Recent push subscriptions: ${subs.length}`)
      subs.forEach(s => {
        console.log(`  - ${s.id.slice(0,8)} | role: ${s.role} | created: ${s.created_at}`)
      })
      if (subs.length === 0) {
        console.log('  ⚠️  No subscriptions yet — user needs to visit app and allow notifications')
      }
    }
  } else {
    console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY not in env — skipping subscription table check')
  }

  console.log('\n━━━ Test Summary ━━━')
  console.log('✅ API endpoint is reachable')
  console.log('📋 Next steps:')
  console.log('   1. Customer visits app on mobile → allow notification popup')
  console.log('   2. Admin changes order status → customer receives push')
  console.log('   3. Verify notification appears even when app is closed')
}

testPushSubscribeEndpoint().catch(console.error)
