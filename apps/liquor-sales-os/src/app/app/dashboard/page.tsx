import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Building2, Users, MapPin, ClipboardList, TrendingUp, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/utils'
import type { DashboardStats, Visit, RepLocation } from '@/types/domain'

export const metadata: Metadata = { title: '대시보드' }

async function getDashboardData(tenantId: string, role: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString()

  const [clientsRes, repsRes, todayVisitsRes, weekVisitsRes, recentVisitsRes, repLocationsRes] =
    await Promise.all([
      supabase.schema('lso').from('clients').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('status', 'active'),

      role !== 'rep'
        ? supabase.schema('public').from('users').select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId).eq('is_active', true)
            .in('role', ['admin', 'manager', 'rep', 'sales'])
        : Promise.resolve({ count: 0, error: null }),

      supabase.schema('lso').from('visits').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('check_in_at', todayStr)
        .neq('status', 'cancelled'),

      supabase.schema('lso').from('visits').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('check_in_at', weekAgoStr)
        .neq('status', 'cancelled'),

      supabase.schema('lso').from('visits')
        .select('id, status, visit_type, check_in_at, client:clients(name), rep:users(name, role)')
        .eq('tenant_id', tenantId)
        .order('check_in_at', { ascending: false })
        .limit(10),

      role !== 'rep'
        ? supabase.schema('lso').from('rep_locations')
            .select('rep_user_id, lat, lng, updated_at, rep:users(name, role)')
            .eq('tenant_id', tenantId)
        : Promise.resolve({ data: [], error: null }),
    ])

  const stats: DashboardStats = {
    totalClients: clientsRes.count ?? 0,
    activeReps:   repsRes.count ?? 0,
    todayVisits:  todayVisitsRes.count ?? 0,
    weekVisits:   weekVisitsRes.count ?? 0,
  }

  return {
    stats,
    recentVisits: (recentVisitsRes.data ?? []) as unknown as Visit[],
    repLocations: (repLocationsRes.data ?? []) as unknown as RepLocation[],
  }
}

export default async function DashboardPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  const { stats, recentVisits, repLocations } = await getDashboardData(tenantId, role)

  const statCards = [
    { label: '활성 거래처',  value: stats.totalClients, icon: Building2, href: '/app/clients',   color: 'text-dk-blue' },
    { label: '영업담당자',   value: stats.activeReps,   icon: Users,     href: '/app/reps',      color: 'text-dk-green', hidden: role === 'rep' },
    { label: '오늘 방문',    value: stats.todayVisits,  icon: MapPin,    href: '/app/visits',    color: 'text-dk-orange' },
    { label: '이번 주 방문', value: stats.weekVisits,   icon: TrendingUp, href: '/app/visits',  color: 'text-dk-purple' },
  ].filter(c => !c.hidden)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-dk-surface border border-dk-border rounded-xl p-4 hover:border-dk-border2 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-dk-muted">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-2xl font-bold font-tabular ${card.color}`}>{card.value.toLocaleString()}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-dk-surface border border-dk-border rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dk-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-dk-muted" />
              <h2 className="text-sm font-semibold text-dk-text">최근 방문</h2>
            </div>
            <Link href="/app/visits" className="text-xs text-dk-blue hover:text-dk-blueHover">전체 보기</Link>
          </div>
          <div className="divide-y divide-dk-border">
            {recentVisits.length === 0 ? (
              <div className="px-4 py-8 text-center text-dk-dim text-sm">방문 기록이 없습니다</div>
            ) : (
              recentVisits.slice(0, 8).map(visit => (
                <div key={visit.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    visit.status === 'checked_in' ? 'bg-dk-green animate-pulse' :
                    visit.status === 'completed'  ? 'bg-dk-blue' :
                    visit.status === 'planned'    ? 'bg-dk-orange' : 'bg-dk-dim'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dk-text truncate">
                      {(visit.client as unknown as { name: string } | null)?.name ?? '—'}
                    </p>
                    <p className="text-xs text-dk-dim">
                      {(visit.rep as unknown as { name: string } | null)?.name ?? '—'} ·{' '}
                      {visit.visit_type === 'sales' ? '영업' :
                       visit.visit_type === 'delivery' ? '배송' :
                       visit.visit_type === 'collection' ? '수금' : '기타'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-dk-dim shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatRelative(visit.check_in_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {role !== 'rep' && (
          <div className="bg-dk-surface border border-dk-border rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dk-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-dk-muted" />
                <h2 className="text-sm font-semibold text-dk-text">담당자 현황</h2>
              </div>
              <Link href="/app/map" className="text-xs text-dk-blue hover:text-dk-blueHover">지도 보기</Link>
            </div>
            <div className="divide-y divide-dk-border">
              {repLocations.length === 0 ? (
                <div className="px-4 py-8 text-center text-dk-dim text-sm">위치 정보 없음</div>
              ) : (
                repLocations.slice(0, 8).map(loc => (
                  <div key={loc.rep_user_id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-tint-orange flex items-center justify-center text-dk-orange text-xs font-bold shrink-0">
                      {(loc.rep as unknown as { name: string } | null)?.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dk-text truncate">
                        {(loc.rep as unknown as { name: string } | null)?.name ?? '—'}
                      </p>
                      <p className="text-xs text-dk-dim">마지막 위치 기록</p>
                    </div>
                    <p className="text-xs text-dk-dim shrink-0">{formatRelative(loc.updated_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
