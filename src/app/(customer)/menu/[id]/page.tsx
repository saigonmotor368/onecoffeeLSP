'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { menuProducts, addons, getProductImage } from '@/lib/menu-data'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import styles from './product.module.css'

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useLang()
  const { addItem } = useCart()
  const { showToast } = useToast()

  const product = menuProducts.find(p => p.id === id) || menuProducts[0]

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

  const unitPrice = (size === 'M' ? product.price_m : product.price_l) ?? (product.price_m || product.price_l || 48)
  const addonTotal = selectedAddons.reduce((sum, aId) => {
    const addon = addons.find(a => a.id === aId)
    return sum + (addon?.price ?? 0)
  }, 0)
  const totalPrice = (unitPrice + addonTotal) * qty * 1000

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      name_vi: product.name_vi,
      name_en: product.name_en,
      size,
      quantity: qty,
      unit_price: (unitPrice + addonTotal) * 1000,
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
        />
      </div>

      {/* Product Detail Card Sheet matching Screen 4 */}
      <div className={styles.detailSheet}>
        {/* Title & Subtitle */}
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>{titleEn}</h1>
          <p className={styles.subTitle}>{titleVi}</p>
          <div className={styles.priceTag}>
            {formatPrice(unitPrice * 1000)}
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
                <span className={styles.sizeCost}>{formatPrice(product.price_m * 1000)}</span>
              </button>
              <button
                type="button"
                className={`${styles.sizeBtn} ${size === 'L' ? styles.sizeBtnActive : ''}`}
                onClick={() => setSize('L')}
              >
                <span className={styles.sizeTitle}>L</span>
                <span className={styles.sizeCost}>{formatPrice(product.price_l * 1000)}</span>
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
