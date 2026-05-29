// liquor-sales-os — Proxy (미들웨어)

import { NextRequest, NextResponse } from 'next/server'
import { createProxyClient } from '@/lib/supabase/client'

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

  const isApp    = pathname.startsWith('/app')
  const isMobile = pathname.startsWith('/mobile')
  const isApi    = pathname.startsWith('/api')

  if (isApp || isMobile || isApi) {
    if (!user) {
      if (isApi) return res
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url)
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const authKey     = serviceKey ?? anonKey

    let profile: { role: string; tenant_id: string; is_active: boolean } | null = null
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=role,tenant_id,is_active&limit=1`,
        {
          headers: {
            'apikey':        authKey,
            'Authorization': `Bearer ${authKey}`,
          },
        }
      )
      if (profileRes.ok) {
        const rows = await profileRes.json() as { role: string; tenant_id: string; is_active: boolean }[]
        profile = rows[0] ?? null
      } else {
        const body = await profileRes.text()
        console.error('[lso proxy] profile fetch error', profileRes.status, body)
      }
    } catch (e) {
      console.error('[lso proxy] profile fetch exception', e)
    }

    if (!profile || !profile.is_active) {
      if (isApi) return res
      return NextResponse.redirect(new URL('/login?error=no_access', req.url))
    }

    // core.users의 admin → lso에서도 admin으로 취급
    const lsoRole = profile.role === 'admin' ? 'admin'
      : profile.role === 'manager' ? 'manager'
      : 'rep'

    // rep는 /app/admin/* 접근 불가
    if ((isApp || isMobile) && pathname.startsWith('/app/admin') && lsoRole === 'rep') {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tenant-id', profile.tenant_id)
    requestHeaders.set('x-user-id',   user.id)
    requestHeaders.set('x-user-role', lsoRole)

    const next = NextResponse.next({ request: { headers: requestHeaders } })
    res.cookies.getAll().forEach(cookie => next.cookies.set(cookie))
    return next
  }

  if (pathname === '/login' && user) {
    if (!req.nextUrl.searchParams.has('error')) {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/app/:path*', '/mobile/:path*', '/api/:path*', '/super-admin/:path*', '/login'],
}
