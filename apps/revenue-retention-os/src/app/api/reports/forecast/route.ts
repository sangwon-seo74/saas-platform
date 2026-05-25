// GET /api/reports/forecast?user_id=...

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  const { supabase } = createRouteHandlerClient(req)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d90 = new Date(today)
  d90.setDate(d90.getDate() + 90)

  let query = supabase
    .from('renewals')
    .select(`
      id, status, risk_level, contract_expires_at,
      company:companies!company_id(id, name),
      assigned_user:users!assigned_user_id(id, name),
      contract:contracts!contract_id(final_amount)
    `)
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['pending', 'contacted', 'negotiating'])
    .gte('contract_expires_at', today.toISOString().split('T')[0])
    .lte('contract_expires_at', d90.toISOString().split('T')[0])
    .order('contract_expires_at', { ascending: true })
    .limit(300)

  if (user_id) query = query.eq('assigned_user_id', user_id)

  const { data: renewals, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  const BUCKETS = [
    { key: 'D7',  label: 'D-7 이내',  maxDays: 7  },
    { key: 'D14', label: 'D-14 이내', maxDays: 14 },
    { key: 'D30', label: 'D-30 이내', maxDays: 30 },
    { key: 'D60', label: 'D-60 이내', maxDays: 60 },
    { key: 'D90', label: 'D-90 이내', maxDays: 90 },
  ]

  type BucketItem = {
    id: string; company: string; amount: number
    risk_level: string | null; assigned: string; expires_at: string
  }
  const bucketItems: Record<string, BucketItem[]> = Object.fromEntries(BUCKETS.map(b => [b.key, []]))

  for (const r of renewals ?? []) {
    const expires  = new Date(r.contract_expires_at as string)
    const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / 86400000)
    const bucket   = BUCKETS.find(b => daysLeft <= b.maxDays)
    if (!bucket) continue
    bucketItems[bucket.key].push({
      id:         r.id as string,
      company:    (r.company as unknown as { name: string } | null)?.name  ?? '—',
      amount:     (r.contract as unknown as { final_amount: number } | null)?.final_amount ?? 0,
      risk_level: r.risk_level as string | null,
      assigned:   (r.assigned_user as unknown as { name: string } | null)?.name ?? '—',
      expires_at: r.contract_expires_at as string,
    })
  }

  const pipeline = BUCKETS.map(b => {
    const items = bucketItems[b.key]
    const total_amount    = items.reduce((s, i) => s + i.amount, 0)
    const high_risk_count = items.filter(i => i.risk_level === 'high').length
    return {
      key:             b.key,
      label:           b.label,
      count:           items.length,
      total_amount,
      high_risk_count,
      items:           items.slice(0, 10),
    }
  })

  return ok({ pipeline, as_of: today.toISOString().split('T')[0] })
}, { roles: ['admin', 'manager'] })
