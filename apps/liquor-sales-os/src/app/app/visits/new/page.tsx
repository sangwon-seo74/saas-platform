import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VISIT_TYPE_LABEL } from '@/lib/utils'
import type { Client, RepUser } from '@/types/domain'

export const metadata: Metadata = { title: '방문 예약 등록' }

async function createPlannedVisitAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin' && role !== 'manager') redirect('/app/visits')

  const clientId    = formData.get('client_id')?.toString()
  const repUserId   = formData.get('rep_user_id')?.toString()
  const visitType   = formData.get('visit_type')?.toString() ?? 'sales'
  const purpose     = formData.get('purpose')?.toString() ?? null
  const scheduledAt = formData.get('scheduled_at')?.toString()

  if (!clientId || !repUserId || !tenantId) redirect('/app/visits/new')

  const checkInAt = scheduledAt
    ? new Date(scheduledAt).toISOString()
    : new Date().toISOString()

  const supabase = await createClient()

  const { data: visit, error } = await supabase
    .schema('lso')
    .from('visits')
    .insert({
      tenant_id:   tenantId,
      client_id:   clientId,
      rep_user_id: repUserId,
      status:      'planned',
      visit_type:  visitType,
      purpose:     purpose,
      check_in_at: checkInAt,
    })
    .select('id')
    .single()

  if (error || !visit) redirect('/app/visits/new')
  redirect(`/app/visits/${visit.id}`)
}

export default async function NewVisitPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin' && role !== 'manager') redirect('/app/visits')

  const supabase = await createClient()

  const [clientsRes, repsRes] = await Promise.all([
    supabase.schema('lso').from('clients')
      .select('id, name, client_type, address')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('name')
      .limit(300),

    supabase.schema('public').from('users')
      .select('id, name, role')
      .eq('tenant_id', tenantId)
      .in('role', ['rep', 'manager', 'sales'])
      .eq('is_active', true)
      .order('name'),
  ])

  const clients = (clientsRes.data ?? []) as unknown as Client[]
  const reps    = (repsRes.data ?? []) as unknown as RepUser[]

  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  const defaultScheduled = now.toISOString().slice(0, 16)

  return (
    <div className="p-4 lg:p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/visits" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-dk-text">방문 예약 등록</h1>
          <p className="text-xs text-dk-muted mt-0.5">담당자에게 방문 일정을 배정합니다</p>
        </div>
      </div>

      <form action={createPlannedVisitAction} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">거래처 *</label>
          <select
            name="client_id"
            required
            className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text focus:outline-none focus:border-dk-border2"
          >
            <option value="">거래처 선택...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">담당 영업사원 *</label>
          <select
            name="rep_user_id"
            required
            className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text focus:outline-none focus:border-dk-border2"
          >
            <option value="">담당자 선택...</option>
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
                  defaultChecked={k === 'sales'}
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
            defaultValue={defaultScheduled}
            className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text focus:outline-none focus:border-dk-border2"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-dk-muted mb-1.5">방문 목적</label>
          <textarea
            name="purpose"
            rows={3}
            placeholder="방문 목적 또는 지시사항을 입력하세요..."
            className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-dk-accent hover:bg-dk-accentHover text-white font-bold rounded-xl transition-colors"
        >
          방문 예약 등록
        </button>
      </form>
    </div>
  )
}
