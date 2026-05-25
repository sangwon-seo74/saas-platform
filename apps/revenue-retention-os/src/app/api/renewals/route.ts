// GET  /api/renewals  — 갱신 파이프라인 목록
// POST /api/renewals  — 갱신 레코드 수동 생성

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { RenewalStatus, RiskLevel } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const status      = searchParams.get('status') as RenewalStatus | null
  const risk        = searchParams.get('risk') as RiskLevel | null
  const company_id  = searchParams.get('company_id')
  const user_id     = searchParams.get('user_id')
  const days_to       = Number(searchParams.get('days_to') ?? 90)
  const include_closed = searchParams.get('include_closed') === 'true'

  const today   = new Date().toISOString().split('T')[0]
  const dateTo  = new Date(Date.now() + days_to * 86400000).toISOString().split('T')[0]

  let query = supabase
    .from('renewals')
    .select(`
      id, status, risk_level, risk_score, contract_expires_at, target_renewal_at,
      result, lost_reason, memo, created_at, updated_at,
      contract:contracts!contract_id(id, contract_no, expires_at, final_amount, amount, product:products!product_id(id, name)),
      company:companies!company_id(id, name, grade),
      assigned_user:users!assigned_user_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .gte('contract_expires_at', today)
    .lte('contract_expires_at', dateTo)
    .order('contract_expires_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (!include_closed) query = query.not('status', 'in', '("won","lost")')

  if (ctx.role === 'sales') query = query.eq('assigned_user_id', ctx.userId)
  if (status)     query = query.eq('status', status)
  if (risk)       query = query.eq('risk_level', risk)
  if (company_id) query = query.eq('company_id', company_id)
  if (user_id)    query = query.eq('assigned_user_id', user_id)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ data: data ?? [], count: count ?? 0, page, limit })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { contract_id, assigned_user_id, memo } = body
  if (!contract_id) return err('VALIDATION', 'contract_id는 필수입니다')

  const { data: contract } = await supabase
    .from('contracts')
    .select('company_id, expires_at, assigned_user_id')
    .eq('id', contract_id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (!contract) return err('NOT_FOUND', '계약을 찾을 수 없습니다', 404)

  const { data, error } = await supabase
    .from('renewals')
    .insert({
      tenant_id: ctx.tenantId,
      contract_id,
      company_id: contract.company_id,
      assigned_user_id: assigned_user_id ?? contract.assigned_user_id,
      status: 'pending',
      contract_expires_at: contract.expires_at,
      memo: memo ?? null,
    })
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
})
