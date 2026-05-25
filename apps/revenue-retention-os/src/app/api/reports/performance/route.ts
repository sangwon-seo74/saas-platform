// GET /api/reports/performance?month=2024-06

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const [year, mon] = month.split('-').map(Number)
  const lastDay = new Date(year, mon, 0).getDate()
  const from = `${month}-01`
  const to   = `${month}-${String(lastDay).padStart(2, '0')}`
  const { supabase } = createRouteHandlerClient(req)

  const [{ data: users, error: uErr }, { data: renewals }, { data: activities }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true),
    supabase
      .from('renewals')
      .select(`
        assigned_user_id, status, result,
        result_contract:contracts!result_contract_id(final_amount)
      `)
      .eq('tenant_id', ctx.tenantId)
      .in('status', ['won', 'lost'])
      .gte('contract_expires_at', from)
      .lte('contract_expires_at', to),
    supabase
      .from('activities')
      .select('user_id, type')
      .eq('tenant_id', ctx.tenantId)
      .gte('activity_at', from)
      .lte('activity_at', to + 'T23:59:59'),
  ])

  if (uErr) return err('DB_ERROR', uErr.message, 500)

  const data = (users ?? []).map(u => {
    const ur = (renewals ?? []).filter(r => r.assigned_user_id === u.id)
    const won = ur.filter(r => r.status === 'won')
    const won_count      = won.length
    const lost_count     = ur.filter(r => r.status === 'lost').length
    const total_count    = ur.length
    const renewal_rate   = total_count > 0 ? Math.round(won_count / total_count * 1000) / 10 : null
    const renewed_count  = won.filter(r => r.result === 'renewed').length
    const upsell_count   = won.filter(r => r.result === 'upsell').length
    const downgrade_count = won.filter(r => r.result === 'downgrade').length
    const won_amount     = won.reduce((s, r) =>
      s + ((r.result_contract as unknown as { final_amount: number } | null)?.final_amount ?? 0), 0)
    const ua = (activities ?? []).filter(a => a.user_id === u.id)
    const call_count  = ua.filter(a => a.type === 'call').length
    const visit_count = ua.filter(a => a.type === 'visit').length
    return {
      id: u.id, name: u.name,
      won_count, lost_count, total_count, renewal_rate,
      renewed_count, upsell_count, downgrade_count,
      won_amount, call_count, visit_count,
    }
  })
    .filter(u => u.total_count > 0 || u.call_count > 0 || u.visit_count > 0)
    .sort((a, b) => (b.won_amount ?? 0) - (a.won_amount ?? 0))

  return ok({ data, month })
}, { roles: ['admin', 'manager'] })
