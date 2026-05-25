// GET /api/settings/invoices — 일반 admin의 자기 테넌트 결제 이력 (사용자 노출 메모 포함)

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createServiceClient } from '@/lib/supabase/client'

/** 현재 테넌트의 인보이스 목록(plan 조인 포함).
 *  super-admin의 운영 메모(memo)는 노출하지 않고, public_memo만 사용자에게 보여준다. */
export const GET = withAuth(async (req, ctx) => {
  const supabase = createServiceClient()
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('tenant_invoices')
    .select(`
      id, invoice_no, billing_cycle, period_start, period_end,
      amount, status, payment_method, paid_at, due_at,
      credit_amount, tax_invoice_status, tax_invoice_no, public_memo,
      plan:plans!plan_id(name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  type Row = {
    id: string; invoice_no: string | null; billing_cycle: string | null
    period_start: string; period_end: string; amount: number; status: string
    payment_method: string | null; paid_at: string | null; due_at: string | null
    credit_amount: number | null; tax_invoice_status: string | null
    tax_invoice_no: string | null; public_memo: string | null
    plan: { name: string } | null
  }

  const rows = ((data ?? []) as unknown as Row[]).map(i => ({
    id:                 i.id,
    invoice_no:         i.invoice_no ?? '',
    plan:               i.plan?.name ?? '',
    billing_cycle:      i.billing_cycle ?? 'monthly',
    period_start:       i.period_start,
    period_end:         i.period_end,
    amount:             i.amount,
    credit_amount:      i.credit_amount ?? 0,
    status:             i.status,
    payment_method:     i.payment_method,
    paid_at:            i.paid_at,
    due_at:             i.due_at,
    tax_invoice_status: i.tax_invoice_status,
    tax_invoice_no:     i.tax_invoice_no,
    memo:               i.public_memo,   // 사용자 노출용 메모만
  }))

  return ok({ data: rows, count: count ?? 0, page, limit })
}, { roles: ['admin'] })
