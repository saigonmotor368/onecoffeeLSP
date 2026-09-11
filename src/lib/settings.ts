import { createClient } from './supabase/client'

export interface ShippingConfig {
  shipping_fee: number            // default: 10000
  free_shipping_threshold: number // default: 100000
  enabled: boolean                // default: true
}

export interface EmployeeDiscountConfig {
  discount_percent: number        // default: 20
  enabled: boolean                // default: true
}

export interface BannerItem {
  id: string
  title_vi: string
  title_en: string
  subtitle_vi?: string | null
  subtitle_en?: string | null
  badge_vi?: string | null
  badge_en?: string | null
  image_url: string
  link_url?: string | null
  is_active: boolean
  sort_order: number
}

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  shipping_fee: 10000,
  free_shipping_threshold: 100000,
  enabled: true,
}

export const DEFAULT_EMPLOYEE_DISCOUNT: EmployeeDiscountConfig = {
  discount_percent: 20,
  enabled: true,
}

export const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'banner-1',
    title_vi: 'Cà Phê Kem Muối Long Sơn',
    title_en: 'Long Son Salted Foam Coffee',
    subtitle_vi: 'Vị cà phê đậm đà kết hợp lớp foam muối béo mịn trứ danh',
    subtitle_en: 'Rich coffee flavor combined with signature salted cream foam',
    badge_vi: 'Món Mới',
    badge_en: 'New',
    image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=1000&q=80',
    link_url: '/menu/cafe-muoi-long-son',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'banner-2',
    title_vi: 'Ưu đãi 20% Nhân viên LSP',
    title_en: '20% Off for LSP Staff',
    subtitle_vi: 'Tự động giảm 20% cho toàn bộ đơn hàng của cán bộ công nhân viên',
    subtitle_en: 'Automatically applied 20% discount on all orders for internal staff',
    badge_vi: 'Nội Bộ',
    badge_en: 'Exclusive',
    image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&q=80',
    link_url: '/menu',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'banner-3',
    title_vi: 'Miễn phí giao hàng tại LSP',
    title_en: 'Free Delivery within LSP',
    subtitle_vi: 'Freeship tận tay cho mọi đơn hàng từ 100.000đ tại 21 điểm giao',
    subtitle_en: 'Free delivery for orders from 100,000 VND to all 21 factory zones',
    badge_vi: 'Freeship',
    badge_en: 'Free Ship',
    image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1000&q=80',
    link_url: '/menu',
    is_active: true,
    sort_order: 3,
  },
]

// Fetch shipping config
export async function getShippingConfig(): Promise<ShippingConfig> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('oc_shipping_config')
    if (cached) {
      try { return JSON.parse(cached) } catch { /* ignore */ }
    }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'shipping')
      .single()

    if (!error && data?.value) {
      const config = data.value as unknown as ShippingConfig
      if (typeof window !== 'undefined') {
        localStorage.setItem('oc_shipping_config', JSON.stringify(config))
      }
      return config
    }
  } catch {
    // ignore
  }

  return DEFAULT_SHIPPING_CONFIG
}

// Fetch employee discount config
export async function getEmployeeDiscountConfig(): Promise<EmployeeDiscountConfig> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('oc_employee_discount')
    if (cached) {
      try { return JSON.parse(cached) } catch { /* ignore */ }
    }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'employee_discount')
      .single()

    if (!error && data?.value) {
      const config = data.value as unknown as EmployeeDiscountConfig
      if (typeof window !== 'undefined') {
        localStorage.setItem('oc_employee_discount', JSON.stringify(config))
      }
      return config
    }
  } catch {
    // ignore
  }

  return DEFAULT_EMPLOYEE_DISCOUNT
}

// Fetch banners
export async function getBanners(): Promise<BannerItem[]> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('oc_banners')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch { /* ignore */ }
    }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('oc_banners', JSON.stringify(data))
      }
      return data as BannerItem[]
    }
  } catch {
    // ignore
  }

  return DEFAULT_BANNERS
}
