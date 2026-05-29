import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { MapPin, Clock, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VISIT_STATUS_LABEL, VISIT_TYPE_LABEL, formatDateTime, cn } from '@/lib/utils'
import type { Visit } from '@/types/domain'

export const metadata: Metadata = { title: '내 방문기록' }

export default async function MobileVisitsPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''

  const supabase = await createClient()
  const { data } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, status, visit_type, result, check_in_at, client:clients(name, address)')
    .eq('tenant_id', tenantId)
    .eq('rep_user_id', userId)
    .order('check_in_at', { ascending: false })
    .limit(30)

  const visits = (data ?? []) as unknown as Visit[]

  const statusColor: Record<string, string> = {
    planned:    'bg-amber-500/20 text-amber-300',
    checked_in: 'bg-green-500/20 text-dk-green',
    completed:  'bg-blue-500/20 text-dk-blue',
    cancelled:  'bg-dk-surface2 text-dk-dim',
  }

  return (
    <div className="pb-4">
      <div className="px-4 py-4 border-b border-dk-border bg-dk-surface">
        <h1 className="text-base font-bold text-dk-text">내 방문기록</h1>
        <p className="text-xs text-dk-muted mt-0.5">최근 {visits.length}건</p>
      </div>

      <div className="divide-y divide-dk-border">
        {visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dk-dim text-sm gap-2">
            <MapPin className="w-6 h-6" />방문 기록이 없습니다
          </div>
        ) : (
          visits.map(visit => {
            const clientInfo = visit.client as unknown as { name: string; address: string } | null
            return (
              <Link
                key={visit.id}
                href={`/app/visits/${visit.id}`}
                className="flex items-start gap-3 px-4 py-4 hover:bg-dk-surface2 active:bg-dk-surface2 transition-colors"
              >
                <div className={cn('mt-0.5 shrink-0')}>
                  {visit.status === 'completed'
                    ? <CheckCircle className="w-4 h-4 text-dk-blue" />
                    : <MapPin className={cn('w-4 h-4',
                        visit.status === 'checked_in' ? 'text-dk-green' : 'text-dk-orange'
                      )} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-dk-text truncate">{clientInfo?.name ?? '—'}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', statusColor[visit.status] ?? '')}>
                      {VISIT_STATUS_LABEL[visit.status]}
                    </span>
                  </div>
                  <p className="text-xs text-dk-dim mt-0.5">
                    {VISIT_TYPE_LABEL[visit.visit_type]} · {clientInfo?.address ?? ''}
                  </p>
                  {visit.result && (
                    <p className="text-xs text-dk-muted mt-1 line-clamp-2">{visit.result}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-dk-dim mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(visit.check_in_at)}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
