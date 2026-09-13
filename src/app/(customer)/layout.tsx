'use client'

import React from 'react'
import BottomNav from '@/components/BottomNav'
import CustomerOrderNotifier from '@/components/CustomerOrderNotifier'
import { usePushSubscription } from '@/lib/use-push-subscription'
import styles from './app-layout.module.css'

function PushInitializer() {
  usePushSubscription('customer', true)
  return null
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mobile-shell ${styles.shell}`}>
      <CustomerOrderNotifier />
      <PushInitializer />
      <main className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
