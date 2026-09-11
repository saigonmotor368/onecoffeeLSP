const fs = require('fs');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) {
      return resolve({ url, status: 'invalid' });
    }
    try {
      const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        resolve({ url, status: res.statusCode });
      });
      req.on('error', (e) => resolve({ url, status: 'error: ' + e.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ url, status: 'timeout' });
      });
      req.end();
    } catch (e) {
      resolve({ url, status: 'exception: ' + e.message });
    }
  });
}

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: products, error } = await supabase.from('products').select('id, name_vi, image_url');
  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  console.log(`Checking ${products.length} products in Supabase...`);
  const broken = [];
  for (const p of products) {
    const res = await checkUrl(p.image_url);
    if (res.status !== 200 && res.status !== 302 && res.status !== 301) {
      console.log(`[BROKEN] ${p.id} (${p.name_vi}): status ${res.status} -> ${p.image_url}`);
      broken.push({ id: p.id, name: p.name_vi, url: p.image_url, status: res.status });
    }
  }
  console.log(`Done! Total broken images: ${broken.length} out of ${products.length}`);
}

run();
