// liquor-sales-os — Supabase 클라이언트 (Edge/Browser 안전)

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSsrBrowserClient, createServerClient } from '@supabase/ssr'
import type { SetAllCookies } from '@supabase/ssr/dist/main/types'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function createBrowserClient() {
  return createSsrBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export function createRouteHandlerClient(request: NextRequest) {
  const response = NextResponse.next()

  const authClient = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll: ((cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        }) as SetAllCookies,
      },
    }
  )

  const supabase = SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'lso' },
      })
    : authClient

  return { supabase, authClient, response }
}

export function createProxyClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll: ((cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        }) as SetAllCookies,
      },
    }
  )
}

export function createServiceClient() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'lso' },
  })
}
