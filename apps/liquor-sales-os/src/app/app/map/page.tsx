import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import MapView from '@/components/map/MapView'
import type { Client, RepLocation } from '@/types/domain'

export const metadata: Metadata = { title: '지도 보기' }

async function getMapData(tenantId: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [clientsRes, locationsRes, todayVisitsRes] = await Promise.all([
    supabase.schema('lso').from('clients')
      .select('id, name, client_type, lat, lng, address, last_visited_at, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .not('lat', 'is', null),

    supabase.schema('lso').from('rep_locations')
      .select('rep_user_id, lat, lng, updated_at, rep:users(id, name, role)')
      .eq('tenant_id', tenantId),

    supabase.schema('lso').from('visits')
      .select('client_id, rep_user_id, status, check_in_at')
      .eq('tenant_id', tenantId)
      .gte('check_in_at', today.toISOString())
      .neq('status', 'cancelled'),
  ])

  const todayVisitedClientIds = new Set(
    (todayVisitsRes.data ?? []).map(v => v.client_id)
  )

  return {
    clients: (clientsRes.data ?? []) as unknown as Client[],
    repLocations: (locationsRes.data ?? []) as unknown as RepLocation[],
    todayVisitedClientIds,
  }
}

export default async function MapPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role === 'rep') {
    return (
      <div className="flex items-center justify-center h-full text-dk-muted text-sm">
        지도 보기는 관리자/매니저만 접근 가능합니다.
      </div>
    )
  }

  const { clients, repLocations, todayVisitedClientIds } = await getMapData(tenantId)

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-dk-border bg-dk-surface flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-4 text-xs text-dk-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-dk-green" />오늘 방문
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-dk-blue" />거래처
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-dk-orange" />담당자
          </span>
        </div>
        <div className="ml-auto text-xs text-dk-dim">
          거래처 {clients.length}개 · 담당자 {repLocations.length}명
        </div>
      </div>
      <div className="flex-1 relative">
        <MapView
          clients={clients}
          repLocations={repLocations}
          todayVisitedClientIds={todayVisitedClientIds}
        />
      </div>
    </div>
  )
}
