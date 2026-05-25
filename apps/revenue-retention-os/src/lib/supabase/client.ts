// ============================================================
// Revenue Retention OS — Supabase 클라이언트 (Edge/Browser 안전)
//
// 이 파일은 Proxy(미들웨어), Route Handler, 브라우저 컴포넌트에서 사용.
// next/headers 를 import하지 않으므로 Edge 런타임에서 안전.
// Server Component용 클라이언트는 lib/supabase/server.ts 사용.
//
// 환경변수 (.env.local):
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (서버 전용, 절대 클라이언트 노출 금지)
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSsrBrowserClient, createServerClient } from '@supabase/ssr'
import type { SetAllCookies } from '@supabase/ssr/dist/main/types'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ─── 브라우저 클라이언트 (클라이언트 컴포넌트용) ────────
// @supabase/ssr의 createBrowserClient 사용: localStorage 대신 쿠키에 세션 저장 →
// proxy(미들웨어)의 createServerClient가 동일 쿠키를 읽을 수 있음
export function createBrowserClient() {
  return createSsrBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// ─── Route Handler용 클라이언트 ─────────────────────────
// DB 쿼리: 서비스 롤(RLS 우회) / 인증 확인: 쿠키 기반 클라이언트
export function createRouteHandlerClient(request: NextRequest) {
  const response = NextResponse.next()

  // 인증 확인용 (auth.getUser()에서만 사용)
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

  // DB 쿼리용: 서비스 롤 키 사용 (RLS 우회, API 라우트에서 수동으로 tenant_id 필터링)
  const supabase = SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : authClient

  return { supabase, authClient, response }
}

// ─── Proxy(미들웨어)용 클라이언트 ──────────────────────
export function createProxyClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

/** @deprecated proxy.ts에서는 createProxyClient 사용 */
export const createMiddlewareClient = createProxyClient

// ─── 서비스 롤 클라이언트 (서버 전용) ────────────────────
// RLS 우회가 필요한 관리 작업에만 사용 (super_admin API 등)
export function createServiceClient() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
