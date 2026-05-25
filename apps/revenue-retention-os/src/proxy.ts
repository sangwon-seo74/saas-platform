// ============================================================
// Revenue Retention OS — Proxy (Next.js 16, Supabase Auth 연동)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createProxyClient } from '@/lib/supabase/client'

// users 테이블 조회는 RLS 우회를 위해 서비스 롤 사용
const serviceClient = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null

const SUPER_ADMIN_EMAILS = (
  process.env.SUPER_ADMIN_EMAILS ?? ''
).split(',').map(e => e.trim()).filter(Boolean)

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  // ── Supabase 세션 검증 (getUser: 서버 검증 — JWT 조작 방어) ─
  const supabase = createProxyClient(req, res)
  let user: { id: string; email?: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase 연결 실패 시 비인증 상태로 처리
    user = null
  }

  // ── /super-admin/* ─────────────────────────────────────
  if (pathname.startsWith('/super-admin')) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(pathname)}&type=super_admin`, req.url)
      )
    }
    const email = user.email ?? ''
    if (!SUPER_ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }
    return res
  }

  // ── /app/* 및 /api/* ────────────────────────────────────
  const isApp = pathname.startsWith('/app')
  const isApi = pathname.startsWith('/api')

  if (isApp || isApi) {
    if (!user) {
      // API 요청은 리다이렉트 대신 401을 withAuth에서 처리
      if (isApi) return res
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url)
      )
    }

    const db = serviceClient ?? supabase
    const { data: profile } = await db
      .from('users')
      .select('role, tenant_id, is_active')
      .eq('id', user.id)
      .single()

    // 프로필 미조회 시 조용히 통과 — 강제 로그아웃 없이 API/앱이 자체적으로 401 처리
    if (!profile || !profile.is_active) {
      if (isApi) return res
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const role = profile.role as string

    if (isApp) {
      if (pathname.startsWith('/app/reports') && !['admin', 'manager'].includes(role)) {
        return NextResponse.redirect(new URL('/app/dashboard', req.url))
      }
      if (pathname.startsWith('/app/settings') && role !== 'admin') {
        return NextResponse.redirect(new URL('/app/dashboard', req.url))
      }
      if (pathname.startsWith('/app/tasks/team') && !['admin', 'manager'].includes(role)) {
        return NextResponse.redirect(new URL('/app/tasks/my', req.url))
      }
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tenant-id', profile.tenant_id)
    requestHeaders.set('x-user-id',   user.id)
    requestHeaders.set('x-user-role', role)

    // getUser() 가 토큰을 갱신했을 때 res에 쌓인 Set-Cookie를 최종 응답에 전달
    const next = NextResponse.next({ request: { headers: requestHeaders } })
    res.cookies.getAll().forEach(cookie => next.cookies.set(cookie))
    return next
  }

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/app/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/app/:path*', '/api/:path*', '/super-admin/:path*', '/login'],
}
