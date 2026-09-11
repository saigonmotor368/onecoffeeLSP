'use client'

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { menuProducts, categories } from '@/lib/menu-data'
import { useLang } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import styles from './menu.module.css'

function MenuContent() {
  const { t, lang } = useLang()
  const searchParams = useSearchParams()
  const [activeSlug, setActiveSlug] = useState(searchParams.get('cat') ?? 'coffee')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let products = search.trim()
      ? menuProducts.filter(p =>
          p.name_vi.toLowerCase().includes(search.toLowerCase()) ||
          p.name_en.toLowerCase().includes(search.toLowerCase())
        )
      : menuProducts.filter(p => p.category_slug === activeSlug)
    return products
  }, [activeSlug, search])

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{t('menu')}</h1>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t('search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </header>

      {/* Category Tabs */}
      {!search && (
        <div className={styles.tabsWrap}>
          <div className={styles.tabs}>
            {categories.map(cat => (
              <button
                key={cat.slug}
                className={`${styles.tab} ${activeSlug === cat.slug ? styles.tabActive : ''}`}
                onClick={() => setActiveSlug(cat.slug)}
              >
                {cat.icon} {lang === 'vi' ? cat.name_vi : cat.name_en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category title */}
      {!search && (
        <div className={styles.catHeader}>
          <h2 className={styles.catTitle}>
            {lang === 'vi'
              ? categories.find(c => c.slug === activeSlug)?.name_vi
              : categories.find(c => c.slug === activeSlug)?.name_en}
          </h2>
          <span className={styles.catCount}>{filtered.length} món</span>
        </div>
      )}

      {search && (
        <p className={styles.searchResults}>
          Kết quả cho "{search}" — {filtered.length} món
        </p>
      )}

      {/* Product List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">☕</span>
          <p className="empty-state-title">Không tìm thấy món</p>
          <p className="empty-state-desc">Thử tìm từ khóa khác nhé</p>
        </div>
      ) : (
        <div className={styles.productList}>
          {filtered.map(product => (
            <MenuProductRow key={product.id} product={product} lang={lang} />
          ))}
        </div>
      )}

      {/* Price note */}
      <p className={styles.priceNote}>
        * Giá tính theo đơn vị 1.000đ · Prices are in 1,000 VND units
      </p>

      <div style={{ height: 'var(--space-4)' }} />
    </div>
  )
}

function MenuProductRow({ product, lang }: { product: typeof menuProducts[0]; lang: string }) {
  const name = lang === 'vi' ? product.name_vi : product.name_en

  return (
    <Link href={`/menu/${product.id}`} className={styles.row}>
      {/* Image placeholder */}
      <div className={styles.rowImg}>
        <span className={styles.rowImgIcon}>☕</span>
        {product.is_new && <span className={styles.rowNew}>Mới</span>}
      </div>

      {/* Info */}
      <div className={styles.rowInfo}>
        <div className={styles.rowNameRow}>
          <p className={styles.rowName}>{name}</p>
          {product.is_recommended && <span className={styles.rowStar}>★</span>}
        </div>
        {product.description_vi && (
          <p className={styles.rowDesc}>{product.description_vi}</p>
        )}
        <div className={styles.rowPrices}>
          {product.price_m && (
            <span className={styles.sizePrice}>
              <span className={styles.sizeLabel}>M</span>
              {formatPrice(product.price_m * 1000)}
            </span>
          )}
          {product.price_l && (
            <span className={styles.sizePrice}>
              <span className={styles.sizeLabel}>L</span>
              {formatPrice(product.price_l * 1000)}
            </span>
          )}
        </div>
      </div>

      {/* Add button */}
      <button
        className={styles.addBtn}
        onClick={e => { e.preventDefault(); }}
        aria-label={`Xem ${name}`}
      >
        +
      </button>
    </Link>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div style={{ padding: '64px 16px', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>}>
      <MenuContent />
    </Suspense>
  )
}
