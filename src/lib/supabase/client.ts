import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let cachedAdminClient: ReturnType<typeof createBrowserClient<Database>> | null = null
let cachedCustomerClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export type ClientScope = 'admin' | 'customer'

/**
 * Creates or retrieves a scoped Supabase client.
 * - 'admin': uses separate cookie/session storage 'sb-admin-auth-token'
 * - 'customer': uses separate cookie/session storage 'sb-customer-auth-token'
 * 
 * If scope is omitted, it auto-detects based on window.location.pathname:
 * paths starting with '/admin' automatically use the 'admin' session,
 * while all customer paths automatically use the 'customer' session.
 */
export function createClient(scope?: ClientScope) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const validUrl = url && (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : 'https://placeholder.supabase.co'
  const validKey = key && key.trim() !== '' && key !== 'your_supabase_anon_key'
    ? key
    : 'placeholder-anon-key'

  // Determine scope: explicit parameter or auto-detect by URL pathname in browser
  let targetScope: ClientScope = scope || 'customer'
  if (!scope && typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/admin')) {
      targetScope = 'admin'
    } else {
      targetScope = 'customer'
    }
  }

  if (targetScope === 'admin') {
    if (!cachedAdminClient) {
      cachedAdminClient = createBrowserClient<Database>(validUrl, validKey, {
        isSingleton: false,
        cookieOptions: {
          name: 'sb-admin-auth-token',
        },
      })
    }
    return cachedAdminClient
  } else {
    if (!cachedCustomerClient) {
      cachedCustomerClient = createBrowserClient<Database>(validUrl, validKey, {
        isSingleton: false,
        cookieOptions: {
          name: 'sb-customer-auth-token',
        },
      })
    }
    return cachedCustomerClient
  }
}

export function createAdminClient() {
  return createClient('admin')
}

export function createCustomerClient() {
  return createClient('customer')
}
