// Menu seed data from the One Coffee menu image
// Prices in 1,000 VND units (e.g. 48 = 48,000đ)

export const categories = [
  { slug: 'coffee',    name_vi: 'Cà Phê',       name_en: 'Coffee',     icon: '☕', sort_order: 1 },
  { slug: 'milk-tea',  name_vi: 'Trà Sữa',       name_en: 'Milk Tea',   icon: '🧋', sort_order: 2 },
  { slug: 'matcha',    name_vi: 'Trà Xanh',      name_en: 'Matcha',     icon: '🍵', sort_order: 3 },
  { slug: 'hot-drink', name_vi: 'Thức Uống Nóng', name_en: 'Hot Drink',  icon: '🔥', sort_order: 4 },
  { slug: 'frappe',    name_vi: 'Đá Xay',        name_en: 'Frappe',     icon: '🥤', sort_order: 5 },
  { slug: 'fruit-tea', name_vi: 'Trà Trái Cây',  name_en: 'Fruit Tea',  icon: '🍑', sort_order: 6 },
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
