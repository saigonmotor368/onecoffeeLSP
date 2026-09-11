'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import { getBanners, type BannerItem, DEFAULT_BANNERS } from '@/lib/settings'
import { menuProducts, getProductImage } from '@/lib/menu-data'
import styles from './home.module.css'

export default function HomePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; default_delivery_address: string | null } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('')

  // Dynamic Banners
  const [banners, setBanners] = useState<BannerItem[]>(DEFAULT_BANNERS)
  const [bannerIndex, setBannerIndex] = useState(0)

  useEffect(() => {
    // Load banners
    getBanners().then(list => {
      const active = list.filter(b => b.is_active !== false)
      if (active.length > 0) setBanners(active)
    })

    // Load saved location from localStorage or profile
    const saved = localStorage.getItem('oc_delivery_location')
    if (saved) setSelectedLocation(saved)

    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, default_delivery_address')
            .eq('id', session.user.id)
            .single()
          if (data) {
            setProfile(data)
            if (data.default_delivery_address) {
              setSelectedLocation(data.default_delivery_address)
              localStorage.setItem('oc_delivery_location', data.default_delivery_address)
            }
          }
        }
      } catch {
        // ignore
      }
    }
    loadProfile()
  }, [])

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  const currentBanner = banners[bannerIndex] || banners[0]

  // Top 15 Popular items across all categories (Coffee, Milk Tea, Matcha, Frappe, Fruit Tea, Food)
  const featuredIds = [
    'cafe-kem-muoi-long-son',
    'cafe-sua-da-dac-biet',
    'bac-xiu-da',
    'cafe-caramel-macchiato',
    'matcha-nuoc-dua-foam-lanh',
    'matcha-latte-da',
    'tra-sua-thai-do',
    'tra-dao-cam-sa-hat-chia',
    'tra-sen-vang',
    'pho-mai-dau-tay-da-xay',
    'cookie-oreo-da-xay',
    'banh-croissant-bo-phap',
    'sandwich-thit-nguoi-pho-mai',
    'banh-tiramisu-ca-phe',
    'tra-sua-thai-xanh-tran-chau',
  ]

  const popularDrinks = featuredIds.map(id => {
    const item = menuProducts.find(p => p.id === id) || menuProducts[0]
    return {
      id: item.id,
      name_vi: item.name_vi,
      name_en: item.name_en,
      price: (item.price_m || item.price_l || 0) * 1000,
      image: getProductImage(item),
    }
  })

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerGreeting}>
          <p className={styles.greetingSub}>
            {lang === 'vi' ? 'Chào buổi sáng,' : 'Good morning,'}
          </p>
          <h1 className={styles.greetingTitle}>
            {lang === 'vi' ? 'Cùng thưởng thức cà phê nhé!' : "Let's get some coffee!"}
          </h1>
        </div>

        <button
          className={styles.avatarBtn}
          onClick={() => router.push('/profile')}
          aria-label="Profile"
        >
          <div className={styles.avatarCircle}>
            {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : '👤'}
          </div>
        </button>
      </header>

      {/* Dynamic Hero Banner */}
      <div
        className={styles.heroBanner}
        onClick={() => router.push(currentBanner.link_url || '/menu')}
      >
        <div className={styles.bannerContent}>
          {currentBanner.badge_vi && (
            <span className={styles.bannerBadge}>
              {lang === 'vi' ? currentBanner.badge_vi : (currentBanner.badge_en || currentBanner.badge_vi)}
            </span>
          )}
          <h2 className={styles.bannerTitleText}>
            {lang === 'vi' ? currentBanner.title_vi : currentBanner.title_en}
          </h2>
          {(currentBanner.subtitle_vi || currentBanner.subtitle_en) && (
            <p className={styles.bannerSubText}>
              {lang === 'vi' ? currentBanner.subtitle_vi : (currentBanner.subtitle_en || currentBanner.subtitle_vi)}
            </p>
          )}
        </div>

        <div className={styles.bannerDrinkWrap}>
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title_en}
            className={styles.bannerDrinkImg}
          />
        </div>

        {/* Carousel indicators if multiple banners */}
        {banners.length > 1 && (
          <div className={styles.bannerDots} onClick={e => e.stopPropagation()}>
            {banners.map((b, idx) => (
              <button
                key={b.id || idx}
                className={`${styles.bannerDot} ${idx === bannerIndex ? styles.bannerDotActive : ''}`}
                onClick={() => setBannerIndex(idx)}
                aria-label={`Banner ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3 Quick Action Cards */}
      <div className={styles.quickActionsGrid}>
        {/* Card 1: Order Now */}
        <Link href="/menu" className={`${styles.quickCard} ${styles.quickCardActive}`}>
          <div className={styles.quickCardIcon}>☕</div>
          <span className={styles.quickCardLabel}>
            {lang === 'vi' ? 'Đặt ngay' : 'Order Now'}
          </span>
        </Link>

        {/* Card 2: Favorites */}
        <Link href="/profile" className={styles.quickCard}>
          <div className={styles.quickCardIconAlt}>🤍</div>
          <span className={styles.quickCardLabelAlt}>
            {lang === 'vi' ? 'Yêu thích' : 'Favorites'}
          </span>
        </Link>

        {/* Card 3: Order History */}
        <Link href="/orders" className={styles.quickCard}>
          <div className={styles.quickCardIconAlt}>🕒</div>
          <span className={styles.quickCardLabelAlt}>
            {lang === 'vi' ? 'Lịch sử' : 'Order History'}
          </span>
        </Link>
      </div>

      {/* Delivery Address Pill Card */}
      <div className={styles.locationCard}>
        <div className={styles.locationIconWrap}>
          <span style={{ fontSize: '18px' }}>📍</span>
        </div>
        <div className={styles.locationInfo}>
          <span className={styles.locationLabel}>
            {lang === 'vi' ? 'Địa chỉ nhận hàng (LSP & khu vực lân cận)' : 'Delivery Address'}
          </span>
          <input
            type="text"
            className={styles.locationInputInline}
            placeholder={
              lang === 'vi'
                ? 'Nhập địa chỉ nhận hàng của bạn...'
                : 'Enter delivery address...'
            }
            value={selectedLocation}
            onChange={e => {
              setSelectedLocation(e.target.value)
              localStorage.setItem('oc_delivery_location', e.target.value)
            }}
          />
        </div>
      </div>

      {/* Popular Drinks Section */}
      <section className={styles.popularSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {lang === 'vi' ? 'Món nổi bật One Coffee' : 'Popular Items'}
          </h2>
          <Link href="/menu" className={styles.seeAllLink}>
            {lang === 'vi' ? 'Xem tất cả' : 'See All'}
          </Link>
        </div>

        <div className={styles.drinksGrid}>
          {popularDrinks.map(drink => (
            <div
              key={drink.id}
              className={styles.drinkCard}
              onClick={() => router.push(`/menu/${drink.id}`)}
            >
              <div className={styles.drinkImageWrap}>
                <img
                  src={drink.image}
                  alt={drink.name_en}
                  className={styles.drinkImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'
                  }}
                />
              </div>
              <h3 className={styles.drinkName}>
                {lang === 'vi' ? drink.name_vi : drink.name_en}
              </h3>
              <p className={styles.drinkPrice}>
                {formatPrice(drink.price)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
