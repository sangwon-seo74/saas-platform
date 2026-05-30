import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, User, Building2, Clock, ArrowLeft, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CLIENT_TYPE_LABEL, VISIT_STATUS_LABEL, VISIT_TYPE_LABEL, formatDateTime, formatNoVisitDays, cn } from '@/lib/utils'
import type { Client, Visit, RepUser } from '@/types/domain'

export const metadata: Metadata = { title: '거래처 상세' }

async function addAssignmentAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId  = headersList.get('x-tenant-id') ?? ''
  const userId    = headersList.get('x-user-id')   ?? ''
  const role      = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin' && role !== 'manager') return

  const clientId   = formData.get('client_id')?.toString()
  const repUserId  = formData.get('rep_user_id')?.toString()
  if (!clientId || !repUserId || !tenantId) return

  const supabase = await createClient()
  await supabase.schema('lso').from('sales_assignments').upsert(
    { tenant_id: tenantId, client_id: clientId, rep_user_id: repUserId, assigned_by: userId, is_active: true },
    { onConflict: 'tenant_id,rep_user_id,client_id' }
  )
  redirect(`/app/clients/${clientId}`)
}

async function removeAssignmentAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId  = headersList.get('x-tenant-id') ?? ''
  const role      = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin' && role !== 'manager') return

  const clientId   = formData.get('client_id')?.toString()
  const repUserId  = formData.get('rep_user_id')?.toString()
  if (!clientId || !repUserId || !tenantId) return

  const supabase = await createClient()
  await supabase.schema('lso').from('sales_assignments')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('rep_user_id', repUserId)

  redirect(`/app/clients/${clientId}`)
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  const supabase = await createClient()

  const [clientRes, visitsRes, assigneesRes, allRepsRes] = await Promise.all([
    supabase.schema('lso').from('clients')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single(),

    supabase.schema('lso').from('visits')
      .select('id, status, visit_type, purpose, result, check_in_at, check_out_at, rep:users(name)')
      .eq('client_id', id)
      .eq('tenant_id', tenantId)
      .order('check_in_at', { ascending: false })
      .limit(20),

    supabase.schema('lso').from('sales_assignments')
      .select('rep_user_id, rep:users(id, name, role)')
      .eq('client_id', id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true),

    (role === 'admin' || role === 'manager')
      ? supabase.schema('public').from('users')
          .select('id, name, role')
          .eq('tenant_id', tenantId)
          .in('role', ['rep', 'manager', 'sales'])
          .eq('is_active', true)
          .order('name')
      : Promise.resolve({ data: [] }),
  ])

  if (!clientRes.data) notFound()
  const client = clientRes.data as unknown as Client

  const visitList  = (visitsRes.data ?? []) as unknown as Visit[]
  const assignees  = (assigneesRes.data ?? []) as unknown as { rep_user_id: string; rep: RepUser | null }[]
  const allReps    = (allRepsRes.data ?? []) as unknown as RepUser[]

  const assignedRepIds = new Set(assignees.map(a => a.rep_user_id))
  const unassignedReps = allReps.filter(r => !assignedRepIds.has(r.id))

  const canEdit = role === 'admin' || role === 'manager'

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
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
        {canEdit && (
          <Link
            href={`/app/clients/${id}/edit`}
            className="ml-auto px-3 py-1.5 text-sm border border-dk-border text-dk-muted rounded-lg hover:bg-dk-surface2 transition-colors"
          >
            수정
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 업체 정보 */}
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-dk-text flex items-center gap-2">
            <Building2 className="w-4 h-4 text-dk-orange" />업체 정보
          </h2>
          {[
            { label: '대표자',       value: client.owner_name },
            { label: '대표 전화',    value: client.phone,    icon: Phone },
            { label: '담당자 연락처', value: client.mobile,   icon: Phone },
            { label: '주소',         value: [client.address, client.address_detail].filter(Boolean).join(' '), icon: MapPin },
            { label: '사업자번호',   value: client.biz_no },
            { label: '지역',         value: client.region },
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
          {client.lat && client.lng && (
            <div className="pt-2 border-t border-dk-border">
              <p className="text-xs text-dk-muted mb-1">GPS 좌표</p>
              <p className="text-xs text-dk-dim font-tabular">
                {client.lat.toFixed(6)}, {client.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* 영업 담당자 배정 */}
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-dk-text flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-dk-green" />영업 담당자
          </h2>

          {/* 현재 배정 목록 */}
          <div className="space-y-2 mb-3">
            {assignees.length === 0 ? (
              <p className="text-sm text-dk-dim">배정된 담당자 없음</p>
            ) : (
              assignees.map(a => {
                const rep = a.rep
                if (!rep) return null
                return (
                  <div key={a.rep_user_id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-tint-orange flex items-center justify-center text-dk-orange text-xs font-bold shrink-0">
                      {rep.name[0]}
                    </div>
                    <Link href={`/app/reps/${rep.id}`} className="text-sm text-dk-text hover:text-dk-blue flex-1 truncate">
                      {rep.name}
                    </Link>
                    {canEdit && (
                      <form action={removeAssignmentAction}>
                        <input type="hidden" name="client_id"  value={id} />
                        <input type="hidden" name="rep_user_id" value={a.rep_user_id} />
                        <button
                          type="submit"
                          className="p-1 text-dk-dim hover:text-dk-red transition-colors"
                          title="배정 해제"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* 담당자 추가 폼 */}
          {canEdit && unassignedReps.length > 0 && (
            <form action={addAssignmentAction} className="flex gap-2 pt-3 border-t border-dk-border">
              <input type="hidden" name="client_id" value={id} />
              <select
                name="rep_user_id"
                className="flex-1 px-2.5 py-1.5 bg-dk-surface2 border border-dk-border rounded-lg text-sm text-dk-text focus:outline-none focus:border-dk-border2 min-w-0"
              >
                {unassignedReps.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 bg-dk-accent text-white text-sm font-medium rounded-lg hover:bg-dk-accentHover transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />배정
              </button>
            </form>
          )}
          {canEdit && unassignedReps.length === 0 && allReps.length > 0 && (
            <p className="text-xs text-dk-dim pt-3 border-t border-dk-border">모든 담당자가 배정됨</p>
          )}
        </div>
      </div>

      {/* 방문 이력 */}
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
                    <span className="text-sm text-dk-text">
                      {VISIT_TYPE_LABEL[visit.visit_type] ?? visit.visit_type}
                    </span>
                    <span className="text-xs text-dk-muted">{VISIT_STATUS_LABEL[visit.status]}</span>
                    {visit.result && (
                      <span className="text-xs text-dk-text truncate max-w-[200px]">{visit.result}</span>
                    )}
                  </div>
                  <p className="text-xs text-dk-dim mt-0.5">
                    {(visit.rep as unknown as { name: string } | null)?.name ?? '—'} · {formatDateTime(visit.check_in_at)}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
