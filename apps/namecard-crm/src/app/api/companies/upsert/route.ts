// POST /api/companies/upsert  { name } — 회사명으로 기존 회사 반환 or 신규 생성

import { withAuth } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return err('VALIDATION', 'name이 필요합니다')

  const name = body.name.trim()
  const { supabase } = createRouteHandlerClient(req)

  const { data: existing } = await supabase
    .from('companies')
    .select('id, name')
    .eq('tenant_id', ctx.tenantId)
    .ilike('name', name)
    .maybeSingle()

  if (existing) return ok(existing)

  const { data: created, error } = await supabase
    .from('companies')
    .insert({ tenant_id: ctx.tenantId, name, created_by: ctx.userId })
    .select('id, name')
    .single()

  if (error) return err('DB_ERROR', error.message)
  return ok(created)
})
