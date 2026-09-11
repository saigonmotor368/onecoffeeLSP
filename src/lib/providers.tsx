'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, type Language, type TranslationKey } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import {
  getShippingConfig,
  getEmployeeDiscountConfig,
  DEFAULT_SHIPPING_CONFIG,
  DEFAULT_EMPLOYEE_DISCOUNT,
  type ShippingConfig,
  type EmployeeDiscountConfig,
} from '@/lib/settings'

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

export interface AppliedVoucher {
  id?: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_order_amount?: number | null
  max_discount?: number | null
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number

  // Shipping & Discount
  shippingConfig: ShippingConfig
  employeeDiscountConfig: EmployeeDiscountConfig
  shippingFee: number
  freeShippingThreshold: number
  isFreeShipping: boolean
  remainingForFreeShipping: number
  employeeDiscountPercent: number
  employeeDiscount: number
  appliedVoucher: AppliedVoucher | null
  voucherDiscount: number
  totalDiscount: number
  finalAmount: number
  applyVoucher: (code: string) => Promise<{ success: boolean; message: string }>
  removeVoucher: () => void
  refreshSettings: () => Promise<void>
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

  // Cart Items
  const [items, setItems] = useState<CartItem[]>([])
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG)
  const [employeeDiscountConfig, setEmployeeDiscountConfig] = useState<EmployeeDiscountConfig>(DEFAULT_EMPLOYEE_DISCOUNT)
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null)

  // Load configs
  const loadConfigs = useCallback(async () => {
    const [ship, emp] = await Promise.all([
      getShippingConfig(),
      getEmployeeDiscountConfig(),
    ])
    setShippingConfig(ship)
    setEmployeeDiscountConfig(emp)
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  // Load saved cart and voucher
  useEffect(() => {
    const savedCart = localStorage.getItem('oc_cart')
    if (savedCart) {
      try { setItems(JSON.parse(savedCart)) } catch { /* noop */ }
    }
    const savedVoucher = localStorage.getItem('oc_applied_voucher')
    if (savedVoucher) {
      try { setAppliedVoucher(JSON.parse(savedVoucher)) } catch { /* noop */ }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('oc_cart', JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (appliedVoucher) {
      localStorage.setItem('oc_applied_voucher', JSON.stringify(appliedVoucher))
    } else {
      localStorage.removeItem('oc_applied_voucher')
    }
  }, [appliedVoucher])

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

  const clearCart = useCallback(() => {
    setItems([])
    setAppliedVoucher(null)
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal   = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  // Freeship calculation
  const freeShippingThreshold = shippingConfig.free_shipping_threshold
  const isFreeShipping = items.length > 0 && subtotal >= freeShippingThreshold
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal)
  const shippingFee = items.length === 0 ? 0 : (isFreeShipping ? 0 : shippingConfig.shipping_fee)

  // Employee discount calculation (20% for LSP internal staff)
  const employeeDiscountPercent = employeeDiscountConfig.enabled ? employeeDiscountConfig.discount_percent : 0
  const employeeDiscount = employeeDiscountPercent > 0 ? Math.round(subtotal * (employeeDiscountPercent / 100)) : 0

  // Voucher discount calculation
  let voucherDiscount = 0
  if (appliedVoucher) {
    const minOrder = appliedVoucher.min_order_amount ?? 0
    if (subtotal >= minOrder) {
      if (appliedVoucher.type === 'percent') {
        const raw = Math.round(subtotal * (appliedVoucher.value / 100))
        voucherDiscount = appliedVoucher.max_discount ? Math.min(raw, appliedVoucher.max_discount) : raw
      } else {
        const val = appliedVoucher.value < 1000 ? appliedVoucher.value * 1000 : appliedVoucher.value
        voucherDiscount = Math.min(subtotal, val)
      }
    }
  }

  const totalDiscount = employeeDiscount + voucherDiscount
  const finalAmount = Math.max(0, subtotal - totalDiscount) + shippingFee

  // Apply Voucher function
  const applyVoucher = useCallback(async (rawCode: string): Promise<{ success: boolean; message: string }> => {
    const code = rawCode.trim().toUpperCase()
    if (!code) {
      return { success: false, message: 'Vui lòng nhập mã khuyến mãi' }
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (!error && data) {
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return { success: false, message: 'Mã khuyến mãi này đã hết hạn sử dụng' }
        }
        if (data.min_order_amount && subtotal < data.min_order_amount) {
          return {
            success: false,
            message: `Mã áp dụng cho đơn từ ${new Intl.NumberFormat('vi-VN').format(data.min_order_amount)}đ`,
          }
        }
        setAppliedVoucher({
          id: data.id,
          code: data.code,
          type: data.type as 'percent' | 'fixed',
          value: data.value,
          min_order_amount: data.min_order_amount,
          max_discount: data.max_discount,
        })
        return { success: true, message: `Áp dụng thành công mã ${data.code}!` }
      }
    } catch {
      // offline/fallback
    }

    // Fallback static vouchers
    if (code === 'WELCOME10') {
      if (subtotal < 50000) {
        return { success: false, message: 'Mã WELCOME10 áp dụng cho đơn từ 50.000đ' }
      }
      setAppliedVoucher({ code: 'WELCOME10', type: 'percent', value: 10, min_order_amount: 50000 })
      return { success: true, message: 'Áp dụng mã WELCOME10 giảm 10% thành công!' }
    }
    if (code === 'LSP50K') {
      if (subtotal < 150000) {
        return { success: false, message: 'Mã LSP50K áp dụng cho đơn từ 150.000đ' }
      }
      setAppliedVoucher({ code: 'LSP50K', type: 'fixed', value: 50000, min_order_amount: 150000 })
      return { success: true, message: 'Áp dụng mã LSP50K giảm 50.000đ thành công!' }
    }

    return { success: false, message: 'Mã khuyến mãi không tồn tại hoặc đã hết hạn' }
  }, [subtotal])

  const removeVoucher = useCallback(() => {
    setAppliedVoucher(null)
  }, [])

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang, t: tFn }}>
      <CartContext.Provider
        value={{
          items,
          addItem,
          removeItem,
          updateQuantity,
          clearCart,
          totalItems,
          subtotal,
          shippingConfig,
          employeeDiscountConfig,
          shippingFee,
          freeShippingThreshold,
          isFreeShipping,
          remainingForFreeShipping,
          employeeDiscountPercent,
          employeeDiscount,
          appliedVoucher,
          voucherDiscount,
          totalDiscount,
          finalAmount,
          applyVoucher,
          removeVoucher,
          refreshSettings: loadConfigs,
        }}
      >
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
