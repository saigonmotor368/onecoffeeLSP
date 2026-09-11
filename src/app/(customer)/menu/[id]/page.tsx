'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { menuProducts, addons } from '@/lib/menu-data'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import styles from './product.module.css'

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useLang()
  const { addItem } = useCart()
  const { showToast } = useToast()

  const product = menuProducts.find(p => p.id === id)

  const [size, setSize] = useState<'M' | 'L'>(() => {
    if (product?.price_m) return 'M'
    return 'L'
  })
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])

  if (!product) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">😔</span>
        <p className="empty-state-title">Không tìm thấy món</p>
        <button className="btn btn-primary" onClick={() => router.back()}>Quay lại</button>
      </div>
    )
  }

  const name = lang === 'vi' ? product.name_vi : product.name_en
  const unitPrice = (size === 'M' ? product.price_m : product.price_l) ?? 0
  const addonTotal = selectedAddons.reduce((sum, id) => {
    const addon = addons.find(a => a.id === id)
    return sum + (addon?.price ?? 0)
  }, 0)
  const total = (unitPrice + addonTotal) * qty

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

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
      image_url: null,
    })
    showToast(lang === 'vi' ? 'Đã thêm vào giỏ hàng!' : 'Added to cart!', 'success')
    router.back()
  }

  return (
    <div className={styles.page}>
      {/* Back button */}
      <button className={styles.backBtn} onClick={() => router.back()}>←</button>

      {/* Product image hero */}
      <div className={styles.hero}>
        <div className={styles.heroImg}>
          <span className={styles.heroEmoji}>☕</span>
          {product.is_new && <span className={`${styles.heroBadge} ${styles.newBadge}`}>Mới</span>}
          {product.is_recommended && <span className={`${styles.heroBadge} ${styles.recBadge}`}>★ Gợi ý</span>}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{name}</h1>
          {product.is_featured && <span className={styles.featuredTag}>✨ Nổi bật</span>}
        </div>

        {product.description_vi && (
          <p className={styles.desc}>
            {lang === 'vi' ? product.description_vi : (product.description_en ?? product.description_vi)}
          </p>
        )}

        {/* Size selector */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Size</p>
          <div className={styles.sizeGroup}>
            {product.price_m && (
              <button
                className={`${styles.sizeBtn} ${size === 'M' ? styles.sizeBtnActive : ''}`}
                onClick={() => setSize('M')}
              >
                <span className={styles.sizeLetter}>M</span>
                <span className={styles.sizePrice}>{formatPrice(product.price_m * 1000)}</span>
                <span className={styles.sizeVol}>240ml</span>
              </button>
            )}
            {product.price_l && (
              <button
                className={`${styles.sizeBtn} ${size === 'L' ? styles.sizeBtnActive : ''}`}
                onClick={() => setSize('L')}
              >
                <span className={styles.sizeLetter}>L</span>
                <span className={styles.sizePrice}>{formatPrice(product.price_l * 1000)}</span>
                <span className={styles.sizeVol}>265ml</span>
              </button>
            )}
          </div>
        </div>

        {/* Addons */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Gọi thêm (+10.000đ/món)</p>
          <div className={styles.addonsGrid}>
            {addons.map(addon => (
              <button
                key={addon.id}
                className={`${styles.addonChip} ${selectedAddons.includes(addon.id) ? styles.addonChipActive : ''}`}
                onClick={() => toggleAddon(addon.id)}
              >
                {selectedAddons.includes(addon.id) && '✓ '}
                {lang === 'vi' ? addon.name_vi : addon.name_en}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Ghi chú (tuỳ chọn)</p>
          <textarea
            className={styles.notesInput}
            placeholder="VD: Ít đá, ít đường, không sữa..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Bottom bar: qty + add to cart */}
      <div className={styles.bottomBar}>
        <div className="qty-control">
          <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
          <span className="qty-value">{qty}</span>
          <button className="qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
        </div>
        <button className={`btn btn-primary ${styles.addCartBtn}`} onClick={handleAddToCart}>
          Thêm vào giỏ · {formatPrice(total * 1000)}
        </button>
      </div>
    </div>
  )
}
