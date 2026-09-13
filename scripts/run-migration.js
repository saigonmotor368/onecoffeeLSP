/**
 * Run SQL migration via Supabase Management API
 * Uses personal access token if available, otherwise shows instructions
 */

const PROJECT_REF = 'hidebmafolacwfzgrrqn'
const SERVICE_KEY = 'SUPABASE_SERVICE_ROLE_KEY_FROM_ENV'
const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'

const SQL = `
-- 1. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  role text DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  device_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique on endpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key') THEN
    ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Anyone can upsert push subscriptions') THEN
    CREATE POLICY "Anyone can upsert push subscriptions" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON public.push_subscriptions(role);

-- 2. Add favorite_ids to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_ids text[] DEFAULT '{}';

SELECT 'Migration complete!' as result;
`

async function runMigration() {
  console.log('🔧 Running Supabase migration...\n')

  // Try via pg REST endpoint  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: SQL })
  })

  if (res.ok) {
    console.log('✅ Migration succeeded via RPC!')
    return
  }

  // Try direct REST insert as workaround — create a temp record to test table exists
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })

  if (testRes.ok) {
    console.log('✅ push_subscriptions table already exists!')
  } else {
    console.log('❌ push_subscriptions table does not exist yet.')
    console.log('\n📋 Anh cần chạy SQL sau trong Supabase SQL Editor:')
    console.log('👉 https://supabase.com/dashboard/project/hidebmafolacwfzgrrqn/editor\n')
    console.log(SQL)
  }

  // Test profiles.favorite_ids
  const profileTest = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=favorite_ids&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  })
  if (profileTest.ok) {
    const data = await profileTest.json()
    if (data.length > 0 && 'favorite_ids' in data[0]) {
      console.log('✅ profiles.favorite_ids column exists!')
    } else {
      console.log('⚠️  profiles.favorite_ids column may not exist - run migration SQL above')
    }
  }
}

runMigration().catch(console.error)
