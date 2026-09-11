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
      {/* Background Coffee Beans with dark overlay */}
      <div className={styles.bgImageWrap}>
        <div
          className={styles.bgImage}
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&q=85")',
          }}
        />
        <div className={styles.bgOverlay} />
      </div>

      {/* Language Switcher at Top */}
      <header className={styles.topBar}>
        <div className={styles.langPills}>
          {LANGUAGE_OPTIONS.map(opt => (
            <button
              key={opt.code}
              onClick={() => setLang(opt.code)}
              className={`${styles.langPill} ${lang === opt.code ? styles.langPillActive : ''}`}
            >
              <span>{opt.flag}</span>
              <span>{opt.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Center Piece: Arched Card matching Screen 1 */}
      <div className={styles.archedCardContainer}>
        <div className={styles.archedCard}>
          {/* Circular Real Brand Logo */}
          <div className={styles.logoWrapper}>
            <Image
              src="/logo-circle.png"
              alt="One Coffee Logo"
              width={105}
              height={105}
              priority
              className={styles.logoImg}
            />
          </div>

          {/* Brand Heading */}
          <h1 className={styles.brandTitle}>ONE COFFEE</h1>

          {/* Artistic Slogan matching mockup */}
          <div className={styles.artisticSloganWrap}>
            <span className={styles.sloganLineLeft} />
            <p className={styles.artisticSloganText}>Good Coffee</p>
            <span className={styles.sloganLineRight} />
          </div>
          <p className={styles.artisticSloganSub}>Brighter Workdays</p>
        </div>
      </div>

      {/* Lower Action Area matching Screen 1 */}
      <div className={styles.bottomSection}>
        <button
          className={styles.btnGetStarted}
          onClick={() => router.push('/home')}
        >
          {lang === 'vi' ? 'Bắt đầu đặt nước' : 'Get Started'}
        </button>

        <button
          className={styles.btnLogin}
          onClick={() => router.push('/auth/login')}
        >
          {lang === 'vi' ? 'Đăng nhập' : 'Login'}
        </button>

        <p className={styles.factoryTagline}>
          One Coffee @ LSP Petrochemical Complex · Since 2026
        </p>
      </div>
    </div>
  )
}
