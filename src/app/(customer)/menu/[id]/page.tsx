'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { menuProducts, addons, getProductImage, type MenuProduct } from '@/lib/menu-data'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice, toVndPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useFavorites } from '@/lib/favorites'
import styles from './product.module.css'

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { lang } = useLang()
  const { addItem } = useCart()
  const { showToast } = useToast()
  const { isFavorite: checkFav, toggleFavorite } = useFavorites()
  const isFavorite = checkFav(id)

  const [product, setProduct] = useState<MenuProduct>(() => {
    return menuProducts.find(p => p.id === id) || menuProducts[0]
  })

  // Multi-size quantities (supports picking both M and L at the same time)
  const [qtyM, setQtyM] = useState<number>(() => (product.price_m ? 1 : 0))
  const [qtyL, setQtyL] = useState<number>(() => (!product.price_m && product.price_l ? 1 : 0))
  const [notes, setNotes] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    const found = menuProducts.find(p => p.id === id)
    if (found) {
      setProduct(found)
      if (found.price_m) {
        setQtyM(1)
        setQtyL(0)
      } else if (found.price_l) {
        setQtyM(0)
        setQtyL(1)
      }
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
          const loadedProduct: MenuProduct = {
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
          }
          setProduct(loadedProduct)
          if (loadedProduct.price_m) {
            setQtyM(1)
            setQtyL(0)
          } else if (loadedProduct.price_l) {
            setQtyM(0)
            setQtyL(1)
          }
        }
      })
  }, [id])

  const titleEn = product.name_en
  const titleVi = product.name_vi
  const imageUrl = getProductImage(product)
  const isFood = product.category_slug === 'food'
  const hasBothSizes = Boolean(product.price_m && product.price_l)

  // Addon calculation
  const addonTotal = selectedAddons.reduce((sum, aId) => {
    const addon = addons.find(a => a.id === aId)
    return sum + toVndPrice(addon?.price ?? 10)
  }, 0)

  const unitPriceM = product.price_m ? toVndPrice(product.price_m) + addonTotal : 0
  const unitPriceL = product.price_l ? toVndPrice(product.price_l) + addonTotal : 0

  const totalCups = (product.price_m ? qtyM : 0) + (product.price_l ? qtyL : 0)
  const totalPrice = (product.price_m ? qtyM * unitPriceM : 0) + (product.price_l ? qtyL * unitPriceL : 0)

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(a => a !== addonId) : [...prev, addonId]
    )
  }

  const handleAddToCart = () => {
    if (totalCups <= 0) {
      showToast(
        lang === 'vi' ? 'Vui lòng chọn ít nhất 1 ly/món!' : 'Please select at least 1 item!',
        'error'
      )
      return
    }

    const addedParts: string[] = []

    // Add Size M if quantity > 0
    if (product.price_m && qtyM > 0) {
      addItem({
        product_id: product.id,
        name_vi: product.name_vi,
        name_en: product.name_en,
        size: 'M',
        quantity: qtyM,
        unit_price: unitPriceM,
        addon_ids: selectedAddons,
        notes,
        image_url: imageUrl,
      })
      addedParts.push(`${qtyM} ly M`)
    }

    // Add Size L if quantity > 0
    if (product.price_l && qtyL > 0) {
      addItem({
        product_id: product.id,
        name_vi: product.name_vi,
        name_en: product.name_en,
        size: 'L',
        quantity: qtyL,
        unit_price: unitPriceL,
        addon_ids: selectedAddons,
        notes,
        image_url: imageUrl,
      })
      addedParts.push(`${qtyL} ly L`)
    }

    const toastMsg = lang === 'vi'
      ? `Đã thêm ${totalCups} ly vào giỏ hàng (${addedParts.join(' + ')})!`
      : `Added ${totalCups} cup${totalCups > 1 ? 's' : ''} to cart (${addedParts.join(' + ')})!`

    showToast(toastMsg, 'success')
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
            const added = toggleFavorite(id)
            showToast(
              added
                ? (lang === 'vi' ? 'Đã lưu vào yêu thích ❤️' : 'Added to favorites ❤️')
                : (lang === 'vi' ? 'Đã bỏ yêu thích' : 'Removed from favorites'),
              'info'
            )
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
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'
          }}
        />
      </div>

      {/* Product Detail Card Sheet */}
      <div className={styles.detailSheet}>
        {/* Title & Price range */}
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>{titleEn}</h1>
          <p className={styles.subTitle}>{titleVi}</p>
          <div className={styles.priceTag}>
            {hasBothSizes ? (
              <span>
                {formatPrice(product.price_m)} ~ {formatPrice(product.price_l)}
              </span>
            ) : (
              <span>{formatPrice(product.price_m || product.price_l)}</span>
            )}
          </div>
        </div>

        {/* Multi-Size & Quantity Selection: Allows picking both M and L at the same time! */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeadingRow}>
            <h3 className={styles.sectionHeading}>
              {hasBothSizes
                ? (lang === 'vi' ? 'Chọn kích cỡ & số lượng' : 'Select Size & Quantity')
                : (lang === 'vi' ? 'Số lượng' : 'Quantity')}
            </h3>
            {totalCups > 0 && (
              <span className={styles.totalCupsBadge}>
                {totalCups} {lang === 'vi' ? (isFood ? 'phần đã chọn' : 'ly đã chọn') : 'selected'}
              </span>
            )}
          </div>

          <div className={styles.sizeSelectionList}>
            {/* Size M Card */}
            {product.price_m && (
              <div
                className={`${styles.sizeCard} ${qtyM > 0 ? styles.sizeCardActive : ''}`}
              >
                <div
                  className={styles.sizeCardInfo}
                  onClick={() => {
                    if (qtyM === 0) setQtyM(1)
                  }}
                >
                  <div
                    className={`${styles.sizeBadge} ${qtyM > 0 ? styles.sizeBadgeActive : ''}`}
                  >
                    {isFood ? '🍽️' : 'M'}
                  </div>
                  <div className={styles.sizeMeta}>
                    <div className={styles.sizeTitle}>
                      {isFood
                        ? (lang === 'vi' ? 'Khẩu phần tiêu chuẩn' : 'Standard Portion')
                        : hasBothSizes
                        ? (lang === 'vi' ? 'Size M (Ly vừa)' : 'Size M (Medium)')
                        : (lang === 'vi' ? 'Cỡ tiêu chuẩn' : 'Standard Size')}
                    </div>
                    <div className={styles.sizePrice}>
                      {formatPrice(unitPriceM)}
                      {addonTotal > 0 && (
                        <span className={styles.addonPriceNote}>
                          {' '}(+{formatPrice(addonTotal)} topping)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.sizeStepper}>
                  <button
                    type="button"
                    className={styles.stepperMiniBtn}
                    onClick={() => setQtyM(Math.max(0, qtyM - 1))}
                    disabled={qtyM === 0}
                    aria-label="Decrease Size M"
                  >
                    −
                  </button>
                  <span
                    className={`${styles.stepperMiniQty} ${qtyM > 0 ? styles.stepperMiniQtyActive : ''}`}
                  >
                    {qtyM}
                  </span>
                  <button
                    type="button"
                    className={`${styles.stepperMiniBtn} ${styles.stepperMiniBtnPlus}`}
                    onClick={() => setQtyM(qtyM + 1)}
                    aria-label="Increase Size M"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Size L Card */}
            {product.price_l && (
              <div
                className={`${styles.sizeCard} ${qtyL > 0 ? styles.sizeCardActive : ''}`}
              >
                <div
                  className={styles.sizeCardInfo}
                  onClick={() => {
                    if (qtyL === 0) setQtyL(1)
                  }}
                >
                  <div
                    className={`${styles.sizeBadge} ${qtyL > 0 ? styles.sizeBadgeActive : ''}`}
                  >
                    L
                  </div>
                  <div className={styles.sizeMeta}>
                    <div className={styles.sizeTitle}>
                      {lang === 'vi' ? 'Size L (Ly lớn)' : 'Size L (Large)'}
                    </div>
                    <div className={styles.sizePrice}>
                      {formatPrice(unitPriceL)}
                      {addonTotal > 0 && (
                        <span className={styles.addonPriceNote}>
                          {' '}(+{formatPrice(addonTotal)} topping)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.sizeStepper}>
                  <button
                    type="button"
                    className={styles.stepperMiniBtn}
                    onClick={() => setQtyL(Math.max(0, qtyL - 1))}
                    disabled={qtyL === 0}
                    aria-label="Decrease Size L"
                  >
                    −
                  </button>
                  <span
                    className={`${styles.stepperMiniQty} ${qtyL > 0 ? styles.stepperMiniQtyActive : ''}`}
                  >
                    {qtyL}
                  </span>
                  <button
                    type="button"
                    className={`${styles.stepperMiniBtn} ${styles.stepperMiniBtnPlus}`}
                    onClick={() => setQtyL(qtyL + 1)}
                    aria-label="Increase Size L"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optional Add-ons / Toppings (for drinks) */}
        {!isFood && (
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeadingRow}>
              <h3 className={styles.sectionHeading}>
                {lang === 'vi' ? 'Topping thêm (tùy chọn)' : 'Add-ons (optional)'}
              </h3>
              <span className={styles.addonNotice}>
                {lang === 'vi' ? '+10.000đ/phần' : '+10,000đ/item'}
              </span>
            </div>
            <div className={styles.addonGrid}>
              {addons.map(addon => {
                const isSelected = selectedAddons.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    type="button"
                    className={`${styles.addonChip} ${isSelected ? styles.addonChipActive : ''}`}
                    onClick={() => toggleAddon(addon.id)}
                  >
                    <span className={styles.addonCheck}>
                      {isSelected ? '✓' : '+'}
                    </span>
                    <span className={styles.addonName}>
                      {lang === 'vi' ? addon.name_vi : addon.name_en}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Note Input */}
        <div className={styles.sectionBlock}>
          <h3 className={styles.sectionHeading}>
            {lang === 'vi' ? 'Ghi chú đơn (tùy chọn)' : 'Note (optional)'}
          </h3>
          <input
            type="text"
            className={styles.noteInput}
            placeholder={
              lang === 'vi'
                ? 'Ví dụ: 1 ly ít đường, 1 ly không đá, thêm ống hút...'
                : 'E.g. 1 cup less sugar, 1 cup no ice...'
            }
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className={styles.bottomBar}>
          <button
            className={`${styles.btnAddToCart} ${totalCups === 0 ? styles.btnDisabled : ''}`}
            onClick={handleAddToCart}
            disabled={totalCups === 0}
          >
            <span style={{ fontSize: '18px', marginRight: '8px' }}>🛒</span>
            <span>
              {lang === 'vi' ? 'Thêm vào giỏ' : 'Add to Cart'}
              {totalCups > 0 && (
                <span style={{ opacity: 0.9, marginLeft: '6px', fontSize: '13px', fontWeight: 500 }}>
                  ({totalCups} {lang === 'vi' ? (isFood ? 'món' : 'ly') : 'cups'}
                  {hasBothSizes && qtyM > 0 && qtyL > 0 ? `: ${qtyM}M + ${qtyL}L` : ''})
                </span>
              )}
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 800 }}>
              {totalCups > 0 ? formatPrice(totalPrice) : (lang === 'vi' ? '0đ' : '$0')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
