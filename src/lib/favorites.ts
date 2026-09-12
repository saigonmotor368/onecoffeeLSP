'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'oc_favorite_ids'

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isItemFavorite(productId: string): boolean {
  const list = getFavorites()
  return list.includes(productId)
}

export function toggleFavorite(productId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const list = getFavorites()
    let updated: string[]
    let isFav = false
    if (list.includes(productId)) {
      updated = list.filter(id => id !== productId)
      isFav = false
    } else {
      updated = [...list, productId]
      isFav = true
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('oc_favorites_changed', { detail: { favorites: updated, productId, isFav } }))
    return isFav
  } catch {
    return false
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    setFavorites(getFavorites())

    const handleUpdate = () => {
      setFavorites(getFavorites())
    }

    window.addEventListener('oc_favorites_changed', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('oc_favorites_changed', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const toggle = (id: string) => {
    const res = toggleFavorite(id)
    setFavorites(getFavorites())
    return res
  }

  const isFavorite = (id: string) => favorites.includes(id)

  return { favorites, toggleFavorite: toggle, isFavorite, totalFavorites: favorites.length }
}
