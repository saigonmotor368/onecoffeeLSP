'use client'

import { useRouter } from 'next/navigation'
import styles from './welcome.module.css'
import { useLang } from '@/lib/providers'
import { LANGUAGE_OPTIONS } from '@/lib/i18n'

export default function WelcomePage() {
  const router = useRouter()
  const { lang, setLang } = useLang()

  return (
    <div className={styles.pageContainer}>
      {/* Background with Green Top, Cream Arch, and Roasted Coffee Beans */}
      <div className={styles.bgImage} />

      {/* Floating Language Switcher at Top Right */}
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

      {/* Brand & Slogan Content centered in the Cream Arch */}
      <main className={styles.brandContent}>
        {/* Original Canva Transparent Logo from Logo on Cup_Rv */}
        <div className={styles.logoWrapper}>
          <img
            src="/logo-original-transparent.png?v=2026"
            alt="One Coffee Logo"
            className={styles.logoImg}
            width={130}
            height={130}
          />
        </div>

        {/* Brand Heading with Luxury Emerald Gradient */}
        <h1 className={styles.brandTitle}>ONE COFFEE</h1>

        {/* Artistic, Soft & Colorful Cursive Slogan */}
        <div className={styles.sloganContainer}>
          <p className={styles.sloganLine1}>
            <span className={styles.sloganTextWarm}>Good Coffee</span>
            <span className={styles.sloganDash}>—</span>
          </p>
          <p className={styles.sloganLine2}>
            <span className={styles.sloganTextGreen}>Brighter Workdays</span>
          </p>
        </div>
      </main>

      {/* Bottom Actions */}
      <footer className={styles.bottomSection}>
        <button
          type="button"
          className={styles.btnGetStarted}
          onClick={() => router.push('/home')}
        >
          {lang === 'vi' ? 'Bắt đầu đặt món →' : 'Start Ordering →'}
        </button>

        <p className={styles.factoryTagline}>
          One Coffee @ LSP Petrochemical Complex · Since 2026
        </p>
      </footer>
    </div>
  )
}
