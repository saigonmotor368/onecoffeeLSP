import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const validUrl = url && (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : 'https://placeholder.supabase.co'
  const validKey = key && key.trim() !== '' && key !== 'your_supabase_anon_key'
    ? key
    : 'placeholder-anon-key'

  return createBrowserClient<Database>(validUrl, validKey)
}
