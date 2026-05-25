// GET / PATCH / DELETE /api/tasks/[id]

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('tasks')
    .select('*, company:companies!company_id(id, name), assigned_user:users!assigned_user_id(id, name)')
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '업무를 찾을 수 없습니다', 404)
  return ok(data)
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const ALLOWED = ['title', 'description', 'type', 'priority', 'status', 'due_at', 'assigned_user_id'] as const
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }
  if (updates.status === 'done')   updates.done_at = new Date().toISOString()
  if (updates.status && updates.status !== 'done') updates.done_at = null

  if (Object.keys(updates).length === 0) return err('VALIDATION', '변경할 필드가 없습니다')

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id })
})
