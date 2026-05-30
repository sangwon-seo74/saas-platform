import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, Users, Building2, CheckCircle2, XCircle, MapPin, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '방문 리포트' }

type Period = 'week' | 'month'

interface VisitRow {
  id: string
  status: string
  check_in_at: string
  rep_user_id: string
  client_id: string
  rep: { name: string } | null
  client: { name: string } | null
}

function getPeriodRange(period: Period) {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  const days = period === 'week' ? 7 : 30
  const from = new Date(now)
  from.setDate(from.getDate() - (days - 1))
  from.setHours(0, 0, 0, 0)

  return { from, to, days, label: period === 'week' ? '최근 7일' : '최근 30일' }
}

async function getReportData(tenantId: string, period: Period) {
  const supabase = await createClient()
  const { from, to, days } = getPeriodRange(period)

  const { data } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, status, check_in_at, rep_user_id, client_id, rep:users(name), client:clients(name)')
    .eq('tenant_id', tenantId)
    .gte('check_in_at', from.toISOString())
    .lte('check_in_at', to.toISOString())
    .order('check_in_at', { ascending: true })

  const visits = (data ?? []) as unknown as VisitRow[]

  const statusCounts = {
    completed:  visits.filter(v => v.status === 'completed').length,
    checked_in: visits.filter(v => v.status === 'checked_in').length,
    planned:    visits.filter(v => v.status === 'planned').length,
    cancelled:  visits.filter(v => v.status === 'cancelled').length,
  }

  const repMap = new Map<string, { name: string; count: number }>()
  for (const v of visits) {
    if (!v.rep_user_id) continue
    const cur = repMap.get(v.rep_user_id) ?? { name: v.rep?.name ?? '알 수 없음', count: 0 }
    cur.count++
    repMap.set(v.rep_user_id, cur)
  }
  const byRep = [...repMap.values()].sort((a, b) => b.count - a.count)

  const clientMap = new Map<string, { name: string; count: number }>()
  for (const v of visits) {
    if (!v.client_id) continue
    const cur = clientMap.get(v.client_id) ?? { name: v.client?.name ?? '알 수 없음', count: 0 }
    cur.count++
    clientMap.set(v.client_id, cur)
  }
  const byClient = [...clientMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)

  const daily: { date: string; label: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const count = visits.filter(v => v.check_in_at.slice(0, 10) === dateStr).length
    daily.push({ date: dateStr, label, count })
  }

  return { statusCounts, byRep, byClient, daily, total: visits.length }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role === 'rep') redirect('/app/dashboard')

  const sp = await searchParams
  const period: Period = sp.period === 'month' ? 'month' : 'week'
  const { label } = getPeriodRange(period)

  const { statusCounts, byRep, byClient, daily, total } = await getReportData(tenantId, period)

  const maxDaily  = Math.max(...daily.map(d => d.count), 1)
  const maxRep    = Math.max(...byRep.map(r => r.count), 1)
  const maxClient = Math.max(...byClient.map(c => c.count), 1)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">방문 리포트</h1>
          <p className="text-xs text-dk-muted mt-0.5">{label} · 총 {total}건</p>
        </div>
        <div className="flex gap-1 bg-dk-surface2 rounded-lg p-1">
          <Link
            href="/app/reports?period=week"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === 'week'
                ? 'bg-dk-surface text-dk-text shadow-sm'
                : 'text-dk-muted hover:text-dk-text'
            }`}
          >
            주간
          </Link>
          <Link
            href="/app/reports?period=month"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === 'month'
                ? 'bg-dk-surface text-dk-text shadow-sm'
                : 'text-dk-muted hover:text-dk-text'
            }`}
          >
            월간
          </Link>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: '완료',   value: statusCounts.completed,  color: 'text-dk-blue',   bg: 'bg-tint-blue',   icon: CheckCircle2 },
          { label: '체크인', value: statusCounts.checked_in, color: 'text-dk-green',  bg: 'bg-tint-green',  icon: MapPin },
          { label: '예정',   value: statusCounts.planned,    color: 'text-dk-orange', bg: 'bg-tint-orange', icon: Clock },
          { label: '취소',   value: statusCounts.cancelled,  color: 'text-dk-red',    bg: 'bg-tint-red',    icon: XCircle },
        ] as const).map(s => (
          <div key={s.label} className="bg-dk-surface border border-dk-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-dk-muted">{s.label}</p>
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold font-tabular ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Daily Bar Chart */}
      <div className="bg-dk-surface border border-dk-border rounded-xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-dk-border">
          <BarChart3 className="w-4 h-4 text-dk-muted" />
          <h2 className="text-sm font-semibold text-dk-text">일별 방문 현황</h2>
        </div>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-end gap-1" style={{ height: '108px' }}>
            {daily.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[9px] text-dk-dim font-tabular leading-none" style={{ minHeight: '11px' }}>
                  {d.count > 0 ? d.count : ''}
                </span>
                <div className="w-full flex items-end" style={{ height: '72px' }}>
                  <div
                    className="w-full rounded-sm transition-all hover:opacity-80"
                    style={{
                      height: d.count === 0 ? '2px' : `${Math.max((d.count / maxDaily) * 100, 10)}%`,
                      backgroundColor: d.count === 0 ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.7)',
                    }}
                    title={`${d.date}: ${d.count}건`}
                  />
                </div>
                <span className="text-[9px] text-dk-dim truncate w-full text-center leading-none">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rep & Client Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Rep */}
        <div className="bg-dk-surface border border-dk-border rounded-xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-dk-border">
            <Users className="w-4 h-4 text-dk-muted" />
            <h2 className="text-sm font-semibold text-dk-text">담당자별 방문 횟수</h2>
          </div>
          <div className="p-4 space-y-3">
            {byRep.length === 0 ? (
              <p className="text-sm text-dk-dim text-center py-6">데이터 없음</p>
            ) : (
              byRep.map((r, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dk-text">{r.name}</span>
                    <span className="text-sm font-semibold font-tabular text-dk-accent">{r.count}건</span>
                  </div>
                  <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-dk-accent rounded-full"
                      style={{ width: `${(r.count / maxRep) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Client */}
        <div className="bg-dk-surface border border-dk-border rounded-xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-dk-border">
            <Building2 className="w-4 h-4 text-dk-muted" />
            <h2 className="text-sm font-semibold text-dk-text">거래처별 방문 횟수 (TOP 10)</h2>
          </div>
          <div className="p-4 space-y-3">
            {byClient.length === 0 ? (
              <p className="text-sm text-dk-dim text-center py-6">데이터 없음</p>
            ) : (
              byClient.map((c, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-dk-text truncate">{c.name}</span>
                    <span className="text-sm font-semibold font-tabular text-dk-blue shrink-0">{c.count}건</span>
                  </div>
                  <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-dk-blue rounded-full"
                      style={{ width: `${(c.count / maxClient) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
