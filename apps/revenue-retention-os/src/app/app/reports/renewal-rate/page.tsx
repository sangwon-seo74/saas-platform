'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react'
import { cn, formatAmount } from '@/lib/utils'

type MonthlyRow = {
  month: string
  renewed: number; upsell: number; downgrade: number; lost: number
  won: number; total: number; rate: number
  won_amount: number; upsell_amount: number; downgrade_amount: number
}
type ChurnReason = { reason: string; count: number; pct: number }

const RESULT_CFG = {
  renewed:   { label: '재계약',  color: 'bg-[#3FB950]', text: 'text-[#3FB950]' },
  upsell:    { label: '업셀',    color: 'bg-[#58A6FF]', text: 'text-[#58A6FF]' },
  downgrade: { label: '다운셀',  color: 'bg-[#E3B341]', text: 'text-[#E3B341]' },
  lost:      { label: '이탈',    color: 'bg-[#FF7B72]/70', text: 'text-[#FF7B72]' },
}

function StackedBar({ row }: { row: MonthlyRow }) {
  const total = row.total || 1
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5">
      <div className="w-full flex flex-col-reverse justify-start gap-px" style={{ height: 72 }}>
        <div className="w-full bg-[#FF7B72]/70 rounded-sm" style={{ height: `${row.lost / total * 72}px` }} />
        <div className="w-full bg-[#E3B341]"              style={{ height: `${row.downgrade / total * 72}px` }} />
        <div className="w-full bg-[#58A6FF]"              style={{ height: `${row.upsell / total * 72}px` }} />
        <div className="w-full bg-[#3FB950] rounded-sm"   style={{ height: `${row.renewed / total * 72}px` }} />
      </div>
      <span className="text-[10px] text-dk-dim font-mono mt-0.5">
        {row.month.slice(2).replace('-', '.')}
      </span>
    </div>
  )
}

export default function RenewalRatePage() {
  const currentYear = new Date().getFullYear()
  const [loading, setLoading]           = useState(true)
  const [years, setYears]               = useState<number[]>([])
  const [monthly, setMonthly]           = useState<MonthlyRow[]>([])
  const [churnReasons, setChurnReasons] = useState<ChurnReason[]>([])
  const [year, setYear]                 = useState(currentYear)

  function loadData(y: number) {
    setYear(y)
    setLoading(true)
    fetch(`/api/reports/renewal-rate?year=${y}`)
      .then(r => r.json())
      .then(json => {
        setMonthly(json.data?.monthly ?? [])
        setChurnReasons(json.data?.churn_reasons ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/reports/years')
      .then(r => r.json())
      .then(async json => {
        if (cancelled) return
        const ys: number[] = json.data?.years ?? []
        setYears(ys)
        const targetYear = ys[ys.length - 1] ?? currentYear
        setYear(targetYear)
        const res = await fetch(`/api/reports/renewal-rate?year=${targetYear}`)
        const data = await res.json()
        if (cancelled) return
        setMonthly(data.data?.monthly ?? [])
        setChurnReasons(data.data?.churn_reasons ?? [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentYear])

  const hasData = !loading && monthly.length > 0

  const latest     = hasData ? monthly[monthly.length - 1] : null
  const prev       = hasData ? (monthly[monthly.length - 2] ?? monthly[monthly.length - 1]) : null
  const rateDelta  = latest && prev ? (latest.rate - prev.rate).toFixed(1) : '0'
  const isUp       = latest && prev ? latest.rate >= prev.rate : true

  const avgRate        = hasData ? Math.round(monthly.reduce((s, d) => s + d.rate, 0) / monthly.length * 10) / 10 : 0
  const totalRenewed   = monthly.reduce((s, d) => s + d.won, 0)
  const totalLost      = monthly.reduce((s, d) => s + d.lost, 0)
  const totalUpsell    = monthly.reduce((s, d) => s + d.upsell, 0)
  const totalDowngrade = monthly.reduce((s, d) => s + d.downgrade, 0)
  const totalAmount    = monthly.reduce((s, d) => s + d.won_amount, 0)
  const totalUpsellAmt = monthly.reduce((s, d) => s + d.upsell_amount, 0)

  return (
    <div className="space-y-5 p-6">
      {/* 헤더 — 항상 표시 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">갱신율 분석</h1>
          <p className="text-sm text-dk-muted mt-0.5">{year}년 갱신 현황</p>
        </div>
        <div className="flex bg-dk-surface2 rounded-lg p-0.5 border border-dk-border">
          {(years.length > 0 ? years : [new Date().getFullYear()]).map(y => (
            <button key={y} onClick={() => loadData(y)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                year === y ? 'bg-dk-surface text-dk-text shadow-sm border border-dk-border' : 'text-dk-muted hover:text-dk-text')}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
        </div>
      )}

      {!loading && monthly.length === 0 && (
        <div className="text-center py-16 text-sm text-dk-dim">해당 연도에 완료된 갱신 데이터가 없습니다</div>
      )}

      {hasData && (<>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">최근 월 갱신율</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold font-mono text-dk-text">{latest!.rate.toFixed(1)}%</span>
            <span className={cn('text-sm font-mono mb-0.5 flex items-center gap-0.5', isUp ? 'text-[#3FB950]' : 'text-[#FF7B72]')}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}{rateDelta}%
            </span>
          </div>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">평균 갱신율</p>
          <span className="text-2xl font-bold font-mono text-dk-blue">{avgRate}%</span>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">갱신 / 이탈</p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold font-mono text-[#3FB950]">{totalRenewed}</span>
            <span className="text-dk-dim">/</span>
            <span className="text-2xl font-bold font-mono text-[#FF7B72]">{totalLost}</span>
          </div>
          <p className="text-xs text-dk-dim mt-0.5">업셀 {totalUpsell} · 다운셀 {totalDowngrade}</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">갱신 매출 합계</p>
          <span className="text-xl font-bold font-mono text-dk-text">
            {(totalAmount / 100_000_000).toFixed(1)}억
          </span>
          {totalUpsellAmt > 0 && (
            <p className="text-xs text-[#58A6FF] mt-0.5">업셀 +{formatAmount(totalUpsellAmt)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 월별 차트 + 테이블 */}
        <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-dk-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-dk-muted" /> 월별 갱신 현황
          </h3>
          <div className="flex items-end gap-1">
            {monthly.map(d => <StackedBar key={d.month} row={d} />)}
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {Object.entries(RESULT_CFG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={cn('w-2.5 h-2.5 rounded-sm', v.color)} />
                <span className="text-xs text-dk-muted">{v.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] text-dk-dim font-medium px-1">
              <span className="w-10">월</span>
              <span className="flex-1">갱신율</span>
              <span className="w-8 text-right text-[#3FB950]">재계약</span>
              <span className="w-8 text-right text-[#58A6FF]">업셀</span>
              <span className="w-8 text-right text-[#E3B341]">다운셀</span>
              <span className="w-8 text-right text-[#FF7B72]">이탈</span>
            </div>
            {monthly.slice().reverse().map(d => (
              <div key={d.month} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-dk-dim w-10">
                  {d.month.slice(2).replace('-', '.')}
                </span>
                <div className="flex-1 h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
                  <div className="h-full bg-dk-blue rounded-full" style={{ width: `${d.rate}%` }} />
                </div>
                <span className="font-mono text-xs font-semibold text-dk-text w-12 text-right">
                  {d.rate.toFixed(1)}%
                </span>
                <span className="text-xs text-[#3FB950] w-8 text-right">{d.renewed}</span>
                <span className="text-xs text-[#58A6FF] w-8 text-right">{d.upsell}</span>
                <span className="text-xs text-[#E3B341] w-8 text-right">{d.downgrade}</span>
                <span className="text-xs text-[#FF7B72] w-8 text-right">{d.lost}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* 결과 유형 분포 */}
          <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-dk-text mb-4">결과 유형 분포</h3>
            {(() => {
              const total = totalRenewed + totalLost
              const items = [
                { label: '재계약',  count: monthly.reduce((s, d) => s + d.renewed, 0),  color: 'bg-[#3FB950]', text: 'text-[#3FB950]' },
                { label: '업셀',    count: totalUpsell,    color: 'bg-[#58A6FF]', text: 'text-[#58A6FF]' },
                { label: '다운셀',  count: totalDowngrade, color: 'bg-[#E3B341]', text: 'text-[#E3B341]' },
                { label: '이탈',    count: totalLost,      color: 'bg-[#FF7B72]/70', text: 'text-[#FF7B72]' },
              ]
              return (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-dk-muted">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-dk-dim">{item.count}건</span>
                          <span className={cn('text-sm font-mono font-semibold', item.text)}>
                            {total > 0 ? (item.count / total * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', item.color)}
                          style={{ width: `${total > 0 ? item.count / total * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* 이탈 사유 */}
          {churnReasons.length > 0 && (
            <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-dk-text mb-4">이탈 사유 분석</h3>
              <div className="space-y-3">
                {churnReasons.map(r => (
                  <div key={r.reason}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-dk-muted">{r.reason}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dk-dim">{r.count}건</span>
                        <span className="text-sm font-mono font-semibold text-dk-text">{r.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF7B72]/70 rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>)}
    </div>
  )
}
