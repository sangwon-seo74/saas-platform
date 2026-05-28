// GET  /api/settings/teams — 팀 멤버 목록 (owner 전용)
// POST /api/settings/teams — 팀원 초대 (owner 전용)

import { withAuth } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import { sendInvite } from '@saas/core-client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .schema('core')
    .from('users')
    .select('id, name, email, role, is_active')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at')

  if (error) return err('DB_ERROR', error.message)
  return ok(data ?? [])
}, { roles: ['owner'] })

export const POST = withAuth(async (req, _ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.email?.trim()) return err('VALIDATION', 'email이 필요합니다')

  const { authClient } = createRouteHandlerClient(req)
  const { data: { session } } = await authClient.auth.getSession()
  const authToken = session?.access_token ?? ''

  const result = await sendInvite(
    { email: body.email.trim(), name: body.name ?? '', role: 'member', app_url: process.env.NEXT_PUBLIC_APP_URL },
    authToken
  )
  if (!result.ok) return err('INVITE_FAILED', result.error?.message ?? '초대 실패')
  return ok({ message: '초대 이메일이 발송됐습니다', email: body.email })
}, { roles: ['owner'] })
