import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils'

export async function GET() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'
  const userId   = headersList.get('x-user-id')   ?? ''

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const supabase = await createClient()

  const [clientsRes, todayRes, weekRes] = await Promise.all([
    supabase.schema('lso').from('clients').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('status', 'active'),

    role === 'rep'
      ? supabase.schema('lso').from('visits').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('rep_user_id', userId)
          .gte('check_in_at', today.toISOString()).neq('status', 'cancelled')
      : supabase.schema('lso').from('visits').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('check_in_at', today.toISOString())
          .neq('status', 'cancelled'),

    supabase.schema('lso').from('visits').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('check_in_at', weekAgo.toISOString())
      .neq('status', 'cancelled'),
  ])

  return ok({
    totalClients: clientsRes.count ?? 0,
    todayVisits:  todayRes.count  ?? 0,
    weekVisits:   weekRes.count   ?? 0,
  })
}
