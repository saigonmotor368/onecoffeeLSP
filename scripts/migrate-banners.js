const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const env = fs.readFileSync('.env.local', 'utf8')
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const sql = `
CREATE TABLE IF NOT EXISTS public.banners (
  id text primary key,
  title_vi text not null,
  title_en text not null,
  subtitle_vi text,
  subtitle_en text,
  badge_vi text,
  badge_en text,
  image_url text not null,
  link_url text,
  is_active boolean default true,
  sort_order int default 1
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text primary key,
  value jsonb not null
);

-- RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view banners" ON public.banners;
CREATE POLICY "Anyone can view banners" ON public.banners FOR SELECT USING (true);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
CREATE POLICY "Anyone can view system settings" ON public.system_settings FOR SELECT USING (true);
`

async function migrate() {
  console.log('Running migration...')
  // Since we don't have rpc for raw query, let's use the REST API or we can just fetch via standard REST if supabase js doesn't have query
  // Wait, supabase-js does not support executing raw DDL queries directly from client.
  // We need to use REST api or Postgres connection.
  // But wait, can we use postgres connection? We don't have postgres URL in .env.local.
}
migrate()
