'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
import styles from './profile.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const { lang, setLang, t } = useLang()
  const { showToast } = useToast()
  const [profile, setProfile] = useState<{
    full_name: string; phone: string; default_delivery_address: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles').select('full_name, phone, default_delivery_address')
        .eq('id', session.user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    showToast('Đã đăng xuất', 'success')
    router.replace('/')
  }

  const menuItems = [
    { icon: '👤', label_vi: 'Thông tin cá nhân', label_en: 'My Information', href: '/profile/edit' },
    { icon: '📦', label_vi: 'Lịch sử đơn hàng',  label_en: 'Order History',    href: '/orders' },
    { icon: '❤️', label_vi: 'Yêu thích',           label_en: 'Favorites',         href: '/favorites' },
    { icon: '🌐', label_vi: 'Ngôn ngữ',            label_en: 'Language',          href: null },
    { icon: '❓', label_vi: 'Hỗ trợ',              label_en: 'Help & Support',    href: '/help' },
    { icon: 'ℹ️', label_vi: 'Về One Coffee',        label_en: 'About One Coffee',  href: '/about' },
  ]

  return (
    <div className={styles.page}>
      {/* Profile header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.profileName}>{profile?.full_name ?? 'Khách hàng'}</h1>
          <p className={styles.profilePhone}>{profile?.phone ?? ''}</p>
          {profile?.default_delivery_address && (
            <p className={styles.profileAddr}>📍 {profile.default_delivery_address}</p>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className={styles.menuList}>
        {menuItems.map((item, i) => {
          const label = lang === 'vi' ? item.label_vi : item.label_en
          if (item.href) {
            return (
              <Link key={i} href={item.href} className={styles.menuItem}>
                <span className={styles.menuIcon}>{item.icon}</span>
                <span className={styles.menuLabel}>{label}</span>
                <span className={styles.menuChevron}>›</span>
              </Link>
            )
          }
          // Language toggle
          return (
            <div key={i} className={styles.menuItem}>
              <span className={styles.menuIcon}>{item.icon}</span>
              <span className={styles.menuLabel}>{label}</span>
              <div className={styles.langToggle}>
                <button
                  className={`${styles.langBtn} ${lang === 'vi' ? styles.langBtnActive : ''}`}
                  onClick={() => setLang('vi')}
                >VI</button>
                <button
                  className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
                  onClick={() => setLang('en')}
                >EN</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Logout */}
      <div className={styles.logoutWrap}>
        <button className={`btn btn-outline btn-full ${styles.logoutBtn}`} onClick={handleLogout}>
          🚪 {t('logout')}
        </button>
        <p className={styles.version}>One Coffee LSP · v1.0.0 · Since 2026</p>
      </div>
    </div>
  )
}
