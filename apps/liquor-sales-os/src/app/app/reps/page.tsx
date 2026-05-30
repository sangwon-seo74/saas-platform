import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Users, MapPin, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatRelative, cn } from '@/lib/utils'
import type { RepUser, RepLocation } from '@/types/domain'

export const metadata: Metadata = { title: '영업담당자' }

export default async function RepsPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role === 'rep') {
    return (
      <div className="flex items-center justify-center h-64 text-dk-muted text-sm">
        관리자/매니저만 접근 가능합니다.
      </div>
    )
  }

  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [repsRes, locationsRes, todayStatsRes] = await Promise.all([
    supabase.schema('public').from('users')
      .select('id, name, email, role, is_active')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'manager', 'rep', 'sales'])
      .order('name'),

    supabase.schema('lso').from('rep_locations')
      .select('rep_user_id, lat, lng, updated_at')
      .eq('tenant_id', tenantId),

    supabase.schema('lso').from('visits')
      .select('rep_user_id, id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('check_in_at', today.toISOString())
      .neq('status', 'cancelled'),
  ])

  const reps = (repsRes.data ?? []) as unknown as RepUser[]
  const locations = (locationsRes.data ?? []) as unknown as RepLocation[]
  const todayVisits = todayStatsRes.data ?? []

  const locationMap = new Map(locations.map(l => [l.rep_user_id, l]))
  const todayCountMap = todayVisits.reduce<Record<string, number>>((acc, v) => {
    acc[v.rep_user_id] = (acc[v.rep_user_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-dk-text">영업담당자</h1>
          <p className="text-xs text-dk-muted mt-0.5">총 {reps.length}명</p>
        </div>
        <Link href="/app/map" className="text-sm text-dk-blue hover:text-dk-blueHover flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />지도 보기
        </Link>
      </div>

      <div className="space-y-2">
        {reps.map(rep => {
          const loc       = locationMap.get(rep.id)
          const todayCount = todayCountMap[rep.id] ?? 0
          return (
            <Link
              key={rep.id}
              href={`/app/reps/${rep.id}`}
              className="flex items-center gap-3 p-3 bg-dk-surface border border-dk-border rounded-xl hover:border-dk-border2 transition-colors"
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                rep.is_active ? 'bg-tint-orange text-dk-orange' : 'bg-dk-surface2 text-dk-dim'
              )}>
                {rep.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-dk-text truncate">{rep.name}</p>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium',
                    rep.role === 'admin' ? 'bg-tint-purple border border-tint-purple-border text-tint-purple-text' :
                    rep.role === 'manager' ? 'bg-tint-blue border border-tint-blue-border text-dk-blue' :
                    'bg-dk-surface2 text-dk-muted'
                  )}>
                    {rep.role === 'admin' ? '관리자' : rep.role === 'manager' ? '매니저' : '영업담당자'}
                  </span>
                  {!rep.is_active && <span className="text-[10px] text-dk-dim">비활성</span>}
                </div>
                <p className="text-xs text-dk-dim truncate">{rep.email}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3 h-3 text-dk-green" />
                  <span className="text-dk-text font-tabular font-medium">{todayCount}</span>
                  <span className="text-dk-dim">건</span>
                </div>
                {loc && (
                  <p className="text-[10px] text-dk-dim mt-0.5">
                    <MapPin className="w-2.5 h-2.5 inline mr-0.5" />
                    {formatRelative(loc.updated_at)}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
        {reps.length === 0 && (
          <div className="py-16 text-center text-dk-dim text-sm flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />등록된 담당자가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
