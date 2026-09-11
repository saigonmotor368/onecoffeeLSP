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
  const { lang, setLang, t } = useLang()
  const { showToast } = useToast()
  const [profile, setProfile] = useState<{
    full_name: string
    phone: string
    default_delivery_address: string | null
  } | null>(null)

  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION.name_en)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('oc_delivery_location')
    if (saved) setSelectedLocation(saved)

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
          setProfile(data)
          if (data.default_delivery_address) {
            setSelectedLocation(data.default_delivery_address)
          }
        }
      } else {
        // Demo profile matching Screen 10
        setProfile({
          full_name: 'Nguyen Van A',
          phone: '0901234567',
          default_delivery_address: 'LSP - Production Line 3',
        })
      }
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    showToast(lang === 'vi' ? 'Đã đăng xuất tài khoản' : 'Logged out', 'info')
    router.replace('/')
  }

  const toggleLanguage = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi'
    setLang(nextLang)
    showToast(
      nextLang === 'vi' ? 'Đã đổi sang Tiếng Việt 🇻🇳' : 'Switched to English 🇺🇸',
      'success'
    )
  }

  const name = profile?.full_name ?? 'Nguyen Van A'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map(p => p[0].toUpperCase())
    .join('') || 'ND'

  return (
    <div className={styles.pageContainer}>
      {/* Header matching Screen 10 */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {lang === 'vi' ? 'Hồ sơ của tôi' : 'My Profile'}
        </h1>
      </header>

      {/* User Info Card matching Screen 10 */}
      <div className={styles.userCard}>
        <div className={styles.avatarCircle}>
          {initials}
        </div>
        <div className={styles.userDetails}>
          <h2 className={styles.userName}>{name}</h2>
          <p className={styles.userRole}>
            {lang === 'vi' ? 'Nhân viên nhà máy LSP' : 'LSP Employee'}
          </p>
        </div>
      </div>

      {/* Menu Options matching Screen 10 */}
      <div className={styles.menuContainer}>
        {/* 1. My Information */}
        <div className={styles.menuItem} onClick={() => setShowInfoModal(true)}>
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>👤</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Thông tin cá nhân' : 'My Information'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

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

        {/* 4. Favorites */}
        <div
          className={styles.menuItem}
          onClick={() => showToast(lang === 'vi' ? 'Danh sách món yêu thích' : 'Favorites list', 'info')}
        >
          <div className={styles.menuItemLeft}>
            <span className={styles.menuIcon}>🤍</span>
            <span className={styles.menuText}>
              {lang === 'vi' ? 'Món yêu thích' : 'Favorites'}
            </span>
          </div>
          <span className={styles.chevron}>›</span>
        </div>

        {/* 5. Language Switcher with 🇻🇳 and 🇺🇸 */}
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
              {lang === 'vi' ? 'Trợ giúp & Hỗ trợ' : 'Help & Support'}
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
      </div>

      {/* Log Out Button matching Screen 10 */}
      <div className={styles.logoutWrapper}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          {lang === 'vi' ? 'Đăng xuất' : 'Log Out'}
        </button>
      </div>

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
            <p><strong>Họ và tên:</strong> {profile?.full_name || 'Nguyen Van A'}</p>
            <p><strong>Số điện thoại:</strong> {profile?.phone || '0901234567'}</p>
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
