// GET   /api/companies/[id]           — 회사 상세 (연락처 목록 포함)
// PATCH /api/companies/[id]  { ... }  — 회사 수정

import { withAuth, requireId } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const { supabase } = createRouteHandlerClient(req)

  const [companyRes, contactsRes] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, address, website, main_phone, created_at, updated_at')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .single(),

    supabase
      .from('contacts')
      .select('id, name, title, department, mobile, email, is_vip, last_contacted_at')
      .eq('company_id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .order('name'),
  ])

  if (!companyRes.data) return err('NOT_FOUND', '회사를 찾을 수 없습니다', 404)

  return ok({ ...companyRes.data, contacts: contactsRes.data ?? [] })
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const update: Record<string, unknown> = {}
  if (body.name?.trim())       update.name       = body.name.trim()
  if (body.address !== undefined) update.address  = body.address?.trim() || null
  if (body.website !== undefined) update.website  = body.website?.trim() || null
  if (body.main_phone !== undefined) update.main_phone = body.main_phone?.trim() || null
  update.updated_at = new Date().toISOString()

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', params.id)
    .eq('tenant_id', ctx.tenantId)
    .select('id, name, address, website, main_phone, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') return err('DUPLICATE', '이미 존재하는 회사명입니다', 409)
    return err('DB_ERROR', error.message)
  }
  return ok(data)
})
