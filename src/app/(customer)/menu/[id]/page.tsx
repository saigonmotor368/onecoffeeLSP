'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { menuProducts, addons, getProductImage, type MenuProduct } from '@/lib/menu-data'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice, toVndPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import styles from './product.module.css'

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useLang()
  const { addItem } = useCart()
  const { showToast } = useToast()

  const [product, setProduct] = useState<MenuProduct>(() => {
    return menuProducts.find(p => p.id === id) || menuProducts[0]
  })

  useEffect(() => {
    if (!id) return
    const found = menuProducts.find(p => p.id === id)
    if (found) {
      setProduct(found)
      return
    }

    // Lookup from Supabase by UUID
    const supabase = createClient()
    supabase
      .from('products')
      .select('*, categories(slug)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as any
          setProduct({
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
          })
        }
      })
  }, [id])

  const [size, setSize] = useState<'M' | 'L'>(() => {
    if (product.price_m) return 'M'
    return 'L'
  })
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])

  const titleEn = product.name_en
  const titleVi = product.name_vi
  const imageUrl = getProductImage(product)

  const rawUnitPrice = (size === 'M' ? product.price_m : product.price_l) ?? (product.price_m || product.price_l || 48)
  const unitPrice = toVndPrice(rawUnitPrice)
  const addonTotal = selectedAddons.reduce((sum, aId) => {
    const addon = addons.find(a => a.id === aId)
    return sum + toVndPrice(addon?.price ?? 10)
  }, 0)
  const calculatedUnitPrice = unitPrice + addonTotal
  const totalPrice = calculatedUnitPrice * qty

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      name_vi: product.name_vi,
      name_en: product.name_en,
      size,
      quantity: qty,
      unit_price: calculatedUnitPrice,
      addon_ids: selectedAddons,
      notes,
      image_url: imageUrl,
    })
    showToast(lang === 'vi' ? 'Đã thêm vào giỏ hàng!' : 'Added to cart!', 'success')
    router.back()
  }

  return (
    <div className={styles.pageContainer}>
      {/* Top Floating Nav matching Screen 4 */}
      <div className={styles.topNav}>
        <button
          className={styles.iconCircleBtn}
          onClick={() => router.back()}
          aria-label="Back"
        >
          ‹
        </button>
        <button
          className={styles.iconCircleBtn}
          onClick={() => {
            setIsFavorite(!isFavorite)
            showToast(isFavorite ? 'Đã bỏ yêu thích' : 'Đã lưu vào yêu thích ❤️', 'info')
          }}
          aria-label="Favorite"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Hero Image matching Screen 4 */}
      <div className={styles.heroImageWrap}>
        <img
          src={imageUrl}
          alt={product.name_en}
          className={styles.heroImage}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'
          }}
        />
      </div>

      {/* Product Detail Card Sheet matching Screen 4 */}
      <div className={styles.detailSheet}>
        {/* Title & Subtitle */}
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>{titleEn}</h1>
          <p className={styles.subTitle}>{titleVi}</p>
          <div className={styles.priceTag}>
            {formatPrice(calculatedUnitPrice)}
          </div>
        </div>

        {/* Size Selection matching Screen 4 (only if both sizes exist) */}
        {product.price_m && product.price_l && (
          <div className={styles.sectionBlock}>
            <h3 className={styles.sectionHeading}>{lang === 'vi' ? 'Kích cỡ' : 'Size'}</h3>
            <div className={styles.sizeSegmentGrid}>
              <button
                type="button"
                className={`${styles.sizeBtn} ${size === 'M' ? styles.sizeBtnActive : ''}`}
                onClick={() => setSize('M')}
              >
                <span className={styles.sizeTitle}>M</span>
                <span className={styles.sizeCost}>{formatPrice(product.price_m)}</span>
              </button>
              <button
                type="button"
                className={`${styles.sizeBtn} ${size === 'L' ? styles.sizeBtnActive : ''}`}
                onClick={() => setSize('L')}
              >
                <span className={styles.sizeTitle}>L</span>
                <span className={styles.sizeCost}>{formatPrice(product.price_l)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Quantity Stepper matching Screen 4 */}
        <div className={styles.sectionBlock}>
          <h3 className={styles.sectionHeading}>{lang === 'vi' ? 'Số lượng' : 'Quantity'}</h3>
          <div className={styles.stepperWrap}>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => setQty(Math.max(1, qty - 1))}
            >
              −
            </button>
            <span className={styles.stepperQty}>{qty}</span>
            <button
              type="button"
              className={`${styles.stepperBtn} ${styles.stepperBtnGreen}`}
              onClick={() => setQty(qty + 1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Note Input matching Screen 4 */}
        <div className={styles.sectionBlock}>
          <h3 className={styles.sectionHeading}>
            {lang === 'vi' ? 'Ghi chú (tùy chọn)' : 'Note (optional)'}
          </h3>
          <input
            type="text"
            className={styles.noteInput}
            placeholder={lang === 'vi' ? 'Ví dụ: ít đá, không đường, thêm ly giấy...' : 'E.g. less ice, no sugar...'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Bottom Sticky Action matching Screen 4 */}
        <div className={styles.bottomBar}>
          <button
            className={styles.btnAddToCart}
            onClick={handleAddToCart}
          >
            <span style={{ fontSize: '18px', marginRight: '8px' }}>🛒</span>
            <span>{lang === 'vi' ? 'Thêm vào giỏ' : 'Add to Cart'}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{formatPrice(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
