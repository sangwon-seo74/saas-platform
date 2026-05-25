// ============================================================
// Revenue Retention OS — Supabase 서버 컴포넌트 클라이언트
//
// Server Component, Server Action, Route Handler(서버 side)에서 사용.
// next/headers를 사용하므로 Proxy(미들웨어)에서 import 금지.
// Next.js 16: cookies()는 Promise를 반환하므로 await 필요.
// ============================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { SetAllCookies } from '@supabase/ssr/dist/main/types'
import { cookies } from 'next/headers'

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function createClient() {
  // Service role key bypasses RLS; auth is verified at the route handler level before any query runs
  if (SUPABASE_SERVICE_KEY) {
    return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  const cookieStore = await cookies()
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll: ((cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 set 불가 - proxy에서 처리
          }
        }) as SetAllCookies,
      },
    }
  )
}

export { createClient as createServerComponentClient }
