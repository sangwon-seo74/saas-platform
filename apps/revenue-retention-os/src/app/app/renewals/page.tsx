'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react'
import { cn, formatAmount, calcDday } from '@/lib/utils'
import type { RenewalStatus, RiskLevel } from '@/types/domain'

type RenewalCard = {
  id: string
  company_name: string
  product_name: string
  expires_at: string
  final_amount: number
  risk: RiskLevel
  status: RenewalStatus
  assigned_user: string
}

const BUCKETS = [
  { key: 'D-90', label: 'D-90', from: 61, to: 90, color: 'border-dk-border bg-dk-surface2/30' },
  { key: 'D-60', label: 'D-60', from: 31, to: 60, color: 'border-dk-border bg-dk-surface2/30' },
  { key: 'D-30', label: 'D-30', from: 15, to: 30, color: 'border-[#7a5000] bg-[#3d2b0d]/30' },
  { key: 'D-14', label: 'D-14', from: 8,  to: 14, color: 'border-[#7a5000] bg-[#3d2b0d]/40' },
  { key: 'D-7',  label: 'D-7',  from: 0,  to: 7,  color: 'border-[#7f2020] bg-[#3d1a1a]/40' },
]

const RISK_CFG: Record<RiskLevel, { cls: string; borderCls: string; icon: React.ElementType }> = {
  high:   { cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]',   borderCls: 'border-l-[#FF7B72]',  icon: AlertCircle },
  medium: { cls: 'bg-[#3d2b0d] text-[#E3B341] border-[#7a5000]',   borderCls: 'border-l-[#E3B341]',  icon: AlertTriangle },
  low:    { cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]',   borderCls: 'border-l-[#3FB950]',  icon: CheckCircle2 },
}

const STATUS_LABEL: Record<RenewalStatus, string> = {
  pending: '대기', contacted: '접촉', negotiating: '협의중', won: '완료', lost: '이탈'
}
const STATUS_CLS: Record<RenewalStatus, string> = {
  pending:     'bg-dk-surface2 text-dk-muted',
  contacted:   'bg-[#1c2d4a] text-[#58A6FF]',
  negotiating: 'bg-[#3d2b0d] text-[#E3B341]',
  won:         'bg-[#0f2d1c] text-[#3FB950]',
  lost:        'bg-[#3d1a1a] text-[#FF7B72]',
}

function RenewalKanbanCard({ renewal }: { renewal: RenewalCard }) {
  const dday = calcDday(renewal.expires_at)
  const risk = RISK_CFG[renewal.risk]
  const RiskIcon = risk.icon

  return (
    <Link href={`/app/renewals/${renewal.id}`}
      className={cn(
        'block bg-dk-surface rounded-xl border border-dk-border border-l-4 p-3',
        'hover:border-dk-border2 hover:scale-[1.01] transition-all cursor-pointer',
        risk.borderCls
      )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-dk-text leading-tight">{renewal.company_name}</p>
        <span className={cn('inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0', risk.cls)}>
          <RiskIcon className="w-2.5 h-2.5" />
          {renewal.risk === 'high' ? '위험' : renewal.risk === 'medium' ? '주의' : '안전'}
        </span>
      </div>

      <p className="text-[10px] text-dk-dim truncate mb-2">{renewal.product_name || '—'}</p>

      <p className="text-sm font-bold text-dk-text font-mono mb-2">
        {formatAmount(renewal.final_amount)}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded',
            dday <= 7  ? 'bg-[#3d1a1a] text-[#FF7B72]' :
            dday <= 14 ? 'bg-[#3d2b0d] text-[#E3B341]' :
                         'bg-dk-surface2 text-dk-muted'
          )}>
            D-{dday}
          </span>
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', STATUS_CLS[renewal.status])}>
            {STATUS_LABEL[renewal.status]}
          </span>
        </div>
        <span className="text-[10px] text-dk-dim">{renewal.assigned_user}</span>
      </div>

    </Link>
  )
}

export default function RenewalsPage() {
  const [loading, setLoading]       = useState(true)
  const [renewals, setRenewals]     = useState<RenewalCard[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [userFilter, setUserFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')

  useEffect(() => {
    fetch('/api/renewals?limit=100&days_to=90')
      .then(r => r.json())
      .then(json => {
        const mapped = ((json.data?.data ?? []) as Record<string, unknown>[]).map(r => ({
          id:            r.id as string,
          company_name:  (r.company  as { name: string } | null)?.name ?? '',
          product_name:  ((r.contract as { product?: { name: string } } | null)?.product?.name) ?? '',
          expires_at:    r.contract_expires_at as string,
          final_amount:  (r.contract as { final_amount: number } | null)?.final_amount ?? 0,
          risk:          (r.risk_level as RiskLevel) ?? 'low',
          status:        r.status as RenewalStatus,
          assigned_user: (r.assigned_user as { name: string } | null)?.name ?? '',
        }))
        setRenewals(mapped)
        setTotalCount(json.data?.count ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  const users = Array.from(new Set(renewals.map(r => r.assigned_user).filter(Boolean)))

  const filtered = renewals.filter(r => {
    const matchUser = userFilter === 'all' || r.assigned_user === userFilter
    const matchRisk = riskFilter === 'all' || r.risk === riskFilter
    return matchUser && matchRisk
  })

  const bucketData = BUCKETS.map(b => ({
    ...b,
    cards: filtered.filter(r => {
      const d = calcDday(r.expires_at)
      return d >= b.from && d <= b.to
    }),
  }))

  const totalAmount = filtered.reduce((s, r) => s + r.final_amount, 0)

  return (
    <div className="flex flex-col h-full p-6 gap-4 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-dk-text flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-dk-blue" /> 갱신 관리
          </h1>
          <p className="text-sm text-dk-dim mt-0.5">
            진행 중 {filtered.length}건 · 예상 ARR {formatAmount(totalAmount)}
          </p>
        </div>
      </div>

      {totalCount > renewals.length && (
        <div className="bg-amber-500/10 border border-[#7a5000] text-[#E3B341] text-xs rounded-lg px-4 py-2.5 shrink-0">
          전체 {totalCount}건 중 상위 100건만 표시됩니다. 나머지 {totalCount - renewals.length}건은 필터를 좁혀 확인하세요.
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="flex gap-1.5">
          {(['all', 'high', 'medium', 'low'] as const).map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                riskFilter === r ? 'bg-dk-text text-dk-bg border-dk-text' : 'text-dk-muted border-dk-border bg-dk-surface hover:border-dk-border2')}>
              {r === 'all' ? '위험도 전체' : r === 'high' ? '⚠ 위험' : r === 'medium' ? '△ 주의' : '✓ 안전'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setUserFilter('all')}
            className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              userFilter === 'all' ? 'bg-[#1f6feb] text-white border-[#1f6feb]' : 'text-dk-muted border-dk-border bg-dk-surface')}>
            전체
          </button>
          {users.map(u => (
            <button key={u} onClick={() => setUserFilter(u)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                userFilter === u ? 'bg-[#1f6feb] text-white border-[#1f6feb]' : 'text-dk-muted border-dk-border bg-dk-surface')}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto pb-2">
        {bucketData.map(bucket => (
          <div key={bucket.key} className="shrink-0 w-[210px] flex flex-col min-h-0">
            <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 shrink-0', bucket.color)}>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-bold',
                  bucket.key === 'D-7'  ? 'text-[#FF7B72]' :
                  bucket.key === 'D-14' ? 'text-[#E3B341]' :
                  bucket.key === 'D-30' ? 'text-[#E3B341]' : 'text-dk-muted'
                )}>
                  {bucket.label}
                </span>
                <span className="text-xs text-dk-dim">({bucket.cards.length}건)</span>
              </div>
              {bucket.cards.length > 0 && (
                <span className="text-[10px] text-dk-dim">
                  {formatAmount(bucket.cards.reduce((s, c) => s + c.final_amount, 0)).replace('원', '')}
                </span>
              )}
            </div>
            <div className={cn('flex-1 min-h-0 overflow-y-auto p-2 space-y-2 rounded-b-xl border', bucket.color)}>
              {bucket.cards.map(r => <RenewalKanbanCard key={r.id} renewal={r} />)}
              {bucket.cards.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-dk-dim">없음</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
