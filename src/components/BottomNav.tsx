'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart, useLang } from '@/lib/providers'
import styles from './BottomNav.module.css'

const navItems = [
  { href: '/home',    icon: '🏠', label_vi: 'Trang chủ', label_en: 'Home' },
  { href: '/menu',    icon: '📋', label_vi: 'Menu',       label_en: 'Menu' },
  { href: '/orders',  icon: '📦', label_vi: 'Đơn hàng',   label_en: 'Orders' },
  { href: '/profile', icon: '👤', label_vi: 'Tài khoản',  label_en: 'More' },
]

const MAIN_NAV_PATHS = ['/home', '/menu', '/orders', '/profile']

export default function BottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCart()
  const { lang } = useLang()

  // Only display bottom navigation on main customer tabs.
  // Hide on detail pages (/menu/[id], /cart, /checkout, /orders/[id]) to prevent button overlap.
  if (!MAIN_NAV_PATHS.includes(pathname)) {
    return null
  }

  return (
    <nav className={styles.nav} role="navigation" aria-label="Bottom navigation">
      {navItems.map(item => {
        const isActive = pathname.startsWith(item.href)
        const isMenu   = item.href === '/menu'
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.iconWrap}>
              {item.icon}
              {isMenu && totalItems > 0 && (
                <span className={styles.badge}>{totalItems > 9 ? '9+' : totalItems}</span>
              )}
            </span>
            <span className={styles.label}>{lang === 'vi' ? item.label_vi : item.label_en}</span>
          </Link>
        )
      })}

      {/* Cart FAB */}
      {totalItems > 0 && (
        <Link href="/cart" className={styles.cartFab} aria-label={`Giỏ hàng (${totalItems} món)`}>
          🛒
          <span className={styles.cartBadge}>{totalItems > 9 ? '9+' : totalItems}</span>
        </Link>
      )}
    </nav>
  )
}
