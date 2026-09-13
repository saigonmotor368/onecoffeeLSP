'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'oc_favorite_ids'
const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
const ANON_KEY = 'sb_publishable_guOvaX17uY9puFkm8Al8fg_T1t2qRBm'

// ─── Local Storage helpers ────────────────────────────────────

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavoritesLocal(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    window.dispatchEvent(new CustomEvent('oc_favorites_changed', { detail: { favorites: ids } }))
  } catch {}
}

export function isItemFavorite(productId: string): boolean {
  return getFavorites().includes(productId)
}

export function toggleFavorite(productId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const list = getFavorites()
    const updated = list.includes(productId)
      ? list.filter(id => id !== productId)
      : [...list, productId]
    saveFavoritesLocal(updated)
    return !list.includes(productId)
  } catch {
    return false
  }
}

// ─── Supabase REST sync (bypasses TypeScript schema) ─────────

async function fetchFavoritesFromSupabase(userId: string, authToken: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=favorite_ids`,
      {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${authToken}`,
        }
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const ids = data?.[0]?.favorite_ids
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

async function saveFavoritesToSupabase(userId: string, authToken: string, favorites: string[]): Promise<void> {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ favorite_ids: favorites }),
      }
    )
  } catch {
    // Non-fatal
  }
}

// ─── React Hook ───────────────────────────────────────────────

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Load from localStorage immediately on mount (no flash)
  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  // Sync with Supabase when user logs in
  useEffect(() => {
    const supabase = createClient()

    const doSync = async (accessToken: string, uid: string) => {
      setUserId(uid)
      setAuthToken(accessToken)
      const remote = await fetchFavoritesFromSupabase(uid, accessToken)
      const local = getFavorites()
      // Merge remote + local (union, no duplicates)
      const merged = [...new Set([...remote, ...local])]
      saveFavoritesLocal(merged)
      setFavorites(merged)
      // Persist merged back to Supabase
      if (merged.length !== remote.length) {
        await saveFavoritesToSupabase(uid, accessToken, merged)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id && session.access_token) {
        doSync(session.access_token, session.user.id)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id && session.access_token) {
        doSync(session.access_token, session.user.id)
      } else {
        setUserId(null)
        setAuthToken(null)
        setFavorites(getFavorites())
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  // Cross-tab sync via storage events
  useEffect(() => {
    const handleUpdate = () => setFavorites(getFavorites())
    window.addEventListener('oc_favorites_changed', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('oc_favorites_changed', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const toggle = useCallback((id: string) => {
    const list = getFavorites()
    const updated = list.includes(id)
      ? list.filter(fid => fid !== id)
      : [...list, id]
    saveFavoritesLocal(updated)
    setFavorites(updated)

    // Sync to Supabase if logged in
    if (userId && authToken) {
      saveFavoritesToSupabase(userId, authToken, updated)
    }

    return !list.includes(id)
  }, [userId, authToken])

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites])

  return {
    favorites,
    toggleFavorite: toggle,
    isFavorite,
    totalFavorites: favorites.length,
  }
}
