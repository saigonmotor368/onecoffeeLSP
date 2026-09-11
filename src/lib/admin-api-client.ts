'use client'

import { createClient } from '@/lib/supabase/client'

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const supabase = createClient('admin')
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers)

  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }

  return fetch(input, { ...init, headers, cache: 'no-store' })
}
