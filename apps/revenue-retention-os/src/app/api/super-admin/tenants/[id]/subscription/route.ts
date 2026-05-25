// PATCH /api/super-admin/tenants/[id]/subscription
//  - 플랜 변경: { plan_code, billing_cycle? }
//  - 구독 해지: { status: 'cancelled', cancel_reason? }
//  - 만료일 연장: { expires_at }

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

/** 테넌트의 활성 구독을 수정한다.
 *  - 활성/체험중/미납 구독 중 가장 최근 1건을 대상으로 한다.
 *  - 활성 구독이 없으면 404 반환. */
export const PATCH = withSuperAdmin(async (req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { plan_code, billing_cycle, status, cancel_reason, expires_at } = body

  // 변경할 활성 구독 식별 (active/trialing/past_due 중 가장 최근)
  const { data: subs } = await supabase
    .from('tenant_subscriptions')
    .select('id, status')
    .eq('tenant_id', params.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
  const sub = (subs ?? [])[0] as { id: string; status: string } | undefined
  if (!sub) return err('NOT_FOUND', '변경할 활성 구독이 없습니다', 404)

  const updateData: Record<string, unknown> = {}

  if (plan_code) {
    const { data: plan } = await supabase.from('plans').select('id').eq('code', plan_code).single()
    if (!plan) return err('VALIDATION', `존재하지 않는 플랜 코드: ${plan_code}`)
    updateData.plan_id = (plan as { id: string }).id
  }
  if (billing_cycle) {
    if (!['monthly', 'yearly'].includes(billing_cycle)) return err('VALIDATION', 'billing_cycle은 monthly 또는 yearly')
    updateData.billing_cycle = billing_cycle
  }
  if (status) {
    const VALID = ['active', 'trialing', 'past_due', 'cancelled']
    if (!VALID.includes(status)) return err('VALIDATION', `status는 ${VALID.join(', ')} 중 하나`)
    updateData.status = status
    if (status === 'cancelled') {
      updateData.cancelled_at  = new Date().toISOString()
      updateData.cancel_reason = cancel_reason ?? null
    }
  }
  if (expires_at) updateData.expires_at = expires_at

  if (Object.keys(updateData).length === 0) return err('VALIDATION', '수정할 필드가 없습니다')

  const { error } = await supabase.from('tenant_subscriptions').update(updateData).eq('id', sub.id)
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ subscription_id: sub.id })
})
