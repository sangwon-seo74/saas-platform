// GET  /api/companies  — 고객사 목록
// POST /api/companies  — 고객사 생성

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { CompanyStatus, RiskLevel } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const status  = searchParams.get('status') as CompanyStatus | null
  const risk    = searchParams.get('risk') as RiskLevel | null
  const grade   = searchParams.get('grade')
  const q       = searchParams.get('q')
  const user_id = searchParams.get('user_id')
  const team_id = searchParams.get('team_id')
  const city    = searchParams.get('city')
  const sort    = searchParams.get('sort') ?? 'updated_at'
  const order   = searchParams.get('order') ?? 'desc'

  let query = supabase
    .from('companies')
    .select('id, name, biz_no, industry, status, grade, renewal_risk, address_city, assigned_user_id, team_id, updated_at, assigned_user:users!assigned_user_id(id, name)', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (ctx.role === 'sales') query = query.eq('assigned_user_id', ctx.userId)
  if (status)  query = query.eq('status', status)
  if (risk)    query = query.eq('renewal_risk', risk)
  if (grade)   query = query.eq('grade', grade)
  if (city)    query = query.eq('address_city', city)
  if (user_id) query = query.eq('assigned_user_id', user_id)
  if (team_id) query = query.eq('team_id', team_id)
  if (q)       query = query.ilike('name', `%${q}%`)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  // Batch-fetch active contracts and attach to each company
  const rows = data ?? []
  const activeContractMap: Record<string, { expires_at: string; final_amount: number }> = {}
  if (rows.length > 0) {
    const { data: ac } = await supabase
      .from('contracts')
      .select('company_id, expires_at, final_amount')
      .in('company_id', rows.map(c => c.id))
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
    for (const c of (ac ?? []) as { company_id: string; expires_at: string; final_amount: number }[]) {
      if (!activeContractMap[c.company_id]) {
        activeContractMap[c.company_id] = { expires_at: c.expires_at, final_amount: c.final_amount }
      }
    }
  }
  const enriched = rows.map(c => ({ ...c, active_contract: activeContractMap[c.id] ?? null }))

  return ok({ data: enriched, count: count ?? 0, page, limit })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { name, biz_no, industry, website, company_size,
          address_road, address_city, address_district, memo,
          assigned_user_id, team_id } = body

  if (!name?.trim()) return err('VALIDATION', '고객사명은 필수입니다')

  if (biz_no) {
    const { count } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('biz_no', biz_no)
    if ((count ?? 0) > 0) return err('DUPLICATE', '이미 등록된 사업자번호입니다', 409)
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      tenant_id: ctx.tenantId,
      name: name.trim(),
      biz_no: biz_no ?? null,
      industry: industry ?? null,
      website: website ?? null,
      company_size: company_size ?? null,
      address_road: address_road ?? null,
      address_city: address_city ?? null,
      address_district: address_district ?? null,
      memo: memo ?? null,
      assigned_user_id: assigned_user_id ?? ctx.userId,
      team_id: team_id ?? null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
})
