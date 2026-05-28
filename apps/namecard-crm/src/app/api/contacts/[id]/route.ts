// GET    /api/contacts/[id]
// PATCH  /api/contacts/[id]
// DELETE /api/contacts/[id]

import { withAuth, requireId } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('contacts')
    .select('*, company:companies!company_id(id, name, address, website, main_phone), tags:contact_tags(tag:tags(id, name, color))')
    .eq('id', params.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error || !data) return err('NOT_FOUND', '고객을 찾을 수 없습니다', 404)
  return ok(data)
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const allowed = ['name','department','title','mobile','fax','email','is_vip','notes','company_id']
  const update: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }
  if (Object.keys(update).length === 0) return err('NO_FIELDS', '변경할 필드가 없습니다')

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('contacts')
    .update(update)
    .eq('id', params.id)
    .eq('tenant_id', ctx.tenantId)
    .select('id')
    .single()

  if (error) return err('DB_ERROR', error.message)
  return ok(data)
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const { supabase } = createRouteHandlerClient(req)
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message)
  return ok({ deleted: true })
})
