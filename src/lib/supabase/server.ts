import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

const DEFAULT_SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_guOvaX17uY9puFkm8Al8fg_T1t2qRBm'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  const validUrl = url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('placeholder')
    ? url
    : DEFAULT_SUPABASE_URL
  const validKey = key && key.trim() !== '' && key !== 'your_supabase_anon_key' && !key.includes('placeholder')
    ? key
    : DEFAULT_SUPABASE_ANON_KEY

  return createServerClient<Database>(
    validUrl,
    validKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component – ignored
          }
        },
      },
    }
  )
}
