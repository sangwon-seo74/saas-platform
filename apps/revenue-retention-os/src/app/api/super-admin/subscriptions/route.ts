// GET /api/super-admin/subscriptions — 구독 목록

import { ok, err } from '@/lib/utils'
import { withSuperAdmin, computeMrr } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { parsePagination } from '@/lib/api'

/** 구독 목록 조회.
 *  상태 필터(status)와 페이지네이션을 받아 tenant·plan 임베디드 조인 결과를
 *  단순한 행 구조로 매핑하고 각 행의 MRR을 함께 계산해 반환한다. */
export const GET = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = parsePagination(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('tenant_subscriptions')
    .select(`
      id, billing_cycle, status, started_at, expires_at, next_billing_at, cancel_reason,
      tenant:tenants!tenant_id(id, name),
      plan:plans!plan_id(name, code, monthly_price, yearly_price)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  type SubRow = {
    id: string; billing_cycle: string; status: string; started_at: string
    expires_at: string; next_billing_at: string | null; cancel_reason: string | null
    tenant: { id: string; name: string } | null
    plan: { name: string; code: string; monthly_price: number; yearly_price: number } | null
  }

  const rows = ((data ?? []) as unknown as SubRow[]).map(s => ({
    id:              s.id,
    tenant_id:       (s.tenant as { id: string } | null)?.id ?? '',
    tenant_name:     (s.tenant as { name: string } | null)?.name ?? '',
    plan:            (s.plan as { name: string } | null)?.name ?? '',
    plan_code:       (s.plan as { code: string } | null)?.code ?? 'free',
    billing_cycle:   s.billing_cycle,
    status:          s.status,
    started_at:      s.started_at,
    expires_at:      s.expires_at,
    next_billing_at: s.next_billing_at,
    cancel_reason:   s.cancel_reason,
    mrr: s.plan ? computeMrr(s.billing_cycle, s.plan.monthly_price, s.plan.yearly_price) : 0,
  }))

  return ok({ data: rows, count: count ?? 0, page, limit })
})
