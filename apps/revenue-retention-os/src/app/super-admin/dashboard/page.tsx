'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Building2,
  AlertTriangle, Clock, ArrowRight,
  DollarSign, Zap, Loader2
} from 'lucide-react'
import { cn, formatAmount, formatDate } from '@/lib/utils'
import { PlanBadge } from '../_components/badges'

type Metrics = {
  mrr: number; arr: number; mrr_delta: number
  active_tenants: number; new_tenants_this_month: number
  churn_this_month: number; pending_invoices: number
  pending_amount: number; expiring_7d: number
  churn_rate: number; arpu: number; ltv: number; conversion_rate: number
}
type NewTenant  = { id: string; name: string; plan: string; created_at: string }
type Expiring   = { id: string; tenant_name: string; plan: string; expires_at: string; amount: number }
type Unpaid     = { id: string; tenant_name: string; plan: string; amount: number; due_at: string | null; overdue_days: number }
type PlanDist   = { name: string; code: string; count: number; pct: number }
type MrrTrend   = { month: string; mrr: number }
type CancelReason = { reason: string; count: number }

type DashboardData = {
  metrics: Metrics
  new_tenants:    NewTenant[]
  expiring:       Expiring[]
  unpaid:         Unpaid[]
  plan_dist:      PlanDist[]
  mrr_trend:      MrrTrend[]
  cancel_reasons: CancelReason[]
}

const PLAN_DIST_COLOR: Record<string, string> = {
  free: 'bg-gray-500', standard: 'bg-blue-500', pro: 'bg-purple-500'
}

/** 대시보드 상단의 핵심 지표 카드.
 *  값, 보조 문구, 전월 대비 증감(%) 아이콘, 클릭 시 이동 링크, 긴급 색상을 옵션으로 지원한다. */
function MetricCard({
  label, value, sub, delta, icon: Icon, iconColor, href, urgent
}: {
  label: string; value: string | number; sub?: string; delta?: number
  icon: React.ElementType; iconColor: string; href?: string; urgent?: boolean
}) {
  const content = (
    <div className={cn(
      'rounded-xl border p-4 transition-colors',
      urgent
        ? 'bg-red-950/40 border-red-800/50 hover:border-red-700/50'
        : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600/50',
      href && 'cursor-pointer'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        {delta !== undefined && (
          <div className={cn('flex items-center gap-0.5 text-xs font-medium', delta >= 0 ? 'text-green-400' : 'text-red-400')}>
            {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

/** 최근 6개월 MRR 추이를 미니 막대 차트로 표시한다.
 *  마지막 막대(이번 달)는 파란색으로 강조하고, 우상단에 전월 대비 증감(%)을 보여준다. */
function MrrTrendChart({ trend, mrr, delta }: { trend: MrrTrend[]; mrr: number; delta: number }) {
  const max = Math.max(...trend.map(d => d.mrr), 1)
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400">MRR 추이</p>
          <p className="text-2xl font-bold text-white mt-0.5">{formatAmount(mrr)}</p>
        </div>
        {delta !== 0 && (
          <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full',
            delta >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10')}>
            {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta >= 0 ? '+' : ''}{delta}% 전월 대비
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {trend.map((d, i) => {
          const h = Math.round((d.mrr / max) * 100)
          const isLast = i === trend.length - 1
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn('w-full rounded-t-sm', isLast ? 'bg-blue-500' : 'bg-gray-600')}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
              <span className="text-[9px] text-gray-500">{d.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 플랜별 구독자 분포(개수+비율)를 가로 바 차트로 표시한다. */
function PlanDistCard({ dist }: { dist: PlanDist[] }) {
  const total = dist.reduce((s, p) => s + p.count, 0)
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
      <p className="text-xs text-gray-400 mb-4">플랜 분포</p>
      <div className="space-y-3">
        {dist.map(p => (
          <div key={p.code}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-300">{p.name}</span>
              <span className="text-xs text-gray-400">{p.count}개 ({p.pct}%)</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div className={cn('h-1.5 rounded-full', PLAN_DIST_COLOR[p.code] ?? 'bg-gray-500')} style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-700">전체 {total}개 테넌트</p>
    </div>
  )
}

/** 슈퍼 관리자 운영 대시보드.
 *  /api/super-admin/dashboard 한 번 호출로 MRR, 테넌트 수, 만료 임박, 미납 인보이스,
 *  플랜 분포, 신규 가입 목록을 한 화면에 집계 표시한다. */
export default function SuperAdminDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/super-admin/dashboard')
      .then(r => r.json())
      .then(json => { if (json.data) setData(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    )
  }

  const m    = data?.metrics
  const mrr  = m?.mrr ?? 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">운영 대시보드</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} 기준
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="월간 반복 매출 (MRR)" value={formatAmount(mrr)}
          sub={`ARR ${formatAmount(mrr * 12)}`} delta={m?.mrr_delta}
          icon={DollarSign} iconColor="bg-blue-600/20 text-blue-400" />
        <MetricCard label="활성 테넌트" value={m?.active_tenants ?? 0}
          sub={`이번 달 +${m?.new_tenants_this_month ?? 0} 신규`}
          icon={Building2} iconColor="bg-green-600/20 text-green-400"
          href="/super-admin/tenants" />
        <MetricCard label="이번 달 이탈" value={m?.churn_this_month ?? 0}
          sub="해지 처리 완료"
          icon={TrendingDown} iconColor="bg-red-600/20 text-red-400" />
        <MetricCard label="만료 임박 (7일)" value={m?.expiring_7d ?? 0}
          sub="갱신 필요"
          icon={Clock} iconColor="bg-amber-600/20 text-amber-400"
          href="/super-admin/subscriptions" urgent={(m?.expiring_7d ?? 0) > 0} />
        <MetricCard label="미납 인보이스" value={m?.pending_invoices ?? 0}
          sub={formatAmount(m?.pending_amount ?? 0)}
          icon={AlertTriangle} iconColor="bg-red-600/20 text-red-400"
          href="/super-admin/invoices" urgent={(m?.pending_invoices ?? 0) > 0} />
        <MetricCard label="이번 달 신규" value={m?.new_tenants_this_month ?? 0}
          sub="가입 완료"
          icon={Zap} iconColor="bg-purple-600/20 text-purple-400" />
      </div>

      {/* SaaS 운영 지표 — Churn, LTV, ARPU, 전환율 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400">월 이탈률 (Churn)</p>
          <p className={cn('text-2xl font-bold mt-1', (m?.churn_rate ?? 0) > 5 ? 'text-red-400' : 'text-white')}>
            {m?.churn_rate ?? 0}%
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">이번달 해지 / 월초 활성</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400">ARPU</p>
          <p className="text-2xl font-bold text-white mt-1">{formatAmount(m?.arpu ?? 0)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">활성 테넌트당 월매출</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400">LTV (추정)</p>
          <p className="text-2xl font-bold text-white mt-1">{formatAmount(m?.ltv ?? 0)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">ARPU ÷ Churn Rate</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400">체험→유료 전환율</p>
          <p className="text-2xl font-bold text-white mt-1">{m?.conversion_rate ?? 0}%</p>
          <p className="text-[10px] text-gray-500 mt-0.5">최근 30일 기준</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MrrTrendChart trend={data?.mrr_trend ?? []} mrr={mrr} delta={m?.mrr_delta ?? 0} />
        <PlanDistCard dist={data?.plan_dist ?? []} />
      </div>

      {/* 이탈 사유 통계 */}
      {(data?.cancel_reasons ?? []).length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-200 mb-3">최근 90일 이탈 사유 Top 5</p>
          <div className="space-y-2">
            {(data?.cancel_reasons ?? []).map(r => (
              <div key={r.reason} className="flex items-center gap-2">
                <p className="text-xs text-gray-300 flex-1 truncate">{r.reason}</p>
                <p className="text-xs font-mono text-amber-400">{r.count}건</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* 최근 신규 가입 */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-700/50">
            <p className="text-sm font-semibold text-white">최근 신규 가입</p>
            <Link href="/super-admin/tenants" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
              전체 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-700/30">
            {(data?.new_tenants ?? []).map(t => (
              <Link key={t.id} href={`/super-admin/tenants/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
                  {t.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{t.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(t.created_at)}</p>
                </div>
                <PlanBadge plan={t.plan} />
              </Link>
            ))}
            {(data?.new_tenants ?? []).length === 0 && (
              <p className="px-4 py-6 text-xs text-gray-500 text-center">없음</p>
            )}
          </div>
        </div>

        {/* 만료 임박 */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-700/50">
            <p className="text-sm font-semibold text-white">만료 임박 <span className="text-amber-400 text-xs ml-1">D-7</span></p>
            <Link href="/super-admin/subscriptions" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
              전체 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-700/30">
            {(data?.expiring ?? []).map(s => {
              const days = Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / 86400000)
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn('text-[10px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0',
                    days <= 3 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')}>
                    D-{days}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200 truncate">{s.tenant_name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{formatAmount(s.amount)}/월</p>
                  </div>
                  <PlanBadge plan={s.plan} />
                </div>
              )
            })}
            {(data?.expiring ?? []).length === 0 && (
              <p className="px-4 py-6 text-xs text-gray-500 text-center">없음</p>
            )}
          </div>
        </div>

        {/* 미납 현황 */}
        <div className="bg-gray-800/60 border border-red-800/30 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-red-800/30">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> 미납 인보이스
            </p>
            <Link href="/super-admin/invoices" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
              전체 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-700/30">
            {(data?.unpaid ?? []).map(inv => (
              <Link key={inv.id} href={`/super-admin/invoices/${inv.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{inv.tenant_name}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">{inv.overdue_days}일 연체</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-white">{formatAmount(inv.amount)}</p>
                  <p className="text-[10px] text-gray-500">{inv.due_at ? formatDate(inv.due_at) : '—'}</p>
                </div>
              </Link>
            ))}
            {(data?.unpaid ?? []).length === 0 && (
              <p className="px-4 py-6 text-xs text-gray-500 text-center">없음</p>
            )}
          </div>
          {(data?.unpaid ?? []).length > 0 && (
            <div className="px-4 py-3 border-t border-gray-700/30 flex justify-between items-center">
              <span className="text-xs text-gray-400">미수금 합계</span>
              <span className="text-sm font-bold text-red-400">{formatAmount(m?.pending_amount ?? 0)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
