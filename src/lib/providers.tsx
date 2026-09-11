'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, type Language, type TranslationKey } from '@/lib/i18n'

// ── Cart Types ──────────────────────────────────────────────
export interface CartItem {
  id: string           // product_id + size
  product_id: string
  name_vi: string
  name_en: string
  size: 'M' | 'L'
  quantity: number
  unit_price: number
  addon_ids: string[]
  notes: string
  image_url: string | null
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
}

// ── Language Context ────────────────────────────────────────
interface LangContextValue {
  lang: Language
  setLang: (l: Language) => void
  t: (key: TranslationKey) => string
}

// ── Toast Context ───────────────────────────────────────────
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
}

// ── Create Contexts ─────────────────────────────────────────
const CartContext    = createContext<CartContextValue | null>(null)
const LangContext    = createContext<LangContextValue | null>(null)
const ToastContext   = createContext<ToastContextValue | null>(null)

// ── Root Provider ───────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  // Language
  const [lang, setLangState] = useState<Language>('vi')
  
  useEffect(() => {
    const saved = localStorage.getItem('oc_lang') as Language | null
    if (saved && (saved === 'vi' || saved === 'en')) setLangState(saved)

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  
  const setLang = useCallback((l: Language) => {
    setLangState(l)
    localStorage.setItem('oc_lang', l)
  }, [])

  const tFn = useCallback((key: TranslationKey) => {
    return translations[lang][key] as string
  }, [lang])

  // Cart
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('oc_cart')
    if (saved) {
      try { setItems(JSON.parse(saved)) } catch { /* noop */ }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('oc_cart', JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = `${item.product_id}-${item.size}-${item.addon_ids.sort().join(',')}`
    setItems(prev => {
      const existing = prev.find(i => i.id === id)
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i)
      }
      return [...prev, { ...item, id }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.id !== id))
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal   = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang, t: tFn }}>
      <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}>
        <ToastContext.Provider value={{ toasts, showToast }}>
          {children}
          <ToastContainer />
        </ToastContext.Provider>
      </CartContext.Provider>
    </LangContext.Provider>
  )
}

// ── Toast Container ─────────────────────────────────────────
function ToastContainer() {
  const ctx = useContext(ToastContext)!
  if (ctx.toasts.length === 0) return null
  return (
    <div className="toast-container">
      {ctx.toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

// ── Hooks ───────────────────────────────────────────────────
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within AppProvider')
  return ctx
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within AppProvider')
  return ctx
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within AppProvider')
  return ctx
}
