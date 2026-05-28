// GET  /api/tags
// POST /api/tags

import { withAuth } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('name')

  if (error) return err('DB_ERROR', error.message)
  return ok(data ?? [])
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return err('VALIDATION', 'name이 필요합니다')

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('tags')
    .insert({ tenant_id: ctx.tenantId, name: body.name.trim(), color: body.color ?? '#6B7280' })
    .select('id, name, color')
    .single()

  if (error) {
    if (error.code === '23505') return err('DUPLICATE', '이미 존재하는 태그입니다')
    return err('DB_ERROR', error.message)
  }
  return ok(data)
})
