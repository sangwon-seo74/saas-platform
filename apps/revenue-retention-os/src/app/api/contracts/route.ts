// GET  /api/contracts  — 계약 목록
// POST /api/contracts  — 계약 생성

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { ContractStatus } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const status      = searchParams.get('status') as ContractStatus | null
  const company_id  = searchParams.get('company_id')
  const user_id     = searchParams.get('user_id')
  const is_paid     = searchParams.get('is_paid')
  const expiring_in = searchParams.get('expiring_in')  // 숫자(일수)
  const sort        = searchParams.get('sort') ?? 'expires_at'
  const order       = searchParams.get('order') ?? 'asc'

  let query = supabase
    .from('contracts')
    .select(`
      id, contract_no, started_at, expires_at, amount, discount_rate,
      final_amount, is_paid, paid_at, status, account_count, renewal_count,
      company:companies!contracts_company_id_fkey(id, name),
      product:products!contracts_product_id_fkey(id, name),
      assigned_user:users!contracts_assigned_user_id_fkey(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  // sales: 본인 담당만 (RLS 보조)
  if (ctx.role === 'sales') query = query.eq('assigned_user_id', ctx.userId)

  if (status)     query = query.eq('status', status)
  if (company_id) query = query.eq('company_id', company_id)
  if (user_id)    query = query.eq('assigned_user_id', user_id)
  if (is_paid)    query = query.eq('is_paid', is_paid === 'true')

  // 만료 임박 필터
  if (expiring_in) {
    const dateTo = new Date(Date.now() + Number(expiring_in) * 86400000).toISOString().split('T')[0]
    const today  = new Date().toISOString().split('T')[0]
    query = query.gte('expires_at', today).lte('expires_at', dateTo)
  }

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ data: data ?? [], count: count ?? 0, page, limit })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { company_id, product_id, started_at, expires_at,
          amount, discount_rate = 0, assigned_user_id,
          contract_no, account_count = 1, payment_method, memo } = body

  if (!company_id) return err('VALIDATION', 'company_id는 필수입니다')
  if (!started_at) return err('VALIDATION', 'started_at은 필수입니다')
  if (!expires_at) return err('VALIDATION', 'expires_at은 필수입니다')
  if (amount == null || amount < 0) return err('VALIDATION', 'amount가 올바르지 않습니다')
  if (new Date(expires_at) <= new Date(started_at)) {
    return err('VALIDATION', '만료일은 시작일보다 이후여야 합니다')
  }

  // 고객사가 같은 테넌트인지 확인
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('id', company_id)
    .eq('tenant_id', ctx.tenantId)
  if (!companyCount) return err('NOT_FOUND', '고객사를 찾을 수 없습니다', 404)

  const final_amount = Math.round(amount * (1 - discount_rate / 100))

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      tenant_id:        ctx.tenantId,
      company_id,
      product_id:       product_id       ?? null,
      assigned_user_id: assigned_user_id ?? ctx.userId,
      contract_no:      contract_no      ?? null,
      started_at,
      expires_at,
      amount,
      discount_rate,
      final_amount,
      account_count,
      payment_method:   payment_method   ?? null,
      memo:             memo             ?? null,
      is_paid:          false,
      status:           'active',
    })
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  // trg_contract_create_renewal 트리거가 renewals 자동 생성

  return ok(data)
})
