// GET / PATCH / DELETE /api/renewals/[id]

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { RenewalStatus } from '@/types/domain'

const VALID_STATUSES: RenewalStatus[] = ['pending', 'contacted', 'negotiating', 'won', 'lost']
const VALID_RESULTS = ['renewed', 'churned', 'upsell', 'downgrade'] as const

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('renewals')
    .select(`
      *,
      contract:contracts!contract_id(id, contract_no, started_at, expires_at, final_amount, amount, is_paid, payment_method, account_count, status, product:products!product_id(id, name)),
      company:companies!company_id(id, name, biz_no, industry, address_city, status),
      assigned_user:users!assigned_user_id(id, name)
    `)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '갱신 레코드를 찾을 수 없습니다', 404)

  const { data: activities } = await supabase
    .from('activities')
    .select('id, type, activity_at, call_result, summary, user:users!user_id(id, name)')
    .eq('renewal_id', params!.id)
    .order('activity_at', { ascending: false })
    .limit(20)

  return ok({ renewal: data, activities: activities ?? [] })
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { status, risk_level, risk_score, target_renewal_at, memo,
          assigned_user_id, result, result_contract_id, lost_reason } = body
  const updates: Record<string, unknown> = {}

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) return err('VALIDATION', 'status 값이 올바르지 않습니다')
    updates.status = status
  }

  if (result !== undefined) {
    if (!VALID_RESULTS.includes(result)) return err('VALIDATION', 'result 값이 올바르지 않습니다')
    updates.result = result
    if (['renewed', 'upsell', 'downgrade'].includes(result)) {
      if (!result_contract_id) return err('VALIDATION', '갱신 완료 시 result_contract_id가 필요합니다')
      updates.status = 'won'
      updates.result_contract_id = result_contract_id
      // 원계약(이 갱신 레코드의 contract_id) 상태를 갱신됨으로 변경
      const { data: renewalRow } = await supabase
        .from('renewals').select('contract_id')
        .eq('id', params!.id).eq('tenant_id', ctx.tenantId).single()
      if (renewalRow?.contract_id) {
        const { error: contractErr } = await supabase
          .from('contracts').update({ status: 'renewed' })
          .eq('id', renewalRow.contract_id).eq('tenant_id', ctx.tenantId)
        if (contractErr) return err('DB_ERROR', '원계약 상태 업데이트 실패: ' + contractErr.message, 500)
      }
    } else if (result === 'churned') {
      updates.status = 'lost'
      updates.lost_reason = lost_reason ?? null
    }
  }

  if (risk_level !== undefined) updates.risk_level = risk_level
  if (risk_score !== undefined) updates.risk_score = Number(risk_score)
  if (target_renewal_at !== undefined) updates.target_renewal_at = target_renewal_at
  if (memo !== undefined) updates.memo = memo
  if (assigned_user_id !== undefined) updates.assigned_user_id = assigned_user_id

  if (Object.keys(updates).length === 0) return err('VALIDATION', '변경할 필드가 없습니다')

  const { data, error } = await supabase
    .from('renewals')
    .update(updates)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data: renewal } = await supabase
    .from('renewals').select('status')
    .eq('id', params!.id).eq('tenant_id', ctx.tenantId).single()

  if (!renewal) return err('NOT_FOUND', '갱신 레코드를 찾을 수 없습니다', 404)
  if (['won', 'lost'].includes(renewal.status))
    return err('CONFLICT', '완료된 갱신은 삭제할 수 없습니다', 409)

  const { error } = await supabase.from('renewals')
    .delete().eq('id', params!.id).eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id })
}, { roles: ['admin'] })
