import { NextRequest } from 'next/server'
import { err } from '@/lib/utils'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/client'

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim()).filter(Boolean)

const SUPER_ADMIN_IP_WHITELIST = (process.env.SUPER_ADMIN_IP_WHITELIST ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)

/** 클라이언트 IP 추출 — proxy/CDN 헤더 우선. */
function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? ''
}

/** 슈퍼어드민 액션을 audit_logs에 비동기 기록 (best-effort).
 *  실패해도 응답에는 영향이 없다. */
async function logSuperAdminAction(params: {
  email: string; action: string; ip: string; userAgent: string; metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('audit_logs').insert({
      email:      params.email,
      action:     params.action,
      ip:         params.ip,
      user_agent: params.userAgent,
      result:     'success',
      metadata:   params.metadata ?? null,
    })
  } catch (e) {
    console.error('[SuperAdmin audit log failed]', e)
  }
}

/** 슈퍼 관리자 전용 라우트 핸들러 래퍼.
 *  쿠키 기반 Supabase 세션을 검증하고, 이메일이 SUPER_ADMIN_EMAILS env에 등록된 경우에만 통과시킨다.
 *  proxy가 주입하는 x-tenant-id 헤더는 무시하고 이메일로만 권한을 판단한다. */
export function withSuperAdmin(
  handler: (req: NextRequest, params: Record<string, string>) => Promise<Response>
) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const { authClient } = createRouteHandlerClient(req)
    let user: { email?: string } | null = null
    try {
      const { data } = await authClient.auth.getUser()
      user = data.user
    } catch {
      user = null
    }
    if (!user) return err('UNAUTHORIZED', '인증이 필요합니다', 401)
    const email = user.email ?? ''
    if (!SUPER_ADMIN_EMAILS.includes(email))
      return err('FORBIDDEN', '슈퍼 관리자 권한이 필요합니다', 403)

    // IP 화이트리스트 (env에 등록된 경우만 적용)
    const clientIp = getClientIp(req)
    if (SUPER_ADMIN_IP_WHITELIST.length > 0 && !SUPER_ADMIN_IP_WHITELIST.includes(clientIp)) {
      return err('FORBIDDEN', `허용되지 않은 IP입니다 (${clientIp})`, 403)
    }

    try {
      const params = context?.params ? await context.params : {}
      const response = await handler(req, params)

      // 변경성 메서드(POST/PATCH/DELETE)는 audit_logs에 자동 기록
      if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
        const url = new URL(req.url)
        // fire-and-forget
        logSuperAdminAction({
          email,
          action:    `sa.${req.method.toLowerCase()} ${url.pathname.replace('/api/super-admin/', '')}`,
          ip:        clientIp,
          userAgent: req.headers.get('user-agent') ?? '',
          metadata:  { params, status: response.status },
        })
      }

      return response
    } catch (e) {
      console.error('[SuperAdmin API Error]', e)
      return err('INTERNAL_ERROR', '서버 오류가 발생했습니다', 500)
    }
  }
}

/** 구독의 월간 환산 매출(MRR)을 계산한다.
 *  연간 결제는 연 가격을 12로 나눠 반올림하고, 월간 결제는 그대로 사용한다. */
export function computeMrr(billing_cycle: string, monthly_price: number, yearly_price: number): number {
  return billing_cycle === 'yearly' ? Math.round(yearly_price / 12) : monthly_price
}
