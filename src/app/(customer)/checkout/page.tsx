'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCart, useLang, useToast } from '@/lib/providers'
import { formatPrice, generateOrderNumber, buildVietQRUrl } from '@/lib/utils'
import {
  playOrderPlacedSound,
  sendDeviceNotification,
  requestNotificationPermission,
  addRecentOrder,
} from '@/lib/notifications'
import styles from './checkout.module.css'

type PaymentMethod = 'cash' | 'transfer'
type TransferViewTab = 'qr' | 'bank'

function CheckoutContent() {
  const router = useRouter()
  const { lang } = useLang()
  const {
    items,
    subtotal,
    shippingFee,
    isLspEmployee,
    setIsLspEmployee,
    employeeDiscountPercent,
    employeeDiscount,
    voucherDiscount,
    appliedVoucher,
    isFreeShipping,
    finalAmount,
    clearCart,
  } = useCart()

  const { showToast } = useToast()

  // Customer & Delivery Info
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [accountCreatedThisCheckout, setAccountCreatedThisCheckout] = useState(false)

  // Auth Options at Checkout
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register')
  const [regPassword, setRegPassword] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [transferTab, setTransferTab] = useState<TransferViewTab>('qr')
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    const savedInfoTimer = window.setTimeout(() => {
      setOrderNumber(generateOrderNumber())
      const savedName = localStorage.getItem('oc_customer_name')
      const savedPhone = localStorage.getItem('oc_customer_phone')
      const savedLocation = localStorage.getItem('oc_delivery_location')
      if (savedName) setRecipientName(savedName)
      if (savedPhone) setRecipientPhone(savedPhone)
      if (savedLocation) setDeliveryAddress(savedLocation)
    }, 0)

    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const supabase = createClient('customer')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsLoggedIn(true)
          setUserId(session.user.id)
          const { data } = await supabase
            .from('profiles')
            .select('full_name, phone, default_delivery_address')
            .eq('id', session.user.id)
            .single()
          if (data) {
            if (data.full_name) setRecipientName(data.full_name)
            if (data.phone) setRecipientPhone(data.phone)
            if (data.default_delivery_address) setDeliveryAddress(data.default_delivery_address)
          }
        }
      } catch {
        // guest mode
      }
    }
    void checkAuth()
    return () => window.clearTimeout(savedInfoTimer)
  }, [])

  const qrAmount = finalAmount > 0 ? finalAmount : 48000

  const qrUrl = buildVietQRUrl({
    amount: qrAmount,
    orderNumber: orderNumber || 'OC20260911-001',
    accountNo: '0977999948',
    bankId: 'MB',
    accountName: 'PHAM XUAN DINH',
  })

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    showToast(lang === 'vi' ? `Đã sao chép: ${text}` : `Copied: ${text}`, 'success')
    setTimeout(() => setCopiedField(null), 2500)
  }

  const handleInlineRegister = async (): Promise<string | false> => {
    const trimmedName = recipientName.trim()
    const cleanPhone = recipientPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '')
    const trimmedAddress = deliveryAddress.trim()

    if (!trimmedName) {
      showToast(lang === 'vi' ? 'Vui lòng nhập họ và tên!' : 'Please enter full name!', 'error')
      return false
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      showToast(lang === 'vi' ? 'Vui lòng nhập số điện thoại hợp lệ!' : 'Please enter valid phone number!', 'error')
      return false
    }
    if (!trimmedAddress) {
      showToast(lang === 'vi' ? 'Vui lòng nhập địa chỉ giao hàng!' : 'Please enter delivery address!', 'error')
      return false
    }
    if (!regPassword || regPassword.length < 6) {
      showToast(lang === 'vi' ? 'Mật khẩu tối thiểu 6 ký tự để bảo mật tài khoản!' : 'Password must be at least 6 characters!', 'error')
      return false
    }

    setAuthLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          full_name: trimmedName,
          password: regPassword,
          default_delivery_address: trimmedAddress,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Lỗi tạo tài khoản', 'error')
        if (data.alreadyRegistered) {
          setAuthTab('login')
        }
        return false
      }

      // Login immediately
      const supabase = createClient('customer')
      const email = `${cleanPhone}@onecoffee.vn`
      const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: regPassword,
      })

      if (signErr || !signData.user) {
        showToast(lang === 'vi' ? 'Tài khoản đã tạo nhưng cần đăng nhập' : 'Account created, please login', 'warning')
        setAuthTab('login')
        return false
      }

      setIsLoggedIn(true)
      setUserId(signData.user.id)
      setAccountCreatedThisCheckout(true)
      localStorage.setItem('oc_customer_name', trimmedName)
      localStorage.setItem('oc_customer_phone', cleanPhone)
      localStorage.setItem('oc_delivery_location', trimmedAddress)
      return signData.user.id
    } catch {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ tạo tài khoản' : 'Error connecting to server', 'error')
      return false
    } finally {
      setAuthLoading(false)
    }
  }

  const handleInlineLogin = async (): Promise<string | false> => {
    const cleanPhone = recipientPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '')
    if (!cleanPhone || cleanPhone.length < 9) {
      showToast(lang === 'vi' ? 'Vui lòng nhập số điện thoại đã đăng ký!' : 'Please enter registered phone!', 'error')
      return false
    }
    if (!loginPassword || loginPassword.length < 6) {
      showToast(lang === 'vi' ? 'Vui lòng nhập mật khẩu tài khoản!' : 'Please enter password!', 'error')
      return false
    }

    setAuthLoading(true)
    try {
      const supabase = createClient('customer')
      const email = `${cleanPhone}@onecoffee.vn`
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      })

      if (error || !data.user) {
        showToast(lang === 'vi' ? 'Số điện thoại hoặc mật khẩu không chính xác' : 'Invalid phone or password', 'error')
        return false
      }

      setIsLoggedIn(true)
      setUserId(data.user.id)
      setAccountCreatedThisCheckout(false)

      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, phone, default_delivery_address')
        .eq('id', data.user.id)
        .single()

      if (prof) {
        if (prof.full_name) setRecipientName(prof.full_name)
        if (prof.phone) setRecipientPhone(prof.phone)
        if (prof.default_delivery_address) setDeliveryAddress(prof.default_delivery_address)
      }

      showToast(lang === 'vi' ? 'Đăng nhập thành công!' : 'Logged in successfully!', 'success')
      return data.user.id
    } catch {
      showToast(lang === 'vi' ? 'Lỗi kết nối đăng nhập' : 'Login connection error', 'error')
      return false
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (!isLoggedIn || !userId) {
      showToast(
        lang === 'vi'
          ? 'Vui lòng tạo tài khoản hoặc đăng nhập trước khi thanh toán!'
          : 'Please register or log in before payment!',
        'error'
      )
      document.getElementById('checkout-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    // Validation
    const trimmedName = recipientName.trim()
    const trimmedPhone = recipientPhone.trim()
    const trimmedAddress = deliveryAddress.trim()

    if (!trimmedName) {
      showToast(lang === 'vi' ? 'Vui lòng nhập họ và tên người nhận!' : 'Please enter recipient name!', 'error')
      return
    }
    if (!trimmedPhone) {
      showToast(lang === 'vi' ? 'Vui lòng nhập số điện thoại nhận hàng!' : 'Please enter phone number!', 'error')
      return
    }
    if (!trimmedAddress) {
      showToast(lang === 'vi' ? 'Vui lòng nhập địa chỉ giao hàng!' : 'Please enter delivery address!', 'error')
      return
    }

    // Persist info for next time
    localStorage.setItem('oc_customer_name', trimmedName)
    localStorage.setItem('oc_customer_phone', trimmedPhone)
    localStorage.setItem('oc_delivery_location', trimmedAddress)

    setLoading(true)
    try {
      const discountNotes = [
        isLspEmployee && employeeDiscount > 0 ? `Giảm ${employeeDiscountPercent}% NV LSP (-${formatPrice(employeeDiscount)})` : '',
        appliedVoucher ? `Voucher ${appliedVoucher.code} (-${formatPrice(voucherDiscount)})` : '',
        isFreeShipping ? 'Freeship 0đ' : `Phí ship: ${formatPrice(shippingFee)}`,
        customerNotes ? `Ghi chú: ${customerNotes}` : '',
      ].filter(Boolean).join(' | ')

      const isCash = paymentMethod === 'cash'

      // Build order payload - always pass user_id explicitly
      const orderPayload = {
        order_number: orderNumber,
        user_id: userId,
        delivery_address: trimmedAddress,
        recipient_name: trimmedName,
        recipient_phone: trimmedPhone,
        total_amount: subtotal || qrAmount,
        discount_amount: employeeDiscount + voucherDiscount,
        shipping_fee: shippingFee,
        final_amount: qrAmount,
        payment_method: isCash ? 'cash' : 'transfer',
        payment_status: isCash ? 'pending' : 'paid',
        order_status: 'pending',
        voucher_id: appliedVoucher?.id || null,
        notes: discountNotes,
      }

      // Build order items payload
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
      const productMap: Record<string, string> = {}
      try {
        const supabase = createClient('customer')
        const { data: dbProducts } = await supabase.from('products').select('id, name_vi')
        if (dbProducts) {
          dbProducts.forEach(p => { productMap[p.name_vi.toLowerCase().trim()] = p.id })
        }
      } catch { /* non-fatal */ }

      const fallbackUuid = Object.values(productMap)[0] || null

      const payloadItems = items.map(item => {
        let validProductId: string | null = isUuid(item.product_id) ? item.product_id : null
        if (!validProductId) {
          validProductId = productMap[(item.name_vi || '').toLowerCase().trim()] || fallbackUuid
        }
        return {
          product_id: validProductId,
          product_name_vi: item.name_vi,
          product_name_en: item.name_en || item.name_vi,
          size: (item.size === 'L' ? 'L' : 'M') as 'M' | 'L',
          quantity: item.quantity,
          unit_price: item.unit_price,
          addon_ids: item.addon_ids || [],
          notes: item.notes || null,
        }
      })

      // Use server API to create order (bypasses RLS, correct user_id guaranteed)
      const customerClient = createClient('customer')
      const { data: sessionData } = await customerClient.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setIsLoggedIn(false)
        setUserId(null)
        throw new Error(lang === 'vi' ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Session expired. Please log in again.')
      }

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ order: orderPayload, items: payloadItems }),
      })
      const orderResult = await res.json()
      if (!res.ok) {
        throw new Error(orderResult.error || 'L" + [char]7895 + "i t" + [char]7841 + "o " + [char]273 + [char]417 + "n h" + [char]224 + "ng')
      }

      const createdId = orderResult.orderId
      clearCart()

      const targetOrderId = createdId || orderNumber
      addRecentOrder(targetOrderId, orderNumber)

      // Play success chime sound 🎶
      playOrderPlacedSound()

      // Send device notification
      requestNotificationPermission().then(granted => {
        if (granted) {
          sendDeviceNotification(
            lang === 'vi' ? '☕ Đặt đơn One Coffee thành công!' : '☕ Order Placed Successfully!',
            {
              body: lang === 'vi'
                ? `Mã đơn #${orderNumber}. Đang chuyển thông tin đến quầy pha chế!`
                : `Order #${orderNumber} has been sent to the baristas!`,
              tag: `placed-${orderNumber}`,
              data: { url: `/orders/${targetOrderId}` },
            }
          )
        }
      })

      showToast(
        lang === 'vi'
          ? (isCash ? 'Đã ghi nhận đơn hàng (Tiền mặt)!' : 'Đã nhận đơn và xác nhận chuyển khoản!')
          : 'Order placed successfully!',
        'success'
      )

      const successParams = new URLSearchParams({ method: paymentMethod })
      if (accountCreatedThisCheckout) successParams.set('accountCreated', '1')
      router.push(`/orders/${targetOrderId}/success?${successParams.toString()}`)
    } catch (err: unknown) {
      console.error('Checkout error:', err)
      showToast(
        err instanceof Error
          ? err.message
          : (lang === 'vi' ? 'Không thể tạo đơn hàng. Vui lòng thử lại.' : 'Unable to create order. Please try again.'),
        'error'
      )
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
        <h1 className={styles.title}>
          {lang === 'vi' ? 'Xác nhận & Thanh toán' : 'Checkout & Payment'}
        </h1>
        <div style={{ width: '32px' }} />
      </header>

      {/* Total Amount Card */}
      <div className={styles.totalRow}>
        <div>
          <span className={styles.totalLabel}>
            {lang === 'vi' ? 'Tổng thanh toán' : 'Total Amount'}
          </span>
          <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>
            {lang === 'vi' ? `Mã đơn: ${orderNumber}` : `Order: ${orderNumber}`}
          </div>
        </div>
        <span className={styles.totalAmount}>
          {formatPrice(qrAmount)}
        </span>
      </div>

      {/* Customer & Account Info Card */}
      <section id="checkout-account" className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>👤</span>
            {lang === 'vi' ? 'Thông tin người đặt & Tài khoản' : 'Customer Info & Account'}
          </h2>
          {isLoggedIn && (
            <span style={{ fontSize: '11px', color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
              {lang === 'vi' ? 'Đã đăng nhập' : 'Logged In'}
            </span>
          )}
        </div>

        {isLoggedIn ? (
          /* When Logged In */
          <>
            <div className={styles.loggedInBadgeCard}>
              <div className={styles.loggedInInfo}>
                <span className={styles.loggedInIcon}>✓</span>
                <div>
                  <div className={styles.loggedInName}>{recipientName || 'Khách hàng'} ({recipientPhone})</div>
                  <div style={{ fontSize: '11px', color: '#718096' }}>Đơn hàng sẽ được lưu vào lịch sử tài khoản của bạn</div>
                </div>
              </div>
              <button
                type="button"
                className={styles.switchAccountBtn}
                onClick={async () => {
                  const supabase = createClient('customer')
                   await supabase.auth.signOut()
                   setIsLoggedIn(false)
                   setUserId(null)
                   setAccountCreatedThisCheckout(false)
                  showToast(lang === 'vi' ? 'Đã đăng xuất tài khoản' : 'Logged out', 'info')
                }}
              >
                {lang === 'vi' ? 'Đổi tài khoản' : 'Switch'}
              </button>
            </div>

            <div className={styles.inputGrid}>
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    {lang === 'vi' ? 'Họ và tên người nhận *' : 'Recipient Name *'}
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder="Nguyễn Văn A"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    {lang === 'vi' ? 'Số điện thoại *' : 'Phone *'}
                  </label>
                  <input
                    type="tel"
                    className={styles.inputField}
                    placeholder="0901234567"
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  {lang === 'vi' ? 'Địa chỉ giao hàng tận nơi *' : 'Delivery Address *'}
                </label>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder={lang === 'vi' ? 'Nhập địa chỉ giao hàng (VD: Tòa nhà điều hành, Cổng 2, hoặc lân cận...)' : 'Enter delivery address...'}
                  value={deliveryAddress}
                  onChange={e => {
                    setDeliveryAddress(e.target.value)
                    localStorage.setItem('oc_delivery_location', e.target.value)
                  }}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  {lang === 'vi' ? 'Ghi chú cho quầy pha chế / shipper (tùy chọn)' : 'Order notes (optional)'}
                </label>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder={lang === 'vi' ? 'VD: Giao phòng họp tầng 2, ít đá, nhiều đường...' : 'e.g. 2nd floor, less ice...'}
                  value={customerNotes}
                  onChange={e => setCustomerNotes(e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          /* When Not Logged In: Tabbed Register / Login */
          <>
            <div className={styles.authTabsContainer}>
              <button
                type="button"
                className={`${styles.authTabBtn} ${authTab === 'register' ? styles.authTabBtnActive : ''}`}
                onClick={() => setAuthTab('register')}
              >
                <span>✨</span>
                <span>{lang === 'vi' ? 'Tạo tài khoản mới' : 'Register'}</span>
              </button>
              <button
                type="button"
                className={`${styles.authTabBtn} ${authTab === 'login' ? styles.authTabBtnActive : ''}`}
                onClick={() => setAuthTab('login')}
              >
                <span>🔑</span>
                <span>{lang === 'vi' ? 'Đã có tài khoản' : 'Login'}</span>
              </button>
            </div>

            {authTab === 'register' ? (
              <div className={styles.inputGrid}>
                <div style={{ fontSize: '12px', color: '#166534', background: '#F0FDF4', padding: '10px 14px', borderRadius: '12px', border: '1px solid #BBF7D0', lineHeight: 1.5 }}>
                  <strong>🔐 Hướng dẫn tài khoản:</strong>
                  <div style={{ marginTop: 4 }}>
                    • <strong>Tên đăng nhập:</strong> Chính là <strong>Số điện thoại</strong> bạn nhập bên dưới.
                    <br />
                    • <strong>Mật khẩu:</strong> Bạn tự đặt (tối thiểu 6 ký tự).
                    <br />
                    • <em>Lần sau đặt món trên bất kỳ điện thoại/máy tính nào, bạn chỉ cần chọn tab <strong>&ldquo;Đã có tài khoản&rdquo;</strong> và nhập SĐT + Mật khẩu này để tra cứu đơn và lưu điểm giao hàng.</em>
                  </div>
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      {lang === 'vi' ? 'Họ và tên người nhận *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder={lang === 'vi' ? 'Nguyễn Văn A' : 'John Doe'}
                      value={recipientName}
                      onChange={e => setRecipientName(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      {lang === 'vi' ? 'Số điện thoại nhận hàng (Tên đăng nhập) *' : 'Phone (Username) *'}
                    </label>
                    <input
                      type="tel"
                      className={styles.inputField}
                      placeholder="0901234567"
                      value={recipientPhone}
                      onChange={e => setRecipientPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    {lang === 'vi' ? 'Địa chỉ giao hàng tận nơi *' : 'Delivery Address *'}
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder={lang === 'vi' ? 'Nhập địa chỉ giao hàng (VD: Tòa nhà điều hành, Cổng 2...)' : 'Enter delivery address...'}
                    value={deliveryAddress}
                    onChange={e => {
                      setDeliveryAddress(e.target.value)
                      localStorage.setItem('oc_delivery_location', e.target.value)
                    }}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    {lang === 'vi' ? '🔑 Đặt Mật khẩu cho tài khoản * (tối thiểu 6 ký tự)' : '🔑 Set Password *'}
                  </label>
                  <input
                    type="password"
                    className={styles.inputField}
                    placeholder={lang === 'vi' ? 'Tạo mật khẩu để đăng nhập lần sau' : 'Password for future logins'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    💡 Hãy ghi nhớ mật khẩu này cùng với SĐT của bạn nhé!
                  </span>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    {lang === 'vi' ? 'Ghi chú cho quầy pha chế / shipper (tùy chọn)' : 'Order notes (optional)'}
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder={lang === 'vi' ? 'VD: Giao phòng họp tầng 2, ít đá, nhiều đường...' : 'e.g. 2nd floor, less ice...'}
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className={styles.authActionBtn}
                  onClick={handleInlineRegister}
                  disabled={authLoading}
                >
                  {authLoading ? 'Đang tạo tài khoản...' : (lang === 'vi' ? '✓ Tạo tài khoản & Mở khóa thanh toán' : 'Register & Unlock Payment')}
                </button>
              </div>
            ) : (
              <div className={styles.inputGrid}>
                <div style={{ fontSize: '12px', color: '#4A5568', background: '#F7FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #EDF2F7' }}>
                  {lang === 'vi'
                    ? 'Nhập Số điện thoại và Mật khẩu đã đăng ký để nạp lại thông tin đơn hàng.'
                    : 'Enter your phone & password to login.'}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    {lang === 'vi' ? 'Số điện thoại *' : 'Phone *'}
                  </label>
                  <input
                    type="tel"
                    className={styles.inputField}
                    placeholder="0901234567"
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.inputLabel} style={{ marginBottom: 0 }}>
                      {lang === 'vi' ? 'Mật khẩu *' : 'Password *'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      style={{ background: 'none', border: 'none', color: '#1E4D3B', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <input
                    type="password"
                    className={styles.inputField}
                    placeholder={lang === 'vi' ? 'Nhập mật khẩu của bạn' : 'Enter password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="button"
                  className={styles.authActionBtn}
                  onClick={handleInlineLogin}
                  disabled={authLoading}
                >
                  {authLoading ? 'Đang đăng nhập...' : (lang === 'vi' ? 'Đăng nhập & Tiếp tục →' : 'Login & Continue →')}
                </button>
              </div>
            )}
          </>
        )}
      </section>

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

      {/* Order Items Summary (Collapsible) */}
      <section className={styles.sectionCard}>
        <div
          className={styles.summaryHeader}
          onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
        >
          <h2 className={styles.sectionTitle}>
            <span>🛍️</span>
            {lang === 'vi' ? `Chi tiết món (${items.length})` : `Order Items (${items.length})`}
          </h2>
          <span style={{ fontSize: '13px', color: '#718096', fontWeight: 700 }}>
            {isSummaryExpanded ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
          </span>
        </div>

        {isSummaryExpanded && (
          <>
            <div className={styles.summaryItemList}>
              {items.map(item => (
                <div key={item.id} className={styles.summaryItemRow}>
                  <div>
                    <div className={styles.summaryItemName}>
                      {item.quantity}x {lang === 'vi' ? item.name_vi : item.name_en}
                    </div>
                    <div className={styles.summaryItemMeta}>
                      Size {item.size}
                      {item.notes ? ` • ${item.notes}` : ''}
                    </div>
                  </div>
                  <div className={styles.summaryItemPrice}>
                    {formatPrice(item.unit_price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.priceBreakdown}>
              <div className={styles.priceRow}>
                <span>{lang === 'vi' ? 'Tạm tính' : 'Subtotal'}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {employeeDiscount > 0 && (
                <div className={styles.priceRow} style={{ color: '#166534' }}>
                  <span>{lang === 'vi' ? 'Giảm 20% NV LSP' : 'LSP Employee (-20%)'}</span>
                  <span>-{formatPrice(employeeDiscount)}</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className={styles.priceRow} style={{ color: '#D97706' }}>
                  <span>{lang === 'vi' ? `Voucher (${appliedVoucher?.code})` : `Voucher (${appliedVoucher?.code})`}</span>
                  <span>-{formatPrice(voucherDiscount)}</span>
                </div>
              )}
              <div className={styles.priceRow}>
                <span>{lang === 'vi' ? 'Phí giao hàng' : 'Shipping Fee'}</span>
                <span>{isFreeShipping ? (lang === 'vi' ? 'Miễn phí' : 'Free') : formatPrice(shippingFee)}</span>
              </div>
              <div className={styles.priceRowTotal}>
                <span>{lang === 'vi' ? 'Tổng thanh toán' : 'Final Total'}</span>
                <span>{formatPrice(qrAmount)}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Payment Method Selector */}
      {isLoggedIn && userId ? (
        <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>💳</span>
            {lang === 'vi' ? 'Phương thức thanh toán' : 'Payment Method'}
          </h2>
        </div>

        <div className={styles.methodList}>
          {/* Cash Option */}
          <div
            className={`${styles.methodCard} ${paymentMethod === 'cash' ? styles.methodCardActive : ''}`}
            onClick={() => setPaymentMethod('cash')}
          >
            <div className={styles.methodRadio}>
              {paymentMethod === 'cash' && <div className={styles.methodRadioDot} />}
            </div>
            <span className={styles.methodIconWrap}>💵</span>
            <div className={styles.methodContent}>
              <h3 className={styles.methodTitle}>
                {lang === 'vi' ? 'Tiền mặt khi nhận nước' : 'Cash on Delivery'}
              </h3>
              <p className={styles.methodDesc}>
                {lang === 'vi'
                  ? 'Thanh toán trực tiếp cho nhân viên barista khi nhận nước tại điểm giao.'
                  : 'Pay cash directly to barista upon beverage delivery.'}
              </p>
            </div>
          </div>

          {/* Transfer Option */}
          <div
            className={`${styles.methodCard} ${paymentMethod === 'transfer' ? styles.methodCardActive : ''}`}
            onClick={() => setPaymentMethod('transfer')}
          >
            <div className={styles.methodRadio}>
              {paymentMethod === 'transfer' && <div className={styles.methodRadioDot} />}
            </div>
            <span className={styles.methodIconWrap}>📱</span>
            <div className={styles.methodContent}>
              <h3 className={styles.methodTitle}>
                {lang === 'vi' ? 'Chuyển khoản VietQR' : 'VietQR Bank Transfer'}
              </h3>
              <p className={styles.methodDesc}>
                {lang === 'vi'
                  ? 'Quét mã VietQR tự động qua app MB Bank, Techcombank, Vietcombank, v.v.'
                  : 'Instant transfer via VietQR scan from any banking app.'}
              </p>
            </div>
          </div>
        </div>

        {/* Branching UI based on selected method */}
        {paymentMethod === 'cash' ? (
          /* Cash Notice Box */
          <div className={styles.cashNoticeBox}>
            <span className={styles.cashNoticeIcon}>🛵</span>
            <div>
              <h4 className={styles.cashNoticeTitle}>
                {lang === 'vi' ? 'Thanh toán tiền mặt khi nhận hàng' : 'Pay cash upon arrival'}
              </h4>
              <p className={styles.cashNoticeText}>
                {lang === 'vi' ? (
                  <>
                    Quý khách vui lòng chuẩn bị đúng <span className={styles.cashAmountHighlight}>{formatPrice(qrAmount)}</span> tiền mặt để gửi nhân viên giao hàng khi nước được mang tới <b>{deliveryAddress}</b>.
                  </>
                ) : (
                  <>
                    Please prepare exact cash amount of <span className={styles.cashAmountHighlight}>{formatPrice(qrAmount)}</span> for delivery to <b>{deliveryAddress}</b>.
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          /* Transfer Details & VietQR */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${transferTab === 'qr' ? styles.segmentBtnActive : ''}`}
                onClick={() => setTransferTab('qr')}
              >
                {lang === 'vi' ? 'Quét mã VietQR' : 'VietQR Code'}
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${transferTab === 'bank' ? styles.segmentBtnActive : ''}`}
                onClick={() => setTransferTab('bank')}
              >
                {lang === 'vi' ? 'Thông tin Chuyển khoản' : 'Bank Details'}
              </button>
            </div>

            {transferTab === 'qr' ? (
              <div className={styles.qrCard}>
                <div className={styles.qrBrandHeader}>
                  <Image
                    src="/logo-circle.png"
                    alt="One Coffee"
                    width={32}
                    height={32}
                    className={styles.qrLogo}
                  />
                  <div className={styles.qrBrandText}>
                    <span className={styles.brandTitle}>ONE COFFEE</span>
                    <span className={styles.vietqrBadge}>VietQR MB Bank</span>
                  </div>
                </div>

                <div className={styles.qrCodeWrapper}>
                  <Image
                    src={qrUrl}
                    alt="VietQR Payment Code"
                    width={280}
                    height={280}
                    unoptimized
                    className={styles.qrImage}
                  />
                </div>

                <p className={styles.scanInstruction}>
                  {lang === 'vi' ? 'Mở app ngân hàng quét mã QR để thanh toán' : 'Scan VietQR with any banking app'}
                </p>
                <p className={styles.scanSub}>
                  {lang === 'vi'
                    ? 'Số tiền và nội dung đã được điền tự động. Sau khi hoàn tất, vui lòng nhấn nút xác nhận bên dưới.'
                    : 'Amount & note are filled automatically. Press confirm button after transfer.'}
                </p>
              </div>
            ) : (
              <div className={styles.bankCard}>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>{lang === 'vi' ? 'Ngân hàng' : 'Bank'}</span>
                  <span className={styles.bankValue}>MB Bank (Quân Đội)</span>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>{lang === 'vi' ? 'Số tài khoản' : 'Account No.'}</span>
                  <div>
                    <span className={styles.bankValueHighlight}>0977999948</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => copyToClipboard('0977999948', 'stk')}
                    >
                      {copiedField === 'stk' ? '✓' : (lang === 'vi' ? 'Chép' : 'Copy')}
                    </button>
                  </div>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>{lang === 'vi' ? 'Chủ tài khoản' : 'Beneficiary'}</span>
                  <span className={styles.bankValue}>PHAM XUAN DINH</span>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>{lang === 'vi' ? 'Số tiền' : 'Amount'}</span>
                  <div>
                    <span className={styles.bankValueHighlight}>{formatPrice(qrAmount)}</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => copyToClipboard(qrAmount.toString(), 'amount')}
                    >
                      {copiedField === 'amount' ? '✓' : (lang === 'vi' ? 'Chép' : 'Copy')}
                    </button>
                  </div>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>{lang === 'vi' ? 'Nội dung CK' : 'Transfer Memo'}</span>
                  <div>
                    <span className={styles.bankValueHighlight}>{orderNumber}</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => copyToClipboard(orderNumber, 'memo')}
                    >
                      {copiedField === 'memo' ? '✓' : (lang === 'vi' ? 'Chép' : 'Copy')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </section>
      ) : (
        <section className={`${styles.sectionCard} ${styles.paymentLockedCard}`}>
          <span className={styles.paymentLockedIcon}>🔒</span>
          <div>
            <h2 className={styles.paymentLockedTitle}>
              {lang === 'vi' ? 'Thanh toán đang được khóa' : 'Payment is locked'}
            </h2>
            <p className={styles.paymentLockedText}>
              {lang === 'vi'
                ? 'Vui lòng tạo tài khoản mới hoặc đăng nhập tài khoản đã có ở phần trên để chọn phương thức thanh toán.'
                : 'Please register or log in above to choose a payment method.'}
            </p>
          </div>
        </section>
      )}

      {/* Sticky Bottom Action Button */}
      <div className={styles.bottomBar}>
        {isLoggedIn && userId ? (
          <button
            className={`${styles.submitBtn} ${paymentMethod === 'cash' ? styles.submitBtnCash : ''}`}
            onClick={handleSubmitOrder}
            disabled={loading}
          >
            {loading ? (
              <span>{lang === 'vi' ? 'Đang xử lý đơn hàng...' : 'Processing order...'}</span>
            ) : paymentMethod === 'cash' ? (
              <span>
                {lang === 'vi'
                  ? `Xác nhận Đặt hàng (Tiền mặt) • ${formatPrice(qrAmount)}`
                  : `Confirm Order (Cash) • ${formatPrice(qrAmount)}`}
              </span>
            ) : (
              <span>
                {lang === 'vi'
                  ? `✓ Tôi đã chuyển khoản xong • ${formatPrice(qrAmount)}`
                  : `✓ I have transferred • ${formatPrice(qrAmount)}`}
              </span>
            )}
          </button>
        ) : (
          <div className={styles.bottomLockedNotice}>
            <span>🔒</span>
            <span>
              {lang === 'vi'
                ? 'Tạo tài khoản hoặc đăng nhập để tiếp tục thanh toán'
                : 'Register or log in to continue payment'}
            </span>
          </div>
        )}
      </div>

      {/* Hotline Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', fontSize: '32px', marginBottom: '8px' }}>📞</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '17px', fontWeight: 800, color: '#1E4D3B', textAlign: 'center' }}>
              Quên mật khẩu đăng nhập?
            </h3>
            <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: '1.6', margin: '0 0 16px', textAlign: 'center' }}>
              Do tài khoản được định danh theo Số điện thoại nội bộ, quý khách vui lòng liên hệ Hotline One Coffee để nhân viên hỗ trợ đặt lại mật khẩu trong 1 phút!
            </p>
            <div
              style={{
                background: '#F0FFF4',
                border: '1px solid #C6F6D5',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#2F855A', fontWeight: 700 }}>HOTLINE HỖ TRỢ / ZALO</div>
              <a
                href="tel:0977999948"
                style={{ fontSize: '20px', fontWeight: 800, color: '#1E4D3B', textDecoration: 'none', display: 'block', marginTop: '4px' }}
              >
                0977 999 948
              </a>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#EDF2F7',
                  color: '#4A5568',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
              <a
                href="tel:0977999948"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1E4D3B',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>📞</span> Gọi ngay
              </a>
            </div>
          </div>
        </div>
      )}
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
