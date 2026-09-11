'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import { DEFAULT_LOCATION } from '@/lib/locations'
import DeliveryLocationModal from '@/components/DeliveryLocationModal'
import styles from './cart.module.css'

export default function CartPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { items, updateQuantity, clearCart, subtotal } = useCart()
  const { showToast } = useToast()

  const [selectedLocation, setSelectedLocation] = useState<string>(DEFAULT_LOCATION.name_en)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('oc_delivery_location')
    if (saved) setSelectedLocation(saved)
  }, [])

  const handleLocationSelect = (locName: string) => {
    setSelectedLocation(locName)
    localStorage.setItem('oc_delivery_location', locName)
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyPage}>
        <header className={styles.header}>
          <h1 className={styles.title}>{lang === 'vi' ? 'Giỏ hàng' : 'Your Cart'}</h1>
        </header>
        <div className={styles.emptyState}>
          <span style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</span>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', margin: '0 0 6px' }}>
            {lang === 'vi' ? 'Giỏ hàng trống' : 'Your Cart is empty'}
          </h2>
          <p style={{ fontSize: '14px', color: '#718096', margin: '0 0 20px' }}>
            {lang === 'vi' ? 'Hãy thêm những món đồ uống thơm ngon vào giỏ nhé!' : 'Add your favorite coffee to get started!'}
          </p>
          <Link href="/menu" className={styles.btnMenu}>
            {lang === 'vi' ? 'Xem thực đơn One Coffee' : 'Explore Menu'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header matching Screen 5 */}
      <header className={styles.header}>
        <h1 className={styles.title}>{lang === 'vi' ? 'Giỏ hàng' : 'Your Cart'}</h1>
        <button
          className={styles.clearAllBtn}
          onClick={() => {
            if (confirm(lang === 'vi' ? 'Bạn có chắc muốn xóa giỏ hàng?' : 'Clear all items in cart?')) {
              clearCart()
              showToast(lang === 'vi' ? 'Đã xóa toàn bộ giỏ hàng' : 'Cart cleared', 'info')
            }
          }}
        >
          <span style={{ fontSize: '13px' }}>🗑️</span>
          <span>{lang === 'vi' ? 'Xóa tất cả' : 'Clear All'}</span>
        </button>
      </header>

      {/* Cart Items List matching Screen 5 */}
      <div className={styles.itemsList}>
        {items.map(item => {
          const name = lang === 'vi' ? item.name_vi : item.name_en
          const lineTotal = item.unit_price * item.quantity
          const itemImg = item.image_url || 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80'

          return (
            <div key={item.id} className={styles.itemRow}>
              {/* Thumbnail */}
              <div className={styles.thumbnailWrap}>
                <img src={itemImg} alt={name} className={styles.thumbnail} />
              </div>

              {/* Center Info */}
              <div className={styles.itemInfo}>
                <h3 className={styles.itemName}>{name}</h3>
                <p className={styles.itemSizePrice}>
                  Size {item.size} — {formatPrice(item.unit_price)}
                </p>

                {/* Quantity Stepper matching Screen 5 */}
                <div className={styles.stepperWrap}>
                  <button
                    className={styles.stepperBtn}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className={styles.stepperValue}>{item.quantity}</span>
                  <button
                    className={styles.stepperBtn}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Right Line Total matching Screen 5 */}
              <div className={styles.itemTotal}>
                {formatPrice(lineTotal)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Delivery Location Section matching Screen 5 */}
      <div
        className={styles.locationBox}
        onClick={() => setIsLocationModalOpen(true)}
      >
        <span className={styles.locationPin}>📍</span>
        <div className={styles.locationDetails}>
          <span className={styles.locationHead}>
            {lang === 'vi' ? 'Điểm nhận nước' : 'Delivery Location'}
          </span>
          <span className={styles.locationName}>{selectedLocation}</span>
        </div>
        <span className={styles.locationArrow}>›</span>
      </div>

      {/* Bottom Summary & Button matching Screen 5 */}
      <div className={styles.bottomBar}>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>{lang === 'vi' ? 'Tổng cộng' : 'Total'}</span>
          <span className={styles.totalAmount}>{formatPrice(subtotal)}</span>
        </div>

        <button
          className={styles.btnProceed}
          onClick={() => router.push('/checkout')}
        >
          {lang === 'vi' ? 'Tiến hành đặt hàng' : 'Proceed to Payment'}
        </button>
      </div>

      {/* 21 Locations Modal */}
      <DeliveryLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedLocation={selectedLocation}
        onSelect={handleLocationSelect}
      />
    </div>
  )
}
