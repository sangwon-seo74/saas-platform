// namecard-crm — Proxy (미들웨어)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createProxyClient } from '@/lib/supabase/client'

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

  const supabase = createProxyClient(req, res)
  let user: { id: string; email?: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  // /super-admin/*
  if (pathname.startsWith('/super-admin')) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(pathname)}&type=super_admin`, req.url)
      )
    }
    if (!SUPER_ADMIN_EMAILS.includes(user.email ?? '')) {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }
    return res
  }

  const isApp = pathname.startsWith('/app')
  const isApi = pathname.startsWith('/api')

  if (isApp || isApi) {
    if (!user) {
      if (isApi) return res
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url)
      )
    }

    const db = serviceClient ?? supabase
    const { data: profile } = await db
      .schema('core')
      .from('users')
      .select('role, tenant_id, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active) {
      if (isApi) return res
      // /login으로 보내면 "로그인된 유저 → /app/dashboard → 다시 여기" 무한 루프 발생.
      // error 파라미터를 붙여서 /login 측에서 루프를 차단한다.
      return NextResponse.redirect(new URL('/login?error=no_access', req.url))
    }

    // rros의 admin 역할을 ncm의 owner로 취급 (같은 Supabase 프로젝트 공유)
    const ncmRole = profile.role === 'admin' ? 'owner' : profile.role

    // owner만 설정 페이지 접근 가능
    if (isApp && pathname.startsWith('/app/settings') && ncmRole !== 'owner') {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tenant-id', profile.tenant_id)
    requestHeaders.set('x-user-id',   user.id)
    requestHeaders.set('x-user-role', ncmRole)

    const next = NextResponse.next({ request: { headers: requestHeaders } })
    res.cookies.getAll().forEach(cookie => next.cookies.set(cookie))
    return next
  }

  if (pathname === '/login' && user) {
    // error 파라미터가 있으면 루프 방지를 위해 리디렉션하지 않는다
    if (!req.nextUrl.searchParams.has('error')) {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/app/:path*', '/api/:path*', '/super-admin/:path*', '/login'],
}
