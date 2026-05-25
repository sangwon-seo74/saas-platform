// GET    /api/activities/[id]
// PATCH  /api/activities/[id]
// DELETE /api/activities/[id]

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      company:companies!company_id(id, name),
      contact:contacts!contact_id(id, name, title),
      user:users!user_id(id, name),
      contract:contracts!contract_id(id, contract_no),
      renewal:renewals!renewal_id(id, status, risk_level)
    `)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '활동 기록을 찾을 수 없습니다', 404)
  return ok(data)
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  // 본인 활동만 수정 (admin 제외)
  if (ctx.role === 'sales') {
    const { data: activity } = await supabase
      .from('activities')
      .select('user_id')
      .eq('id', params!.id)
      .single()
    if (activity && activity.user_id !== ctx.userId) {
      return err('FORBIDDEN', '본인의 활동 기록만 수정할 수 있습니다', 403)
    }
  }

  const ALLOWED = [
    'contact_id', 'contact_value', 'activity_at', 'call_result', 'call_duration',
    'visit_purpose', 'companions', 'summary', 'next_action', 'next_action_at',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return err('VALIDATION', '변경할 필드가 없습니다')
  }

  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)

  // next_action_at 변경 시 연결된 자동 Task due_at 동기화
  if (updates.next_action_at) {
    await supabase
      .from('tasks')
      .update({ due_at: updates.next_action_at })
      .eq('activity_id', params!.id)
      .eq('is_auto', true)
      .eq('tenant_id', ctx.tenantId)
  }

  return ok(data)
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  // 본인 활동 또는 admin만 삭제
  if (ctx.role === 'sales') {
    const { data: activity } = await supabase
      .from('activities')
      .select('user_id')
      .eq('id', params!.id)
      .single()
    if (activity && activity.user_id !== ctx.userId) {
      return err('FORBIDDEN', '본인의 활동 기록만 삭제할 수 있습니다', 403)
    }
  }

  // 연결된 자동 생성 Task 먼저 삭제
  await supabase
    .from('tasks')
    .delete()
    .eq('activity_id', params!.id)
    .eq('is_auto', true)
    .eq('tenant_id', ctx.tenantId)

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id })
})
