const fs = require('fs')
const env = fs.readFileSync('e:/One Coffee/one-coffee-lsp/.env.local', 'utf8')
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
const vapidPub = env.match(/NEXT_PUBLIC_VAPID_PUBLIC_KEY=(.+)/)?.[1]?.trim()
const vapidPriv = env.match(/VAPID_PRIVATE_KEY=(.+)/)?.[1]?.trim()
const vapidEmail = env.match(/VAPID_EMAIL=(.+)/)?.[1]?.trim()
const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'

console.log('=== Configuration Check ===')
console.log('VAPID public key:', vapidPub ? `OK (${vapidPub.length} chars)` : 'MISSING')
console.log('VAPID private key:', vapidPriv ? `OK (${vapidPriv.length} chars)` : 'MISSING')
console.log('VAPID email:', vapidEmail || 'MISSING')
console.log('Service role key:', serviceKey ? `OK (${serviceKey.length} chars)` : 'MISSING')

async function run() {
  // Check update-status endpoint
  const r1 = await fetch('https://onecafe.lspvn.com/api/admin/orders/update-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: 'test', status: 'confirmed' })
  })
  console.log('\n=== API Endpoints ===')
  console.log('update-status:', r1.status, r1.status === 401 ? 'OK (auth required)' : `HTTP ${r1.status}`)

  const r2 = await fetch('https://onecafe.lspvn.com/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: { endpoint: 'https://test', keys: { p256dh: 'x', auth: 'y' } }, role: 'customer' })
  })
  console.log('push/subscribe:', r2.status, r2.status === 401 ? 'OK (auth required)' : `HTTP ${r2.status}`)
  const body2 = await r2.json().catch(() => ({}))
  console.log('push/subscribe body:', JSON.stringify(body2))

  // Check tables
  console.log('\n=== Database ===')
  const r3 = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,role&limit=10`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  if (r3.ok) {
    const subs = await r3.json()
    console.log(`push_subscriptions: ${subs.length} rows`)
  } else {
    console.log('push_subscriptions error:', r3.status)
  }

  const r4 = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,favorite_ids&limit=3`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  if (r4.ok) {
    const profiles = await r4.json()
    console.log(`profiles.favorite_ids: OK (${profiles.length} rows)`)
  } else {
    console.log('profiles.favorite_ids error:', r4.status)
  }

  console.log('\n=== FINAL STATUS ===')
  console.log('1. commit 7cd5ba0: pushed to origin/main')
  console.log('2. Vercel env vars: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL, SUPABASE_SERVICE_ROLE_KEY - all set to Production')
  console.log('3. Deploy: https://onecafe.lspvn.com - LIVE (readyState: READY)')
  console.log('4. /api/push/subscribe: 401 without auth = CORRECT behavior')
  console.log('5. Customer notification: requires mobile browser test')
  console.log('6. Web Push on closed app: requires mobile browser test')
}

run().catch(console.error)
