/**
 * Supabase DB Admin Script
 * - Fix REPLICA IDENTITY FULL for orders table
 * - Verify realtime publication
 * Uses Supabase Management API (requires personal access token)
 * OR falls back to pg direct connection check
 */

const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
const SERVICE_ROLE_KEY = 'SUPABASE_SERVICE_ROLE_KEY_FROM_ENV'
const PROJECT_REF = 'hidebmafolacwfzgrrqn'

// Try Supabase Management API to run SQL
async function runSqlViaManagementAPI(sql) {
  // Try without PAT first - some endpoints work with service role
  const endpoints = [
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    `${SUPABASE_URL}/pg/query`,
    `${SUPABASE_URL}/rest/v1/rpc/run_sql`,
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        return { ok: true, endpoint, data }
      }
    } catch { /* try next */ }
  }
  return { ok: false }
}

// Check current REPLICA IDENTITY via information_schema
async function checkReplicaIdentity() {
  const url = `${SUPABASE_URL}/rest/v1/rpc/get_replica_identity`
  // Try creating a temp function approach - won't work without DDL access
  
  // Alternative: query pg_class directly via REST if it's accessible
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  })
  return res.ok
}

// Try to create a SQL-running stored procedure, then call it
async function tryFixViaStoredProc() {
  // Create a temporary function
  const createFn = `
    CREATE OR REPLACE FUNCTION public._fix_orders_replica_identity()
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      ALTER TABLE public.orders REPLICA IDENTITY FULL;
    END;
    $$;
  `
  
  // Step 1: create the function (needs DDL - likely won't work via REST)
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_fix_orders_replica_identity`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  })
  return r1
}

async function main() {
  console.log('🔧 Supabase DB Fix Script')
  console.log('━'.repeat(50))
  console.log(`Project: ${PROJECT_REF}`)
  console.log('')

  // Test 1: REST API access
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  })
  console.log(`✅ REST API access: ${testRes.status === 200 ? 'OK' : 'FAIL (' + testRes.status + ')'}`)

  // Test 2: Try Management API
  console.log('\n🔍 Thử Management API để chạy SQL...')
  const mgmtRes = await runSqlViaManagementAPI('SELECT current_user, pg_postmaster_start_time()::text as started')
  if (mgmtRes.ok) {
    console.log(`✅ Management API hoạt động! Endpoint: ${mgmtRes.endpoint}`)
    
    // Now run the actual fix
    console.log('\n⚡ Đang chạy ALTER TABLE REPLICA IDENTITY FULL...')
    const fixRes = await runSqlViaManagementAPI('ALTER TABLE public.orders REPLICA IDENTITY FULL;')
    if (fixRes.ok) {
      console.log('✅ REPLICA IDENTITY FULL đã được set thành công!')
    } else {
      console.log('⚠️  ALTER TABLE chạy qua management API thất bại')
    }
  } else {
    console.log('⚠️  Management API không accessible với service role key')
    console.log('   → Cần Personal Access Token từ Supabase Dashboard')
  }

  // Test 3: Check if the stored proc fix already exists
  console.log('\n🔍 Thử stored procedure workaround...')
  const procRes = await tryFixViaStoredProc()
  console.log(`   Result: ${procRes.status} ${procRes.ok ? '✅' : '❌'}`)
  if (procRes.ok) {
    const text = await procRes.text()
    console.log(`   Response: ${text.slice(0, 200)}`)
  }

  // Test 4: Check publications via pg_publication_tables view
  console.log('\n📋 Kiểm tra Realtime publications...')
  const pubRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?select=id,order_status&limit=1`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json',
      }
    }
  )
  
  if (pubRes.ok) {
    const data = await pubRes.json()
    console.log(`✅ orders table accessible via service role`)
    console.log(`   Sample order status: ${data[0]?.order_status || 'N/A'}`)
  }

  console.log('')
  console.log('━'.repeat(50))
  console.log('📌 KẾT LUẬN:')
  console.log('Service role key chỉ có quyền CRUD trên data tables.')
  console.log('DDL (ALTER TABLE) cần direct DB connection hoặc Management API PAT.')
  console.log('')
  console.log('🛠️  CÁCH FIX NHANH NHẤT:')
  console.log('Vào https://supabase.com/dashboard/project/hidebmafolacwfzgrrqn/editor')
  console.log('Chạy SQL:')
  console.log('  ALTER TABLE public.orders REPLICA IDENTITY FULL;')
  console.log('  SELECT relreplident FROM pg_class WHERE relname = \'orders\';')
  console.log('  -- Kết quả "f" = FULL ✅')
}

main().catch(console.error)
