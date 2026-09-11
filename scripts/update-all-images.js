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
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const FIXED_IMAGE_MAP = {
  // Cà phê
  'cafe-den-da-dac-biet': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
  'cafe-sua-da-dac-biet': 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
  'cafe-macchiato-sua-dua': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
  'cafe-caramel-macchiato': 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
  'cafe-white-choco-macchiato': 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80',
  'cafe-latte-tran-chau-duong-den': 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80',
  'mocha-da-vien': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
  'cafe-espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
  'cafe-latte-da': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop&q=80',
  'cafe-americano-da': 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
  'cafe-cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668ba67e53?w=600&auto=format&fit=crop&q=80',
  'cafe-den-viet-nam': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
  'cafe-sua-da-viet-nam': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
  'bac-xiu-da': 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80',
  'cafe-kem-muoi-long-son': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',

  // Trà sữa (Tất cả link đều 200 OK)
  'tra-sua-thai-do': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
  'tra-sua-thai-do-tran-chau': 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80',
  'tra-sua-thai-xanh': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
  'tra-sua-thai-xanh-tran-chau': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
  'sua-tuoi-tran-chau-duong-den': 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600&auto=format&fit=crop&q=80',
  'socola-da-vien': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',

  // Trà xanh / Matcha
  'matcha-nuoc-dua-foam-lanh': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
  'matcha-latte-da': 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&auto=format&fit=crop&q=80',
  'matcha-latte-dau': 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80',
  'matcha-cold-whisk-oatmilk': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',

  // Thức uống nóng
  'cafe-americano-nong': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
  'cafe-cappuccino-nong': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
  'cafe-latte-nong': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
  'matcha-latte-nong': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',

  // Đá xay / Frappe
  'matcha-da-xay': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
  'pho-mai-dau-tay-da-xay': 'https://images.unsplash.com/photo-1553787499-6f9133860278?w=600&auto=format&fit=crop&q=80',
  'dau-do-da-xay': 'https://images.unsplash.com/photo-1570857502809-08184874388e?w=600&auto=format&fit=crop&q=80',
  'tra-sua-thai-do-da-xay': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
  'cookie-oreo-da-xay': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
  'viet-quat-da-xay': 'https://images.unsplash.com/photo-1553787499-6f9133860278?w=600&auto=format&fit=crop&q=80',
  'socola-da-xay': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80',

  // Trà trái cây
  'tra-hoa-hibiscus-dau': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
  'tra-hoa-ngu-sac': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
  'tra-hoa-o-long-dao': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
  'tra-sen-vang': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
  'tra-vai-hibiscus': 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600&auto=format&fit=crop&q=80',
  'tra-dao-cam-sa-hat-chia': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',

  // Food & Bakery
  'banh-croissant-bo-phap': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
  'sandwich-thit-nguoi-pho-mai': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
  'banh-mi-que-pate': 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80',
  'banh-tiramisu-ca-phe': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
  'banh-muffin-chocolate': 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=600&auto=format&fit=crop&q=80',
  'banh-cookies-hanh-nhan': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80',
  'hat-dieu-rang-muoi': 'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=600&auto=format&fit=crop&q=80',
};

async function updateSupabase() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Updating images in Supabase...');

  for (const [slug, imgUrl] of Object.entries(FIXED_IMAGE_MAP)) {
    // Try updating by id or matching name
    const { error } = await supabase
      .from('products')
      .update({ image_url: imgUrl })
      .eq('id', slug);
    if (error) {
      console.warn(`Update error for ${slug}:`, error.message);
    }
  }

  // Double check if products were keyed by UUID or slug
  const { data: prods } = await supabase.from('products').select('id, name_vi, image_url');
  for (const p of prods) {
    const matchedKey = Object.keys(FIXED_IMAGE_MAP).find(k => {
      // match by id or by simplified name
      return p.id === k || p.name_vi.toLowerCase().includes(k.replace(/-/g, ' '));
    });
    if (matchedKey) {
      await supabase.from('products').update({ image_url: FIXED_IMAGE_MAP[matchedKey] }).eq('id', p.id);
    }
  }
  console.log('Supabase product image URLs updated successfully!');
}

updateSupabase();
