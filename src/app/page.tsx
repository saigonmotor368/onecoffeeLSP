'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './welcome.module.css'
import { useLang } from '@/lib/providers'
import { LANGUAGE_OPTIONS } from '@/lib/i18n'

export default function WelcomePage() {
  const router = useRouter()
  const { lang, setLang, t } = useLang()

  useEffect(() => {
    const checkSession = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.replace('/home')
    }
    checkSession()
  }, [router])

  return (
    <div className={styles.pageContainer}>
      {/* Floating Language Switcher at Top */}
      <header className={styles.topBar}>
        <div className={styles.langPills}>
          {LANGUAGE_OPTIONS.map(opt => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLang(opt.code)}
              className={`${styles.langPill} ${lang === opt.code ? styles.langPillActive : ''}`}
            >
              <span>{opt.flag}</span>
              <span>{opt.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Center Piece: Arched Cream Card matching Screen 1 */}
      <main className={styles.centerSection}>
        <div className={styles.archedCard}>
          {/* Circular Brand Logo (transparent PNG) */}
          <div className={styles.logoWrapper}>
            <Image
              src="/logo-circle.png"
              alt="One Coffee Logo"
              width={116}
              height={116}
              priority
              className={styles.logoImg}
            />
          </div>

          {/* Brand Heading */}
          <h1 className={styles.brandTitle}>ONE COFFEE</h1>

          {/* Slogan matching Screen 1 layout */}
          <div className={styles.sloganContainer}>
            <p className={styles.sloganLine1}>
              Good Coffee <span className={styles.sloganDash}>—</span>
            </p>
            <p className={styles.sloganLine2}>Brighter Workdays</p>
          </div>
        </div>
      </main>

      {/* Foreground Real Roasted Coffee Beans (Screen 1) */}
      <div className={styles.coffeeBeansForeground} />

      {/* Bottom Actions sitting directly on Coffee Beans (Screen 1) */}
      <footer className={styles.bottomSection}>
        <button
          type="button"
          className={styles.btnGetStarted}
          onClick={() => router.push('/home')}
        >
          {lang === 'vi' ? 'Bắt đầu đặt món' : 'Get Started'}
        </button>

        <button
          type="button"
          className={styles.btnLogin}
          onClick={() => router.push('/auth/login')}
        >
          {lang === 'vi' ? 'Đăng nhập / Login' : 'Login'}
        </button>

        <p className={styles.factoryTagline}>
          One Coffee @ LSP Petrochemical Complex · Since 2026
        </p>
      </footer>
    </div>
  )
}
