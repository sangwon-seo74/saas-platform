// GET   /api/super-admin/tenants/[id] — 테넌트 상세
// PATCH /api/super-admin/tenants/[id] — 테넌트 정보/상태 수정

import { ok, err } from '@/lib/utils'
import { withSuperAdmin, computeMrr } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

/** 테넌트 상세 조회. 5개 탭이 사용할 데이터를 한 번에 모아 반환한다.
 *  - 기본 정보(tenants): 추가 컬럼(ceo_name 등) 미적용 환경에서도 동작하도록 fallback SELECT
 *  - 활성 구독 + 플랜 + MRR
 *  - 최근 인보이스(상위 10) + 누적 결제 금액
 *  - 사용자 목록, 사용량(사용자/고객사/메시지) */
export const GET = withSuperAdmin(async (_req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const id = params.id

  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  // 마이그레이션 20260521_tenants_extra_columns 적용 여부와 무관하게 동작하도록
  // 우선 추가 컬럼 포함 SELECT를 시도하고, 실패 시 기본 컬럼만 재시도
  const tryWithExtra = await supabase
    .from('tenants')
    .select('id, name, biz_no, ceo_name, email, phone, address, is_active, created_at, priority, tags')
    .eq('id', id).single()
  const tenantRes = tryWithExtra.error
    ? await supabase.from('tenants').select('id, name, biz_no, is_active, created_at').eq('id', id).single()
    : tryWithExtra

  const [
    { data: subs },
    { data: users },
    { data: invoices },
    { count: userCount },
    { count: companyCount },
    { count: messageCount },
  ] = await Promise.all([
    supabase.from('tenant_subscriptions')
      .select('id, billing_cycle, status, started_at, expires_at, next_billing_at, plan:plans!plan_id(name, code, monthly_price, yearly_price)')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('users').select('id, name, email, role, last_login_at, is_active')
      .eq('tenant_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('tenant_invoices')
      .select('id, invoice_no, period_start, period_end, amount, status, paid_at, billing_cycle')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', id).eq('is_active', true),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    supabase.from('messages').select('*', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .gte('sent_at', thisMonthStart.toISOString()),
  ])

  const { data: tenant, error: tenantErr } = tenantRes
  if (tenantErr || !tenant) return err('NOT_FOUND', '테넌트를 찾을 수 없습니다', 404)
  const tenantWithDefaults = {
    ceo_name: null, email: null, phone: null, address: null,
    priority: 'standard', tags: [],
    ...(tenant as Record<string, unknown>),
  }

  type SubRow = { id: string; billing_cycle: string; status: string; started_at: string; expires_at: string; next_billing_at: string | null; plan: { name: string; code: string; monthly_price: number; yearly_price: number } | null }
  const activeSub = ((subs ?? []) as unknown as SubRow[]).find(s => ['active', 'trialing', 'past_due'].includes(s.status))
    ?? ((subs ?? []) as unknown as SubRow[])[0] ?? null

  const mrr = activeSub?.plan
    ? computeMrr(activeSub.billing_cycle, activeSub.plan.monthly_price, activeSub.plan.yearly_price)
    : 0

  const totalPaid = ((invoices ?? []) as { amount: number; status: string }[])
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0)

  return ok({
    ...tenantWithDefaults,
    subscription: activeSub ? {
      plan:           (activeSub.plan as { name: string } | null)?.name ?? 'Free',
      plan_code:      (activeSub.plan as { code: string } | null)?.code ?? 'free',
      status:         activeSub.status,
      billing_cycle:  activeSub.billing_cycle,
      started_at:     activeSub.started_at,
      expires_at:     activeSub.expires_at,
      next_billing_at: activeSub.next_billing_at,
      mrr,
      total_paid: totalPaid,
    } : null,
    usage: {
      users:     { current: userCount ?? 0,    max: null },
      companies: { current: companyCount ?? 0, max: null },
      messages:  { current: messageCount ?? 0, max: null },
    },
    users:    users ?? [],
    invoices: invoices ?? [],
  })
})

/** 테넌트 정보/활성 상태 수정.
 *  전달된 필드만 부분 업데이트하고, "column does not exist" 에러가 나면
 *  마이그레이션 미적용 환경으로 간주해 name/biz_no/is_active만 추출해 재시도한다. */
export const PATCH = withSuperAdmin(async (req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { name, biz_no, ceo_name, email, phone, address, is_active, priority, tags } = body
  const updateData: Record<string, unknown> = {}
  if (name       !== undefined) updateData.name       = name
  if (biz_no     !== undefined) updateData.biz_no     = biz_no
  if (ceo_name   !== undefined) updateData.ceo_name   = ceo_name
  if (email      !== undefined) updateData.email      = email
  if (phone      !== undefined) updateData.phone      = phone
  if (address    !== undefined) updateData.address    = address
  if (is_active  !== undefined) updateData.is_active  = is_active
  if (priority   !== undefined) updateData.priority   = priority
  if (tags       !== undefined) updateData.tags       = tags

  if (Object.keys(updateData).length === 0) return err('VALIDATION', '수정할 필드가 없습니다')

  let { error } = await supabase.from('tenants').update(updateData).eq('id', params.id)
  // 추가 컬럼 마이그레이션이 적용되지 않은 환경에서는 해당 필드 제외 후 재시도
  if (error && /column .* does not exist/i.test(error.message)) {
    const safe: Record<string, unknown> = {}
    for (const k of ['name', 'biz_no', 'is_active']) {
      if (updateData[k] !== undefined) safe[k] = updateData[k]
    }
    if (Object.keys(safe).length > 0) {
      const r = await supabase.from('tenants').update(safe).eq('id', params.id)
      error = r.error
    } else error = null
  }
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ id: params.id })
})
