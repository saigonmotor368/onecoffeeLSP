async function check() {
  // Fetch the specific chunk that references VAPID
  const url = 'https://onecafe.lspvn.com/_next/static/immutable/chunks/2q7vyjb0r24a6.js';
  const resp = await fetch(url);
  const code = await resp.text();
  
  // Search for the key or parts of it
  const searches = [
    'BObXO53R',
    'VAPID_PUBLIC',
    'NEXT_PUBLIC_VAPID',
    'publicKey',
    'applicationServerKey',
    'your_',
    'pushManager',
    'PushManager',
  ];
  
  for (const term of searches) {
    const idx = code.indexOf(term);
    if (idx !== -1) {
      console.log(`Found "${term}" at position ${idx}`);
      console.log('Context:', code.slice(Math.max(0, idx - 50), idx + 100));
      console.log('---');
    }
  }
  
  // Also check chunk 2
  const url2 = 'https://onecafe.lspvn.com/_next/static/immutable/chunks/2c-8p08amz9ps.js';
  const resp2 = await fetch(url2);
  const code2 = await resp2.text();
  
  const idx2 = code2.indexOf('NEXT_PUBLIC_VAPID');
  if (idx2 !== -1) {
    console.log('\nChunk 2:');
    console.log('Context:', code2.slice(Math.max(0, idx2 - 100), idx2 + 200));
  }
}
check().catch(console.error);
