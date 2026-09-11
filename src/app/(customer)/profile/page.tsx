'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
import { DEFAULT_LOCATION } from '@/lib/locations'
import DeliveryLocationModal from '@/components/DeliveryLocationModal'
import styles from './profile.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const { lang, setLang } = useLang()
  const { showToast } = useToast()
  const [profile, setProfile] = useState<{
    full_name: string
    phone: string
    default_delivery_address: string | null
  } | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION.name_en)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
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
    setSelectedLocation(DEFAULT_LOCATION.name_en)
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
            <span style={{ fontSize: '20px' }}>✨</span>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E4D3B' }}>
              {lang === 'vi' ? 'Đăng nhập hoặc Tạo tài khoản' : 'Login or Create Account'}
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#4A5568', margin: 0, lineHeight: 1.4 }}>
            {lang === 'vi'
              ? 'Tích điểm thành viên, lưu điểm giao hàng yêu thích và theo dõi đơn hàng dễ dàng.'
              : 'Earn points, save delivery locations, and track your orders.'}
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

        {/* 2. Delivery Locations (21 locations in factory) */}
        <div className={styles.menuItem} onClick={() => setIsLocationModalOpen(true)}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>📍</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Vị trí nhận nước (21 điểm LSP)' : 'Delivery Locations'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

        {/* 3. Order History */}
        <Link href="/orders" className={styles.menuItem}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>🕒</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Lịch sử đơn hàng' : 'Order History'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </Link>

        {/* 4. Language Switcher */}
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

        {/* 5. Help & Support */}
        <div className={styles.menuItem} onClick={() => setShowHelpModal(true)}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>❓</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Hotline & Hỗ trợ' : 'Help & Support'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

        {/* 6. About One Coffee */}
        <div className={styles.menuItem} onClick={() => setShowAboutModal(true)}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>ℹ️</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Về One Coffee LSP' : 'About One Coffee'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

        {/* 7. Reset Cache / Test New Customer */}
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

      {/* 21 Locations Modal */}
      <DeliveryLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedLocation={selectedLocation}
        onSelect={loc => {
          setSelectedLocation(loc)
          localStorage.setItem('oc_delivery_location', loc)
          showToast(lang === 'vi' ? `Đã chọn: ${loc}` : `Selected: ${loc}`, 'success')
        }}
      />

      {/* Info Modal */}
      {showInfoModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowInfoModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#1E4D3B' }}>
              {lang === 'vi' ? 'Thông tin cá nhân' : 'My Information'}
            </h3>
            <p><strong>Họ và tên:</strong> {profile?.full_name || 'Khách vãng lai'}</p>
            <p><strong>Số điện thoại:</strong> {profile?.phone || 'Chưa cập nhật'}</p>
            <p><strong>Vị trí mặc định:</strong> {selectedLocation}</p>
            <button className={styles.modalCloseBtn} onClick={() => setShowInfoModal(false)}>Đóng</button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelpModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: '#1E4D3B' }}>
              ☕ One Coffee Hotline
            </h3>
            <p style={{ fontSize: '14px', color: '#4A5568', lineHeight: '1.6' }}>
              Quầy One Coffee tại nhà máy Hóa Dầu Long Sơn (LSP).<br />
              📞 Hotline giao hàng: <strong>0977 999 948</strong><br />
              ⏰ Giờ phục vụ: <strong>06:30 — 18:00</strong> các ngày trong tuần.
            </p>
            <button className={styles.modalCloseBtn} onClick={() => setShowHelpModal(false)}>Đóng</button>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAboutModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: '#1E4D3B' }}>
              ONE COFFEE LSP
            </h3>
            <p style={{ fontFamily: 'var(--font-artistic), cursive', fontSize: '24px', color: '#1E4D3B', margin: '4px 0 12px' }}>
              Good Coffee — Brighter Workdays
            </p>
            <p style={{ fontSize: '13px', color: '#718096', lineHeight: '1.5' }}>
              Phục vụ đồ uống sạch, chất lượng và giao tận tay đến 21 khu vực/phòng ban trong khuôn viên nhà máy Hóa dầu Long Sơn (LSP).
            </p>
            <button className={styles.modalCloseBtn} onClick={() => setShowAboutModal(false)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}
