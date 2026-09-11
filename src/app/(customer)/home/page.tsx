'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/providers'
import { getGreeting, formatPrice } from '@/lib/utils'
import { menuProducts, categories } from '@/lib/menu-data'
import styles from './home.module.css'

export default function HomePage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; default_delivery_address: string | null } | null>(null)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setGreeting(getGreeting(lang))
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, default_delivery_address')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data)
      }
    }
    load()
  }, [lang])

  const featured = menuProducts.filter(p => p.is_featured).slice(0, 5)
  const popular  = menuProducts.filter(p => p.is_recommended).slice(0, 6)

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.userName}>
            {profile?.full_name ?? 'Khách hàng'} 👋
          </h1>
        </div>
        <button
          className={styles.profileBtn}
          onClick={() => router.push('/profile')}
          aria-label="Profile"
        >
          {profile?.full_name?.[0] ?? '?'}
        </button>
      </header>

      {/* Delivery location */}
      <Link href="/checkout" className={styles.locationBar}>
        <span className={styles.locationIcon}>📍</span>
        <span className={styles.locationText}>
          {profile?.default_delivery_address ?? t('delivery_location')}
        </span>
        <span className={styles.locationChevron}>›</span>
      </Link>

      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>☕ One Coffee LSP</p>
          <h2 className={styles.heroTitle}>Good Coffee,<br />Brighter Workdays</h2>
          <Link href="/menu" className={`btn btn-accent btn-sm ${styles.heroBtn}`}>
            {t('order_now')} →
          </Link>
        </div>
        <div className={styles.heroDecor}>
          <div className={styles.coffeeCup}>☕</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <Link href="/menu" className={styles.quickBtn}>
          <span className={styles.quickIcon}>☕</span>
          <span>{t('order_now')}</span>
        </Link>
        <Link href="/orders" className={styles.quickBtn}>
          <span className={styles.quickIcon}>📦</span>
          <span>{t('order_history')}</span>
        </Link>
        <Link href="/profile" className={styles.quickBtn}>
          <span className={styles.quickIcon}>❤️</span>
          <span>{t('favorites')}</span>
        </Link>
      </div>

      {/* Categories */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Danh mục</h2>
        </div>
        <div className={styles.categoryScroll}>
          {categories.map(cat => (
            <Link
              key={cat.slug}
              href={`/menu?cat=${cat.slug}`}
              className={styles.categoryChip}
            >
              <span className={styles.categoryIcon}>{cat.icon}</span>
              <span>{lang === 'vi' ? cat.name_vi : cat.name_en}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Drinks */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('popular_drinks')}</h2>
          <Link href="/menu" className={styles.seeAll}>{t('see_all')}</Link>
        </div>
        <div className={styles.popularScroll}>
          {popular.map(product => (
            <ProductCard key={product.id} product={product} lang={lang} />
          ))}
        </div>
      </section>

      {/* New & Featured */}
      {featured.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>✨ Nổi bật & Mới</h2>
            <Link href="/menu" className={styles.seeAll}>{t('see_all')}</Link>
          </div>
          <div className={styles.featuredGrid}>
            {featured.map(product => (
              <FeaturedCard key={product.id} product={product} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Promo banner */}
      <div className={styles.promoBanner}>
        <div>
          <p className={styles.promoTitle}>🎫 Mã ưu đãi hôm nay</p>
          <p className={styles.promoDesc}>Dùng <strong>WELCOME10</strong> giảm 10% đơn đầu tiên</p>
        </div>
        <Link href="/cart" className="btn btn-primary btn-sm">Dùng ngay</Link>
      </div>

      <div style={{ height: 'var(--space-6)' }} />
    </div>
  )
}

function ProductCard({ product, lang }: { product: typeof menuProducts[0]; lang: string }) {
  const name = lang === 'vi' ? product.name_vi : product.name_en
  const price = product.price_m ?? product.price_l ?? 0
  return (
    <Link href={`/menu/${product.id}`} className={styles.productCard}>
      <div className={styles.productImgWrap}>
        <div className={styles.productImgPlaceholder}>☕</div>
        {product.is_new && <span className={styles.newBadge}>Mới</span>}
        {product.is_recommended && <span className={styles.recBadge}>★</span>}
      </div>
      <div className={styles.productInfo}>
        <p className={styles.productName}>{name}</p>
        <p className={styles.productPrice}>
          M {formatPrice(price * 1000)}
          {product.price_l && <> · L {formatPrice(product.price_l * 1000)}</>}
        </p>
      </div>
    </Link>
  )
}

function FeaturedCard({ product, lang }: { product: typeof menuProducts[0]; lang: string }) {
  const name = lang === 'vi' ? product.name_vi : product.name_en
  const price = product.price_m ?? product.price_l ?? 0
  return (
    <Link href={`/menu/${product.id}`} className={styles.featuredCard}>
      <div className={styles.featuredImgPlaceholder}>☕</div>
      <div className={styles.featuredInfo}>
        <p className={styles.featuredName}>{name}</p>
        <p className={styles.featuredPrice}>{formatPrice(price * 1000)}</p>
      </div>
      {product.is_new && <span className={styles.featuredBadge}>Mới</span>}
    </Link>
  )
}
