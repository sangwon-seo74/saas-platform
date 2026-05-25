// GET    /api/contracts/[id]
// PATCH  /api/contracts/[id]
// DELETE /api/contracts/[id]

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      company:companies!contracts_company_id_fkey(id, name, biz_no, address_city),
      product:products!contracts_product_id_fkey(id, name, billing_cycle),
      assigned_user:users!contracts_assigned_user_id_fkey(id, name),
      contract_accounts(*),
      renewals!renewals_contract_id_fkey(id, status, risk_level, risk_score, contract_expires_at, result, created_at)
    `)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '계약을 찾을 수 없습니다', 404)
  return ok(data)
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const ALLOWED = [
    'product_id', 'started_at', 'expires_at', 'amount', 'discount_rate',
    'final_amount', 'is_paid', 'paid_at', 'payment_method',
    'status', 'cancel_reason', 'assigned_user_id', 'contract_no', 'memo',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  // 결제 완료 처리 시 paid_at 자동 설정
  if (updates.is_paid === true && !updates.paid_at) {
    updates.paid_at = new Date().toISOString().split('T')[0]
  }

  // 금액 변경 시 final_amount 재계산
  if ('amount' in updates || 'discount_rate' in updates) {
    const { data: current } = await supabase
      .from('contracts')
      .select('amount, discount_rate')
      .eq('id', params!.id)
      .single()
    if (current) {
      const amt  = Number(updates.amount ?? current.amount)
      const disc = Number(updates.discount_rate ?? current.discount_rate)
      updates.final_amount = Math.round(amt * (1 - disc / 100))
    }
  }

  if (Object.keys(updates).length === 0) {
    return err('VALIDATION', '변경할 필드가 없습니다')
  }

  const { data, error } = await supabase
    .from('contracts')
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

  // 활성 계약 삭제 방지 → 소프트 딜리트 (cancelled)
  const { data: contract } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (!contract) return err('NOT_FOUND', '계약을 찾을 수 없습니다', 404)

  if (contract.status === 'active') {
    // 활성 계약은 삭제 대신 cancelled 처리
    const { error } = await supabase
      .from('contracts')
      .update({ status: 'cancelled' })
      .eq('id', params!.id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()
    if (error) return err('DB_ERROR', error.message, 500)
    return ok({ deleted: false, cancelled: true, id: params!.id })
  }

  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id })
}, { roles: ['admin', 'manager'] })
