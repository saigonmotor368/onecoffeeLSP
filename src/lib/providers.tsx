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

function normalizeVoucherMoney(value: number | null | undefined) {
  if (!value) return 0
  return value < 1000 ? value * 1000 : value
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
  isLspEmployee: boolean
  setIsLspEmployee: (val: boolean) => void
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
  const [isLspEmployee, setIsLspEmployeeState] = useState<boolean>(false)
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

  // Load saved cart, voucher and LSP employee status
  useEffect(() => {
    const savedCart = localStorage.getItem('oc_cart')
    if (savedCart) {
      try { setItems(JSON.parse(savedCart)) } catch { /* noop */ }
    }
    const savedVoucher = localStorage.getItem('oc_applied_voucher')
    if (savedVoucher) {
      try { setAppliedVoucher(JSON.parse(savedVoucher)) } catch { /* noop */ }
    }
    const savedLsp = localStorage.getItem('oc_is_lsp_employee')
    if (savedLsp === 'true') {
      setIsLspEmployeeState(true)
    }
  }, [])

  const setIsLspEmployee = useCallback((val: boolean) => {
    setIsLspEmployeeState(val)
    localStorage.setItem('oc_is_lsp_employee', val ? 'true' : 'false')
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

  // Employee discount calculation (20% for LSP internal staff only when checked)
  const employeeDiscountPercent = (isLspEmployee && employeeDiscountConfig.enabled)
    ? employeeDiscountConfig.discount_percent
    : 0
  const employeeDiscount = employeeDiscountPercent > 0
    ? Math.round(subtotal * (employeeDiscountPercent / 100))
    : 0

  // Voucher discount calculation
  let voucherDiscount = 0
  if (appliedVoucher) {
    // Older Admin screens stored money fields in thousands (50 meant 50.000đ).
    // New records use full VND, while this normalization keeps legacy vouchers valid.
    const minOrder = normalizeVoucherMoney(appliedVoucher.min_order_amount)
    if (subtotal >= minOrder) {
      if (appliedVoucher.type === 'percent') {
        const raw = Math.round(subtotal * (appliedVoucher.value / 100))
        const maxDiscount = normalizeVoucherMoney(appliedVoucher.max_discount)
        voucherDiscount = maxDiscount ? Math.min(raw, maxDiscount) : raw
      } else {
        const val = normalizeVoucherMoney(appliedVoucher.value)
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
        .maybeSingle()

      if (error) {
        console.warn('Voucher query error:', error.message)
        return { success: false, message: 'Không thể kết nối đến máy chủ khuyến mãi' }
      }

      if (!data) {
        return { success: false, message: 'Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực' }
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { success: false, message: 'Mã khuyến mãi này đã hết hạn sử dụng' }
      }

      if (data.usage_limit && data.used_count >= data.usage_limit) {
        return { success: false, message: 'Mã khuyến mãi đã đạt số lượt sử dụng tối đa' }
      }

      const minOrder = normalizeVoucherMoney(data.min_order_amount)
      if (minOrder && subtotal < minOrder) {
        return {
          success: false,
          message: `Mã áp dụng cho đơn từ ${new Intl.NumberFormat('vi-VN').format(minOrder)}đ`,
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
    } catch {
      return { success: false, message: 'Lỗi kiểm tra mã khuyến mãi' }
    }
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
          isLspEmployee,
          setIsLspEmployee,
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
