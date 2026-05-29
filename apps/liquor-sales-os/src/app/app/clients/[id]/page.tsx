import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, User, Building2, Clock, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CLIENT_TYPE_LABEL, VISIT_STATUS_LABEL, VISIT_TYPE_LABEL, formatDateTime, formatNoVisitDays, cn } from '@/lib/utils'
import type { Client, Visit } from '@/types/domain'

export const metadata: Metadata = { title: '거래처 상세' }

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  const supabase = await createClient()

  const { data: clientData } = await supabase
    .schema('lso')
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!clientData) notFound()
  const client = clientData as unknown as Client

  const { data: visits } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, status, visit_type, purpose, result, check_in_at, check_out_at, rep:users(name)')
    .eq('client_id', id)
    .eq('tenant_id', tenantId)
    .order('check_in_at', { ascending: false })
    .limit(20)

  const visitList = (visits ?? []) as unknown as Visit[]

  const { data: assignees } = await supabase
    .from('sales_assignments')
    .select('rep:users(id, name, role)')
    .eq('client_id', id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/clients" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-dk-text">{client.name}</h1>
          <p className="text-xs text-dk-muted mt-0.5">
            {CLIENT_TYPE_LABEL[client.client_type] ?? client.client_type} · {formatNoVisitDays(client.last_visited_at)}
          </p>
        </div>
        {(role === 'admin' || role === 'manager') && (
          <Link href={`/app/clients/${id}/edit`} className="ml-auto px-3 py-1.5 text-sm border border-dk-border text-dk-muted rounded-lg hover:bg-dk-surface2 transition-colors">
            수정
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-dk-text flex items-center gap-2">
            <Building2 className="w-4 h-4 text-dk-orange" />업체 정보
          </h2>
          {[
            { label: '대표자', value: client.owner_name, icon: User },
            { label: '대표 전화', value: client.phone, icon: Phone },
            { label: '담당자 연락처', value: client.mobile, icon: Phone },
            { label: '주소', value: [client.address, client.address_detail].filter(Boolean).join(' '), icon: MapPin },
            { label: '사업자번호', value: client.biz_no, icon: null },
            { label: '지역', value: client.region, icon: null },
          ].filter(i => i.value).map(item => (
            <div key={item.label} className="flex gap-2 text-sm">
              <span className="text-dk-muted w-24 shrink-0 text-xs leading-5">{item.label}</span>
              <span className="text-dk-text flex-1">{item.value}</span>
            </div>
          ))}
          {client.notes && (
            <div className="pt-2 border-t border-dk-border">
              <p className="text-xs text-dk-muted mb-1">메모</p>
              <p className="text-sm text-dk-text whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-dk-text flex items-center gap-2">
            <User className="w-4 h-4 text-dk-green" />영업 담당자
          </h2>
          {(assignees ?? []).length === 0 ? (
            <p className="text-sm text-dk-dim">배정된 담당자 없음</p>
          ) : (
            (assignees ?? []).map((a) => {
              const rep = (a as unknown as { rep: { id: string; name: string } | null }).rep
              return rep ? (
                <div key={rep.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-tint-orange flex items-center justify-center text-dk-orange text-xs font-bold shrink-0">
                    {rep.name[0]}
                  </div>
                  <span className="text-sm text-dk-text">{rep.name}</span>
                </div>
              ) : null
            })
          )}

          {client.lat && client.lng && (
            <div className="pt-3 border-t border-dk-border">
              <p className="text-xs text-dk-muted mb-1">GPS 좌표</p>
              <p className="text-xs text-dk-dim font-tabular">
                {client.lat.toFixed(6)}, {client.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-dk-surface border border-dk-border rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dk-border">
          <h2 className="text-sm font-semibold text-dk-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-dk-blue" />방문 이력
          </h2>
          <span className="text-xs text-dk-muted">{visitList.length}건</span>
        </div>
        <div className="divide-y divide-dk-border">
          {visitList.length === 0 ? (
            <div className="px-4 py-8 text-center text-dk-dim text-sm">방문 이력이 없습니다</div>
          ) : (
            visitList.map(visit => (
              <div key={visit.id} className="px-4 py-3 flex items-start gap-3">
                <div className={cn(
                  'w-2 h-2 rounded-full mt-1.5 shrink-0',
                  visit.status === 'checked_in' ? 'bg-dk-green animate-pulse' :
                  visit.status === 'completed'  ? 'bg-dk-blue' :
                  visit.status === 'planned'    ? 'bg-dk-orange' : 'bg-dk-dim'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-dk-text">
                      {VISIT_TYPE_LABEL[visit.visit_type] ?? visit.visit_type}
                    </span>
                    <span className="text-xs text-dk-muted">{VISIT_STATUS_LABEL[visit.status]}</span>
                    {visit.result && (
                      <span className="text-xs text-dk-text truncate">{visit.result}</span>
                    )}
                  </div>
                  <p className="text-xs text-dk-dim mt-0.5">
                    {(visit.rep as unknown as { name: string } | null)?.name ?? '—'} · {formatDateTime(visit.check_in_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
