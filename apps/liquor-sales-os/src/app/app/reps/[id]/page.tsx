import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Building2, TrendingUp, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CLIENT_TYPE_LABEL, VISIT_STATUS_LABEL, VISIT_TYPE_LABEL, formatDateTime, formatRelative, cn } from '@/lib/utils'
import type { RepUser, RepLocation, Visit, Client } from '@/types/domain'

export const metadata: Metadata = { title: '담당자 상세' }

export default async function RepDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role = headersList.get('x-user-role') ?? 'rep'

  if (role === 'rep') notFound()

  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 29)

  const [repRes, locationRes, assignedRes, recentVisitsRes, todayCountRes, weekCountRes, monthCountRes] = await Promise.all([
    supabase.schema('public').from('users')
      .select('id, name, email, role, is_active')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single(),

    supabase.schema('lso').from('rep_locations')
      .select('lat, lng, updated_at')
      .eq('rep_user_id', id)
      .eq('tenant_id', tenantId)
      .single(),

    supabase.schema('lso').from('sales_assignments')
      .select('client:clients(id, name, client_type, address, status)')
      .eq('rep_user_id', id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true),

    supabase.schema('lso').from('visits')
      .select('id, status, visit_type, purpose, result, check_in_at, client:clients(id, name)')
      .eq('rep_user_id', id)
      .eq('tenant_id', tenantId)
      .order('check_in_at', { ascending: false })
      .limit(15),

    supabase.schema('lso').from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('rep_user_id', id)
      .eq('tenant_id', tenantId)
      .gte('check_in_at', today.toISOString())
      .neq('status', 'cancelled'),

    supabase.schema('lso').from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('rep_user_id', id)
      .eq('tenant_id', tenantId)
      .gte('check_in_at', weekAgo.toISOString())
      .neq('status', 'cancelled'),

    supabase.schema('lso').from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('rep_user_id', id)
      .eq('tenant_id', tenantId)
      .gte('check_in_at', monthAgo.toISOString())
      .neq('status', 'cancelled'),
  ])

  if (!repRes.data) notFound()

  const rep = repRes.data as unknown as RepUser
  const location = locationRes.data as unknown as RepLocation | null
  const assignedClients = (assignedRes.data ?? []).map(
    a => (a as unknown as { client: Client }).client
  ).filter(Boolean)
  const recentVisits = (recentVisitsRes.data ?? []) as unknown as Visit[]

  const roleLabel: Record<string, string> = {
    admin: '관리자', manager: '매니저', rep: '영업담당자',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/reps" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0',
            rep.is_active ? 'bg-tint-orange text-dk-orange' : 'bg-dk-surface2 text-dk-dim'
          )}>
            {rep.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-dk-text">{rep.name}</h1>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                rep.role === 'admin'   ? 'bg-tint-purple border border-tint-purple-border text-tint-purple-text' :
                rep.role === 'manager' ? 'bg-tint-blue border border-tint-blue-border text-dk-blue' :
                'bg-dk-surface2 text-dk-muted'
              )}>
                {roleLabel[rep.role] ?? rep.role}
              </span>
              {!rep.is_active && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-tint-red border border-tint-red-border text-dk-red">비활성</span>
              )}
            </div>
            <p className="text-xs text-dk-dim mt-0.5">{rep.email}</p>
          </div>
        </div>
        <Link href="/app/map" className="text-sm text-dk-blue hover:text-dk-blueHover flex items-center gap-1.5 shrink-0">
          <MapPin className="w-3.5 h-3.5" />지도
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '오늘', value: todayCountRes.count ?? 0 },
          { label: '7일', value: weekCountRes.count ?? 0 },
          { label: '30일', value: monthCountRes.count ?? 0 },
        ].map(s => (
          <div key={s.label} className="bg-dk-surface border border-dk-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-dk-text font-tabular">{s.value}</p>
            <p className="text-xs text-dk-muted mt-0.5">{s.label} 방문</p>
          </div>
        ))}
      </div>

      {/* Last location */}
      {location && (
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-dk-green shrink-0" />
          <div>
            <p className="text-sm text-dk-text">마지막 위치 확인</p>
            <p className="text-xs text-dk-dim mt-0.5">
              {formatRelative(location.updated_at)} · {(location as unknown as RepLocation & { lat: number; lng: number }).lat.toFixed(4)}, {(location as unknown as RepLocation & { lat: number; lng: number }).lng.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {/* Assigned clients */}
      <div className="bg-dk-surface border border-dk-border rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dk-border">
          <h2 className="text-sm font-semibold text-dk-text flex items-center gap-2">
            <Building2 className="w-4 h-4 text-dk-orange" />담당 거래처
          </h2>
          <span className="text-xs text-dk-muted">{assignedClients.length}개</span>
        </div>
        <div className="divide-y divide-dk-border">
          {assignedClients.length === 0 ? (
            <div className="px-4 py-8 text-center text-dk-dim text-sm">배정된 거래처 없음</div>
          ) : (
            assignedClients.map(client => (
              <Link
                key={client.id}
                href={`/app/clients/${client.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-dk-surface2 transition-colors"
              >
                <Building2 className="w-4 h-4 text-dk-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dk-text truncate">{client.name}</p>
                  <p className="text-xs text-dk-dim">{CLIENT_TYPE_LABEL[client.client_type] ?? client.client_type}</p>
                </div>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded shrink-0',
                  client.status === 'active' ? 'bg-tint-green border border-tint-green-border text-dk-green' : 'bg-dk-surface2 text-dk-dim'
                )}>
                  {client.status === 'active' ? '활성' : '비활성'}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Recent visits */}
      <div className="bg-dk-surface border border-dk-border rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dk-border">
          <h2 className="text-sm font-semibold text-dk-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-dk-blue" />최근 방문
          </h2>
          <Link href={`/app/visits?rep=${id}`} className="text-xs text-dk-blue hover:text-dk-blueHover flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />전체 보기
          </Link>
        </div>
        <div className="divide-y divide-dk-border">
          {recentVisits.length === 0 ? (
            <div className="px-4 py-8 text-center text-dk-dim text-sm">방문 이력이 없습니다</div>
          ) : (
            recentVisits.map(visit => {
              const clientInfo = visit.client as unknown as { id: string; name: string } | null
              return (
                <Link
                  key={visit.id}
                  href={`/app/visits/${visit.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-dk-surface2 transition-colors"
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1.5 shrink-0',
                    visit.status === 'checked_in' ? 'bg-dk-green animate-pulse' :
                    visit.status === 'completed'  ? 'bg-dk-blue' :
                    visit.status === 'planned'    ? 'bg-dk-orange' : 'bg-dk-dim'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-dk-text truncate">
                        {clientInfo?.name ?? '—'}
                      </span>
                      <span className="text-xs text-dk-muted shrink-0">
                        {VISIT_TYPE_LABEL[visit.visit_type]}
                      </span>
                      <span className="text-xs text-dk-dim shrink-0">
                        {VISIT_STATUS_LABEL[visit.status]}
                      </span>
                    </div>
                    <p className="text-xs text-dk-dim mt-0.5">{formatDateTime(visit.check_in_at)}</p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
