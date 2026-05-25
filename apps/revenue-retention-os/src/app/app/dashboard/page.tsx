'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Phone, AlertTriangle, CheckSquare, TrendingUp,
  RefreshCw, Building2, ArrowRight, Plus,
  ChevronRight, Clock, Loader2, Target
} from 'lucide-react'
import { cn, formatAmount, formatDate, calcDday } from '@/lib/utils'

const RISK_CLS: Record<string, string> = {
  high:   'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]',
  medium: 'bg-[#3d2b0d] text-[#E3B341] border-[#7a5000]',
  low:    'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]',
}
const RISK_LABEL: Record<string, string> = { high: '위험', medium: '주의', low: '안전' }
const ACTIVITY_ICON: Record<string, string> = { call: '📞', visit: '🤝', email: '📧', sms: '💬', kakao: '💛' }
const PRIORITY_CLS: Record<string, string> = { high: 'bg-[#FF7B72]', medium: 'bg-[#E3B341]', low: 'bg-dk-dim' }

function MetricCard({ label, value, sub, icon: Icon, color, href }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; href?: string
}) {
  const content = (
    <div className={cn(
      'flex flex-col bg-dk-surface border border-dk-border rounded-xl p-4 hover:border-dk-border2 transition-colors h-full min-h-[112px]',
      href && 'cursor-pointer'
    )}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3 shrink-0', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-dk-text leading-none">{value}</p>
      <p className="text-xs text-dk-muted mt-1.5">{label}</p>
      <p className="text-xs text-dk-dim mt-0.5 min-h-[14px]">{sub ?? ''}</p>
    </div>
  )
  return href ? <Link href={href} className="h-full">{content}</Link> : content
}

function calcStats(tasks: { status: string; created_at: string }[], days: number) {
  const from = new Date()
  from.setDate(from.getDate() - days)
  from.setHours(0, 0, 0, 0)
  const inPeriod = tasks.filter(t => t.status !== 'cancelled' && new Date(t.created_at) >= from)
  const done     = inPeriod.filter(t => t.status === 'done')
  const rate     = inPeriod.length > 0 ? Math.round(done.length / inPeriod.length * 100) : null
  return { done: done.length, total: inPeriod.length, rate }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [myTasks, setMyTasks] = useState<{ status: string; created_at: string }[]>([])
  const [dashData, setDashData] = useState<{
    summary: { calls_today: number; overdue_tasks: number; renewals_d7: number; renewals_d30: number }
    urgentRenewals: Record<string, unknown>[]
    todayTasks: Record<string, unknown>[]
    recentActivities: Record<string, unknown>[]
  } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/tasks?mine=true&limit=500').then(r => r.json()),
    ]).then(([dashJson, taskJson]) => {
      setDashData(dashJson.data)
      setMyTasks(taskJson.data?.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  const s = dashData?.summary ?? { calls_today: 0, overdue_tasks: 0, renewals_d7: 0, renewals_d30: 0 }
  const urgentRenewals = (dashData?.urgentRenewals ?? []) as Record<string, unknown>[]
  const todayTasks = (dashData?.todayTasks ?? []) as Record<string, unknown>[]
  const recentActivities = (dashData?.recentActivities ?? []) as Record<string, unknown>[]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">대시보드</h1>
          <p className="text-sm text-dk-dim mt-0.5">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/activities"
            className="flex items-center gap-1.5 text-sm bg-[#1f6feb] text-white px-3.5 py-2 rounded-lg hover:bg-[#388bfd] transition-colors">
            <Plus className="w-4 h-4" /> 활동이력
          </Link>
          <Link href="/app/companies/new"
            className="flex items-center gap-1.5 text-sm border border-dk-border text-dk-muted px-3.5 py-2 rounded-lg hover:bg-dk-surface2 hover:text-dk-text transition-colors">
            <Building2 className="w-4 h-4" /> 고객사 등록
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 items-stretch">
        <MetricCard label="오늘 통화" value={s.calls_today} icon={Phone} color="bg-blue-500/20 text-[#58A6FF]" href="/app/activities" />
        <MetricCard label="갱신 임박 (D-7)" value={s.renewals_d7} sub={`D-30 기준 ${s.renewals_d30}건`} icon={RefreshCw} color="bg-red-500/20 text-[#FF7B72]" href="/app/renewals" />
        <MetricCard label="기한 초과 할일" value={s.overdue_tasks} sub="미처리" icon={CheckSquare} color={s.overdue_tasks > 0 ? 'bg-amber-500/20 text-[#E3B341]' : 'bg-green-500/20 text-[#3FB950]'} href="/app/tasks/my" />
        <MetricCard label="갱신 임박 (D-30)" value={`${s.renewals_d30}건`} icon={TrendingUp} color="bg-green-500/20 text-[#3FB950]" href="/app/reports/renewal-rate" />
      </div>

      {/* 업무 달성율 */}
      {(() => {
        const stats = [
          { label: '1주일', ...calcStats(myTasks, 7) },
          { label: '1달',   ...calcStats(myTasks, 30) },
          { label: '6개월', ...calcStats(myTasks, 180) },
        ]
        return (
          <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-dk-border">
              <Target className="w-4 h-4 text-dk-muted" />
              <h3 className="text-sm font-semibold text-dk-text">내 업무 달성율</h3>
              <Link href="/app/tasks/my" className="ml-auto text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-0.5">
                내 업무 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 divide-x divide-dk-border">
              {stats.map(({ label, done, total, rate }) => {
                const color = rate === null ? 'text-dk-dim' : rate >= 80 ? 'text-[#3FB950]' : rate >= 50 ? 'text-[#E3B341]' : 'text-[#FF7B72]'
                const barColor = rate === null ? 'bg-dk-surface2' : rate >= 80 ? 'bg-[#3FB950]' : rate >= 50 ? 'bg-[#E3B341]' : 'bg-[#FF7B72]'
                return (
                  <div key={label} className="px-6 py-4">
                    <p className="text-xs text-dk-dim font-medium mb-1.5">{label}</p>
                    <p className={cn('text-3xl font-bold font-mono leading-none', color)}>
                      {rate === null ? '—' : `${rate}%`}
                    </p>
                    <div className="mt-2.5 h-1 bg-dk-surface2 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${rate ?? 0}%` }} />
                    </div>
                    <p className="text-[11px] text-dk-dim mt-1.5">{done} / {total}건 완료</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      <div className="bg-dk-surface border border-dk-border rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dk-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E3B341]" />
            <h3 className="text-sm font-semibold text-dk-text">갱신 위험 알림판</h3>
          </div>
          <Link href="/app/renewals" className="text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-0.5">
            전체 보기 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-dk-border border-b border-dk-border">
          <div className="px-5 py-4 text-center bg-red-500/10">
            <p className="text-3xl font-bold text-[#FF7B72] font-mono">{s.renewals_d7}</p>
            <p className="text-xs font-medium text-[#FF7B72]/70 mt-1">D-7 이내</p>
          </div>
          <div className="px-5 py-4 text-center bg-amber-500/10">
            <p className="text-3xl font-bold text-[#E3B341] font-mono">{s.renewals_d30}</p>
            <p className="text-xs font-medium text-[#E3B341]/70 mt-1">D-30 이내</p>
          </div>
        </div>
        <div className="divide-y divide-dk-border">
          {urgentRenewals.length === 0 ? (
            <p className="text-sm text-dk-dim text-center py-8">갱신 임박 건이 없습니다</p>
          ) : urgentRenewals.map((r) => {
            const expiresAt = r.contract_expires_at as string
            const dday = calcDday(expiresAt)
            const risk = (r.risk_level as string) ?? 'low'
            const companyName = (r.company as Record<string, string>)?.name ?? ''
            const amount = ((r.contract as Record<string, number>)?.final_amount ?? 0)
            const assignedUser = (r.assigned_user as Record<string, string>)?.name ?? ''
            return (
              <Link key={r.id as string} href={`/app/renewals/${r.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-dk-surface2/50 transition-colors">
                <span className={cn('text-xs font-bold font-mono px-2 py-0.5 rounded shrink-0',
                  dday <= 7 ? 'bg-[#3d1a1a] text-[#FF7B72]' : 'bg-[#3d2b0d] text-[#E3B341]')}>
                  D-{dday}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dk-text truncate">{companyName}</p>
                  <p className="text-xs text-dk-dim mt-0.5">{assignedUser}</p>
                </div>
                <p className="text-sm font-bold text-dk-text font-mono shrink-0">{formatAmount(amount)}</p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0', RISK_CLS[risk])}>
                  {RISK_LABEL[risk]}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-dk-dim shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dk-surface border border-dk-border rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-dk-border">
            <h3 className="text-sm font-semibold text-dk-text flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-dk-muted" /> 할일
            </h3>
            <Link href="/app/tasks/my" className="text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-0.5">
              전체 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-dk-border">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-dk-dim text-center py-8">할일이 없습니다</p>
            ) : todayTasks.map((t) => {
              const dueAt = t.due_at as string | null
              const dday = dueAt ? calcDday(dueAt) : 0
              const isOverdue = dday < 0
              return (
                <div key={t.id as string} className="flex items-center gap-3 px-5 py-3 hover:bg-dk-surface2/50 transition-colors">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_CLS[t.priority as string] ?? 'bg-dk-dim')} />
                  <p className={cn('flex-1 text-sm truncate', isOverdue ? 'text-[#FF7B72] font-medium' : 'text-dk-text')}>
                    {t.title as string}
                  </p>
                  {dueAt && (
                    <span className={cn('text-[10px] font-mono shrink-0', isOverdue ? 'text-[#FF7B72] font-bold' : 'text-dk-dim')}>
                      {isOverdue ? `D+${Math.abs(dday)}` : dday === 0 ? '오늘' : `D-${dday}`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-dk-surface border border-dk-border rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-dk-border">
            <h3 className="text-sm font-semibold text-dk-text flex items-center gap-2">
              <Clock className="w-4 h-4 text-dk-muted" /> 최근 활동
            </h3>
            <Link href="/app/activities" className="text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-0.5">
              전체 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-dk-border">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-dk-dim text-center py-8">활동이 없습니다</p>
            ) : recentActivities.map((a) => (
              <div key={a.id as string} className="flex items-start gap-3 px-5 py-3 hover:bg-dk-surface2/50 transition-colors">
                <span className="text-base shrink-0 mt-0.5">{ACTIVITY_ICON[a.type as string] ?? '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-dk-text truncate">
                    {(a.company as Record<string, string>)?.name ?? ''}
                  </p>
                  <p className="text-xs text-dk-muted truncate mt-0.5">{a.summary as string}</p>
                </div>
                <p className="text-[10px] text-dk-dim shrink-0 mt-0.5">{formatDate(a.activity_at as string)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
