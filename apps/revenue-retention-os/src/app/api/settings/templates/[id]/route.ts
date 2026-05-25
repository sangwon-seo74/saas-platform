// GET    /api/settings/templates/[id]
// PATCH  /api/settings/templates/[id]
// DELETE /api/settings/templates/[id]

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

function extractVars(content: string): string[] {
  return [...content.matchAll(/\{(\w+)\}/g)].map(m => m[1])
}

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '템플릿을 찾을 수 없습니다', 404)
  return ok(data)
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const ALLOWED = ['name', 'category', 'subject', 'content', 'is_active'] as const
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  // content 변경 시 variables 재추출
  if (typeof updates.content === 'string') {
    updates.variables = extractVars(updates.content)
  }

  if (Object.keys(updates).length === 0) {
    return err('VALIDATION', '변경할 필드가 없습니다')
  }

  const { data, error } = await supabase
    .from('message_templates')
    .update(updates)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
}, { roles: ['admin'] })

export const DELETE = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  // 최근 30일 발송 이력 확인 → 있으면 소프트 딜리트
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', params!.id)
    .gte('sent_at', thirtyDaysAgo)

  if ((count ?? 0) > 0) {
    // 소프트 딜리트
    const { error } = await supabase
      .from('message_templates')
      .update({ is_active: false })
      .eq('id', params!.id)
      .eq('tenant_id', ctx.tenantId)
      .select('id')
      .single()
    if (error) return err('DB_ERROR', error.message, 500)
    return ok({ deleted: false, deactivated: true, id: params!.id })
  }

  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id })
}, { roles: ['admin'] })
