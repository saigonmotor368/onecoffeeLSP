'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { menuProducts, categories, getProductImage, type MenuProduct } from '@/lib/menu-data'
import { useLang, useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useFavorites } from '@/lib/favorites'
import styles from './menu.module.css'

const allCategories = [
  { slug: 'all', name_vi: 'Tất cả', name_en: 'All Menu', icon: '✨', sort_order: 0 },
  { slug: 'favorites', name_vi: 'Yêu thích', name_en: 'Favorites', icon: '❤️', sort_order: 1 },
  ...categories,
]

function MenuContent() {
  const { t, lang } = useLang()
  const { showToast } = useToast()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSlug, setActiveSlug] = useState(searchParams.get('cat') ?? 'all')
  const [search, setSearch] = useState('')
  const [productsList, setProductsList] = useState<MenuProduct[]>(menuProducts)

  useEffect(() => {
    const catParam = searchParams.get('cat')
    if (catParam) {
      setActiveSlug(catParam)
    }
  }, [searchParams])

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase
        .from('products')
        .select('*, categories(slug)')
        .eq('is_available', true)
        .order('sort_order', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const mapped: MenuProduct[] = (data as any[]).map((d: any) => ({
              id: d.id,
              category_slug: d.categories?.slug || 'coffee',
              name_vi: d.name_vi,
              name_en: d.name_en,
              description_vi: d.description_vi,
              description_en: d.description_en,
              price_m: d.price_m,
              price_l: d.price_l,
              image_url: d.image_url,
              is_featured: d.is_featured,
              is_new: d.is_new,
              is_recommended: d.is_recommended,
            }))
            setProductsList(mapped)
          }
        })
    } catch {
      // fallback to static menuProducts
    }
  }, [])

  const filtered = useMemo(() => {
    if (search.trim()) {
      return productsList.filter(p =>
        p.name_vi.toLowerCase().includes(search.toLowerCase()) ||
        p.name_en.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (activeSlug === 'all') return productsList
    if (activeSlug === 'favorites') return productsList.filter(p => favorites.includes(p.id))
    return productsList.filter(p => p.category_slug === activeSlug)
  }, [activeSlug, search, productsList, favorites])

  const currentCategory = allCategories.find(c => c.slug === activeSlug)

  const handleToggleFav = (productId: string) => {
    const added = toggleFavorite(productId)
    showToast(
      added
        ? (lang === 'vi' ? 'Đã thêm vào yêu thích ❤️' : 'Added to favorites ❤️')
        : (lang === 'vi' ? 'Đã bỏ yêu thích' : 'Removed from favorites'),
      'info'
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
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

      {/* Category Pills with 'Tất cả' & 'Yêu thích' */}
      {!search && (
        <div className={styles.categoryPillsWrap}>
          <div className={styles.categoryPills}>
            {allCategories.map(cat => {
              const isActive = activeSlug === cat.slug
              let label = lang === 'vi' ? `${cat.icon} ${cat.name_vi}` : `${cat.icon} ${cat.name_en}`
              if (cat.slug === 'favorites' && favorites.length > 0) {
                label += ` (${favorites.length})`
              }
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

      {/* Search results summary */}
      {search && (
        <p className={styles.searchResults}>
          {lang === 'vi' ? `Kết quả tìm kiếm cho "${search}"` : `Search results for "${search}"`} ({filtered.length})
        </p>
      )}

      {/* When searching or viewing single category */}
      {(search || activeSlug !== 'all') && (
        <div>
          {!search && currentCategory && (
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                {currentCategory.icon} {lang === 'vi' ? currentCategory.name_vi : currentCategory.name_en}
                <span className={styles.sectionCount}>({filtered.length})</span>
              </h2>
            </div>
          )}

          {filtered.length === 0 ? (
            activeSlug === 'favorites' ? (
              <div className="empty-state" style={{ padding: '48px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>❤️</span>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1E4D3B', margin: '0 0 6px' }}>
                  {lang === 'vi' ? 'Chưa có món yêu thích nào' : 'No favorite items yet'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '320px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                  {lang === 'vi'
                    ? 'Bấm vào biểu tượng trái tim ❤️ ở bất kỳ món đồ uống nào để thêm nhanh vào danh mục yêu thích nhé!'
                    : 'Tap the heart ❤️ icon on any drink to quickly save it to your favorites!'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSlug('all')}
                  style={{
                    background: '#1E4D3B',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(30, 77, 59, 0.3)'
                  }}
                >
                  {lang === 'vi' ? '☕ Khám phá Menu ngay' : '☕ Explore Menu Now'}
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">☕</span>
                <p className="empty-state-title">
                  {lang === 'vi' ? 'Không tìm thấy món' : 'No items found'}
                </p>
                <p className="empty-state-desc">
                  {lang === 'vi' ? 'Thử tìm từ khóa khác nhé' : 'Try searching another keyword'}
                </p>
              </div>
            )
          ) : (
            <div className={styles.productList}>
              {filtered.map(product => (
                <MenuProductItem
                  key={product.id}
                  product={product}
                  lang={lang}
                  isFav={isFavorite(product.id)}
                  onToggleFav={handleToggleFav}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULL CATALOG VIEW: when 'all' is active and not searching */}
      {activeSlug === 'all' && !search && (
        <div className={styles.catalogAll}>
          {categories.map(cat => {
            const catItems = productsList.filter(p => p.category_slug === cat.slug)
            if (catItems.length === 0) return null

            return (
              <section key={cat.slug} className={styles.catalogSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {cat.icon} {lang === 'vi' ? cat.name_vi : cat.name_en}
                    <span className={styles.sectionCount}>({catItems.length})</span>
                  </h2>
                </div>

                <div className={styles.productList}>
                  {catItems.map(product => (
                    <MenuProductItem
                      key={product.id}
                      product={product}
                      lang={lang}
                      isFav={isFavorite(product.id)}
                      onToggleFav={handleToggleFav}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <div style={{ height: 'var(--space-8)' }} />
    </div>
  )
}

function MenuProductItem({
  product,
  lang,
  isFav,
  onToggleFav,
}: {
  product: MenuProduct
  lang: string
  isFav?: boolean
  onToggleFav?: (id: string) => void
}) {
  const imageUrl = getProductImage(product)
  const primaryName = lang === 'vi' ? product.name_vi : product.name_en
  const secondaryName = lang === 'vi' ? product.name_en : product.name_vi

  return (
    <Link href={`/menu/${product.id}`} className={styles.productRow}>
      {/* Thumbnail with heart button */}
      <div className={styles.thumbnailWrap} style={{ position: 'relative' }}>
        <img
          src={imageUrl}
          alt={primaryName}
          className={styles.thumbnail}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'
          }}
        />
        {onToggleFav && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFav(product.id)
            }}
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(4px)',
              border: 'none',
              borderRadius: '50%',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              zIndex: 2,
            }}
            aria-label="Yêu thích"
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      {/* Info */}
      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{primaryName}</h3>
        <p className={styles.productSub}>{secondaryName}</p>

        <div className={styles.sizePrices}>
          {product.price_m && product.price_l ? (
            <>
              <span className={styles.sizePrice}>
                <strong className={styles.sizeLetter}>M</strong> {formatPrice(product.price_m)}
              </span>
              <span className={styles.sizePrice}>
                <strong className={styles.sizeLetter}>L</strong> {formatPrice(product.price_l)}
              </span>
            </>
          ) : (
            <span className={styles.sizePrice}>
              {formatPrice(product.price_m ?? product.price_l)}
            </span>
          )}
        </div>
      </div>

      {/* Square Dark Green + Button */}
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
