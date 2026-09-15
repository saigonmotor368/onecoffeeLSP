'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import styles from './cart.module.css'

export default function CartPage() {
  const router = useRouter()
  const { lang } = useLang()
  const {
    items,
    updateQuantity,
    clearCart,
    subtotal,
    isDeliveryAvailable,
    remainingForDelivery,
    shippingFee,
    isLspEmployee,
    setIsLspEmployee,
    employeeDiscountPercent,
    employeeDiscount,
    appliedVoucher,
    voucherDiscount,
    finalAmount,
    applyVoucher,
    removeVoucher,
  } = useCart()

  const { showToast } = useToast()

  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [applyingVoucher, setApplyingVoucher] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('oc_delivery_location')
    if (saved) setSelectedLocation(saved)
  }, [])

  const handleApplyVoucher = async () => {
    if (!voucherCodeInput.trim()) {
      showToast(lang === 'vi' ? 'Vui lòng nhập mã khuyến mãi' : 'Please enter a voucher code', 'warning')
      return
    }
    setApplyingVoucher(true)
    const res = await applyVoucher(voucherCodeInput)
    setApplyingVoucher(false)
    if (res.success) {
      showToast(res.message, 'success')
      setVoucherCodeInput('')
    } else {
      showToast(res.message, 'error')
    }
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

  const deliveryPercent = Math.min(100, Math.round((subtotal / 200000) * 100))

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
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

      {/* Delivery Progress Card */}
      <div className={styles.freeshipCard}>
        <div className={styles.freeshipHeader}>
          <span>🚚</span>
          {isDeliveryAvailable ? (
            <span className={styles.freeshipSuccess}>
              {lang === 'vi' ? '🎉 Đơn hàng đủ điều kiện GIAO HÀNG TẬN NƠI!' : '🎉 Your order is eligible for DELIVERY!'}
            </span>
          ) : (
            <span>
              {lang === 'vi'
                ? `Thêm ${formatPrice(remainingForDelivery)} để được `
                : `Add ${formatPrice(remainingForDelivery)} more for `}
              <strong style={{ color: '#1E4D3B' }}>{lang === 'vi' ? 'GIAO HÀNG TẬN NƠI' : 'DELIVERY'}</strong>
            </span>
          )}
        </div>
        <div className={styles.freeshipProgressTrack}>
          <div
            className={styles.freeshipProgressBar}
            style={{ width: `${deliveryPercent}%` }}
          />
        </div>
        {!isDeliveryAvailable && (
          <div style={{ fontSize: '12px', color: '#E53E3E', marginTop: '6px', textAlign: 'center', fontWeight: 600 }}>
            {lang === 'vi' ? 'Đơn hàng dưới 200k vui lòng đến nhận hàng trực tiếp tại One Cafe' : 'Orders under 200k please pickup at One Cafe'}
          </div>
        )}
      </div>

      {/* Cart Items List */}
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

                {/* Quantity Stepper */}
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

              {/* Right Line Total */}
              <div className={styles.itemTotal}>
                {formatPrice(lineTotal)}
              </div>
            </div>
          )
        })}
      </div>

      {/* LSP Employee Verification Checkbox Card */}
      <div
        className={`${styles.lspToggleCard} ${isLspEmployee ? styles.lspToggleCardActive : ''}`}
        onClick={() => {
          const nextVal = !isLspEmployee
          setIsLspEmployee(nextVal)
          if (nextVal) {
            showToast(
              lang === 'vi'
                ? 'Đã áp dụng giảm 20% cho nhân viên LSP!'
                : 'Applied 20% LSP employee discount!',
              'success'
            )
          } else {
            showToast(
              lang === 'vi'
                ? 'Đã hủy ưu đãi nhân viên LSP (giá tiêu chuẩn)'
                : 'Removed LSP discount (standard price)',
              'info'
            )
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={isLspEmployee}
      >
        <div className={`${styles.lspCheckboxWrap} ${isLspEmployee ? styles.lspCheckboxWrapChecked : ''}`}>
          {isLspEmployee ? <span className={styles.customCheckmark}>✓</span> : null}
        </div>
        <div className={styles.lspToggleBody}>
          <div className={styles.lspToggleTitleRow}>
            <span className={styles.lspToggleTitle}>
              {lang === 'vi' ? 'Bạn có phải là nhân viên LSP không?' : 'Are you an LSP employee?'}
            </span>
            <span className={`${styles.lspBadge} ${isLspEmployee ? styles.lspBadgeActive : ''}`}>
              LSP
            </span>
          </div>
          <p className={styles.lspToggleSub}>
            {lang === 'vi'
              ? 'Tích chọn để tự động giảm 20% toàn bộ đồ uống (dành riêng cho CBCNV LSP)'
              : 'Check this box to get 20% off drinks for LSP staff'}
          </p>
        </div>
        {isLspEmployee && employeeDiscount > 0 && (
          <div className={styles.lspSavingsPill}>
            -{formatPrice(employeeDiscount)}
          </div>
        )}
      </div>

      {/* Voucher Input & Applied Voucher */}
      <div className={styles.voucherSection}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A202C' }}>
          {lang === 'vi' ? '🎫 Voucher & Khuyến mãi' : '🎫 Vouchers & Promotions'}
        </div>

        {appliedVoucher ? (
          <div className={styles.appliedVoucherTag}>
            <div className={styles.voucherTagLeft}>
              <span>✓</span>
              <span>
                {appliedVoucher.code} ({appliedVoucher.type === 'percent' ? `-${appliedVoucher.value}%` : `-${formatPrice(appliedVoucher.value)}`})
              </span>
              <span style={{ fontWeight: 800, color: '#2B6CB0', marginLeft: '4px' }}>
                (-{formatPrice(voucherDiscount)})
              </span>
            </div>
            <button
              className={styles.btnRemoveVoucher}
              onClick={() => {
                removeVoucher()
                showToast(lang === 'vi' ? 'Đã hủy voucher' : 'Voucher removed', 'info')
              }}
              title={lang === 'vi' ? 'Xóa voucher' : 'Remove voucher'}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className={styles.voucherInputRow}>
            <input
              type="text"
              className={styles.voucherInput}
              placeholder={lang === 'vi' ? 'Nhập mã giảm giá...' : 'Enter promo code...'}
              value={voucherCodeInput}
              onChange={e => setVoucherCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') handleApplyVoucher() }}
            />
            <button
              className={styles.btnApplyVoucher}
              onClick={handleApplyVoucher}
              disabled={applyingVoucher}
            >
              {applyingVoucher ? '...' : (lang === 'vi' ? 'Áp dụng' : 'Apply')}
            </button>
          </div>
        )}
      </div>

      {/* Delivery Address Section - removed from Cart. They will select it in Checkout */}

      {/* Bill Breakdown Card */}
      <div className={styles.billCard}>
        <div className={styles.billTitle}>
          {lang === 'vi' ? 'Chi tiết thanh toán' : 'Payment Breakdown'}
        </div>
        <div className={styles.billRow}>
          <span>{lang === 'vi' ? 'Tạm tính tiền món' : 'Item Subtotal'}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {employeeDiscount > 0 && (
          <div className={styles.billRowGreen}>
            <span>{lang === 'vi' ? 'Chiết khấu nhân viên LSP (-20%)' : 'LSP Staff Discount (-20%)'}</span>
            <span>-{formatPrice(employeeDiscount)}</span>
          </div>
        )}
        {voucherDiscount > 0 && (
          <div className={styles.billRowGreen}>
            <span>{lang === 'vi' ? `Mã khuyến mãi (${appliedVoucher?.code})` : `Voucher (${appliedVoucher?.code})`}</span>
            <span>-{formatPrice(voucherDiscount)}</span>
          </div>
        )}

        <div className={styles.billDivider} />
        <div className={styles.billRowTotal}>
          <span>{lang === 'vi' ? 'Tổng thanh toán' : 'Total Amount'}</span>
          <span style={{ color: '#1E4D3B' }}>{formatPrice(finalAmount)}</span>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomTotalRow}>
          <span className={styles.bottomTotalLabel}>
            {lang === 'vi' ? 'Tổng thanh toán' : 'Total Amount'}
          </span>
          <span className={styles.bottomTotalAmount}>{formatPrice(finalAmount)}</span>
        </div>

        <button
          className={styles.btnProceed}
          onClick={() => router.push('/checkout')}
        >
          {lang === 'vi' ? 'Tiến hành đặt hàng →' : 'Proceed to Checkout →'}
        </button>
      </div>
    </div>
  )
}
