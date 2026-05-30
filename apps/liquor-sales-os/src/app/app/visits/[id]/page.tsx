import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Package, CheckCircle, Pencil, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VISIT_STATUS_LABEL, VISIT_TYPE_LABEL, formatDateTime, cn } from '@/lib/utils'
import type { Visit, VisitItem } from '@/types/domain'

export const metadata: Metadata = { title: '방문 상세' }

async function cancelVisitAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  const id = formData.get('id')?.toString()
  if (!id || !tenantId || (role !== 'admin' && role !== 'manager')) redirect('/app/visits')

  const supabase = await createClient()

  const { data: existing } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing || existing.status !== 'planned') redirect(`/app/visits/${id}`)

  await supabase
    .schema('lso')
    .from('visits')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  redirect(`/app/visits/${id}`)
}

async function completeVisitAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  const id = formData.get('id')?.toString()
  if (!id || !tenantId) redirect('/app/visits')

  const supabase = await createClient()

  const { data: existing } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, rep_user_id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) redirect('/app/visits')
  if (role === 'rep' && existing.rep_user_id !== userId) redirect('/app/visits')
  if (existing.status !== 'checked_in') redirect(`/app/visits/${id}`)

  await supabase
    .schema('lso')
    .from('visits')
    .update({ status: 'completed', check_out_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  redirect(`/app/visits/${id}`)
}

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'
  const userId   = headersList.get('x-user-id') ?? ''

  const supabase = await createClient()

  const { data: visitData } = await supabase
    .schema('lso')
    .from('visits')
    .select('*, client:clients(id, name, address, client_type), rep:users(id, name, role)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!visitData) notFound()
  if (role === 'rep' && (visitData as unknown as Visit).rep_user_id !== userId) notFound()

  const visit = visitData as unknown as Visit

  const { data: items } = await supabase
    .schema('lso')
    .from('visit_items')
    .select('*')
    .eq('visit_id', id)

  const visitItems = (items ?? []) as unknown as VisitItem[]
  const clientInfo = visit.client as unknown as { id: string; name: string; address: string } | null
  const repInfo    = visit.rep    as unknown as { id: string; name: string }                  | null

  const canComplete =
    visit.status === 'checked_in' &&
    (role !== 'rep' || visit.rep_user_id === userId)

  const canManagePlanned = visit.status === 'planned' && (role === 'admin' || role === 'manager')

  const statusColor: Record<string, string> = {
    planned:    'text-amber-300',
    checked_in: 'text-dk-green',
    completed:  'text-dk-blue',
    cancelled:  'text-dk-dim',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/visits" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-dk-text">방문 상세</h1>
          <p className={cn('text-xs mt-0.5', statusColor[visit.status])}>
            {VISIT_STATUS_LABEL[visit.status]} · {VISIT_TYPE_LABEL[visit.visit_type]}
          </p>
        </div>
      </div>

      <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-dk-orange mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-dk-text">{clientInfo?.name ?? '—'}</p>
            {clientInfo?.address && <p className="text-xs text-dk-muted mt-0.5">{clientInfo.address}</p>}
          </div>
          <Link
            href={`/app/clients/${clientInfo?.id}`}
            className="ml-auto text-xs text-dk-blue hover:text-dk-blueHover"
          >
            거래처 보기
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dk-border">
          <div>
            <p className="text-[10px] text-dk-muted mb-1">담당자</p>
            <p className="text-sm text-dk-text">{repInfo?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-dk-muted mb-1">체크인</p>
            <div className="flex items-center gap-1 text-sm text-dk-text">
              <Clock className="w-3.5 h-3.5 text-dk-dim" />
              {formatDateTime(visit.check_in_at)}
            </div>
          </div>
          {visit.check_out_at && (
            <div>
              <p className="text-[10px] text-dk-muted mb-1">체크아웃</p>
              <div className="flex items-center gap-1 text-sm text-dk-text">
                <Clock className="w-3.5 h-3.5 text-dk-dim" />
                {formatDateTime(visit.check_out_at)}
              </div>
            </div>
          )}
          {visit.lat && visit.lng && (
            <div>
              <p className="text-[10px] text-dk-muted mb-1">GPS</p>
              <p className="text-xs text-dk-dim font-tabular">{visit.lat.toFixed(5)}, {visit.lng.toFixed(5)}</p>
            </div>
          )}
        </div>

        {visit.purpose && (
          <div className="pt-3 border-t border-dk-border">
            <p className="text-[10px] text-dk-muted mb-1">방문 목적</p>
            <p className="text-sm text-dk-text whitespace-pre-wrap">{visit.purpose}</p>
          </div>
        )}
        {visit.result && (
          <div className="pt-3 border-t border-dk-border">
            <p className="text-[10px] text-dk-muted mb-1">상담 결과</p>
            <p className="text-sm text-dk-text whitespace-pre-wrap">{visit.result}</p>
          </div>
        )}
      </div>

      {visitItems.length > 0 && (
        <div className="bg-dk-surface border border-dk-border rounded-xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-dk-border">
            <Package className="w-4 h-4 text-dk-muted" />
            <h2 className="text-sm font-semibold text-dk-text">주문 내역</h2>
          </div>
          <div className="divide-y divide-dk-border">
            {visitItems.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-dk-text">{item.product_name}</p>
                  {item.memo && <p className="text-xs text-dk-muted mt-0.5">{item.memo}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-tabular text-dk-text">{item.quantity} {' '}개</p>
                  {item.unit_price && (
                    <p className="text-xs text-dk-muted font-tabular">
                      {(item.unit_price * item.quantity).toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManagePlanned && (
        <div className="flex gap-3">
          <Link
            href={`/app/visits/${id}/edit`}
            className="flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-dk-text border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            수정
          </Link>
          <form action={cancelVisitAction} className="flex-1">
            <input type="hidden" name="id" value={visit.id} />
            <button
              type="submit"
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-dk-red border border-tint-red-border rounded-xl hover:bg-dk-danger/10 transition-colors"
            >
              <X className="w-4 h-4" />
              방문 취소
            </button>
          </form>
        </div>
      )}

      {canComplete && (
        <form action={completeVisitAction}>
          <input type="hidden" name="id" value={visit.id} />
          <button
            type="submit"
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-dk-blue hover:bg-dk-blueHover rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            방문 완료 처리
          </button>
        </form>
      )}
    </div>
  )
}
