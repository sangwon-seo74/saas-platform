// ============================================================
// Revenue Retention OS — API 공통 유틸
// DB: PostgreSQL (pg 드라이버 기준 / Supabase 연동 가능)
// ============================================================

import { NextRequest } from 'next/server'
import { err } from '@/lib/utils'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/client'

/** 변경성 요청(POST/PATCH/DELETE)을 audit_logs에 자동 기록.
 *  fire-and-forget — 실패해도 응답에 영향 없음. */
async function logUserAction(params: {
  tenantId: string; userId: string; email: string
  action: string; ip: string; userAgent: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('audit_logs').insert({
      tenant_id:  params.tenantId,
      user_id:    params.userId,
      email:      params.email,
      action:     params.action,
      ip:         params.ip,
      user_agent: params.userAgent,
      result:     'success',
      metadata:   params.metadata ?? null,
    })
  } catch (e) {
    console.error('[Audit log failed]', e)
  }
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? ''
}

// ─── 테넌트 인증 컨텍스트 ────────────────────────────────
export interface AuthContext {
  userId: string
  tenantId: string
  role: 'admin' | 'manager' | 'sales'
}

/**
 * 요청에서 인증 정보를 추출한다.
 * 미들웨어가 헤더에 주입한 x-tenant-id / x-user-id / x-user-role 을 읽는다.
 * 미들웨어를 통과한 요청만 /app/* 에 도달하므로 여기서는 헤더 존재 여부만 확인.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  // 프록시가 주입한 헤더 우선 (빠른 경로)
  const tenantId = req.headers.get('x-tenant-id')
  const userId   = req.headers.get('x-user-id')
  const role     = req.headers.get('x-user-role') as AuthContext['role'] | null
  if (tenantId && userId && role) return { userId, tenantId, role }

  // 클라이언트 컴포넌트에서 직접 호출 시 쿠키 기반 인증 폴백
  const { authClient, supabase } = createRouteHandlerClient(req)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) return null
  return { userId: user.id, tenantId: profile.tenant_id, role: profile.role as AuthContext['role'] }
}

/**
 * 인증 필수 Route Handler 래퍼
 * - 인증 실패 시 401
 * - role 제한 시 403
 * Next.js 15: params는 Promise이므로 await 처리
 */
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext, params: Record<string, string>) => Promise<Response>,
  options?: { roles?: AuthContext['role'][] }
) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const ctx = await getAuthContext(req)
    if (!ctx) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

    if (options?.roles && !options.roles.includes(ctx.role)) {
      return err('FORBIDDEN', '권한이 없습니다', 403)
    }

    try {
      const params = await context.params
      const response = await handler(req, ctx, params)

      // 변경성 메서드는 audit_logs에 fire-and-forget 기록
      if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
        const url = new URL(req.url)
        // 사용자 이메일은 fetch — 부담스러우면 userId만 기록
        const { authClient } = createRouteHandlerClient(req)
        authClient.auth.getUser().then(({ data }) => {
          logUserAction({
            tenantId:  ctx.tenantId,
            userId:    ctx.userId,
            email:     data.user?.email ?? '',
            action:    `app.${req.method.toLowerCase()} ${url.pathname.replace('/api/', '')}`,
            ip:        getClientIp(req),
            userAgent: req.headers.get('user-agent') ?? '',
            metadata:  { params, role: ctx.role, status: response.status },
          })
        }).catch(() => {})
      }

      return response
    } catch (e) {
      console.error('[API Error]', e)
      return err('INTERNAL_ERROR', '서버 오류가 발생했습니다', 500)
    }
  }
}

// ─── 페이지네이션 파싱 ───────────────────────────────────
export function parsePagination(url: string) {
  const { searchParams } = new URL(url)
  const page  = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

// ─── 공통 필터 파싱 ─────────────────────────────────────
export function parseCommonFilters(url: string) {
  const { searchParams } = new URL(url)
  return {
    q:         searchParams.get('q') ?? undefined,
    team_id:   searchParams.get('team_id') ?? undefined,
    user_id:   searchParams.get('user_id') ?? undefined,
    date_from: searchParams.get('date_from') ?? undefined,
    date_to:   searchParams.get('date_to') ?? undefined,
    sort:      searchParams.get('sort') ?? 'created_at',
    order:     (searchParams.get('order') ?? 'desc') as 'asc' | 'desc',
  }
}

// ─── 타입 가드 ─────────────────────────────────────────
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function requireId(id: string | undefined): Response | null {
  if (!id || !isValidUUID(id)) {
    return err('INVALID_ID', '유효하지 않은 ID입니다', 400)
  }
  return null
}
