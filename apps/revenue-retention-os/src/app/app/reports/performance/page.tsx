'use client'

import { useState, useEffect } from 'react'
import { Phone, TrendingUp, Users, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn, formatAmount } from '@/lib/utils'

type UserPerf = {
  id: string; name: string
  won_count: number; lost_count: number; total_count: number; renewal_rate: number | null
  renewed_count: number; upsell_count: number; downgrade_count: number
  won_amount: number; call_count: number; visit_count: number
}

function RankBadge({ rank }: { rank: number }) {
  const cls = rank === 1 ? 'bg-[#E3B341] text-dk-bg' :
              rank === 2 ? 'bg-dk-muted text-dk-bg' :
              rank === 3 ? 'bg-[#BC6C25] text-white' :
              'bg-dk-surface2 text-dk-dim border border-dk-border'
  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold', cls)}>
      {rank}
    </span>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden w-full">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${max > 0 ? Math.min(100, value / max * 100) : 0}%` }} />
    </div>
  )
}

function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function PerformancePage() {
  const thisMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth]       = useState(thisMonth)
  const [sort, setSort]         = useState<'won_amount' | 'renewal_rate' | 'call_count'>('won_amount')
  const [loading, setLoading]   = useState(true)
  const [data, setData]         = useState<UserPerf[]>([])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/performance?month=${month}`)
      .then(r => r.json())
      .then(json => setData(json.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [month])

  const sorted = [...data].sort((a, b) => {
    if (sort === 'renewal_rate') return (b.renewal_rate ?? -1) - (a.renewal_rate ?? -1)
    return b[sort] - a[sort]
  })

  const maxAmount   = Math.max(...data.map(p => p.won_amount), 1)
  const maxCalls    = Math.max(...data.map(p => p.call_count), 1)

  const teamTotal = {
    won:    data.reduce((s, p) => s + p.won_count, 0),
    amount: data.reduce((s, p) => s + p.won_amount, 0),
    calls:  data.reduce((s, p) => s + p.call_count, 0),
    upsell: data.reduce((s, p) => s + p.upsell_count, 0),
  }
  const avgRate = data.filter(p => p.renewal_rate !== null).length > 0
    ? Math.round(data.filter(p => p.renewal_rate !== null)
        .reduce((s, p) => s + (p.renewal_rate ?? 0), 0) / data.filter(p => p.renewal_rate !== null).length * 10) / 10
    : null

  const [yr, mo] = month.split('-').map(Number)
  const monthLabel = `${yr}년 ${mo}월`
  const canNext = month < thisMonth

  return (
    <div className="space-y-5 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">담당자별 실적</h1>
          <p className="text-sm text-dk-muted mt-0.5">{monthLabel} 현황</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-dk-border rounded-lg overflow-hidden bg-dk-surface">
            <button onClick={() => setMonth(prevMonth(month))}
              className="px-2.5 py-2 text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium text-dk-text min-w-[80px] text-center">{monthLabel}</span>
            <button onClick={() => setMonth(nextMonth(month))} disabled={!canNext}
              className={cn('px-2.5 py-2 transition-colors', canNext ? 'text-dk-muted hover:text-dk-text hover:bg-dk-surface2' : 'text-dk-dim cursor-default')}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 팀 합계 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '팀 평균 갱신율', value: avgRate !== null ? `${avgRate}%` : '—', icon: TrendingUp, cls: 'text-dk-blue' },
          { label: '갱신 건수',      value: `${teamTotal.won}건`,                     icon: Users,    cls: 'text-[#3FB950]' },
          { label: '갱신 매출',      value: `${(teamTotal.amount / 100_000_000).toFixed(1)}억`, icon: TrendingUp, cls: 'text-dk-text' },
          { label: '업셀 건수',      value: `${teamTotal.upsell}건`,                   icon: Phone,    cls: 'text-[#58A6FF]' },
        ].map(s => (
          <div key={s.label} className="bg-dk-surface border border-dk-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className="w-3.5 h-3.5 text-dk-muted" />
              <span className="text-xs text-dk-muted">{s.label}</span>
            </div>
            <span className={cn('text-2xl font-bold font-mono', s.cls)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dk-muted">정렬:</span>
        {[
          { key: 'won_amount',   label: '갱신 매출' },
          { key: 'renewal_rate', label: '갱신율' },
          { key: 'call_count',   label: '통화량' },
        ].map(s => (
          <button key={s.key} onClick={() => setSort(s.key as typeof sort)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
              sort === s.key
                ? 'bg-dk-blue/20 text-dk-blue border-[#2d4a7a]'
                : 'text-dk-muted border-dk-border hover:bg-dk-surface2')}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-dk-surface border border-dk-border rounded-xl py-16 text-center">
          <p className="text-sm text-dk-dim">해당 월에 활동 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((person, idx) => (
            <div key={person.id} className="bg-dk-surface border border-dk-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                {/* 순위 + 이름 */}
                <div className="shrink-0 flex items-center gap-2 w-28">
                  <RankBadge rank={idx + 1} />
                  <div>
                    <p className="text-sm font-semibold text-dk-text">{person.name}</p>
                    {person.renewal_rate !== null ? (
                      <p className={cn('text-xs font-mono',
                        person.renewal_rate >= 80 ? 'text-[#3FB950]' :
                        person.renewal_rate >= 50 ? 'text-[#E3B341]' : 'text-[#FF7B72]')}>
                        {person.renewal_rate}%
                      </p>
                    ) : (
                      <p className="text-xs text-dk-dim">갱신 없음</p>
                    )}
                  </div>
                </div>

                {/* 지표 */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {/* 갱신 결과 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-dk-muted">갱신 성과</span>
                      <span className="text-sm font-mono font-bold text-dk-text">
                        {person.won_count}/{person.total_count}
                      </span>
                    </div>
                    <MiniBar value={person.won_count} max={Math.max(...data.map(p => p.total_count), 1)} color="bg-[#3FB950]" />
                    <div className="flex gap-2 mt-0.5 text-[10px]">
                      <span className="text-[#3FB950]">재계약 {person.renewed_count}</span>
                      <span className="text-[#58A6FF]">업셀 {person.upsell_count}</span>
                      {person.downgrade_count > 0 && <span className="text-[#E3B341]">다운셀 {person.downgrade_count}</span>}
                    </div>
                  </div>

                  {/* 갱신 매출 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-dk-muted">갱신 매출</span>
                      <span className="text-sm font-mono font-bold text-dk-text">
                        {(person.won_amount / 100_000_000).toFixed(1)}억
                      </span>
                    </div>
                    <MiniBar value={person.won_amount} max={maxAmount} color="bg-dk-blue" />
                    <p className="text-[10px] text-dk-dim mt-0.5">{formatAmount(person.won_amount)}</p>
                  </div>

                  {/* 활동량 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-dk-muted">통화 / 방문</span>
                      <span className="text-sm font-mono font-bold text-dk-text">
                        {person.call_count} / {person.visit_count}
                      </span>
                    </div>
                    <MiniBar value={person.call_count} max={maxCalls} color="bg-dk-purple" />
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-dk-dim">
                      <span className="flex items-center gap-0.5">
                        <Phone className="w-2.5 h-2.5" /> {person.call_count}건
                      </span>
                    </div>
                  </div>
                </div>

                {/* 이탈 */}
                {person.lost_count > 0 && (
                  <div className="shrink-0 text-center w-12">
                    <p className="text-sm font-bold font-mono text-[#FF7B72]">{person.lost_count}</p>
                    <p className="text-[10px] text-dk-dim">이탈</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
