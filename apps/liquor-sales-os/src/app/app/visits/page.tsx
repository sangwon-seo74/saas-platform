import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { MapPin, Clock, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VISIT_STATUS_LABEL, VISIT_TYPE_LABEL, formatDateTime, cn } from '@/lib/utils'
import type { Visit } from '@/types/domain'

export const metadata: Metadata = { title: '방문 내역' }

async function getVisits(tenantId: string, role: string, userId: string, status?: string, type?: string) {
  const supabase = await createClient()
  let query = supabase
    .schema('lso')
    .from('visits')
    .select('id, status, visit_type, purpose, result, check_in_at, check_out_at, lat, lng, client:clients(id, name, address), rep:users(id, name)')
    .eq('tenant_id', tenantId)
    .order('check_in_at', { ascending: false })
    .limit(50)

  if (role === 'rep')                      query = query.eq('rep_user_id', userId)
  if (status && status !== 'all')          query = query.eq('status', status)
  if (type && type !== 'all')              query = query.eq('visit_type', type)

  const { data } = await query
  return (data ?? []) as unknown as Visit[]
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const { status, type } = await searchParams
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'
  const userId   = headersList.get('x-user-id') ?? ''

  const visits = await getVisits(tenantId, role, userId, status, type)

  const statusColor: Record<string, string> = {
    planned:    'bg-tint-amber border border-amber-500/30 text-amber-300',
    checked_in: 'bg-tint-green border border-tint-green-border text-dk-green',
    completed:  'bg-tint-blue border border-tint-blue-border text-dk-blue',
    cancelled:  'bg-dk-surface2 border border-dk-border text-dk-dim',
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-dk-text">방문 내역</h1>
          <p className="text-xs text-dk-muted mt-0.5">총 {visits.length}건</p>
        </div>
        {role === 'rep' && (
          <Link
            href="/mobile/checkin"
            className="px-3 py-1.5 bg-dk-accent text-white text-sm font-semibold rounded-lg hover:bg-dk-accentHover transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />체크인
          </Link>
        )}
      </div>

      <form className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-dk-muted">
          <Filter className="w-3.5 h-3.5" />필터:
        </div>
        <select
          name="status"
          defaultValue={status ?? 'all'}
          className="px-3 py-1.5 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text focus:outline-none focus:border-dk-border2"
        >
          <option value="all">전체 상태</option>
          {Object.entries(VISIT_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={type ?? 'all'}
          className="px-3 py-1.5 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text focus:outline-none focus:border-dk-border2"
        >
          <option value="all">전체 유형</option>
          {Object.entries(VISIT_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 bg-dk-surface2 text-dk-text text-sm rounded-lg border border-dk-border hover:border-dk-border2 transition-colors"
        >
          적용
        </button>
      </form>

      <div className="space-y-2">
        {visits.length === 0 ? (
          <div className="py-16 text-center text-dk-dim text-sm">방문 기록이 없습니다</div>
        ) : (
          visits.map(visit => {
            const clientInfo = visit.client as unknown as { id: string; name: string; address: string } | null
            const repInfo    = visit.rep    as unknown as { name: string } | null
            return (
              <Link
                key={visit.id}
                href={`/app/visits/${visit.id}`}
                className="flex items-start gap-3 p-3 bg-dk-surface border border-dk-border rounded-xl hover:border-dk-border2 transition-colors"
              >
                <div className="mt-1 shrink-0">
                  <MapPin className={cn(
                    'w-4 h-4',
                    visit.status === 'checked_in' ? 'text-dk-green' :
                    visit.status === 'completed'  ? 'text-dk-blue'  :
                    visit.status === 'planned'    ? 'text-dk-orange' : 'text-dk-dim'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-dk-text truncate">
                      {clientInfo?.name ?? '—'}
                    </p>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusColor[visit.status] ?? '')}>
                      {VISIT_STATUS_LABEL[visit.status]}
                    </span>
                    <span className="text-xs text-dk-muted">
                      {VISIT_TYPE_LABEL[visit.visit_type] ?? visit.visit_type}
                    </span>
                  </div>
                  {visit.result && (
                    <p className="text-xs text-dk-muted mt-0.5 truncate">{visit.result}</p>
                  )}
                  <p className="text-xs text-dk-dim mt-0.5">{clientInfo?.address ?? ''}</p>
                </div>
                <div className="text-right shrink-0">
                  {role !== 'rep' && <p className="text-xs text-dk-muted">{repInfo?.name ?? '—'}</p>}
                  <p className="flex items-center gap-1 text-xs text-dk-dim mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(visit.check_in_at)}
                  </p>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
