// GET  /api/companies  — 회사 목록 (이름·연락처 수 포함)
// POST /api/companies  — 회사 생성

import { withAuth } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  const { supabase } = createRouteHandlerClient(req)

  let query = supabase
    .from('companies')
    .select('id, name, address, website, main_phone, created_at, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('name', { ascending: true })
    .limit(200)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return err('DB_ERROR', error.message)

  const companies = data ?? []

  // contact count per company
  if (companies.length > 0) {
    const { data: counts } = await supabase
      .from('contacts')
      .select('company_id')
      .eq('tenant_id', ctx.tenantId)
      .in('company_id', companies.map(c => c.id))

    const countMap: Record<string, number> = {}
    for (const row of (counts ?? []) as { company_id: string }[]) {
      countMap[row.company_id] = (countMap[row.company_id] ?? 0) + 1
    }

    return ok(companies.map(c => ({ ...c, contact_count: countMap[c.id] ?? 0 })))
  }

  return ok(companies.map(c => ({ ...c, contact_count: 0 })))
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return err('VALIDATION', '회사명은 필수입니다')

  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('companies')
    .insert({
      tenant_id:  ctx.tenantId,
      name:       body.name.trim(),
      address:    body.address?.trim() || null,
      website:    body.website?.trim() || null,
      main_phone: body.main_phone?.trim() || null,
      created_by: ctx.userId,
    })
    .select('id, name, address, website, main_phone, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return err('DUPLICATE', '이미 존재하는 회사명입니다', 409)
    return err('DB_ERROR', error.message)
  }
  return ok(data)
})
