// PATCH  /api/settings/teams/[id] — 팀 이름 수정
// DELETE /api/settings/teams/[id] — 팀 삭제

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createServiceClient } from '@/lib/supabase/client'

export const PATCH = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return err('VALIDATION', '팀명은 필수입니다')

  const { error } = await supabase.from('teams').update({ name: body.name.trim() })
    .eq('id', params.id).eq('tenant_id', ctx.tenantId)
  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ id: params.id })
}, { roles: ['admin'] })

export const DELETE = withAuth(async (_req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  // 팀에 소속된 사용자들의 team_id를 null로 (FK ON DELETE SET NULL이 있어도 안전망)
  await supabase.from('users').update({ team_id: null }).eq('team_id', params.id).eq('tenant_id', ctx.tenantId)
  const { error } = await supabase.from('teams').delete().eq('id', params.id).eq('tenant_id', ctx.tenantId)
  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ id: params.id })
}, { roles: ['admin'] })
