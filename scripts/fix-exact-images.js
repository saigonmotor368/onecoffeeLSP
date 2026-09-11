const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const EXACT_UPDATES = [
  {
    id: '850bd8e6-d425-4f05-a8d2-cedf5cd17802',
    name: 'Cà Phê Latte Trân Châu Đường Đen',
    url: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'ecf9d3ae-7ae1-4c50-881d-bc235c1598e4',
    name: 'Trà Sữa Thái Đỏ',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'a0d51fef-8c51-4526-bbe3-0fab4d96a980',
    name: 'Trà Sữa Thái Đỏ Trân Châu Đường Đen',
    url: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '1b3924b2-4e1a-49fa-99cb-c05fd324f155',
    name: 'Trà Sữa Thái Xanh',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '658e50d2-1e67-4f2c-ba0b-a6d78a610835',
    name: 'Trà Sữa Thái Xanh Trân Châu Đường Đen',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'd3cc84fb-5f26-4dcb-ac9c-478dfb239e56',
    name: 'Sữa Tươi Trân Châu Đường Đen',
    url: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '0765e6cf-5916-4d43-b94f-6e17264186c2',
    name: 'Hạt Điều Bình Phước Rang Muối',
    url: 'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=600&auto=format&fit=crop&q=80'
  }
];

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  for (const item of EXACT_UPDATES) {
    const { error } = await supabase
      .from('products')
      .update({ image_url: item.url })
      .eq('id', item.id);
    if (error) {
      console.error(`Error updating ${item.name}:`, error.message);
    } else {
      console.log(`Updated ${item.name} -> ${item.url}`);
    }
  }
}

run();
