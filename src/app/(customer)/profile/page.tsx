'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
import { useFavorites } from '@/lib/favorites'
import { menuProducts, getProductImage, type MenuProduct } from '@/lib/menu-data'
import styles from './profile.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const { lang, setLang } = useLang()
  const { showToast } = useToast()
  const { favorites, toggleFavorite, totalFavorites } = useFavorites()
  const [favoriteProducts, setFavoriteProducts] = useState<MenuProduct[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [profile, setProfile] = useState<{
    full_name: string
    phone: string
    default_delivery_address: string | null
  } | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  const [selectedLocation, setSelectedLocation] = useState('')
  const [tempAddress, setTempAddress] = useState('')
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('oc_delivery_location')
    if (saved) setSelectedLocation(saved)

    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsLoggedIn(true)
          const { data } = await supabase
            .from('profiles')
            .select('full_name, phone, default_delivery_address')
            .eq('id', session.user.id)
            .single()
          if (data) {
            setProfile(data)
            if (data.default_delivery_address) {
              setSelectedLocation(data.default_delivery_address)
            }
          }
        } else {
          // Guest mode - DO NOT set fake demo profile!
          setIsLoggedIn(false)
          setProfile(null)
        }
      } catch {
        setIsLoggedIn(false)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  // Load favorite product details whenever favorites list changes
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteProducts([])
      return
    }
    // Try Supabase first, fallback to static data
    const supabase = createClient()
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name_vi, name_en, price_m, price_l, image_url, categories(slug)')
          .in('id', favorites)
          .eq('is_available', true)
        if (!error && data && data.length > 0) {
          const mapped: MenuProduct[] = (data as any[]).map((d: any) => ({
            id: d.id,
            category_slug: d.categories?.slug || 'coffee',
            name_vi: d.name_vi,
            name_en: d.name_en,
            price_m: d.price_m,
            price_l: d.price_l,
            image_url: d.image_url,
          }))
          setFavoriteProducts(mapped)
        } else {
          // Fallback: match from static menu data (slug-based IDs)
          const staticMatches = menuProducts.filter(p => favorites.includes(p.id))
          setFavoriteProducts(staticMatches)
        }
      } catch {
        const staticMatches = menuProducts.filter(p => favorites.includes(p.id))
        setFavoriteProducts(staticMatches)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.join(',')])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    // Completely clear all user & guest cache
    localStorage.removeItem('oc_customer_name')
    localStorage.removeItem('oc_customer_phone')
    localStorage.removeItem('oc_delivery_location')
    localStorage.removeItem('onecoffee_cart')
    localStorage.removeItem('sb-hidebmafolacwfzgrrqn-auth-token')
    sessionStorage.clear()
    setIsLoggedIn(false)
    setProfile(null)
    showToast(lang === 'vi' ? 'Đã đăng xuất tài khoản và xóa cache' : 'Logged out and cache cleared', 'info')
    router.replace('/home')
  }

  const handleResetGuestCache = () => {
    localStorage.clear()
    sessionStorage.clear()
    setProfile(null)
    setIsLoggedIn(false)
    setSelectedLocation('')
    showToast(
      lang === 'vi' ? 'Đã xóa toàn bộ bộ nhớ đệm! Bạn có thể test như khách mới.' : 'Cache cleared! Ready to test as new customer.',
      'success'
    )
    router.replace('/home')
  }

  const toggleLanguage = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi'
    setLang(nextLang)
    showToast(
      nextLang === 'vi' ? 'Đã đổi sang Tiếng Việt 🇻🇳' : 'Switched to English 🇺🇸',
      'success'
    )
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map(p => p[0].toUpperCase())
        .join('')
    : '👤'

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {lang === 'vi' ? 'Tài khoản' : 'Account'}
        </h1>
      </header>

      {/* User Info Card */}
      <div className={styles.userCard}>
        <div className={styles.avatarCircle}>
          {initials}
        </div>
        <div className={styles.userDetails}>
          <h2 className={styles.userName}>
            {isLoggedIn && profile?.full_name
              ? profile.full_name
              : (lang === 'vi' ? 'Khách hàng vãng lai' : 'Guest Customer')}
          </h2>
          <p className={styles.userRole}>
            {isLoggedIn
              ? (lang === 'vi' ? 'Nhân viên nhà máy LSP' : 'LSP Employee')
              : (lang === 'vi' ? 'Chưa đăng nhập tài khoản' : 'Not logged in')}
          </p>
        </div>
      </div>

      {/* Guest Login / Register CTA if not logged in */}
      {!isLoggedIn && (
        <div style={{ background: '#F4F9F6', border: '1px solid #D1E7DD', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔐</span>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E4D3B' }}>
              {lang === 'vi' ? 'Đăng nhập bằng SĐT & Mật khẩu' : 'Login with Phone & Password'}
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#4A5568', margin: 0, lineHeight: 1.5 }}>
            {lang === 'vi'
              ? 'Nhập Số điện thoại và Mật khẩu bạn đã đặt khi mua hàng để xem lại lịch sử đơn, tích điểm và nạp nhanh thông tin nhận hàng.'
              : 'Enter your phone number & password from checkout to view order history and earn points.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            <Link
              href="/auth/login"
              style={{ padding: '9px 0', background: '#1E4D3B', color: '#FFFFFF', textAlign: 'center', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
            >
              {lang === 'vi' ? 'Đăng nhập' : 'Login'}
            </Link>
            <Link
              href="/auth/register"
              style={{ padding: '9px 0', background: '#FFFFFF', color: '#1E4D3B', border: '1px solid #1E4D3B', textAlign: 'center', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
            >
              {lang === 'vi' ? 'Đăng ký' : 'Register'}
            </Link>
          </div>
        </div>
      )}

      {/* Menu Options */}
      <div className={styles.menuContainer}>
        {/* 1. My Information (if logged in) */}
        {isLoggedIn && (
          <div className={styles.menuItem} onClick={() => setShowInfoModal(true)}>
            <div className={styles.menuItemLeft}>
              <span className={styles.menuIcon}>👤</span>
              <span className={styles.menuText}>
                {lang === 'vi' ? 'Thông tin cá nhân' : 'My Information'}
              </span>
            </div>
            <span className={styles.chevron}>›</span>
          </div>
        )}

        {/* 2. Default Delivery Address */}
        <div
          className={styles.menuItem}
          onClick={() => {
            setTempAddress(selectedLocation)
            setShowAddressModal(true)
          }}
        >
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>📍</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Địa chỉ giao hàng mặc định' : 'Default Delivery Address'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

        {/* 3. Favorite Drinks — expandable inline list */}
        <div>
          <div
            className={styles.menuItem}
            onClick={() => setShowFavorites(v => !v)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.menuItemLeft}>
              <span className={styles.menuIcon}>❤️</span>
              <span className={styles.menuText}>
                {lang === 'vi' ? 'Danh sách yêu thích' : 'Favorite Drinks'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {totalFavorites > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, background: '#FFE4E6', color: '#E11D48', padding: '2px 8px', borderRadius: '12px' }}>
                  {totalFavorites} {lang === 'vi' ? 'món' : 'items'}
                </span>
              )}
              <span className={styles.chevron} style={{ transform: showFavorites ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>›</span>
            </div>
          </div>

          {/* Favorites inline panel */}
          {showFavorites && (
            <div style={{ background: '#FFF5F5', borderTop: '1px solid #FFE4E6', borderRadius: '0 0 14px 14px', padding: '12px 16px', marginTop: -1 }}>
              {favoriteProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>❤️</div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 12px' }}>
                    {lang === 'vi'
                      ? 'Chưa có món yêu thích nào. Bấm ❤️ ở bất kỳ món nào trong menu!'
                      : 'No favorites yet. Tap ❤️ on any menu item!'}
                  </p>
                  <Link
                    href="/menu"
                    style={{
                      display: 'inline-block',
                      background: '#1E4D3B',
                      color: '#fff',
                      padding: '8px 20px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    ☕ {lang === 'vi' ? 'Khám phá Menu' : 'Explore Menu'}
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {favoriteProducts.map(product => {
                    const imgUrl = getProductImage(product)
                    const name = lang === 'vi' ? product.name_vi : product.name_en
                    const price = product.price_m ?? product.price_l
                    return (
                      <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', borderRadius: '12px', padding: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <Link href={`/menu/${product.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                          <img
                            src={imgUrl}
                            alt={name}
                            style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                            onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=200&auto=format&fit=crop' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                            {price && <div style={{ fontSize: '12px', color: '#1E4D3B', fontWeight: 600, marginTop: 2 }}>{new Intl.NumberFormat('vi-VN').format(price * (price < 1000 ? 1000 : 1))}đ</div>}
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            toggleFavorite(product.id)
                            showToast(lang === 'vi' ? 'Đã bỏ yêu thích' : 'Removed from favorites', 'info')
                          }}
                          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                          aria-label="Remove favorite"
                        >
                          ❤️
                        </button>
                      </div>
                    )
                  })}
                  <Link
                    href="/menu?cat=favorites"
                    style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: '#1E4D3B', fontWeight: 700, padding: '8px', textDecoration: 'none' }}
                  >
                    {lang === 'vi' ? '📋 Xem trong Menu →' : '📋 View in Menu →'}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Order History */}
        <Link href="/orders" className={styles.menuItem}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>🕒</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Lịch sử đơn hàng' : 'Order History'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </Link>

        {/* 5. Language Switcher */}
        <div className={styles.menuItem} onClick={toggleLanguage}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>🌐</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Ngôn ngữ' : 'Language'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E4D3B' }}>
              {lang === 'vi' ? 'Tiếng Việt 🇻🇳' : 'English 🇺🇸'}
            </span>
            <span className={styles.chevron}>›</span>
          </div>
        </div>

        {/* 6. Help & Support */}
        <div className={styles.menuItem} onClick={() => setShowHelpModal(true)}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>❓</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Hotline & Hỗ trợ' : 'Help & Support'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

        {/* 7. About One Coffee */}
        <div className={styles.menuItem} onClick={() => setShowAboutModal(true)}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>ℹ️</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Về One Coffee LSP' : 'About One Coffee'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

        {/* 8. Reset Cache / Test New Customer */}
        <div className={styles.menuItem} onClick={handleResetGuestCache} style={{ borderTop: '1px dashed #E2E8F0', marginTop: '4px' }}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>🗑️</span>
            <span className={styles.menuText} style={{ color: '#C53030' }}>
              {lang === 'vi' ? 'Xóa toàn bộ Cache (Test khách mới)' : 'Reset Cache (Test New Guest)'}
            </span>
          </div>
          <span className={styles.chevron} style={{ color: '#C53030' }}>›</span>
        </div>
      </div>

      {/* Log Out Button (Only shown if logged in) */}
      {isLoggedIn && (
        <div className={styles.logoutWrapper}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            {lang === 'vi' ? 'Đăng xuất tài khoản' : 'Log Out'}
          </button>
        </div>
      )}

      {/* Edit Address Modal */}
      {showAddressModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAddressModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: '#1E4D3B' }}>
              📍 {lang === 'vi' ? 'Địa chỉ giao hàng mặc định' : 'Default Delivery Address'}
            </h3>
            <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 8px' }}>
              {lang === 'vi'
                ? 'Nhập địa chỉ nhận hàng tại nhà máy LSP hoặc khu vực lân cận để tự động điền khi đặt hàng.'
                : 'Enter your preferred delivery address for fast checkout.'}
            </p>
            <input
              type="text"
              className={styles.modalInput}
              placeholder={lang === 'vi' ? 'VD: Tòa nhà điều hành, Cổng 2, đường ABC...' : 'e.g. Admin Building, Gate 2...'}
              value={tempAddress}
              onChange={e => setTempAddress(e.target.value)}
              autoFocus
            />
            <div className={styles.modalActionRow}>
              <button className={styles.modalCancelBtn} onClick={() => setShowAddressModal(false)}>
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                className={styles.modalSaveBtn}
                onClick={async () => {
                  const val = tempAddress.trim()
                  setSelectedLocation(val)
                  localStorage.setItem('oc_delivery_location', val)
                  if (isLoggedIn) {
                    try {
                      const supabase = createClient()
                      const { data: { session } } = await supabase.auth.getSession()
                      if (session) {
                        await supabase
                          .from('profiles')
                          .update({ default_delivery_address: val })
                          .eq('id', session.user.id)
                      }
                    } catch {
                      // non-fatal
                    }
                  }
                  showToast(lang === 'vi' ? 'Đã lưu địa chỉ giao hàng!' : 'Address saved!', 'success')
                  setShowAddressModal(false)
                }}
              >
                {lang === 'vi' ? 'Lưu địa chỉ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowInfoModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#1E4D3B' }}>
              {lang === 'vi' ? 'Thông tin cá nhân' : 'My Information'}
            </h3>
            <p><strong>{lang === 'vi' ? 'Họ và tên:' : 'Full Name:'}</strong> {profile?.full_name || (lang === 'vi' ? 'Khách vãng lai' : 'Guest')}</p>
            <p><strong>{lang === 'vi' ? 'Số điện thoại:' : 'Phone Number:'}</strong> {profile?.phone || (lang === 'vi' ? 'Chưa cập nhật' : 'Not updated')}</p>
            <p><strong>{lang === 'vi' ? 'Vị trí mặc định:' : 'Default Location:'}</strong> {selectedLocation || (lang === 'vi' ? 'Chưa lưu' : 'Not set')}</p>
            <button className={styles.modalCloseBtn} onClick={() => setShowInfoModal(false)}>
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelpModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: '#1E4D3B' }}>
              ☕ {lang === 'vi' ? 'Hotline & Hỗ Trợ One Coffee' : 'One Coffee Hotline & Support'}
            </h3>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
              {lang === 'vi'
                ? 'Quầy One Coffee tại nhà máy Hóa Dầu Long Sơn (LSP).'
                : 'One Coffee Shop at Long Son Petrochemicals (LSP) Complex.'}<br />
              📞 {lang === 'vi' ? 'Hotline đặt hàng: ' : 'Order Hotline: '}<a href="tel:0828687321" style={{ color: '#1E4D3B', fontWeight: 800, textDecoration: 'none' }}>0828 687 321 (Ngọc)</a><br />
              ⏰ {lang === 'vi' ? 'Giờ phục vụ: ' : 'Working Hours: '}<strong>06:30 — 18:00</strong> {lang === 'vi' ? 'các ngày trong tuần.' : 'daily.'}
            </p>
            <button className={styles.modalCloseBtn} onClick={() => setShowHelpModal(false)}>
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAboutModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <img src="/icon-order-192.png" alt="One Coffee Logo" style={{ width: '42px', height: '42px', borderRadius: '10px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1E4D3B' }}>
                  ONE COFFEE LSP
                </h3>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#C89B3C' }}>
                  LSP PETROCHEMICAL COMPLEX · SINCE 2026
                </div>
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-artistic), cursive', fontSize: '22px', color: '#1E4D3B', margin: '6px 0 14px' }}>
              Good Coffee — Brighter Workdays
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13.5px', color: '#1E293B', lineHeight: '1.6', margin: '0 0 10px', fontWeight: 500 }}>
                {lang === 'vi'
                  ? 'Thành lập năm 2026, One Coffee là điểm cà phê tiện ích tại LSP, phục vụ nhu cầu hằng ngày và mang đến trải nghiệm thuận tiện hơn cho mọi thành viên làm việc tại đây.'
                  : 'Established in 2026, One Coffee is an in-house coffee shop at LSP, dedicated to bringing greater convenience and a better daily experience to everyone working here.'}
              </p>
              <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.5', margin: 0, fontStyle: 'italic', borderTop: '1px dashed #CBD5E1', paddingTop: '8px' }}>
                {lang === 'vi'
                  ? 'Established in 2026, One Coffee is an in-house coffee shop at LSP, dedicated to bringing greater convenience and a better daily experience to everyone working here.'
                  : 'Thành lập năm 2026, One Coffee là điểm cà phê tiện ích tại LSP, phục vụ nhu cầu hằng ngày và mang đến trải nghiệm thuận tiện hơn cho mọi thành viên làm việc tại đây.'}
              </p>
            </div>
            <button className={styles.modalCloseBtn} onClick={() => setShowAboutModal(false)}>
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
