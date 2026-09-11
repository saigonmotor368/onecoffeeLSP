'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import { addons } from '@/lib/menu-data'
import styles from './cart.module.css'

const VOUCHERS_MOCK: Record<string, { type: 'percent' | 'fixed'; value: number; min: number; max?: number }> = {
  'WELCOME10': { type: 'percent', value: 10, min: 50, max: 50 },
  'LSP50K':    { type: 'fixed',   value: 50, min: 150 },
}

export default function CartPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { items, removeItem, updateQuantity, clearCart, subtotal } = useCart()
  const { showToast } = useToast()

  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<null | { code: string; discount: number }>(null)
  const [voucherError, setVoucherError] = useState('')

  const applyVoucher = () => {
    const v = VOUCHERS_MOCK[voucherCode.toUpperCase()]
    if (!v) {
      setVoucherError('Mã voucher không hợp lệ')
      return
    }
    if (subtotal / 1000 < v.min) {
      setVoucherError(`Đơn tối thiểu ${formatPrice(v.min * 1000)}`)
      return
    }
    let discount = v.type === 'percent'
      ? (subtotal * v.value) / 100
      : v.value * 1000
    if (v.max) discount = Math.min(discount, v.max * 1000)
    setAppliedVoucher({ code: voucherCode.toUpperCase(), discount })
    setVoucherError('')
    showToast(`Áp dụng ${voucherCode.toUpperCase()} thành công!`, 'success')
  }

  const discount = appliedVoucher?.discount ?? 0
  const total = Math.max(0, subtotal - discount)

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.back()}>←</button>
          <h1 className={styles.title}>Giỏ hàng</h1>
          <div style={{ width: 40 }} />
        </header>
        <div className="empty-state" style={{ marginTop: 80 }}>
          <span className="empty-state-icon">🛒</span>
          <p className="empty-state-title">Giỏ hàng trống</p>
          <p className="empty-state-desc">Hãy chọn đồ uống yêu thích để thêm vào giỏ!</p>
          <Link href="/menu" className="btn btn-primary" style={{ marginTop: 8 }}>Xem Menu</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>←</button>
        <h1 className={styles.title}>Giỏ hàng ({items.length} món)</h1>
        <button className={styles.clearBtn} onClick={() => { clearCart(); showToast('Đã xóa giỏ hàng', 'info') }}>
          Xóa
        </button>
      </header>

      <div className={styles.content}>
        {/* Cart items */}
        <div className={styles.itemsList}>
          {items.map(item => {
            const name = lang === 'vi' ? item.name_vi : item.name_en
            const itemAddons = item.addon_ids
              .map(id => addons.find(a => a.id === id))
              .filter(Boolean)
            return (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.itemImg}>☕</div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{name}</p>
                  <p className={styles.itemMeta}>
                    Size {item.size}
                    {itemAddons.length > 0 && ` · ${itemAddons.map(a => lang === 'vi' ? a!.name_vi : a!.name_en).join(', ')}`}
                  </p>
                  {item.notes && <p className={styles.itemNotes}>📝 {item.notes}</p>}
                  <p className={styles.itemPrice}>{formatPrice(item.unit_price)}</p>
                </div>
                <div className={styles.itemRight}>
                  <div className="qty-control" style={{ '--space-3': '8px' } as React.CSSProperties}>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Voucher */}
        <div className={styles.voucherSection}>
          <p className={styles.sectionLabel}>🎫 Mã Voucher</p>
          <div className={styles.voucherInput}>
            <input
              className={`input ${voucherError ? 'input-error' : ''}`}
              placeholder="Nhập mã giảm giá"
              value={voucherCode}
              onChange={e => { setVoucherCode(e.target.value); setVoucherError('') }}
              style={{ textTransform: 'uppercase' }}
            />
            <button className="btn btn-outline btn-sm" onClick={applyVoucher}
              style={{ flexShrink: 0 }}>
              Áp dụng
            </button>
          </div>
          {voucherError && <span className="error-text">{voucherError}</span>}
          {appliedVoucher && (
            <div className={styles.voucherApplied}>
              <span>✓ {appliedVoucher.code} — Giảm {formatPrice(appliedVoucher.discount)}</span>
              <button onClick={() => { setAppliedVoucher(null); setVoucherCode('') }}>✕</button>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Tạm tính</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className={`${styles.summaryRow} ${styles.discountRow}`}>
              <span>Giảm giá ({appliedVoucher?.code})</span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className={styles.divider} />
          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span>Tổng cộng</span>
            <span className={styles.totalAmount}>{formatPrice(total)}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={() => router.push(`/checkout?total=${total}`)}
        >
          Tiến hành thanh toán →
        </button>
      </div>
    </div>
  )
}
