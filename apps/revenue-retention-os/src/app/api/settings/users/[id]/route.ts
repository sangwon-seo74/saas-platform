// GET    /api/settings/users/[id]
// PATCH  /api/settings/users/[id]  — 역할/팀/활성화 수정
// DELETE /api/settings/users/[id]  — 비활성화 (소프트 딜리트)

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/domain'

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('users')
    .select(`
      id, name, email, phone, role, is_active, last_login_at, created_at,
      team:teams!team_id(id, name)
    `)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '사용자를 찾을 수 없습니다', 404)

  // 담당 고객사·계약 수 집계
  const [{ count: companyCount }, { count: contractCount }] = await Promise.all([
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_user_id', params!.id)
      .eq('tenant_id', ctx.tenantId),
    supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_user_id', params!.id)
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'active'),
  ])

  return ok({ ...data, company_count: companyCount ?? 0, contract_count: contractCount ?? 0 })
}, { roles: ['admin', 'manager'] })

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr

  if (params!.id === ctx.userId) {
    return err('FORBIDDEN', '자신의 계정은 여기서 수정할 수 없습니다', 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { role, team_id, is_active, name, phone } = body
  const updates: Record<string, unknown> = {}

  if (role !== undefined) {
    if (ctx.role !== 'admin') {
      return err('FORBIDDEN', '역할 변경은 관리자만 가능합니다', 403)
    }
    const VALID_ROLES: UserRole[] = ['admin', 'manager', 'sales']
    if (!VALID_ROLES.includes(role)) {
      return err('VALIDATION', 'role 값이 올바르지 않습니다')
    }
    updates.role = role
  }

  if (team_id !== undefined)  updates.team_id   = team_id ?? null
  if (name?.trim())           updates.name      = name.trim()
  if (phone !== undefined)    updates.phone     = phone ?? null

  if (is_active !== undefined) {
    if (ctx.role !== 'admin') {
      return err('FORBIDDEN', '계정 활성화/비활성화는 관리자만 가능합니다', 403)
    }
    updates.is_active = Boolean(is_active)
  }

  if (Object.keys(updates).length === 0) {
    return err('VALIDATION', '변경할 필드가 없습니다')
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
}, { roles: ['admin', 'manager'] })

export const DELETE = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  if (params!.id === ctx.userId) {
    return err('FORBIDDEN', '자신의 계정은 삭제할 수 없습니다', 403)
  }
  const { supabase } = createRouteHandlerClient(req)
  const { searchParams } = new URL(req.url)
  const reassign_to = searchParams.get('reassign_to')

  // 담당 데이터 재배정
  if (reassign_to) {
    await Promise.all([
      supabase.from('companies')
        .update({ assigned_user_id: reassign_to })
        .eq('assigned_user_id', params!.id)
        .eq('tenant_id', ctx.tenantId),
      supabase.from('contracts')
        .update({ assigned_user_id: reassign_to })
        .eq('assigned_user_id', params!.id)
        .eq('tenant_id', ctx.tenantId),
      supabase.from('renewals')
        .update({ assigned_user_id: reassign_to })
        .eq('assigned_user_id', params!.id)
        .eq('tenant_id', ctx.tenantId),
    ])
  }

  // 소프트 딜리트 (is_active = false)
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id, reassigned_to: reassign_to })
}, { roles: ['admin'] })
