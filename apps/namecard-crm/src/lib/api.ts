// namecard-crm — API 공통 유틸

import { NextRequest } from 'next/server'
import { err } from '@/lib/utils'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/client'

async function logUserAction(params: {
  tenantId: string; userId: string; email: string
  action: string; ip: string; userAgent: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.schema('core').from('audit_logs').insert({
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

export interface AuthContext {
  userId: string
  tenantId: string
  role: 'owner' | 'member'
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const tenantId = req.headers.get('x-tenant-id')
  const userId   = req.headers.get('x-user-id')
  const role     = req.headers.get('x-user-role') as AuthContext['role'] | null
  if (tenantId && userId && role) return { userId, tenantId, role }

  const { authClient, supabase } = createRouteHandlerClient(req)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .schema('core')
    .from('users')
    .select('tenant_id, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) return null
  return { userId: user.id, tenantId: profile.tenant_id, role: profile.role as AuthContext['role'] }
}

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

      if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
        const url = new URL(req.url)
        const { authClient } = createRouteHandlerClient(req)
        authClient.auth.getUser().then(({ data }: { data: { user: { email?: string } | null } }) => {
          logUserAction({
            tenantId:  ctx.tenantId,
            userId:    ctx.userId,
            email:     data.user?.email ?? '',
            action:    `ncm.${req.method.toLowerCase()} ${url.pathname.replace('/api/', '')}`,
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

export function parsePagination(url: string) {
  const { searchParams } = new URL(url)
  const page  = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function requireId(id: string | undefined): Response | null {
  if (!id || !isValidUUID(id)) {
    return err('INVALID_ID', '유효하지 않은 ID입니다', 400)
  }
  return null
}
