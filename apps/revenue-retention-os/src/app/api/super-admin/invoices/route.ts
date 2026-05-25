// GET /api/super-admin/invoices — 인보이스 목록

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { parsePagination } from '@/lib/api'

/** 인보이스 목록 조회.
 *  상태(status), 특정 테넌트(tenant_id), 페이지네이션을 받아
 *  tenant·plan 조인 결과를 평탄화된 행 구조로 반환한다. */
export const GET = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = parsePagination(req.url)
  const status    = searchParams.get('status')
  const tenant_id = searchParams.get('tenant_id')

  let query = supabase
    .from('tenant_invoices')
    .select(`
      id, invoice_no, billing_cycle, period_start, period_end,
      amount, status, payment_method, paid_at, due_at, memo,
      tenant:tenants!tenant_id(id, name),
      plan:plans!plan_id(name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status    && status !== 'all') query = query.eq('status', status)
  if (tenant_id)                     query = query.eq('tenant_id', tenant_id)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  type InvRow = {
    id: string; invoice_no: string | null; billing_cycle: string | null
    period_start: string; period_end: string; amount: number; status: string
    payment_method: string | null; paid_at: string | null; due_at: string | null; memo: string | null
    tenant: { id: string; name: string } | null
    plan: { name: string } | null
  }

  const rows = ((data ?? []) as unknown as InvRow[]).map(i => ({
    id:             i.id,
    invoice_no:     i.invoice_no ?? '',
    tenant_id:      (i.tenant as { id: string } | null)?.id ?? '',
    tenant_name:    (i.tenant as { name: string } | null)?.name ?? '',
    plan:           (i.plan as { name: string } | null)?.name ?? '',
    billing_cycle:  i.billing_cycle ?? 'monthly',
    period_start:   i.period_start,
    period_end:     i.period_end,
    amount:         i.amount,
    status:         i.status,
    payment_method: i.payment_method,
    paid_at:        i.paid_at,
    due_at:         i.due_at,
    memo:           i.memo,
  }))

  return ok({ data: rows, count: count ?? 0, page, limit })
})
