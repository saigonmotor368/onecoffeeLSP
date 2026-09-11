'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import { LSP_LOCATIONS, DEFAULT_LOCATION } from '@/lib/locations'
import DeliveryLocationModal from '@/components/DeliveryLocationModal'
import styles from './home.module.css'

export default function HomePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; default_delivery_address: string | null } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>(DEFAULT_LOCATION.name_en)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  useEffect(() => {
    // Load saved location from localStorage or profile
    const saved = localStorage.getItem('oc_delivery_location')
    if (saved) setSelectedLocation(saved)

    const loadProfile = async () => {
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
    }
    loadProfile()
  }, [])

  const handleLocationSelect = (locName: string) => {
    setSelectedLocation(locName)
    localStorage.setItem('oc_delivery_location', locName)
  }

  // Popular items matching mockup Screen 2 (Drinks & Bakery)
  const popularDrinks = [
    {
      id: 'cafe-muoi-long-son',
      name_vi: 'Cà Phê Kem Muối Long Sơn',
      name_en: 'Salted Foam Coffee',
      price: 48000,
      image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'matcha-latte',
      name_vi: 'Matcha Latte',
      name_en: 'Matcha Latte',
      price: 54000,
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'banh-croissant-bo-phap',
      name_vi: 'Bánh Croissant Bơ Pháp',
      name_en: 'French Butter Croissant',
      price: 35000,
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'tra-sua-thai-do',
      name_vi: 'Trà Sữa Thái Đỏ',
      name_en: 'Thai Red Milk Tea',
      price: 54000,
      image: 'https://images.unsplash.com/photo-1558857563-b37cf0e23485?w=500&auto=format&fit=crop&q=80',
    },
  ]

  return (
    <div className={styles.page}>
      {/* Top Header matching Screen 2 */}
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
            {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'ND'}
          </div>
        </button>
      </header>

      {/* Hero Banner with Artistic Typography matching Screen 2 */}
      <div className={styles.heroBanner} onClick={() => router.push('/menu')}>
        <div className={styles.bannerContent}>
          <p className={styles.bannerScriptLine1}>Good Coffee</p>
          <p className={styles.bannerScriptLine2}>Brighter</p>
          <p className={styles.bannerScriptLine3}>Workdays</p>
        </div>
        <div className={styles.bannerDrinkWrap}>
          <img
            src="https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80"
            alt="One Coffee Drink"
            className={styles.bannerDrinkImg}
          />
        </div>
      </div>

      {/* 3 Quick Action Cards matching Screen 2 */}
      <div className={styles.quickActionsGrid}>
        {/* Card 1: Order Now (Active Dark Green) */}
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

      {/* Delivery Location Pill Card matching Screen 2 */}
      <div
        className={styles.locationCard}
        onClick={() => setIsLocationModalOpen(true)}
      >
        <div className={styles.locationIconWrap}>
          <span style={{ fontSize: '18px' }}>📍</span>
        </div>
        <div className={styles.locationInfo}>
          <span className={styles.locationLabel}>
            {lang === 'vi' ? 'Điểm nhận nước' : 'Delivery Location'}
          </span>
          <span className={styles.locationValue}>
            {selectedLocation}
          </span>
        </div>
        <span className={styles.locationChevron}>›</span>
      </div>

      {/* Popular Drinks Section matching Screen 2 */}
      <section className={styles.popularSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {lang === 'vi' ? 'Món phổ biến' : 'Popular Drinks'}
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

      {/* 21 Locations Modal (Screen 6) */}
      <DeliveryLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedLocation={selectedLocation}
        onSelect={handleLocationSelect}
      />
    </div>
  )
}
