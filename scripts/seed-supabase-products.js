require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Import products from menu-data (reproduced here for node script execution)
const menuProducts = [
  // CÀ PHÊ
  { id: 'cafe-den-da-dac-biet', category_slug: 'coffee', name_vi: 'Cà Phê Đen Đá Đặc Biệt', name_en: 'Special Iced Black Coffee', price_m: 36, price_l: 42, image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80' },
  { id: 'cafe-sua-da-dac-biet', category_slug: 'coffee', name_vi: 'Cà Phê Sữa Đá Đặc Biệt', name_en: 'Special Iced Milk Coffee', price_m: 50, price_l: 54, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80' },
  { id: 'cafe-macchiato-sua-dua', category_slug: 'coffee', name_vi: 'Cà Phê Macchiato Sữa Dừa', name_en: 'Coconut Milk Macchiato Coffee', price_m: 50, price_l: null, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'cafe-caramel-macchiato', category_slug: 'coffee', name_vi: 'Cà Phê Caramel Macchiato', name_en: 'Iced Caramel Macchiato', price_m: 50, price_l: 54, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'cafe-white-choco-macchiato', category_slug: 'coffee', name_vi: 'Cà Phê White Choco Macchiato', name_en: 'Iced White Choco Macchiato', price_m: 50, price_l: 54, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'cafe-latte-tran-chau-duong-den', category_slug: 'coffee', name_vi: 'Cà Phê Latte Trân Châu Đường Đen', name_en: 'Iced Latte With Brown Sugar Pearls', price_m: null, price_l: 54, image_url: 'https://images.unsplash.com/photo-1558857563-b37cf0e23485?w=500&q=80' },
  { id: 'mocha-da-vien', category_slug: 'coffee', name_vi: 'Mocha Đá Viên', name_en: 'Iced Mocha', price_m: 50, price_l: 54, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'cafe-espresso', category_slug: 'coffee', name_vi: 'Cà Phê Espresso', name_en: 'Espresso Coffee', price_m: 32, price_l: null, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&q=80' },
  { id: 'cafe-latte-da', category_slug: 'coffee', name_vi: 'Cà Phê Latte Đá', name_en: 'Iced Latte', price_m: 50, price_l: 54, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'cafe-americano-da', category_slug: 'coffee', name_vi: 'Cà Phê Americano Đá', name_en: 'Iced Americano Coffee', price_m: 36, price_l: 42, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80' },
  { id: 'cafe-cappuccino', category_slug: 'coffee', name_vi: 'Cà Phê Cappuccino', name_en: 'Iced Cappuccino', price_m: 50, price_l: 54, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'cafe-den-viet-nam', category_slug: 'coffee', name_vi: 'Cà Phê Đen Việt Nam', name_en: 'Vietnamese Iced Black Coffee', price_m: 32, price_l: 36, image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80' },
  { id: 'cafe-sua-da-viet-nam', category_slug: 'coffee', name_vi: 'Cà Phê Sữa Đá Việt Nam', name_en: 'Vietnamese Iced Milk Coffee', price_m: 36, price_l: 42, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80' },
  { id: 'bac-xiu-da', category_slug: 'coffee', name_vi: 'Bạc Xỉu Đá', name_en: 'Vietnamese White Coffee', price_m: 36, price_l: 42, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80' },
  { id: 'cafe-kem-muoi-long-son', category_slug: 'coffee', name_vi: 'Cà Phê Kem Muối Long Sơn', name_en: 'Long Son Salted Foam Coffee', description_vi: 'Italian M 48 / Vietnamese L 44', price_m: 48, price_l: 44, is_featured: true, is_new: true, image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80' },

  // TRÀ SỮA
  { id: 'tra-sua-thai-do', category_slug: 'milk-tea', name_vi: 'Trà Sữa Thái Đỏ', name_en: 'Red Thai Milk Tea', price_m: 50, price_l: 54, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1558857563-b37cf0e23485?w=500&q=80' },
  { id: 'tra-sua-thai-do-tran-chau', category_slug: 'milk-tea', name_vi: 'Trà Sữa Thái Đỏ Trân Châu Đường Đen', name_en: 'Red Thai Milk Tea with Brown Sugar Pearls', price_m: 54, price_l: 60, image_url: 'https://images.unsplash.com/photo-1558857563-b37cf0e23485?w=500&q=80' },
  { id: 'tra-sua-thai-xanh', category_slug: 'milk-tea', name_vi: 'Trà Sữa Thái Xanh', name_en: 'Green Thai Milk Tea', price_m: 50, price_l: 54, image_url: 'https://images.unsplash.com/photo-1558857563-b37cf0e23485?w=500&q=80' },
  { id: 'tra-sua-thai-xanh-tran-chau', category_slug: 'milk-tea', name_vi: 'Trà Sữa Thái Xanh Trân Châu Đường Đen', name_en: 'Green Thai Milk Tea with Brown Sugar Pearls', price_m: 54, price_l: 60, image_url: 'https://images.unsplash.com/photo-1558857563-b37cf0e23485?w=500&q=80' },
  { id: 'sua-tuoi-tran-chau-duong-den', category_slug: 'milk-tea', name_vi: 'Sữa Tươi Trân Châu Đường Đen', name_en: 'Fresh Milk with Brown Sugar Pearls', price_m: 44, price_l: 54, image_url: 'https://images.unsplash.com/photo-1558857563-b37cf0e23485?w=500&q=80' },
  { id: 'socola-da-vien', category_slug: 'milk-tea', name_vi: 'Sôcola Đá Viên', name_en: 'Iced Chocolate', price_m: 50, price_l: 54, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },

  // TRÀ XANH / MATCHA
  { id: 'matcha-nuoc-dua-foam-lanh', category_slug: 'matcha', name_vi: 'Matcha Nước Dừa Foam Lạnh', name_en: 'Cold Matcha Coconut Foam', price_m: 64, price_l: null, is_featured: true, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80' },
  { id: 'matcha-latte-da', category_slug: 'matcha', name_vi: 'Matcha Latte Đá', name_en: 'Iced Matcha Latte', description_vi: 'Oatmilk +5', price_m: 54, price_l: null, is_new: true, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80' },
  { id: 'matcha-latte-dau', category_slug: 'matcha', name_vi: 'Matcha Latte Dâu', name_en: 'Strawberry Matcha Latte', description_vi: 'Oatmilk +5', price_m: 64, price_l: null, is_new: true, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80' },
  { id: 'matcha-cold-whisk-oatmilk', category_slug: 'matcha', name_vi: 'Matcha Cold Whisk Oatmilk', name_en: 'Matcha Cold Whisk Oatmilk', price_m: 54, price_l: null, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80' },

  // THỨC UỐNG NÓNG
  { id: 'cafe-americano-nong', category_slug: 'hot-drink', name_vi: 'Cà Phê Americano Nóng', name_en: 'Hot Americano', price_m: 36, price_l: 42, image_url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&q=80' },
  { id: 'cafe-cappuccino-nong', category_slug: 'hot-drink', name_vi: 'Cà Phê Cappuccino Nóng', name_en: 'Hot Cappuccino', price_m: null, price_l: 54, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'cafe-latte-nong', category_slug: 'hot-drink', name_vi: 'Cà Phê Latte Nóng', name_en: 'Hot Latte', price_m: 50, price_l: null, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80' },
  { id: 'matcha-latte-nong', category_slug: 'hot-drink', name_vi: 'Matcha Latte Nóng', name_en: 'Hot Matcha Latte', description_vi: 'Oatmilk +5', price_m: 60, price_l: null, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80' },

  // ĐÁ XAY
  { id: 'matcha-da-xay', category_slug: 'frappe', name_vi: 'Matcha Đá Xay', name_en: 'Matcha Frappe', description_vi: 'Oatmilk +5', price_m: 54, price_l: null, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { id: 'pho-mai-dau-tay-da-xay', category_slug: 'frappe', name_vi: 'Phô Mai Dâu Tây Đá Xay', name_en: 'Strawberry Cheese Frappe', price_m: 54, price_l: null, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { id: 'dau-do-da-xay', category_slug: 'frappe', name_vi: 'Dâu Đỏ Đá Xay', name_en: 'Strawberry Frappe', price_m: 54, price_l: null, image_url: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&q=80' },
  { id: 'tra-sua-thai-do-da-xay', category_slug: 'frappe', name_vi: 'Trà Sữa Thái Đỏ Đá Xay', name_en: 'Thai Red Milk Tea Frappe', price_m: 54, price_l: null, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { id: 'cookie-oreo-da-xay', category_slug: 'frappe', name_vi: 'Cookie Oreo Đá Xay', name_en: 'Oreo Cookie Frappe', price_m: 44, price_l: null, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { id: 'viet-quat-da-xay', category_slug: 'frappe', name_vi: 'Việt Quất Đá Xay', name_en: 'Blueberry Frappe', price_m: 44, price_l: null, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { id: 'socola-da-xay', category_slug: 'frappe', name_vi: 'Sôcola Đá Xay', name_en: 'Chocolate Frappe', price_m: 54, price_l: null, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },

  // TRÀ TRÁI CÂY
  { id: 'tra-hoa-hibiscus-dau', category_slug: 'fruit-tea', name_vi: 'Trà Hoa Hibiscus Dâu', name_en: 'Strawberry Hibiscus Tea', price_m: 54, price_l: null, image_url: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&q=80' },
  { id: 'tra-hoa-ngu-sac', category_slug: 'fruit-tea', name_vi: 'Trà Hoa Ngũ Sắc', name_en: 'Five-Color Flower Tea', price_m: 54, price_l: null, image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80' },
  { id: 'tra-hoa-o-long-dao', category_slug: 'fruit-tea', name_vi: 'Trà Hoa Ô Long Đào', name_en: 'Peach Oolong Tea', price_m: 50, price_l: null, image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80' },
  { id: 'tra-sen-vang', category_slug: 'fruit-tea', name_vi: 'Trà Sen Vàng', name_en: 'Golden Lotus Tea', price_m: 50, price_l: null, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80' },
  { id: 'tra-vai-hibiscus', category_slug: 'fruit-tea', name_vi: 'Trà Vải Hibiscus', name_en: 'Hibiscus Lychee Tea', price_m: 50, price_l: null, image_url: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&q=80' },
  { id: 'tra-dao-cam-sa-hat-chia', category_slug: 'fruit-tea', name_vi: 'Trà Đào Cam Sả Hạt Chia', name_en: 'Peach, Orange, Lemongrass & Chia Seed Tea', price_m: 50, price_l: null, is_featured: true, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80' },

  // BÁNH & THỨC ĂN
  { id: 'banh-croissant-bo-phap', category_slug: 'food', name_vi: 'Bánh Croissant Bơ Pháp', name_en: 'French Butter Croissant', description_vi: 'Bánh sừng bò nướng nóng giòn tan, thơm ngậy vị bơ Pháp cao cấp', price_m: 35, price_l: null, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80' },
  { id: 'sandwich-thit-nguoi-pho-mai', category_slug: 'food', name_vi: 'Sandwich Thịt Nguội & Phô Mai', name_en: 'Ham & Cheese Sandwich', description_vi: 'Bánh sandwich nướng giòn kẹp thịt nguội xông khói và phô mai cheddar béo ngậy', price_m: 45, price_l: null, is_featured: true, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80' },
  { id: 'banh-mi-que-pate', category_slug: 'food', name_vi: 'Bánh Mì Que Pate Hải Phòng', name_en: 'Pate Stick Baguette', description_vi: 'Bánh mì que vỏ mỏng giòn rụm kẹp pate Hải Phòng béo bùi, thơm nức mũi', price_m: 25, price_l: null, image_url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&q=80' },
  { id: 'banh-tiramisu-ca-phe', category_slug: 'food', name_vi: 'Bánh Tiramisu One Coffee', name_en: 'One Coffee Tiramisu Cake', description_vi: 'Bánh mousse phô mai mascarpone mềm mịn hòa quyện cốt bánh thấm đẫm cà phê espresso', price_m: 45, price_l: null, is_recommended: true, image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80' },
  { id: 'banh-muffin-chocolate', category_slug: 'food', name_vi: 'Bánh Muffin Double Chocolate', name_en: 'Double Chocolate Muffin', description_vi: 'Bánh muffin socola đậm đà mềm ẩm với hạt sô-cô-la chip nguyên chất tan chảy', price_m: 35, price_l: null, image_url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=500&q=80' },
  { id: 'banh-cookies-hanh-nhan', category_slug: 'food', name_vi: 'Cookies Hạnh Nhân Bơ Nướng', name_en: 'Baked Almond Butter Cookies', description_vi: 'Bánh quy bơ giòn xốp rắc lát hạnh nhân thơm bùi, ăn kèm cà phê tuyệt ngon', price_m: 28, price_l: null, image_url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&q=80' },
  { id: 'hat-dieu-rang-muoi', category_slug: 'food', name_vi: 'Hạt Điều Bình Phước Rang Muối', name_en: 'Roasted Salted Cashews', description_vi: 'Hạt điều rang củi loại 1 nguyên hạt giòn béo, món snack năng lượng cho ngày làm việc', price_m: 32, price_l: null, image_url: 'https://images.unsplash.com/photo-1536591375315-1b836820db76?w=500&q=80' },
];

async function seedProducts() {
  console.log('Fetching categories from Supabase...');
  const { data: categories, error: catErr } = await supabase.from('categories').select('id, slug');
  if (catErr) {
    console.error('Error fetching categories:', catErr);
    return;
  }

  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c.id; });
  console.log('Categories mapped:', catMap);

  // Check if products already exist
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log(`Products table already has ${count} items. Deleting old products to ensure clean real seed...`);
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  console.log(`Preparing to insert ${menuProducts.length} items from the real One Coffee menu...`);

  const records = menuProducts.map((p, index) => {
    const categoryId = catMap[p.category_slug];
    if (!categoryId) {
      console.warn(`Warning: Category slug not found: ${p.category_slug} for product ${p.name_vi}`);
    }

    return {
      category_id: categoryId,
      name_vi: p.name_vi,
      name_en: p.name_en,
      description_vi: p.description_vi || null,
      description_en: p.description_en || null,
      price_m: p.price_m ? p.price_m * 1000 : null,
      price_l: p.price_l ? p.price_l * 1000 : null,
      image_url: p.image_url,
      is_available: true,
      is_featured: !!p.is_featured,
      is_new: !!p.is_new,
      is_recommended: !!p.is_recommended,
      sort_order: index + 1,
    };
  });

  const { data, error } = await supabase.from('products').insert(records).select();
  if (error) {
    console.error('Failed to insert products:', error);
  } else {
    console.log(`Successfully seeded ${data.length} real products into Supabase!`);
  }
}

seedProducts().catch(console.error);
