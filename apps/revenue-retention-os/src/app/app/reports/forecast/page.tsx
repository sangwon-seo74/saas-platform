'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react'
import { cn, formatAmount, formatDate, calcDday } from '@/lib/utils'

type BucketItem = {
  id: string; company: string; amount: number
  risk_level: string | null; assigned: string; expires_at: string
}
type Bucket = {
  key: string; label: string; count: number
  total_amount: number; high_risk_count: number
  items: BucketItem[]
}

const RISK_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  high:   { label: '위험', cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]',   icon: AlertCircle },
  medium: { label: '주의', cls: 'bg-[#3d2b0d] text-[#E3B341] border-[#7a5000]',   icon: AlertTriangle },
  low:    { label: '안전', cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]',   icon: CheckCircle2 },
}

const BUCKET_COLOR: Record<string, { bar: string; text: string; bg: string }> = {
  D7:  { bar: 'bg-[#FF7B72]', text: 'text-[#FF7B72]', bg: 'bg-[#3d1a1a]/50' },
  D14: { bar: 'bg-[#E3B341]', text: 'text-[#E3B341]', bg: 'bg-[#3d2b0d]/50' },
  D30: { bar: 'bg-[#58A6FF]', text: 'text-[#58A6FF]', bg: 'bg-[#1c2d4a]/50' },
  D60: { bar: 'bg-dk-blue',   text: 'text-dk-blue',   bg: 'bg-dk-surface2' },
  D90: { bar: 'bg-dk-muted',  text: 'text-dk-muted',  bg: 'bg-dk-surface2' },
}

export default function ForecastPage() {
  const [loading, setLoading]   = useState(true)
  const [pipeline, setPipeline] = useState<Bucket[]>([])
  const [asOf, setAsOf]         = useState('')
  const [expanded, setExpanded] = useState<string | null>('D7')

  useEffect(() => {
    fetch('/api/reports/forecast')
      .then(r => r.json())
      .then(json => {
        setPipeline(json.data?.pipeline ?? [])
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

  const totalAmount  = pipeline.reduce((s, b) => s + b.total_amount, 0)
  const totalCount   = pipeline.reduce((s, b) => s + b.count, 0)
  const urgentAmount = pipeline.filter(b => b.key === 'D7' || b.key === 'D14')
                                .reduce((s, b) => s + b.total_amount, 0)
  const highRiskAmt  = pipeline.reduce((s, b) => {
    const highItems = b.items.filter(i => i.risk_level === 'high')
    return s + highItems.reduce((ss, i) => ss + i.amount, 0)
  }, 0)

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">매출 예측</h1>
          <p className="text-sm text-dk-muted mt-0.5">
            갱신 예정 계약 파이프라인{asOf ? ` · 기준일 ${formatDate(asOf)}` : ''}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">90일 내 갱신 예정</p>
          <p className="text-2xl font-bold font-mono text-dk-text">
            {(totalAmount / 100_000_000).toFixed(1)}억
          </p>
          <p className="text-xs text-dk-dim mt-1">{totalCount}건</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">D-14 이내 긴급</p>
          <p className="text-2xl font-bold font-mono text-[#E3B341]">
            {(urgentAmount / 100_000_000).toFixed(1)}억
          </p>
          <p className="text-xs text-[#E3B341]/70 mt-1">즉시 관리 필요</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">고위험 갱신 금액</p>
          <p className="text-2xl font-bold font-mono text-[#FF7B72]">
            {(highRiskAmt / 100_000_000).toFixed(1)}억
          </p>
          <p className="text-xs text-dk-dim mt-1">위험도 high 기준</p>
        </div>
      </div>

      {/* 파이프라인 막대 */}
      <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-dk-text mb-4">만료 구간별 갱신 파이프라인</h3>
        {totalAmount === 0 ? (
          <p className="text-sm text-dk-dim text-center py-4">90일 내 갱신 예정 건이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {pipeline.map(b => {
              const cfg = BUCKET_COLOR[b.key]
              return (
                <div key={b.key} className="flex items-center gap-3">
                  <div className="w-20 shrink-0">
                    <p className={cn('text-xs font-semibold', cfg.text)}>{b.label}</p>
                    <p className="text-[10px] text-dk-dim">{b.count}건</p>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-7 bg-dk-surface2 rounded-lg overflow-hidden">
                      <div className={cn('h-full rounded-lg transition-all', cfg.bar)}
                        style={{ width: totalAmount > 0 ? `${b.total_amount / totalAmount * 100}%` : '0%' }} />
                    </div>
                    {b.total_amount > 0 && (
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-mono font-semibold text-white drop-shadow">
                          {(b.total_amount / 100_000_000).toFixed(1)}억
                        </span>
                      </div>
                    )}
                  </div>
                  {b.high_risk_count > 0 && (
                    <span className="text-xs text-[#FF7B72] shrink-0">위험 {b.high_risk_count}건</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 구간별 상세 목록 */}
      <div className="space-y-3">
        {pipeline.filter(b => b.count > 0).map(b => {
          const cfg = BUCKET_COLOR[b.key]
          const isOpen = expanded === b.key
          return (
            <div key={b.key} className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : b.key)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-dk-surface2/50 transition-colors"
              >
                <span className={cn('text-sm font-semibold', cfg.text)}>{b.label}</span>
                <span className="text-xs text-dk-dim">{b.count}건</span>
                <span className="text-sm font-mono font-bold text-dk-text ml-auto">
                  {formatAmount(b.total_amount)}
                </span>
                {b.high_risk_count > 0 && (
                  <span className="text-xs text-[#FF7B72] shrink-0">{b.high_risk_count}건 위험</span>
                )}
                <ChevronRight className={cn('w-4 h-4 text-dk-dim transition-transform shrink-0', isOpen && 'rotate-90')} />
              </button>

              {isOpen && b.items.length > 0 && (
                <div className="border-t border-dk-border divide-y divide-dk-border">
                  {b.items.map(item => {
                    const risk = RISK_CFG[item.risk_level ?? 'low']
                    const RiskIcon = risk.icon
                    const dday = calcDday(item.expires_at)
                    return (
                      <Link key={item.id} href={`/app/renewals/${item.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-dk-surface2/50 transition-colors">
                        <span className={cn(
                          'text-xs font-bold font-mono px-2 py-0.5 rounded shrink-0',
                          dday <= 7 ? 'bg-[#3d1a1a] text-[#FF7B72]' : 'bg-[#3d2b0d] text-[#E3B341]'
                        )}>
                          D-{dday}
                        </span>
                        <p className="flex-1 text-sm font-medium text-dk-text truncate">{item.company}</p>
                        <span className={cn('inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0', risk.cls)}>
                          <RiskIcon className="w-2.5 h-2.5" /> {risk.label}
                        </span>
                        <span className="text-sm font-mono font-bold text-dk-text shrink-0">{formatAmount(item.amount)}</span>
                        <span className="text-xs text-dk-dim shrink-0">{item.assigned}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
