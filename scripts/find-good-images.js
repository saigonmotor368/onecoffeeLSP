const https = require('https');

function check(url) {
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD', timeout: 4000 }, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', e => resolve({ url, status: e.message })).end();
  });
}

async function testList() {
  const candidates = [
    // Milk tea / boba
    'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    // Nuts / snacks
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=600&auto=format&fit=crop&q=80',
    // Additional teas
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80'
  ];

  for (const c of candidates) {
    const r = await check(c);
    console.log(r.status, '->', c);
  }
}

testList();
