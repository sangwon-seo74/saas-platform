import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VISIT_TYPE_LABEL } from '@/lib/utils'
import type { Client, RepUser, Visit } from '@/types/domain'

export const metadata: Metadata = { title: '방문 예약 수정' }

async function updateVisitAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin' && role !== 'manager') redirect('/app/visits')

  const id           = formData.get('id')?.toString()
  const repUserId    = formData.get('rep_user_id')?.toString()
  const visitType    = formData.get('visit_type')?.toString() ?? 'sales'
  const purpose      = formData.get('purpose')?.toString() ?? null
  const scheduledAt  = formData.get('scheduled_at')?.toString()

  if (!id || !repUserId || !tenantId) redirect('/app/visits')

  const supabase = await createClient()

  const { data: existing } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing || existing.status !== 'planned') redirect(`/app/visits/${id}`)

  const checkInAt = scheduledAt
    ? new Date(scheduledAt).toISOString()
    : undefined

  await supabase
    .schema('lso')
    .from('visits')
    .update({
      rep_user_id: repUserId,
      visit_type:  visitType,
      purpose:     purpose || null,
      ...(checkInAt ? { check_in_at: checkInAt } : {}),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  redirect(`/app/visits/${id}`)
}

export default async function EditVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin' && role !== 'manager') redirect('/app/visits')

  const supabase = await createClient()

  const [visitRes, repsRes] = await Promise.all([
    supabase.schema('lso').from('visits')
      .select('*, client:clients(id, name)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single(),

    supabase.schema('public').from('users')
      .select('id, name, role')
      .eq('tenant_id', tenantId)
      .in('role', ['rep', 'manager', 'sales'])
      .eq('is_active', true)
      .order('name'),
  ])

  if (!visitRes.data) notFound()

  const visit = visitRes.data as unknown as Visit
  if (visit.status !== 'planned') redirect(`/app/visits/${id}`)

  const reps       = (repsRes.data ?? []) as unknown as RepUser[]
  const clientInfo = visit.client as unknown as { id: string; name: string } | null

  const scheduledLocal = visit.check_in_at
    ? new Date(visit.check_in_at).toISOString().slice(0, 16)
    : ''

  return (
    <div className="p-4 lg:p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/app/visits/${id}`} className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-dk-text">방문 예약 수정</h1>
          <p className="text-xs text-dk-muted mt-0.5">{clientInfo?.name ?? '—'}</p>
        </div>
      </div>

      <form action={updateVisitAction} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        {/* 거래처 — 읽기 전용 */}
        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">거래처</label>
          <div className="w-full px-3 py-2.5 bg-dk-surface2 border border-dk-border rounded-xl text-sm text-dk-dim">
            {clientInfo?.name ?? '—'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">담당 영업사원 *</label>
          <select
            name="rep_user_id"
            required
            defaultValue={visit.rep_user_id}
            className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text focus:outline-none focus:border-dk-border2"
          >
            {reps.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">방문 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(VISIT_TYPE_LABEL) as [string, string][]).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visit_type"
                  value={k}
                  defaultChecked={k === visit.visit_type}
                  className="accent-dk-accent"
                />
                <span className="text-sm text-dk-text">{v}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">예약 일시</label>
          <input
            type="datetime-local"
            name="scheduled_at"
            defaultValue={scheduledLocal}
            className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text focus:outline-none focus:border-dk-border2"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">방문 목적</label>
          <textarea
            name="purpose"
            rows={3}
            defaultValue={visit.purpose ?? ''}
            placeholder="방문 목적 또는 지시사항을 입력하세요..."
            className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href={`/app/visits/${id}`}
            className="flex-1 py-3 text-center text-sm font-semibold text-dk-muted border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            className="flex-1 py-3 bg-dk-accent hover:bg-dk-accentHover text-white font-bold rounded-xl transition-colors"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
