// GET /api/settings/subscription — 일반 admin의 자기 테넌트 구독 정보
// 활성/체험중/미납 구독 1건 + 플랜 정보 + 사용량 + 가능한 플랜 목록

import { ok } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createServiceClient } from '@/lib/supabase/client'
import { computeMrr } from '@/lib/super-admin'

/** 현재 테넌트의 활성 구독 + 플랜 + 사용량 + 전환 가능 플랜 목록. */
export const GET = withAuth(async (_req, ctx) => {
  const supabase = createServiceClient()

  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const [
    { data: subs },
    { data: plans },
    { count: userCount },
    { count: companyCount },
    { count: messageCount },
  ] = await Promise.all([
    supabase.from('tenant_subscriptions')
      .select('id, billing_cycle, status, started_at, expires_at, next_billing_at, cancel_reason, cancelled_at, plan:plans!plan_id(id, name, code, monthly_price, yearly_price, max_users, max_companies, max_messages)')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false }),
    supabase.from('plans').select('id, name, code, monthly_price, yearly_price, max_users, max_companies, max_messages').eq('is_active', true).order('monthly_price', { ascending: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('is_active', true),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).gte('sent_at', monthStart.toISOString()),
  ])

  type SubRow = {
    id: string; billing_cycle: string; status: string; started_at: string; expires_at: string
    next_billing_at: string | null; cancel_reason: string | null; cancelled_at: string | null
    plan: { id: string; name: string; code: string; monthly_price: number; yearly_price: number; max_users: number | null; max_companies: number | null; max_messages: number | null } | null
  }
  const list      = (subs ?? []) as unknown as SubRow[]
  const activeSub = list.find(s => ['active', 'trialing', 'past_due'].includes(s.status)) ?? list[0] ?? null
  const mrr       = activeSub?.plan
    ? computeMrr(activeSub.billing_cycle, activeSub.plan.monthly_price, activeSub.plan.yearly_price)
    : 0

  return ok({
    subscription: activeSub ? {
      id:             activeSub.id,
      plan_id:        activeSub.plan?.id ?? null,
      plan:           activeSub.plan?.name ?? 'Free',
      plan_code:      activeSub.plan?.code ?? 'free',
      billing_cycle:  activeSub.billing_cycle,
      status:         activeSub.status,
      started_at:     activeSub.started_at,
      expires_at:     activeSub.expires_at,
      next_billing_at: activeSub.next_billing_at,
      cancel_reason:  activeSub.cancel_reason,
      cancelled_at:   activeSub.cancelled_at,
      mrr,
    } : null,
    plan_limits: activeSub?.plan ? {
      max_users:     activeSub.plan.max_users,
      max_companies: activeSub.plan.max_companies,
      max_messages:  activeSub.plan.max_messages,
    } : null,
    usage: {
      users:     { current: userCount    ?? 0, max: activeSub?.plan?.max_users     ?? null },
      companies: { current: companyCount ?? 0, max: activeSub?.plan?.max_companies ?? null },
      messages:  { current: messageCount ?? 0, max: activeSub?.plan?.max_messages  ?? null },
    },
    available_plans: plans ?? [],
  })
}, { roles: ['admin'] })
