// GET /api/super-admin/dashboard — 운영 대시보드 집계 메트릭

import { ok } from '@/lib/utils'
import { withSuperAdmin, computeMrr } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'

/** 운영 대시보드용 집계 메트릭 반환.
 *  - MRR/ARR/전월 대비 증감, 활성 테넌트 수, 이번 달 신규/이탈 건수
 *  - 미납 인보이스 목록(상위 5), 7일 내 만료 임박 구독(상위 5), 최근 신규 테넌트(상위 5)
 *  - 플랜별 구독 분포, 최근 6개월 월별 MRR 추이
 *  Promise.all로 9개 쿼리를 병렬 실행한 뒤 JS에서 집계한다. */
export const GET = withSuperAdmin(async () => {
  const supabase = createServiceClient()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysLater  = new Date(now.getTime() + 7 * 86400000).toISOString()
  const sixMonthsAgo    = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const [
    { data: activeSubs },
    { count: activeTenantCount },
    { count: newTenantsCount },
    { count: churnCount },
    { data: pendingInvList, count: pendingInvCount },
    { data: expiring },
    { data: recentTenants },
    { data: paidInvoices },
    { data: allPlans },
  ] = await Promise.all([
    // 활성 구독 (MRR 계산용)
    supabase
      .from('tenant_subscriptions')
      .select('id, billing_cycle, plan:plans!plan_id(name, code, monthly_price, yearly_price)')
      .in('status', ['active', 'trialing']),

    // 활성 테넌트 수
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('is_active', true),

    // 이번 달 신규 가입
    supabase.from('tenants').select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonthStart),

    // 이번 달 이탈 (해지)
    supabase.from('tenant_subscriptions').select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('cancelled_at', thisMonthStart),

    // 미납 인보이스 목록
    supabase
      .from('tenant_invoices')
      .select('id, amount, due_at, tenant:tenants!tenant_id(id, name), plan:plans!plan_id(name)', { count: 'exact' })
      .in('status', ['pending', 'failed'])
      .order('due_at', { ascending: true })
      .limit(5),

    // 7일 내 만료 임박 구독
    supabase
      .from('tenant_subscriptions')
      .select('id, expires_at, billing_cycle, tenant:tenants!tenant_id(id, name), plan:plans!plan_id(name, monthly_price, yearly_price)')
      .eq('status', 'active')
      .gte('expires_at', now.toISOString())
      .lte('expires_at', sevenDaysLater)
      .order('expires_at', { ascending: true })
      .limit(5),

    // 최근 5개 신규 테넌트
    supabase
      .from('tenants')
      .select('id, name, created_at, subscriptions:tenant_subscriptions!tenant_id(status, plan:plans!plan_id(name))')
      .order('created_at', { ascending: false })
      .limit(5),

    // 최근 6개월 결제 완료 인보이스 (MRR 추이용)
    supabase
      .from('tenant_invoices')
      .select('amount, paid_at, billing_cycle')
      .eq('status', 'paid')
      .gte('paid_at', sixMonthsAgo)
      .not('paid_at', 'is', null),

    // 전체 플랜 목록
    supabase.from('plans').select('id, name, code').eq('is_active', true),
  ])

  // MRR 계산
  type SubRow = { billing_cycle: string; plan: { monthly_price: number; yearly_price: number; code: string; name: string } | null }
  const mrr = ((activeSubs ?? []) as unknown as SubRow[]).reduce((sum: number, s: SubRow) => {
    if (!s.plan) return sum
    return sum + computeMrr(s.billing_cycle, s.plan.monthly_price, s.plan.yearly_price)
  }, 0)

  // 미납 금액 합계
  type InvRow = { amount: number; due_at: string | null; id: string; tenant: { id: string; name: string } | null; plan: { name: string } | null }
  const pendingAmount = ((pendingInvList ?? []) as unknown as InvRow[]).reduce((sum: number, i: InvRow) => sum + i.amount, 0)

  // 최근 신규 가입 매핑
  type RecentTenant = { id: string; name: string; created_at: string; subscriptions: { status: string; plan: { name: string } | null }[] }
  const newTenantsMapped = ((recentTenants ?? []) as unknown as RecentTenant[]).map((t: RecentTenant) => {
    const sub = t.subscriptions?.find(s => ['active', 'trialing'].includes(s.status))
    return {
      id: t.id,
      name: t.name,
      plan: (sub?.plan as { name: string } | null)?.name ?? 'Free',
      created_at: t.created_at,
    }
  })

  // 만료 임박 매핑
  type ExpiringRow = { id: string; expires_at: string; billing_cycle: string; tenant: { id: string; name: string } | null; plan: { name: string; monthly_price: number; yearly_price: number } | null }
  const expiringMapped = ((expiring ?? []) as unknown as ExpiringRow[]).map((s: ExpiringRow) => ({
    id: s.id,
    tenant_name: (s.tenant as { id: string; name: string } | null)?.name ?? '',
    plan: (s.plan as { name: string } | null)?.name ?? '',
    expires_at: s.expires_at,
    amount: s.plan ? computeMrr(s.billing_cycle, s.plan.monthly_price, s.plan.yearly_price) : 0,
  }))

  // 미납 인보이스 매핑
  const unpaidMapped = ((pendingInvList ?? []) as unknown as InvRow[]).map((i: InvRow) => {
    const daysOverdue = i.due_at
      ? Math.max(0, Math.ceil((now.getTime() - new Date(i.due_at).getTime()) / 86400000))
      : 0
    return {
      id: i.id,
      tenant_name: (i.tenant as { id: string; name: string } | null)?.name ?? '',
      plan: (i.plan as { name: string } | null)?.name ?? '',
      amount: i.amount,
      due_at: i.due_at,
      overdue_days: daysOverdue,
    }
  })

  // 플랜 분포 계산
  const planCountMap: Record<string, { name: string; count: number }> = {}
  for (const s of (activeSubs ?? []) as unknown as SubRow[]) {
    if (!s.plan) continue
    const code = s.plan.code
    if (!planCountMap[code]) planCountMap[code] = { name: s.plan.name, count: 0 }
    planCountMap[code].count++
  }
  const totalSubs = Object.values(planCountMap).reduce((s, v) => s + v.count, 0)
  const planOrder = (allPlans ?? []).map((p: { id: string; name: string; code: string }) => p.code)
  const planDist = planOrder
    .filter((code: string) => planCountMap[code])
    .map((code: string) => ({
      name: planCountMap[code].name,
      code,
      count: planCountMap[code].count,
      pct: totalSubs > 0 ? Math.round((planCountMap[code].count / totalSubs) * 100) : 0,
    }))

  // MRR 추이 (최근 6개월)
  type PaidInvRow = { amount: number; paid_at: string; billing_cycle: string }
  const monthlyMrr: Record<string, number> = {}
  for (const inv of (paidInvoices ?? []) as PaidInvRow[]) {
    if (!inv.paid_at) continue
    const d = new Date(inv.paid_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const effective = inv.billing_cycle === 'yearly' ? Math.round(inv.amount / 12) : inv.amount
    monthlyMrr[key] = (monthlyMrr[key] ?? 0) + effective
  }
  const mrrTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { month: `${d.getMonth() + 1}월`, mrr: monthlyMrr[key] ?? 0 }
  })

  // MRR delta: 이번달 vs 지난달 추이
  const currentMonthMrr = mrrTrend[5].mrr
  const lastMonthMrr = mrrTrend[4].mrr
  const mrrDelta = lastMonthMrr > 0 ? Math.round(((currentMonthMrr - lastMonthMrr) / lastMonthMrr) * 100 * 10) / 10 : 0

  // ─── 추가 지표 계산 ────────────────────────────────
  // Churn rate: 이번 달 시작 시점의 활성 구독 중 이번 달에 cancelled된 비율
  const monthStartActiveCount =
    (activeTenantCount ?? 0) + (churnCount ?? 0) - (newTenantsCount ?? 0)  // 근사치
  const churnRate = monthStartActiveCount > 0
    ? Math.round(((churnCount ?? 0) / monthStartActiveCount) * 1000) / 10  // 소수 1자리 %
    : 0

  // LTV 근사치: 평균 MRR / churn rate (월 단위)
  const arpu = (activeTenantCount ?? 0) > 0 ? Math.round(mrr / (activeTenantCount ?? 1)) : 0
  const ltv  = churnRate > 0 ? Math.round((arpu / (churnRate / 100))) : arpu * 24  // churn 0이면 2년 가정

  // 무료→유료 전환율: 최근 30일 trialing → active 변환
  const last30dStart = new Date(Date.now() - 30 * 86400000).toISOString()
  const [{ count: trialConverts }, { count: trialStarted }] = await Promise.all([
    supabase.from('tenant_subscriptions')
      .select('*', { count: 'exact', head: true })
      .not('converted_from_trial_at', 'is', null)
      .gte('converted_from_trial_at', last30dStart),
    supabase.from('tenant_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trialing')
      .gte('started_at', last30dStart),
  ])
  const totalTrialBase = (trialStarted ?? 0) + (trialConverts ?? 0)
  const conversionRate = totalTrialBase > 0
    ? Math.round(((trialConverts ?? 0) / totalTrialBase) * 1000) / 10 : 0

  // 이탈 사유 통계 (최근 90일 cancelled)
  const last90dStart = new Date(Date.now() - 90 * 86400000).toISOString()
  const { data: cancelReasons } = await supabase
    .from('tenant_subscriptions')
    .select('cancel_reason')
    .eq('status', 'cancelled')
    .gte('cancelled_at', last90dStart)
    .not('cancel_reason', 'is', null)
  const reasonCounts: Record<string, number> = {}
  for (const r of (cancelReasons ?? []) as { cancel_reason: string }[]) {
    const key = (r.cancel_reason ?? '').trim() || '(사유 없음)'
    reasonCounts[key] = (reasonCounts[key] ?? 0) + 1
  }
  const cancelReasonsTop = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  return ok({
    metrics: {
      mrr,
      arr: mrr * 12,
      mrr_delta: mrrDelta,
      active_tenants: activeTenantCount ?? 0,
      new_tenants_this_month: newTenantsCount ?? 0,
      churn_this_month: churnCount ?? 0,
      pending_invoices: pendingInvCount ?? 0,
      pending_amount: pendingAmount,
      expiring_7d: expiring?.length ?? 0,
      churn_rate: churnRate,
      arpu,
      ltv,
      conversion_rate: conversionRate,
    },
    new_tenants:    newTenantsMapped,
    expiring:       expiringMapped,
    unpaid:         unpaidMapped,
    plan_dist:      planDist,
    mrr_trend:      mrrTrend,
    cancel_reasons: cancelReasonsTop,
  })
})
