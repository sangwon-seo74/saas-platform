// GET /api/super-admin/plans — 플랜 목록 (구독자 수 + MRR 기여 포함)

import { ok, err } from '@/lib/utils'
import { withSuperAdmin, computeMrr } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'

/** 전체 플랜 목록 + 각 플랜의 활성 구독 수와 월간 MRR 기여를 함께 반환한다.
 *  활성/체험중 구독을 한 번에 조회한 뒤 plan_id별로 카운트와 MRR을 JS에서 집계한다. */
export const GET = withSuperAdmin(async () => {
  const supabase = createServiceClient()

  const [{ data: plans, error }, { data: activeSubs }] = await Promise.all([
    supabase.from('plans').select('*').order('monthly_price', { ascending: true }),
    supabase
      .from('tenant_subscriptions')
      .select('billing_cycle, plan:plans!plan_id(id, monthly_price, yearly_price)')
      .in('status', ['active', 'trialing']),
  ])

  if (error) return err('DB_ERROR', error.message, 500)

  // 플랜별 구독자 수 + MRR 기여 계산
  type SubRow = { billing_cycle: string; plan: { id: string; monthly_price: number; yearly_price: number } | null }
  const subsByPlan: Record<string, { count: number; mrr: number }> = {}
  for (const s of (activeSubs ?? []) as unknown as SubRow[]) {
    if (!s.plan) continue
    const planId = s.plan.id
    if (!subsByPlan[planId]) subsByPlan[planId] = { count: 0, mrr: 0 }
    subsByPlan[planId].count++
    subsByPlan[planId].mrr += computeMrr(s.billing_cycle, s.plan.monthly_price, s.plan.yearly_price)
  }

  const rows = (plans ?? []).map(p => ({
    ...p,
    subscriber_count: subsByPlan[p.id]?.count ?? 0,
    monthly_mrr:      subsByPlan[p.id]?.mrr   ?? 0,
  }))

  return ok(rows)
})
