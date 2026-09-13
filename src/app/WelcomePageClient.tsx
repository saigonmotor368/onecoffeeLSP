'use client'

import { useRouter } from 'next/navigation'
import styles from './welcome.module.css'
import { useLang } from '@/lib/providers'

export default function WelcomePageClient() {
  const router = useRouter()
  const { lang, setLang } = useLang()

  return (
    <div className={styles.pageContainer}>
      {/* Background with Green Top, Cream Arch, and Roasted Coffee Beans */}
      <div className={styles.bgImage} />

      {/* Top Spacer */}
      <div className={styles.topBarSpacer} />

      {/* Brand & Slogan Content centered in the Cream Arch */}
      <div className={styles.brandContent}>
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
      </div>

      {/* Bottom Actions with 2 Language Buttons sitting right above the CTA */}
      <footer className={styles.bottomSection}>
        {/* 2 Prominent Language Selection Buttons */}
        <div className={styles.languageSelectorSection}>
          <div className={styles.languageButtonGroup}>
            <button
              type="button"
              onClick={() => setLang('vi')}
              className={`${styles.langSelectBtn} ${lang === 'vi' ? styles.langSelectBtnActive : ''}`}
              aria-label="Tiếng Việt"
            >
              <span className={styles.langName}>Tiếng Việt</span>
              {lang === 'vi' && <span className={styles.langCheck}>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => setLang('en')}
              className={`${styles.langSelectBtn} ${lang === 'en' ? styles.langSelectBtnActive : ''}`}
              aria-label="English"
            >
              <span className={styles.langName}>English</span>
              {lang === 'en' && <span className={styles.langCheck}>✓</span>}
            </button>
          </div>
        </div>

        {/* Primary Start CTA */}
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
