const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
const KEY = 'SUPABASE_SERVICE_ROLE_KEY_FROM_ENV'

async function checkRealtime() {
  console.log('🔍 Kiểm tra Supabase Realtime publication...\n')

  // Check via SQL
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename"
      })
    })
    const data = await res.json()
    console.log('Realtime tables:', JSON.stringify(data))
  } catch(e) {
    console.log('SQL check error:', e.message)
  }

  // Try direct realtime connection test via Supabase REST
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id,order_status&limit=1`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
    }
  })
  console.log('REST orders access:', res2.status, res2.ok ? 'OK' : 'FAIL')
}

checkRealtime().catch(console.error)
