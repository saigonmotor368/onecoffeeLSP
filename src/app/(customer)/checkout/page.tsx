'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice, generateOrderNumber, buildVietQRUrl, isValidPhone } from '@/lib/utils'
import styles from './checkout.module.css'

type PaymentMethod = 'cash' | 'transfer'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang, t } = useLang()
  const { items, subtotal, clearCart } = useCart()
  const { showToast } = useToast()

  const total = parseInt(searchParams.get('total') ?? String(subtotal))

  const [profile, setProfile] = useState<{ full_name: string; phone: string; default_delivery_address: string | null } | null>(null)
  const [form, setForm] = useState({
    delivery_address: '',
    recipient_name: '',
    recipient_phone: '',
  })
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // QR state
  const [orderNumber, setOrderNumber] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone, default_delivery_address')
          .eq('id', session.user.id)
          .single()
        if (data) {
          setProfile(data)
          setForm(f => ({
            ...f,
            delivery_address: data.default_delivery_address ?? '',
            recipient_name: data.full_name,
            recipient_phone: data.phone,
          }))
        }
      }
    }
    load()
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.delivery_address.trim()) e.delivery_address = 'Vui lòng nhập địa chỉ giao'
    if (!form.recipient_name.trim()) e.recipient_name = 'Vui lòng nhập tên người nhận'
    if (!isValidPhone(form.recipient_phone)) e.recipient_phone = 'Số điện thoại không hợp lệ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleConfirm = async () => {
    if (!validate()) return
    if (items.length === 0) { showToast('Giỏ hàng trống!', 'error'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const orderNum = generateOrderNumber()
      setOrderNumber(orderNum)

      // Insert order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNum,
          user_id: session.user.id,
          delivery_address: form.delivery_address,
          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone,
          total_amount: subtotal,
          discount_amount: Math.max(0, subtotal - total),
          final_amount: total,
          payment_method: payment,
          payment_status: 'pending',
          order_status: 'pending',
        })
        .select('id')
        .single()

      if (orderErr || !order) throw new Error(orderErr?.message ?? 'Order failed')

      // Insert order items
      await supabase.from('order_items').insert(
        items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name_vi: item.name_vi,
          product_name_en: item.name_en,
          size: item.size,
          quantity: item.quantity,
          unit_price: item.unit_price,
          addon_ids: item.addon_ids,
          notes: item.notes || null,
        }))
      )

      setOrderId(order.id)

      if (payment === 'transfer') {
        setShowQR(true)
      } else {
        clearCart()
        router.push(`/orders/${order.id}/success`)
      }
    } catch (err) {
      showToast('Có lỗi xảy ra. Vui lòng thử lại!', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // QR Payment screen
  if (showQR) {
    const qrUrl = buildVietQRUrl({ amount: total, orderNumber })
    return (
      <div className={styles.qrPage}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => setShowQR(false)}>←</button>
          <h1 className={styles.title}>Thanh toán QR</h1>
          <div style={{ width: 40 }} />
        </header>

        <div className={styles.qrContent}>
          <div className={styles.amountBig}>
            <p className={styles.amountLabel}>Số tiền cần thanh toán</p>
            <p className={styles.amountValue}>{formatPrice(total)}</p>
          </div>

          <div className={styles.qrCard}>
            <div className={styles.qrBankHeader}>
              <span className={styles.vietqrLogo}>VietQR</span>
              <span className={styles.bankName}>🏦 MB Bank</span>
            </div>
            <div className={styles.qrImgWrap}>
              <Image
                src={qrUrl}
                alt="QR Code thanh toán"
                width={240}
                height={240}
                className={styles.qrImg}
                unoptimized
              />
            </div>
            <div className={styles.qrInfo}>
              <div className={styles.qrInfoRow}>
                <span>Số TK</span>
                <strong>0977999948</strong>
              </div>
              <div className={styles.qrInfoRow}>
                <span>Tên TK</span>
                <strong>PHAM XUAN DINH</strong>
              </div>
              <div className={styles.qrInfoRow}>
                <span>Nội dung</span>
                <strong className={styles.orderContent}>{orderNumber}</strong>
              </div>
            </div>
          </div>

          <div className={styles.qrNote}>
            <p>⚠️ Nhập đúng nội dung <strong>{orderNumber}</strong> để quầy nhận biết đơn của bạn</p>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={() => {
              clearCart()
              router.push(`/orders/${orderId}/success`)
            }}
          >
            ✓ Tôi đã chuyển khoản
          </button>

          <button
            className="btn btn-ghost btn-full"
            onClick={() => router.push('/orders')}
            style={{ marginTop: 8 }}
          >
            Xem đơn hàng
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>←</button>
        <h1 className={styles.title}>Xác nhận đơn hàng</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className={styles.content}>
        {/* Order summary */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>📦 Tóm tắt đơn hàng ({items.length} món)</p>
          {items.map(item => (
            <div key={item.id} className={styles.orderItem}>
              <span>{item.quantity}x {lang === 'vi' ? item.name_vi : item.name_en} ({item.size})</span>
              <span>{formatPrice(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div className={styles.divider} />
          <div className={`${styles.orderItem} ${styles.totalRow}`}>
            <span>Tổng cộng</span>
            <span className={styles.totalAmt}>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Delivery info */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>📍 Thông tin giao hàng</p>

          <div className="input-group">
            <label className="input-label">Địa chỉ giao hàng *</label>
            <input
              className={`input ${errors.delivery_address ? 'input-error' : ''}`}
              placeholder="VD: Dây chuyền 1, Block A, Khu sản xuất..."
              value={form.delivery_address}
              onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
            />
            {errors.delivery_address && <span className="error-text">{errors.delivery_address}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Tên người nhận *</label>
            <input
              className={`input ${errors.recipient_name ? 'input-error' : ''}`}
              placeholder="Họ và tên"
              value={form.recipient_name}
              onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
            />
            {errors.recipient_name && <span className="error-text">{errors.recipient_name}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Số điện thoại *</label>
            <input
              className={`input ${errors.recipient_phone ? 'input-error' : ''}`}
              type="tel" inputMode="tel"
              placeholder="0912345678"
              value={form.recipient_phone}
              onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))}
            />
            {errors.recipient_phone && <span className="error-text">{errors.recipient_phone}</span>}
          </div>
        </div>

        {/* Payment method */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>💳 Hình thức thanh toán</p>
          <div className={styles.paymentMethods}>
            <button
              className={`${styles.payBtn} ${payment === 'cash' ? styles.payBtnActive : ''}`}
              onClick={() => setPayment('cash')}
            >
              <span className={styles.payIcon}>💵</span>
              <div>
                <p className={styles.payLabel}>Tiền mặt</p>
                <p className={styles.payDesc}>Thanh toán khi nhận hàng</p>
              </div>
              {payment === 'cash' && <span className={styles.payCheck}>✓</span>}
            </button>
            <button
              className={`${styles.payBtn} ${payment === 'transfer' ? styles.payBtnActive : ''}`}
              onClick={() => setPayment('transfer')}
            >
              <span className={styles.payIcon}>📱</span>
              <div>
                <p className={styles.payLabel}>Chuyển khoản</p>
                <p className={styles.payDesc}>QR VietQR · MB Bank</p>
              </div>
              {payment === 'transfer' && <span className={styles.payCheck}>✓</span>}
            </button>
          </div>
        </div>

        {/* Confirm button */}
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading
            ? <><span className="spinner spinner-sm" />Đang xử lý...</>
            : payment === 'cash'
              ? `Đặt hàng · ${formatPrice(total)}`
              : `Tiếp tục thanh toán · ${formatPrice(total)}`
          }
        </button>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: '64px 16px', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>}>
      <CheckoutContent />
    </Suspense>
  )
}
