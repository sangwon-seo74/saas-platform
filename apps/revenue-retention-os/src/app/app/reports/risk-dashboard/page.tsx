'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { cn, formatAmount, formatDate } from '@/lib/utils'

const C = { surface2: '#1C2128', border: '#21262D', text: '#E6EDF3', dim: '#6E7681' }
const PIE_COLORS = { high: '#FF7B72', medium: '#E3B341', low: '#3FB950' }

type RiskItem = {
  id: string; company: string; amount: number
  status: string; assigned: string; expires_at: string; days_left: number
}
type RiskGroup = { count: number; total_amount: number; items: RiskItem[] }
type Groups = { high: RiskGroup; medium: RiskGroup; low: RiskGroup }

const RISK_CFG = {
  high:   { label: '고위험', cls: 'bg-tint-red text-dk-red border-tint-red-border', bar: 'bg-dk-red',  icon: AlertCircle,   text: 'text-dk-red' },
  medium: { label: '주의',   cls: 'bg-tint-amber text-dk-orange border-tint-amber-border', bar: 'bg-dk-orange',  icon: AlertTriangle, text: 'text-dk-orange' },
  low:    { label: '안전',   cls: 'bg-tint-green text-dk-green border-tint-green-border', bar: 'bg-dk-green',  icon: CheckCircle2,  text: 'text-dk-green' },
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기', contacted: '접촉', negotiating: '협의중',
}

export default function RiskDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups]   = useState<Groups | null>(null)
  const [total, setTotal]     = useState({ count: 0, amount: 0 })
  const [asOf, setAsOf]       = useState('')
  const [expanded, setExpanded] = useState<'high' | 'medium' | 'low' | null>('high')

  useEffect(() => {
    fetch('/api/reports/risk-dashboard')
      .then(r => r.json())
      .then(json => {
        setGroups(json.data?.groups ?? null)
        setTotal({ count: json.data?.total_count ?? 0, amount: json.data?.total_amount ?? 0 })
        setAsOf(json.data?.as_of ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  if (!groups) {
    return <div className="text-center py-16 text-sm text-dk-dim">데이터를 불러올 수 없습니다</div>
  }

  const riskKeys = ['high', 'medium', 'low'] as const

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">위험도 현황</h1>
          <p className="text-sm text-dk-muted mt-0.5">
            진행 중인 갱신 건 위험도 분포{asOf ? ` · 기준일 ${formatDate(asOf)}` : ''}
          </p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">전체 갱신 진행</p>
          <span className="text-2xl font-bold font-mono text-dk-text">{total.count}건</span>
          <p className="text-xs text-dk-dim mt-0.5">{(total.amount / 100_000_000).toFixed(1)}억</p>
        </div>
        {riskKeys.map(k => {
          const cfg = RISK_CFG[k]
          const g   = groups[k]
          const Icon = cfg.icon
          return (
            <div key={k} className="bg-dk-surface border border-dk-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn('w-3.5 h-3.5', cfg.text)} />
                <p className="text-xs text-dk-muted">{cfg.label}</p>
              </div>
              <span className={cn('text-2xl font-bold font-mono', cfg.text)}>{g.count}건</span>
              <p className="text-xs text-dk-dim mt-0.5">{(g.total_amount / 100_000_000).toFixed(1)}억</p>
            </div>
          )
        })}
      </div>

      {/* 위험도 분포 — Pie 차트 + 바 */}
      {total.count > 0 && (
        <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-dk-text mb-4">위험도 분포</h3>
          <div className="flex items-center gap-6 mb-4">
            <div style={{ width: 140, height: 140, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskKeys.map(k => ({ name: RISK_CFG[k].label, value: groups[k].count }))}
                    cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                    dataKey="value" strokeWidth={0}>
                    {riskKeys.map(k => <Cell key={k} fill={PIE_COLORS[k]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: C.text }}
                    formatter={(value, name) => {
                    const v = typeof value === 'number' ? value : 0
                    return [`${v}건`, String(name)] as [string, string]
                  }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {riskKeys.map(k => {
                const pct = total.count > 0 ? Math.round(groups[k].count / total.count * 100) : 0
                const cfg = RISK_CFG[k]
                const Icon = cfg.icon
                return (
                  <div key={k} className="flex items-center gap-2">
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.text)} />
                    <span className="text-xs text-dk-muted w-8">{cfg.label}</span>
                    <div className="flex-1 h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', cfg.bar)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={cn('text-xs font-mono font-semibold w-8 text-right', cfg.text)}>{pct}%</span>
                    <span className="text-xs text-dk-dim w-8 text-right">{groups[k].count}건</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="h-6 flex rounded-lg overflow-hidden gap-px">
            {riskKeys.map(k => {
              const pct = total.count > 0 ? groups[k].count / total.count * 100 : 0
              return pct > 0 ? (
                <div key={k} className={cn('h-full flex items-center justify-center', RISK_CFG[k].bar)}
                  style={{ width: `${pct}%` }} title={`${RISK_CFG[k].label} ${groups[k].count}건`}>
                  {pct > 8 && <span className="text-[10px] font-bold text-white">{Math.round(pct)}%</span>}
                </div>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* 위험도별 업체 목록 */}
      <div className="space-y-3">
        {riskKeys.filter(k => groups[k].count > 0).map(k => {
          const cfg  = RISK_CFG[k]
          const g    = groups[k]
          const Icon = cfg.icon
          const isOpen = expanded === k
          return (
            <div key={k} className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : k)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-dk-surface2/50 transition-colors">
                <Icon className={cn('w-4 h-4 shrink-0', cfg.text)} />
                <span className={cn('text-sm font-semibold', cfg.text)}>{cfg.label}</span>
                <span className="text-xs text-dk-dim">{g.count}건</span>
                <span className="text-sm font-mono font-bold text-dk-text ml-auto">
                  {(g.total_amount / 100_000_000).toFixed(1)}억
                </span>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0',
                  isOpen ? cfg.cls : 'border-dk-border text-dk-dim'
                )}>
                  {isOpen ? '접기' : '펼치기'}
                </span>
              </button>

              {isOpen && g.items.length > 0 && (
                <div className="border-t border-dk-border divide-y divide-dk-border">
                  {g.items.map(item => (
                    <Link key={item.id} href={`/app/renewals/${item.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-dk-surface2/50 transition-colors">
                      <span className={cn(
                        'text-xs font-bold font-mono px-2 py-0.5 rounded shrink-0',
                        item.days_left <= 7  ? 'bg-tint-red text-dk-red' :
                        item.days_left <= 14 ? 'bg-tint-amber text-dk-orange' :
                                               'bg-dk-surface2 text-dk-muted'
                      )}>
                        D-{item.days_left}
                      </span>
                      <p className="flex-1 text-sm font-medium text-dk-text truncate">{item.company}</p>
                      <span className="text-xs text-dk-dim shrink-0">
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                      <span className="text-sm font-mono font-bold text-dk-text shrink-0">
                        {formatAmount(item.amount)}
                      </span>
                      <span className="text-xs text-dk-dim shrink-0 w-14 text-right">{item.assigned}</span>
                      <span className="text-xs text-dk-dim shrink-0">{formatDate(item.expires_at)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
