// GET /api/reports/renewal-rate?year=2024

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
      status, result, lost_reason, contract_expires_at,
      result_contract:contracts!result_contract_id(final_amount)
    `)
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['won', 'lost'])
    .gte('contract_expires_at', from)
    .lte('contract_expires_at', to)

  if (error) return err('DB_ERROR', error.message, 500)

  // 월별 집계
  type MonthBucket = {
    month: string
    renewed: number; upsell: number; downgrade: number; lost: number
    won_amount: number; upsell_amount: number; downgrade_amount: number
  }
  const monthMap = new Map<string, MonthBucket>()
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`
    monthMap.set(key, { month: key, renewed: 0, upsell: 0, downgrade: 0, lost: 0, won_amount: 0, upsell_amount: 0, downgrade_amount: 0 })
  }

  for (const r of renewals ?? []) {
    const key = (r.contract_expires_at as string).slice(0, 7)
    const row = monthMap.get(key)
    if (!row) continue
    const newAmt = (r.result_contract as unknown as { final_amount: number } | null)?.final_amount ?? 0
    if (r.status === 'won') {
      row.won_amount += newAmt
      if (r.result === 'upsell')         { row.upsell++;    row.upsell_amount    += newAmt }
      else if (r.result === 'downgrade') { row.downgrade++; row.downgrade_amount += newAmt }
      else                               { row.renewed++ }
    } else {
      row.lost++
    }
  }

  const monthly = Array.from(monthMap.values())
    .filter(m => (m.renewed + m.upsell + m.downgrade + m.lost) > 0)
    .map(m => {
      const won   = m.renewed + m.upsell + m.downgrade
      const total = won + m.lost
      const rate  = total > 0 ? Math.round(won / total * 1000) / 10 : 0
      return { ...m, won, total, rate }
    })

  // 이탈 사유 집계
  const reasonMap = new Map<string, number>()
  for (const r of renewals ?? []) {
    if (r.status === 'lost') {
      const reason = (r.lost_reason as string) || '미입력'
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1)
    }
  }
  const totalLost = Array.from(reasonMap.values()).reduce((s, v) => s + v, 0)
  const churn_reasons = Array.from(reasonMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({
      reason, count, pct: totalLost > 0 ? Math.round(count / totalLost * 100) : 0
    }))

  return ok({ monthly, churn_reasons, year })
}, { roles: ['admin', 'manager'] })
