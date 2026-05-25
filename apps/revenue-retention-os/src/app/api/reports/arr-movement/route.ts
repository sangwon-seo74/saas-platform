// GET /api/reports/arr-movement?year=2025
// 월별 ARR 순변동: 기존 ARR → 재계약/업셀/다운셀/이탈 분해 → NRR

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())
  const { supabase } = createRouteHandlerClient(req)

  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  const { data: renewals, error } = await supabase
    .from('renewals')
    .select(`
      status, result, contract_expires_at,
      contract:contracts!contract_id(final_amount),
      result_contract:contracts!result_contract_id(final_amount)
    `)
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['won', 'lost'])
    .gte('contract_expires_at', from)
    .lte('contract_expires_at', to)

  if (error) return err('DB_ERROR', error.message, 500)

  type MonthBucket = {
    month: string
    base_arr: number
    renewed_arr: number
    upsell_gain: number
    downgrade_loss: number
    churn_loss: number
  }

  const monthMap = new Map<string, MonthBucket>()
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`
    monthMap.set(key, { month: key, base_arr: 0, renewed_arr: 0, upsell_gain: 0, downgrade_loss: 0, churn_loss: 0 })
  }

  for (const r of renewals ?? []) {
    const key = (r.contract_expires_at as string).slice(0, 7)
    const row = monthMap.get(key)
    if (!row) continue

    const baseAmt   = (r.contract as unknown as { final_amount: number } | null)?.final_amount ?? 0
    const resultAmt = (r.result_contract as unknown as { final_amount: number } | null)?.final_amount ?? 0

    row.base_arr += baseAmt

    if (r.status === 'won') {
      row.renewed_arr += resultAmt
      if (r.result === 'upsell')         row.upsell_gain    += Math.max(0, resultAmt - baseAmt)
      else if (r.result === 'downgrade') row.downgrade_loss += Math.max(0, baseAmt - resultAmt)
    } else {
      row.churn_loss += baseAmt
    }
  }

  const monthly = Array.from(monthMap.values())
    .filter(m => m.base_arr > 0)
    .map(m => {
      const net_change = m.upsell_gain - m.downgrade_loss - m.churn_loss
      const nrr = m.base_arr > 0 ? Math.round(m.renewed_arr / m.base_arr * 1000) / 10 : null
      return { ...m, net_change, nrr }
    })

  const totalBase    = monthly.reduce((s, m) => s + m.base_arr, 0)
  const totalRenewed = monthly.reduce((s, m) => s + m.renewed_arr, 0)
  const totalNrr     = totalBase > 0 ? Math.round(totalRenewed / totalBase * 1000) / 10 : null
  const totalUpsell  = monthly.reduce((s, m) => s + m.upsell_gain, 0)
  const totalDowngrade = monthly.reduce((s, m) => s + m.downgrade_loss, 0)
  const totalChurn   = monthly.reduce((s, m) => s + m.churn_loss, 0)

  return ok({
    monthly, year,
    summary: { total_base: totalBase, total_renewed: totalRenewed, total_nrr: totalNrr, total_upsell: totalUpsell, total_downgrade: totalDowngrade, total_churn: totalChurn },
  })
}, { roles: ['admin', 'manager'] })
