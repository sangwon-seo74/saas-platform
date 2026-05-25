// PATCH  /api/super-admin/users/[id] — 사용자 역할/활성 상태 변경
// DELETE /api/super-admin/users/[id]/sessions — 모든 세션 강제 종료 (별도 path 권장이나 단순화)

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

const VALID_ROLES = ['admin', 'manager', 'sales']

/** 사용자 역할/활성 상태 수정 + 옵션으로 모든 세션 강제 종료(force_signout=true). */
export const PATCH = withSuperAdmin(async (req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { role, is_active, force_signout } = body
  const updateData: Record<string, unknown> = {}
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return err('VALIDATION', `role은 ${VALID_ROLES.join(', ')} 중 하나`)
    updateData.role = role
  }
  if (is_active !== undefined) updateData.is_active = Boolean(is_active)

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase.from('users').update(updateData).eq('id', params.id)
    if (error) return err('DB_ERROR', error.message, 500)
  }

  // app_metadata도 동기화 (proxy.ts에서 role 사용)
  if (updateData.role) {
    await supabase.auth.admin.updateUserById(params.id, {
      app_metadata: { role: updateData.role },
    })
  }

  // 강제 로그아웃 (모든 세션 즉시 종료)
  if (force_signout) {
    await supabase.auth.admin.signOut(params.id, 'global')
  }

  return ok({ id: params.id })
})
