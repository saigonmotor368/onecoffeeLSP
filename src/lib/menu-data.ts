// Menu seed data from the One Coffee menu image
// Prices in 1,000 VND units (e.g. 48 = 48,000đ)

export const categories = [
  { slug: 'coffee',    name_vi: 'Cà Phê',        name_en: 'Coffee',        icon: '☕', sort_order: 1 },
  { slug: 'milk-tea',  name_vi: 'Trà Sữa',        name_en: 'Milk Tea',      icon: '🧋', sort_order: 2 },
  { slug: 'fruit-tea', name_vi: 'Trà Trái Cây',   name_en: 'Fruit Tea',     icon: '🍑', sort_order: 3 },
  { slug: 'matcha',    name_vi: 'Trà Xanh',       name_en: 'Matcha',        icon: '🍵', sort_order: 4 },
  { slug: 'frappe',    name_vi: 'Đá Xay',         name_en: 'Frappe',        icon: '🥤', sort_order: 5 },
  { slug: 'hot-drink', name_vi: 'Thức Uống Nóng', name_en: 'Hot Drink',     icon: '🔥', sort_order: 6 },
  { slug: 'food',      name_vi: 'Bánh & Thức Ăn', name_en: 'Bakery & Food', icon: '🥐', sort_order: 7 },
]

export interface MenuProduct {
  id: string
  category_slug: string
  name_vi: string
  name_en: string
  description_vi?: string
  description_en?: string
  price_m: number | null   // price in 1000đ units
  price_l: number | null
  is_featured?: boolean
  is_new?: boolean
  is_recommended?: boolean
  tags?: string[]
  image_url?: string
}

const PRODUCT_IMAGE_MAP: Record<string, string> = {
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

  // Trà sữa
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
}

export function getProductImage(product: MenuProduct): string {
  if (product.image_url && !product.image_url.includes('1558857563') && !product.image_url.includes('1536591375')) {
    return product.image_url
  }
  const id = product.id.toLowerCase()
  if (PRODUCT_IMAGE_MAP[id]) return PRODUCT_IMAGE_MAP[id]
  const cat = product.category_slug.toLowerCase()

  if (cat === 'food') return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  if (cat === 'coffee') return 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'
  if (cat === 'milk-tea') return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'
  if (cat === 'fruit-tea') return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80'
  if (cat === 'matcha') return 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'
  if (cat === 'frappe') return 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80'
  if (cat === 'hot-drink') return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'

  return 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'
}

export const menuProducts: MenuProduct[] = [
  // ── CÀ PHÊ ──────────────────────────────────────────────
  {
    id: 'cafe-den-da-dac-biet',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Đen Đá Đặc Biệt',
    name_en: 'Special Iced Black Coffee',
    price_m: 36, price_l: 42,
  },
  {
    id: 'cafe-sua-da-dac-biet',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Sữa Đá Đặc Biệt',
    name_en: 'Special Iced Milk Coffee',
    price_m: 50, price_l: 54,
    is_recommended: true,
  },
  {
    id: 'cafe-macchiato-sua-dua',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Macchiato Sữa Dừa',
    name_en: 'Coconut Milk Macchiato Coffee',
    price_m: 50, price_l: null,
  },
  {
    id: 'cafe-caramel-macchiato',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Caramel Macchiato',
    name_en: 'Iced Caramel Macchiato',
    price_m: 50, price_l: 54,
  },
  {
    id: 'cafe-white-choco-macchiato',
    category_slug: 'coffee',
    name_vi: 'Cà Phê White Choco Macchiato',
    name_en: 'Iced White Choco Macchiato',
    price_m: 50, price_l: 54,
  },
  {
    id: 'cafe-latte-tran-chau-duong-den',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Latte Trân Châu Đường Đen',
    name_en: 'Iced Latte With Brown Sugar Pearls',
    price_m: null, price_l: 54,
  },
  {
    id: 'mocha-da-vien',
    category_slug: 'coffee',
    name_vi: 'Mocha Đá Viên',
    name_en: 'Iced Mocha',
    price_m: 50, price_l: 54,
  },
  {
    id: 'cafe-espresso',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Espresso',
    name_en: 'Espresso Coffee',
    price_m: 32, price_l: null,
    is_recommended: true,
  },
  {
    id: 'cafe-latte-da',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Latte Đá',
    name_en: 'Iced Latte',
    price_m: 50, price_l: 54,
  },
  {
    id: 'cafe-americano-da',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Americano Đá',
    name_en: 'Iced Americano Coffee',
    price_m: 36, price_l: 42,
    is_recommended: true,
  },
  {
    id: 'cafe-cappuccino',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Cappuccino',
    name_en: 'Iced Cappuccino',
    price_m: 50, price_l: 54,
  },
  {
    id: 'cafe-den-viet-nam',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Đen Việt Nam',
    name_en: 'Vietnamese Iced Black Coffee',
    price_m: 32, price_l: 36,
  },
  {
    id: 'cafe-sua-da-viet-nam',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Sữa Đá Việt Nam',
    name_en: 'Vietnamese Iced Milk Coffee',
    price_m: 36, price_l: 42,
  },
  {
    id: 'bac-xiu-da',
    category_slug: 'coffee',
    name_vi: 'Bạc Xỉu Đá',
    name_en: 'Vietnamese White Coffee',
    price_m: 36, price_l: 42,
    is_recommended: true,
  },
  {
    id: 'cafe-kem-muoi-long-son',
    category_slug: 'coffee',
    name_vi: 'Cà Phê Kem Muối Long Sơn',
    name_en: 'Long Son Salted Foam Coffee',
    description_vi: 'Italian M 48 / Vietnamese L 44',
    price_m: 48, price_l: 44,
    is_featured: true, is_new: true,
  },

  // ── TRÀ SỮA ─────────────────────────────────────────────
  {
    id: 'tra-sua-thai-do',
    category_slug: 'milk-tea',
    name_vi: 'Trà Sữa Thái Đỏ',
    name_en: 'Red Thai Milk Tea',
    price_m: 50, price_l: 54,
    is_recommended: true,
  },
  {
    id: 'tra-sua-thai-do-tran-chau',
    category_slug: 'milk-tea',
    name_vi: 'Trà Sữa Thái Đỏ Trân Châu Đường Đen',
    name_en: 'Red Thai Milk Tea with Brown Sugar Pearls',
    price_m: 54, price_l: 60,
  },
  {
    id: 'tra-sua-thai-xanh',
    category_slug: 'milk-tea',
    name_vi: 'Trà Sữa Thái Xanh',
    name_en: 'Green Thai Milk Tea',
    price_m: 50, price_l: 54,
  },
  {
    id: 'tra-sua-thai-xanh-tran-chau',
    category_slug: 'milk-tea',
    name_vi: 'Trà Sữa Thái Xanh Trân Châu Đường Đen',
    name_en: 'Green Thai Milk Tea with Brown Sugar Pearls',
    price_m: 54, price_l: 60,
  },
  {
    id: 'sua-tuoi-tran-chau-duong-den',
    category_slug: 'milk-tea',
    name_vi: 'Sữa Tươi Trân Châu Đường Đen',
    name_en: 'Fresh Milk with Brown Sugar Pearls',
    price_m: 44, price_l: 54,
  },
  {
    id: 'socola-da-vien',
    category_slug: 'milk-tea',
    name_vi: 'Sôcola Đá Viên',
    name_en: 'Iced Chocolate',
    price_m: 50, price_l: 54,
  },

  // ── TRÀ XANH / MATCHA ───────────────────────────────────
  {
    id: 'matcha-nuoc-dua-foam-lanh',
    category_slug: 'matcha',
    name_vi: 'Matcha Nước Dừa Foam Lạnh',
    name_en: 'Cold Matcha Coconut Foam',
    price_m: 64, price_l: null,
    is_featured: true,
  },
  {
    id: 'matcha-latte-da',
    category_slug: 'matcha',
    name_vi: 'Matcha Latte Đá',
    name_en: 'Iced Matcha Latte',
    description_vi: 'Oatmilk +5',
    price_m: 54, price_l: null,
    is_new: true,
  },
  {
    id: 'matcha-latte-dau',
    category_slug: 'matcha',
    name_vi: 'Matcha Latte Dâu',
    name_en: 'Strawberry Matcha Latte',
    description_vi: 'Oatmilk +5',
    price_m: 64, price_l: null,
    is_new: true,
  },
  {
    id: 'matcha-cold-whisk-oatmilk',
    category_slug: 'matcha',
    name_vi: 'Matcha Cold Whisk Oatmilk',
    name_en: 'Matcha Cold Whisk Oatmilk',
    price_m: 54, price_l: null,
  },

  // ── THỨC UỐNG NÓNG ───────────────────────────────────────
  {
    id: 'cafe-americano-nong',
    category_slug: 'hot-drink',
    name_vi: 'Cà Phê Americano Nóng',
    name_en: 'Hot Americano',
    price_m: 36, price_l: 42,
  },
  {
    id: 'cafe-cappuccino-nong',
    category_slug: 'hot-drink',
    name_vi: 'Cà Phê Cappuccino Nóng',
    name_en: 'Hot Cappuccino',
    price_m: null, price_l: 54,
  },
  {
    id: 'cafe-latte-nong',
    category_slug: 'hot-drink',
    name_vi: 'Cà Phê Latte Nóng',
    name_en: 'Hot Latte',
    price_m: 50, price_l: null,
  },
  {
    id: 'matcha-latte-nong',
    category_slug: 'hot-drink',
    name_vi: 'Matcha Latte Nóng',
    name_en: 'Hot Matcha Latte',
    description_vi: 'Oatmilk +5',
    price_m: 60, price_l: null,
  },

  // ── ĐÁ XAY / FRAPPE ─────────────────────────────────────
  {
    id: 'matcha-da-xay',
    category_slug: 'frappe',
    name_vi: 'Matcha Đá Xay',
    name_en: 'Matcha Frappe',
    description_vi: 'Oatmilk +5',
    price_m: 54, price_l: null,
  },
  {
    id: 'pho-mai-dau-tay-da-xay',
    category_slug: 'frappe',
    name_vi: 'Phô Mai Dâu Tây Đá Xay',
    name_en: 'Strawberry Cheese Frappe',
    price_m: 54, price_l: null,
    is_recommended: true,
  },
  {
    id: 'dau-do-da-xay',
    category_slug: 'frappe',
    name_vi: 'Dâu Đỏ Đá Xay',
    name_en: 'Strawberry Frappe',
    price_m: 54, price_l: null,
  },
  {
    id: 'tra-sua-thai-do-da-xay',
    category_slug: 'frappe',
    name_vi: 'Trà Sữa Thái Đỏ Đá Xay',
    name_en: 'Thai Red Milk Tea Frappe',
    price_m: 54, price_l: null,
  },
  {
    id: 'cookie-oreo-da-xay',
    category_slug: 'frappe',
    name_vi: 'Cookie Oreo Đá Xay',
    name_en: 'Oreo Cookie Frappe',
    price_m: 44, price_l: null,
  },
  {
    id: 'viet-quat-da-xay',
    category_slug: 'frappe',
    name_vi: 'Việt Quất Đá Xay',
    name_en: 'Blueberry Frappe',
    price_m: 44, price_l: null,
  },
  {
    id: 'socola-da-xay',
    category_slug: 'frappe',
    name_vi: 'Sôcola Đá Xay',
    name_en: 'Chocolate Frappe',
    price_m: 54, price_l: null,
  },

  // ── TRÀ TRÁI CÂY ────────────────────────────────────────
  {
    id: 'tra-hoa-hibiscus-dau',
    category_slug: 'fruit-tea',
    name_vi: 'Trà Hoa Hibiscus Dâu',
    name_en: 'Strawberry Hibiscus Tea',
    price_m: 54, price_l: null,
  },
  {
    id: 'tra-hoa-ngu-sac',
    category_slug: 'fruit-tea',
    name_vi: 'Trà Hoa Ngũ Sắc',
    name_en: 'Five-Color Flower Tea',
    price_m: 54, price_l: null,
  },
  {
    id: 'tra-hoa-o-long-dao',
    category_slug: 'fruit-tea',
    name_vi: 'Trà Hoa Ô Long Đào',
    name_en: 'Peach Oolong Tea',
    price_m: 50, price_l: null,
  },
  {
    id: 'tra-sen-vang',
    category_slug: 'fruit-tea',
    name_vi: 'Trà Sen Vàng',
    name_en: 'Golden Lotus Tea',
    price_m: 50, price_l: null,
    is_recommended: true,
  },
  {
    id: 'tra-vai-hibiscus',
    category_slug: 'fruit-tea',
    name_vi: 'Trà Vải Hibiscus',
    name_en: 'Hibiscus Lychee Tea',
    price_m: 50, price_l: null,
  },
  {
    id: 'tra-dao-cam-sa-hat-chia',
    category_slug: 'fruit-tea',
    name_vi: 'Trà Đào Cam Sả Hạt Chia',
    name_en: 'Peach, Orange, Lemongrass & Chia Seed Tea',
    price_m: 50, price_l: null,
    is_featured: true,
    is_recommended: true,
  },

  // ── BÁNH & THỨC ĂN (FOOD & BAKERY) ──────────────────────
  {
    id: 'banh-croissant-bo-phap',
    category_slug: 'food',
    name_vi: 'Bánh Croissant Bơ Pháp',
    name_en: 'French Butter Croissant',
    description_vi: 'Bánh sừng bò nướng nóng giòn tan, thơm ngậy vị bơ Pháp cao cấp',
    description_en: 'Warm, crispy, flaky butter croissant baked fresh daily',
    price_m: 35, price_l: null,
    is_recommended: true,
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sandwich-thit-nguoi-pho-mai',
    category_slug: 'food',
    name_vi: 'Sandwich Thịt Nguội & Phô Mai',
    name_en: 'Ham & Cheese Sandwich',
    description_vi: 'Bánh sandwich nướng giòn kẹp thịt nguội xông khói và phô mai cheddar béo ngậy',
    description_en: 'Golden toasted sandwich with premium smoked ham and melted cheddar cheese',
    price_m: 45, price_l: null,
    is_featured: true,
    is_recommended: true,
    image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'banh-mi-que-pate',
    category_slug: 'food',
    name_vi: 'Bánh Mì Que Pate Hải Phòng',
    name_en: 'Pate Stick Baguette',
    description_vi: 'Bánh mì que vỏ mỏng giòn rụm kẹp pate Hải Phòng béo bùi, thơm nức mũi',
    description_en: 'Crispy stick baguette stuffed with rich aromatic pate',
    price_m: 25, price_l: null,
    image_url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'banh-tiramisu-ca-phe',
    category_slug: 'food',
    name_vi: 'Bánh Tiramisu One Coffee',
    name_en: 'One Coffee Tiramisu Cake',
    description_vi: 'Bánh mousse phô mai mascarpone mềm mịn hòa quyện cốt bánh thấm đẫm cà phê espresso',
    description_en: 'Signature Italian tiramisu with silky mascarpone and rich espresso-soaked layers',
    price_m: 45, price_l: null,
    is_recommended: true,
    image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'banh-muffin-chocolate',
    category_slug: 'food',
    name_vi: 'Bánh Muffin Double Chocolate',
    name_en: 'Double Chocolate Muffin',
    description_vi: 'Bánh muffin socola đậm đà mềm ẩm với hạt sô-cô-la chip nguyên chất tan chảy',
    description_en: 'Rich, moist chocolate muffin bursting with decadent dark chocolate chips',
    price_m: 35, price_l: null,
    image_url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'banh-cookies-hanh-nhan',
    category_slug: 'food',
    name_vi: 'Cookies Hạnh Nhân Bơ Nướng',
    name_en: 'Baked Almond Butter Cookies',
    description_vi: 'Bánh quy bơ giòn xốp rắc lát hạnh nhân thơm bùi, ăn kèm cà phê tuyệt ngon',
    description_en: 'Crisp, buttery handmade cookies generously topped with toasted sliced almonds',
    price_m: 28, price_l: null,
    image_url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'hat-dieu-rang-muoi',
    category_slug: 'food',
    name_vi: 'Hạt Điều Bình Phước Rang Muối',
    name_en: 'Roasted Salted Cashews',
    description_vi: 'Hạt điều rang củi loại 1 nguyên hạt giòn béo, món snack năng lượng cho ngày làm việc',
    description_en: 'Premium wood-roasted salted cashews, delicious energy booster for workdays',
    price_m: 32, price_l: null,
    image_url: 'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=600&auto=format&fit=crop&q=80',
  },
]

export const addons = [
  { id: 'addon-dao', name_vi: 'Thêm Đào', name_en: 'Add Peach', price: 10 },
  { id: 'addon-vai', name_vi: 'Thêm Vải', name_en: 'Add Lychee', price: 10 },
  { id: 'addon-hat-sen', name_vi: 'Thêm Hạt Sen', name_en: 'Add Lotus Seeds', price: 10 },
  { id: 'addon-kem-tuoi', name_vi: 'Thêm Kem Tươi', name_en: 'Add Whipping Cream', price: 10 },
  { id: 'addon-nha-dam', name_vi: 'Thêm Nha Đam', name_en: 'Add Aloe Vera', price: 10 },
  { id: 'addon-cafe', name_vi: 'Thêm Cà Phê', name_en: 'Add Espresso Shot', price: 10 },
  { id: 'addon-tran-chau-den', name_vi: 'Thêm Trân Châu Đen', name_en: 'Add Black Tapioca Pearls', price: 10 },
  { id: 'addon-kem-foam', name_vi: 'Thêm Kem Foam', name_en: 'Add Cream Foam', price: 10 },
  { id: 'addon-tran-chau-trang-3q', name_vi: 'Thêm Trân Châu Trắng 3Q', name_en: 'Add White Crystal Pearls 3Q', price: 10 },
]
