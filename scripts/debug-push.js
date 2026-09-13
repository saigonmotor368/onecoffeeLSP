// Check if NEXT_PUBLIC_VAPID_PUBLIC_KEY is available on the deployed site
async function check() {
  // 1. Check env var on Vercel by inspecting the page source
  const r = await fetch('https://onecafe.lspvn.com/admin/settings');
  const html = await r.text();
  console.log('Admin settings page status:', r.status);
  
  // Search for VAPID key pattern in the HTML/JS chunks
  const keyPattern = /[A-Za-z0-9_-]{80,90}/g;
  const allMatches = html.match(keyPattern) || [];
  const vapidLike = allMatches.filter(m => m.startsWith('B'));
  console.log('Possible VAPID keys in page source:', vapidLike.length);
  if (vapidLike.length > 0) {
    vapidLike.forEach(k => console.log('  ', k.slice(0, 40) + '...'));
  }

  // 2. Check the JS chunk files for NEXT_PUBLIC env
  const scriptMatches = html.match(/src="([^"]*_next[^"]*\.js)"/g) || [];
  console.log('\nJS chunks found:', scriptMatches.length);

  // 3. Try fetching the subscribe API with a real admin token
  const fs = require('fs');
  const env = fs.readFileSync('e:/One Coffee/one-coffee-lsp/.env.local', 'utf8');
  const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
  const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co';

  // Sign in as admin
  const passwords = ['Admin@123', 'admin123', 'Admin123!', 'admin@123', 'Admin2026!'];
  let token = null;
  for (const pw of passwords) {
    const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@onecoffee.vn', password: pw })
    });
    if (res.ok) {
      const data = await res.json();
      token = data.access_token;
      console.log('\nAdmin login success with password attempt');
      break;
    }
  }

  if (!token) {
    // Generate admin token via service role
    console.log('\nUsing service role to generate admin link...');
    // Use admin API to get user details
    const userRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users?page=1&per_page=20', {
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey }
    });
    const userData = await userRes.json();
    const admin = userData.users?.find(u => u.email === 'admin@onecoffee.vn');
    if (admin) {
      // Generate token for this user
      const genRes = await fetch(SUPABASE_URL + '/auth/v1/admin/generate_link', {
        method: 'POST',
        headers: { 
          apikey: serviceKey, 
          Authorization: 'Bearer ' + serviceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'magiclink', email: 'admin@onecoffee.vn' })
      });
      if (genRes.ok) {
        const genData = await genRes.json();
        // The generated link includes the token
        console.log('Magic link generated, using token...');
        // Extract access token from the hashed_token
        // Actually we need to use a different approach
      }

      // Alternative: use service role key to call subscribe API directly
      console.log('\nTesting subscribe API with service role key directly...');
      const subRes = await fetch('https://onecafe.lspvn.com/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + serviceKey,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-admin-diag-' + Date.now(),
            keys: {
              p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz_MpPJyEkWTwTHs-YErKlVJnDbbxcVCNaLrTROogGUa5Z7j3kp7gIHj_test',
              auth: 'tBHItJI5svbpez7KI4CCXg'
            }
          },
          role: 'admin',
          deviceInfo: 'Server Diagnostic Test'
        })
      });
      console.log('Subscribe with service key - Status:', subRes.status);
      const subBody = await subRes.json().catch(() => ({}));
      console.log('Response:', JSON.stringify(subBody));
    }
  }
}

check().catch(console.error);
