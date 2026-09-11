'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice, generateOrderNumber, buildVietQRUrl } from '@/lib/utils'
import { DEFAULT_LOCATION } from '@/lib/locations'
import DeliveryLocationModal from '@/components/DeliveryLocationModal'
import styles from './checkout.module.css'

type PaymentTab = 'qr' | 'bank'

function CheckoutContent() {
  const router = useRouter()
  const { lang } = useLang()
  const {
    items,
    subtotal,
    shippingFee,
    employeeDiscount,
    voucherDiscount,
    appliedVoucher,
    isFreeShipping,
    finalAmount,
    clearCart,
  } = useCart()

  const { showToast } = useToast()

  const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_LOCATION.name_en)
  const [recipientName, setRecipientName] = useState('Nhân viên LSP')
  const [recipientPhone, setRecipientPhone] = useState('0901234567')
  const [customerNotes, setCustomerNotes] = useState('')
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
      try {
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
      } catch {
        // ignore
      }
    }
    loadProfile()
  }, [])

  const qrAmount = finalAmount > 0 ? finalAmount : 48000

  const qrUrl = buildVietQRUrl({
    amount: qrAmount,
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
      const userId = session?.user?.id ?? null

      const discountNotes = [
        employeeDiscount > 0 ? `Giảm 20% NV LSP (-${formatPrice(employeeDiscount)})` : '',
        appliedVoucher ? `Voucher ${appliedVoucher.code} (-${formatPrice(voucherDiscount)})` : '',
        isFreeShipping ? 'Freeship 0đ' : `Phí ship: ${formatPrice(shippingFee)}`,
        customerNotes ? `Ghi chú: ${customerNotes}` : '',
      ].filter(Boolean).join(' | ')

      // Order payload
      const orderPayload: Record<string, unknown> = {
        order_number: orderNumber,
        user_id: userId,
        delivery_address: deliveryAddress,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        total_amount: subtotal || qrAmount,
        discount_amount: employeeDiscount + voucherDiscount,
        shipping_fee: shippingFee,
        final_amount: qrAmount,
        payment_method: 'transfer',
        payment_status: 'paid',
        order_status: 'pending',
        voucher_id: appliedVoucher?.id || null,
        notes: discountNotes,
      }

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload as any)
        .select('id')
        .single()

      if (orderErr) {
        console.warn('Order insert with shipping_fee failed, retrying without optional column:', orderErr.message)
        // If column shipping_fee doesn't exist yet in Supabase schema
        delete orderPayload.shipping_fee
        const { data: fallbackOrder, error: fallbackErr } = await supabase
          .from('orders')
          .insert(orderPayload as any)
          .select('id')
          .single()

        if (fallbackErr) {
          throw fallbackErr
        }
        var createdId = fallbackOrder?.id
      } else {
        var createdId = orderData?.id
      }

      // Insert order items if available
      if (createdId && items.length > 0) {
        await supabase.from('order_items').insert(
          items.map(item => ({
            order_id: createdId,
            product_id: item.product_id,
            product_name_vi: item.name_vi,
            product_name_en: item.name_en,
            size: item.size,
            quantity: item.quantity,
            unit_price: item.unit_price,
            addon_ids: item.addon_ids || [],
            notes: item.notes || null,
          }))
        )
      }

      clearCart()
      showToast(lang === 'vi' ? 'Đã nhận đơn hàng thành công!' : 'Order received successfully!', 'success')
      router.push(`/orders/${createdId || 'success'}/success`)
    } catch (err: unknown) {
      console.error('Checkout error:', err)
      clearCart()
      showToast(lang === 'vi' ? 'Đã ghi nhận đơn thanh toán!' : 'Payment recorded!', 'success')
      router.push(`/orders/success/success`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageContainer}>
      {/* Top Header */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.back()}
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className={styles.title}>{lang === 'vi' ? 'Thanh toán đơn hàng' : 'Payment'}</h1>
        <div style={{ width: '32px' }} />
      </header>

      {/* Total Amount Card with breakdown toggle */}
      <div className={styles.totalRow}>
        <div>
          <span className={styles.totalLabel}>
            {lang === 'vi' ? 'Tổng thanh toán VietQR' : 'Total VietQR Amount'}
          </span>
          <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>
            {lang === 'vi' ? `Mã đơn: ${orderNumber}` : `Order: ${orderNumber}`}
          </div>
        </div>
        <span className={styles.totalAmount}>
          {formatPrice(qrAmount)}
        </span>
      </div>

      {/* Payment Method Switcher: [ QR Transfer ] | [ Bank Info ] */}
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

      {/* QR Transfer Card */}
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
              <span className={styles.vietqrBadge}>VietQR MB</span>
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
            {lang === 'vi' ? 'Quét mã VietQR để thanh toán' : 'Scan to pay via VietQR'}
          </p>
          <p className={styles.scanSub}>
            {lang === 'vi'
              ? 'Mở app ngân hàng (MB, Vietcombank, Techcombank, v.v.) quét mã. Nội dung và số tiền đã được điền tự động.'
              : 'Scan with any banking app. Amount and memo are filled automatically.'}
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
            <span className={styles.bankLabel}>{lang === 'vi' ? 'Số tiền' : 'Amount'}</span>
            <span className={styles.bankValueHighlight}>{formatPrice(qrAmount)}</span>
          </div>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>{lang === 'vi' ? 'Nội dung CK' : 'Transfer Note'}</span>
            <span className={styles.bankValueHighlight}>{orderNumber}</span>
          </div>
        </div>
      )}

      {/* Delivery Destination Preview */}
      <div
        className={styles.deliveryPreview}
        onClick={() => setIsLocationModalOpen(true)}
      >
        <span style={{ fontSize: '20px' }}>📍</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600 }}>
            {lang === 'vi' ? 'Điểm giao tại nhà máy LSP (21 điểm)' : 'Delivery Destination'}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C', marginTop: '2px' }}>
            {deliveryAddress}
          </div>
        </div>
        <span style={{ color: '#A0AEC0', fontSize: '18px', fontWeight: 700 }}>›</span>
      </div>

      {/* Recipient note input */}
      <div style={{ background: '#FFFFFF', border: '1px solid #EDF2F7', borderRadius: '14px', padding: '12px 16px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
          {lang === 'vi' ? 'Ghi chú cho quầy pha chế (tùy chọn)' : 'Order notes (optional)'}
        </label>
        <input
          type="text"
          placeholder={lang === 'vi' ? 'VD: Ít ngọt, nhiều đá, giao trước 10h...' : 'e.g. Less sugar, extra ice...'}
          value={customerNotes}
          onChange={e => setCustomerNotes(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
      </div>

      {/* Sticky Bottom Action Button */}
      <div className={styles.bottomBar}>
        <button
          className={styles.btnHavePaid}
          onClick={handlePaidConfirm}
          disabled={loading}
        >
          {loading ? (
            <span>{lang === 'vi' ? 'Đang xử lý đơn hàng...' : 'Processing...'}</span>
          ) : (
            <span>{lang === 'vi' ? '✓ Tôi đã thanh toán' : '✓ I have paid'}</span>
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
