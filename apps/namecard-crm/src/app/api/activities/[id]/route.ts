// PATCH  /api/activities/[id]
// DELETE /api/activities/[id]

import { withAuth, requireId } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const PATCH = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('activities')
    .update({ content: body.content, type: body.type })
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
    .from('activities')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message)
  return ok({ deleted: true })
})
