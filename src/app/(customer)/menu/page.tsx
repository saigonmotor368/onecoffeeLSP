'use client'

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { menuProducts, categories, getProductImage, type MenuProduct } from '@/lib/menu-data'
import { useLang } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import styles from './menu.module.css'

function MenuContent() {
  const { t, lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSlug, setActiveSlug] = useState(searchParams.get('cat') ?? 'coffee')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return search.trim()
      ? menuProducts.filter(p =>
          p.name_vi.toLowerCase().includes(search.toLowerCase()) ||
          p.name_en.toLowerCase().includes(search.toLowerCase())
        )
      : menuProducts.filter(p => p.category_slug === activeSlug)
  }, [activeSlug, search])

  const currentCategory = categories.find(c => c.slug === activeSlug)

  return (
    <div className={styles.page}>
      {/* Header matching Screen 3 */}
      <header className={styles.header}>
        <h1 className={styles.title}>{t('menu')}</h1>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={lang === 'vi' ? 'Tìm đồ uống, bánh ngọt...' : 'Search drinks, bakery...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </header>

      {/* Category Pills matching Screen 3 */}
      {!search && (
        <div className={styles.categoryPillsWrap}>
          <div className={styles.categoryPills}>
            {categories.map(cat => {
              const isActive = activeSlug === cat.slug
              const label = lang === 'vi' ? `${cat.icon} ${cat.name_vi}` : `${cat.icon} ${cat.name_en}`
              return (
                <button
                  key={cat.slug}
                  className={`${styles.categoryPill} ${isActive ? styles.categoryPillActive : ''}`}
                  onClick={() => setActiveSlug(cat.slug)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Category Section Header matching Screen 3 */}
      {!search && currentCategory && (
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {currentCategory.icon} {lang === 'vi' ? currentCategory.name_vi : currentCategory.name_en}
          </h2>
        </div>
      )}

      {search && (
        <p className={styles.searchResults}>
          {lang === 'vi' ? `Kết quả cho "${search}"` : `Results for "${search}"`} ({filtered.length})
        </p>
      )}

      {/* Product List matching Screen 3 */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">☕</span>
          <p className="empty-state-title">
            {lang === 'vi' ? 'Không tìm thấy món' : 'No items found'}
          </p>
          <p className="empty-state-desc">
            {lang === 'vi' ? 'Thử tìm từ khóa khác nhé' : 'Try searching another keyword'}
          </p>
        </div>
      ) : (
        <div className={styles.productList}>
          {filtered.map(product => (
            <MenuProductItem key={product.id} product={product} lang={lang} />
          ))}
        </div>
      )}

      <div style={{ height: 'var(--space-8)' }} />
    </div>
  )
}

function MenuProductItem({ product, lang }: { product: MenuProduct; lang: string }) {
  const imageUrl = getProductImage(product)
  const primaryName = lang === 'vi' ? product.name_vi : product.name_en
  const secondaryName = lang === 'vi' ? product.name_en : product.name_vi

  return (
    <Link href={`/menu/${product.id}`} className={styles.productRow}>
      {/* Thumbnail */}
      <div className={styles.thumbnailWrap}>
        <img src={imageUrl} alt={primaryName} className={styles.thumbnail} />
      </div>

      {/* Info matching Screen 3 */}
      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{primaryName}</h3>
        <p className={styles.productSub}>{secondaryName}</p>

        <div className={styles.sizePrices}>
          {product.price_m && product.price_l ? (
            <>
              <span className={styles.sizePrice}>
                <strong className={styles.sizeLetter}>M</strong> {formatPrice(product.price_m * 1000)}
              </span>
              <span className={styles.sizePrice}>
                <strong className={styles.sizeLetter}>L</strong> {formatPrice(product.price_l * 1000)}
              </span>
            </>
          ) : (
            <span className={styles.sizePrice}>
              {formatPrice(((product.price_m ?? product.price_l) ?? 0) * 1000)}
            </span>
          )}
        </div>
      </div>

      {/* Square Dark Green + Button matching Screen 3 */}
      <div className={styles.addBtnSquare}>
        +
      </div>
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
