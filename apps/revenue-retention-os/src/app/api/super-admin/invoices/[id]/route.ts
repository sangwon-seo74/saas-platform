// GET   /api/super-admin/invoices/[id] — 인보이스 상세
// PATCH /api/super-admin/invoices/[id] — 결제 상태 수동 처리

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

/** 인보이스 상세 조회.
 *  invoice_no, 청구 기간, 금액, 상태, 결제 수단, PG 결제번호, 운영 메모 등을 평탄화해 반환한다. */
export const GET = withSuperAdmin(async (_req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()

  // 추가 컬럼은 마이그레이션 적용 환경에서만 가져온다 (graceful fallback)
  const tryExtra = await supabase
    .from('tenant_invoices')
    .select(`
      id, invoice_no, billing_cycle, period_start, period_end,
      amount, status, payment_method, paid_at, due_at, pg_payment_id, memo, created_at,
      credit_amount, tax_invoice_status, tax_invoice_no, public_memo,
      tenant:tenants!tenant_id(id, name), plan:plans!plan_id(name)
    `)
    .eq('id', params.id).single()
  const res = tryExtra.error
    ? await supabase.from('tenant_invoices').select(`
        id, invoice_no, billing_cycle, period_start, period_end,
        amount, status, payment_method, paid_at, due_at, pg_payment_id, memo, created_at,
        tenant:tenants!tenant_id(id, name), plan:plans!plan_id(name)
      `).eq('id', params.id).single()
    : tryExtra

  if (res.error || !res.data) return err('NOT_FOUND', '인보이스를 찾을 수 없습니다', 404)

  type Raw = { id: string; invoice_no: string | null; billing_cycle: string | null
    period_start: string; period_end: string; amount: number; status: string
    payment_method: string | null; paid_at: string | null; due_at: string | null
    pg_payment_id: string | null; memo: string | null; created_at: string
    credit_amount?: number; tax_invoice_status?: string | null; tax_invoice_no?: string | null
    public_memo?: string | null
    tenant: { id: string; name: string } | null
    plan:   { name: string } | null }
  const row = res.data as unknown as Raw

  return ok({
    id:             row.id,
    invoice_no:     row.invoice_no ?? '',
    tenant_id:      row.tenant?.id ?? '',
    tenant_name:    row.tenant?.name ?? '',
    plan:           row.plan?.name ?? '',
    billing_cycle:  row.billing_cycle ?? 'monthly',
    period_start:   row.period_start,
    period_end:     row.period_end,
    amount:         row.amount,
    status:         row.status,
    payment_method: row.payment_method,
    paid_at:        row.paid_at,
    due_at:         row.due_at,
    pg_payment_id:  row.pg_payment_id,
    memo:           row.memo,
    created_at:     row.created_at,
    credit_amount:      row.credit_amount      ?? 0,
    tax_invoice_status: row.tax_invoice_status ?? null,
    tax_invoice_no:     row.tax_invoice_no     ?? null,
    public_memo:        row.public_memo        ?? null,
  })
})

/** 인보이스 상태/메모 수정.
 *  status를 'paid'로 변경 시 paid_at을 현재 시각으로, pg_payment_id를 'MANUAL-{timestamp}'로 자동 기록.
 *  'refunded'로 변경 시 paid_at은 null로 초기화. status 외에 memo만 단독 수정도 가능. */
export const PATCH = withSuperAdmin(async (req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { status, memo, pg_payment_id, credit_amount, tax_invoice_status, tax_invoice_no, public_memo } = body
  const updateData: Record<string, unknown> = {}

  if (status !== undefined) {
    const VALID = ['pending', 'paid', 'failed', 'refunded']
    if (!VALID.includes(status)) return err('VALIDATION', `status는 ${VALID.join(', ')} 중 하나여야 합니다`)
    updateData.status = status
    if (status === 'paid') {
      updateData.paid_at        = new Date().toISOString()
      updateData.pg_payment_id  = pg_payment_id ?? `MANUAL-${Date.now()}`
    }
    if (status === 'refunded') {
      updateData.paid_at = null
    }
  }
  if (memo            !== undefined) updateData.memo               = memo
  if (credit_amount   !== undefined) updateData.credit_amount      = Number(credit_amount) || 0
  if (tax_invoice_status !== undefined) updateData.tax_invoice_status = tax_invoice_status
  if (tax_invoice_no  !== undefined) updateData.tax_invoice_no     = tax_invoice_no
  if (public_memo     !== undefined) updateData.public_memo        = public_memo

  if (Object.keys(updateData).length === 0) return err('VALIDATION', '수정할 필드가 없습니다')

  const { error } = await supabase.from('tenant_invoices').update(updateData).eq('id', params.id)
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ id: params.id, status: updateData.status })
})
