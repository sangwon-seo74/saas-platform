// GET /api/reports/risk-dashboard
// 현재 진행 중인 갱신 건 위험도 현황 (실시간 스냅샷)

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)

  const today = new Date().toISOString().split('T')[0]
  const d90   = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]

  const { data: renewals, error } = await supabase
    .from('renewals')
    .select(`
      id, status, risk_level, risk_score, contract_expires_at,
      company:companies!company_id(id, name),
      assigned_user:users!assigned_user_id(id, name),
      contract:contracts!contract_id(final_amount)
    `)
    .eq('tenant_id', ctx.tenantId)
    .not('status', 'in', '("won","lost")')
    .gte('contract_expires_at', today)
    .lte('contract_expires_at', d90)
    .order('contract_expires_at', { ascending: true })
    .limit(500)

  if (error) return err('DB_ERROR', error.message, 500)

  type RiskGroup = {
    count: number
    total_amount: number
    items: {
      id: string; company: string; amount: number
      status: string; assigned: string; expires_at: string; days_left: number
    }[]
  }

  const groups: Record<string, RiskGroup> = {
    high:   { count: 0, total_amount: 0, items: [] },
    medium: { count: 0, total_amount: 0, items: [] },
    low:    { count: 0, total_amount: 0, items: [] },
  }

  const todayMs = new Date(today).getTime()

  for (const r of renewals ?? []) {
    const risk   = (r.risk_level as string) || 'low'
    const group  = groups[risk] ?? groups['low']
    const amount = (r.contract as unknown as { final_amount: number } | null)?.final_amount ?? 0
    const expiresMs  = new Date(r.contract_expires_at as string).getTime()
    const daysLeft   = Math.ceil((expiresMs - todayMs) / 86400000)

    group.count++
    group.total_amount += amount
    group.items.push({
      id:         r.id as string,
      company:    (r.company as unknown as { name: string } | null)?.name ?? '—',
      amount,
      status:     r.status as string,
      assigned:   (r.assigned_user as unknown as { name: string } | null)?.name ?? '—',
      expires_at: r.contract_expires_at as string,
      days_left:  daysLeft,
    })
  }

  // 고위험은 최대 20건, 나머지는 10건만
  groups.high.items   = groups.high.items.slice(0, 20)
  groups.medium.items = groups.medium.items.slice(0, 10)
  groups.low.items    = groups.low.items.slice(0, 10)

  const total_count  = (renewals ?? []).length
  const total_amount = (renewals ?? []).reduce((s, r) =>
    s + ((r.contract as unknown as { final_amount: number } | null)?.final_amount ?? 0), 0)

  return ok({ groups, total_count, total_amount, as_of: today })
}, { roles: ['admin', 'manager'] })
