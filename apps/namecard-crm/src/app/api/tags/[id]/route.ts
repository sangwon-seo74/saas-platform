// PATCH  /api/tags/[id]  { name?, color? } — 태그 수정
// DELETE /api/tags/[id]               — 태그 삭제 (contact_tags 연쇄 삭제)

import { withAuth, requireId } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const PATCH = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const update: Record<string, unknown> = {}
  if (body.name?.trim())  update.name  = body.name.trim()
  if (body.color?.trim()) update.color = body.color.trim()
  if (Object.keys(update).length === 0) return err('NO_FIELDS', '변경할 필드가 없습니다')

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('tags')
    .update(update)
    .eq('id', params.id)
    .eq('tenant_id', ctx.tenantId)
    .select('id, name, color')
    .single()

  if (error) {
    if (error.code === '23505') return err('DUPLICATE', '이미 존재하는 태그 이름입니다')
    return err('DB_ERROR', error.message)
  }
  return ok(data)
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const { supabase } = createRouteHandlerClient(req)
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message)
  return ok({ deleted: true })
})
