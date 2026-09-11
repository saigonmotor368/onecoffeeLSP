'use client'

import React from 'react'
import BottomNav from '@/components/BottomNav'
import CustomerOrderNotifier from '@/components/CustomerOrderNotifier'
import styles from './app-layout.module.css'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mobile-shell ${styles.shell}`}>
      <CustomerOrderNotifier />
      <main className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
