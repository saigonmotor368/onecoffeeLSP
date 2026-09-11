'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice, generateOrderNumber, buildVietQRUrl, isValidPhone } from '@/lib/utils'
import { DEFAULT_LOCATION } from '@/lib/locations'
import DeliveryLocationModal from '@/components/DeliveryLocationModal'
import styles from './checkout.module.css'

type PaymentTab = 'qr' | 'bank'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang, t } = useLang()
  const { items, subtotal, clearCart } = useCart()
  const { showToast } = useToast()

  const total = parseInt(searchParams.get('total') ?? String(subtotal))

  const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_LOCATION.name_en)
  const [recipientName, setRecipientName] = useState('Nguyen Van A')
  const [recipientPhone, setRecipientPhone] = useState('0901234567')
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('qr')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  useEffect(() => {
    // Load default saved address
    const saved = localStorage.getItem('oc_delivery_location')
    if (saved) setDeliveryAddress(saved)

    // Generate or retrieve order number
    const generated = generateOrderNumber()
    setOrderNumber(generated)

    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone, default_delivery_address')
          .eq('id', session.user.id)
          .single()
        if (data) {
          if (data.full_name) setRecipientName(data.full_name)
          if (data.phone) setRecipientPhone(data.phone)
          if (data.default_delivery_address) {
            setDeliveryAddress(data.default_delivery_address)
          }
        }
      }
    }
    loadProfile()
  }, [])

  const qrUrl = buildVietQRUrl({
    amount: total > 0 ? total : 206000,
    orderNumber: orderNumber || 'OC20260911-001',
    accountNo: '0977999948',
    bankId: 'MB',
    accountName: 'PHAM XUAN DINH',
  })

  const handlePaidConfirm = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? 'guest-user'

      const newId = 'order-' + Date.now()
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          id: newId,
          order_number: orderNumber,
          user_id: userId,
          delivery_address: deliveryAddress,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          total_amount: subtotal || total,
          discount_amount: 0,
          final_amount: total > 0 ? total : 206000,
          payment_method: 'transfer',
          payment_status: 'paid',
          order_status: 'pending',
        })
        .select('id')
        .single()

      const createdId = orderData?.id ?? newId

      // Insert items if available
      if (items.length > 0) {
        await supabase.from('order_items').insert(
          items.map(item => ({
            order_id: createdId,
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
      }

      clearCart()
      showToast(lang === 'vi' ? 'Đã nhận đơn hàng thành công!' : 'Order received successfully!', 'success')
      router.push(`/orders/${createdId}/success`)
    } catch {
      clearCart()
      router.push(`/orders/demo-order-1/success`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageContainer}>
      {/* Top Header matching Screen 7 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.back()}
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className={styles.title}>{lang === 'vi' ? 'Thanh toán' : 'Payment'}</h1>
        <div style={{ width: '32px' }} />
      </header>

      {/* Total Amount Row matching Screen 7 */}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>
          {lang === 'vi' ? 'Tổng thanh toán' : 'Total Amount'}
        </span>
        <span className={styles.totalAmount}>
          {formatPrice(total > 0 ? total : 206000)}
        </span>
      </div>

      {/* Segmented Control matching Screen 7: [ QR Transfer ] | [ Bank Info ] */}
      <div className={styles.segmentedControl}>
        <button
          type="button"
          className={`${styles.segmentBtn} ${paymentTab === 'qr' ? styles.segmentBtnActive : ''}`}
          onClick={() => setPaymentTab('qr')}
        >
          {lang === 'vi' ? 'Chuyển khoản QR' : 'QR Transfer'}
        </button>
        <button
          type="button"
          className={`${styles.segmentBtn} ${paymentTab === 'bank' ? styles.segmentBtnActive : ''}`}
          onClick={() => setPaymentTab('bank')}
        >
          {lang === 'vi' ? 'Thông tin Ngân hàng' : 'Bank Info'}
        </button>
      </div>

      {/* QR Transfer Card matching Screen 7 */}
      {paymentTab === 'qr' ? (
        <div className={styles.qrCard}>
          <div className={styles.qrBrandHeader}>
            <Image
              src="/logo-circle.png"
              alt="One Coffee"
              width={34}
              height={34}
              className={styles.qrLogo}
            />
            <div className={styles.qrBrandText}>
              <span className={styles.brandTitle}>ONE COFFEE</span>
              <span className={styles.vietqrBadge}>VietQR</span>
            </div>
          </div>

          <div className={styles.qrCodeWrapper}>
            <img
              src={qrUrl}
              alt="VietQR Payment Code"
              className={styles.qrImage}
            />
          </div>

          <p className={styles.scanInstruction}>
            {lang === 'vi' ? 'Quét mã để thanh toán' : 'Scan to pay'}
          </p>
          <p className={styles.scanSub}>
            {lang === 'vi'
              ? 'Sau khi thanh toán thành công, vui lòng bấm "Tôi đã thanh toán".'
              : "After payment, please tap 'I have paid'."}
          </p>
        </div>
      ) : (
        /* Bank Info Card */
        <div className={styles.bankCard}>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>{lang === 'vi' ? 'Ngân hàng' : 'Bank'}</span>
            <span className={styles.bankValue}>MB Bank (Quân Đội)</span>
          </div>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>{lang === 'vi' ? 'Số tài khoản' : 'Account No.'}</span>
            <span className={styles.bankValueHighlight}>0977999948</span>
          </div>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>{lang === 'vi' ? 'Chủ tài khoản' : 'Beneficiary'}</span>
            <span className={styles.bankValue}>PHAM XUAN DINH</span>
          </div>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>{lang === 'vi' ? 'Nội dung CK' : 'Transfer Note'}</span>
            <span className={styles.bankValueHighlight}>{orderNumber}</span>
          </div>
        </div>
      )}

      {/* Delivery Summary matching Screen 7 */}
      <div
        className={styles.deliveryPreview}
        onClick={() => setIsLocationModalOpen(true)}
      >
        <span style={{ fontSize: '18px' }}>📍</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#718096' }}>
            {lang === 'vi' ? 'Điểm giao tại LSP' : 'Delivery Destination'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A202C' }}>
            {deliveryAddress}
          </div>
        </div>
        <span style={{ color: '#A0AEC0', fontSize: '16px' }}>›</span>
      </div>

      {/* Sticky Bottom Action Button matching Screen 7: "I have paid" */}
      <div className={styles.bottomBar}>
        <button
          className={styles.btnHavePaid}
          onClick={handlePaidConfirm}
          disabled={loading}
        >
          {loading ? (
            <span>{lang === 'vi' ? 'Đang xử lý...' : 'Processing...'}</span>
          ) : (
            <span>{lang === 'vi' ? 'Tôi đã thanh toán' : 'I have paid'}</span>
          )}
        </button>
      </div>

      {/* 21 Locations Modal */}
      <DeliveryLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedLocation={deliveryAddress}
        onSelect={loc => {
          setDeliveryAddress(loc)
          localStorage.setItem('oc_delivery_location', loc)
        }}
      />
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
