'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn, formatAmount } from '@/lib/utils'

type MonthlyRow = {
  month: string
  renewed: number; upsell: number; downgrade: number; lost: number
  won: number; total: number; rate: number
  won_amount: number; upsell_amount: number; downgrade_amount: number
}
type ChurnReason = { reason: string; count: number; pct: number }

const C = { green: '#3FB950', blue: '#58A6FF', orange: '#E3B341', red: '#FF7B72', text: '#E6EDF3', dim: '#6E7681', surface2: '#1C2128', border: '#21262D' }

const RESULT_CFG = {
  renewed:   { label: '재계약',  color: 'bg-dk-green', text: 'text-dk-green' },
  upsell:    { label: '업셀',    color: 'bg-dk-blue', text: 'text-dk-blue' },
  downgrade: { label: '다운셀',  color: 'bg-dk-orange', text: 'text-dk-orange' },
  lost:      { label: '이탈',    color: 'bg-dk-red/70', text: 'text-dk-red' },
}

function RenewalChart({ monthly }: { monthly: MonthlyRow[] }) {
  const data = monthly.map(d => ({
    month: d.month.slice(2).replace('-', '.'),
    재계약: d.renewed, 업셀: d.upsell, 다운셀: d.downgrade, 이탈: d.lost,
    갱신율: d.rate,
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 4, right: 36, bottom: 0, left: -20 }}>
        <XAxis dataKey="month" tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="count" axisLine={false} tickLine={false} tick={{ fill: C.dim, fontSize: 10 }} allowDecimals={false} />
        <YAxis yAxisId="rate" orientation="right" axisLine={false} tickLine={false} tick={{ fill: C.dim, fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.text }}
          formatter={(value, name) => {
            const v = typeof value === 'number' ? value : 0
            return [name === '갱신율' ? `${v}%` : `${v}건`, String(name)] as [string, string]
          }}
        />
        <Bar yAxisId="count" dataKey="재계약" stackId="a" fill={C.green} />
        <Bar yAxisId="count" dataKey="업셀"   stackId="a" fill={C.blue} />
        <Bar yAxisId="count" dataKey="다운셀" stackId="a" fill={C.orange} />
        <Bar yAxisId="count" dataKey="이탈"   stackId="a" fill={C.red} radius={[2, 2, 0, 0]} />
        <Line yAxisId="rate" type="monotone" dataKey="갱신율" stroke={C.text} strokeWidth={1.5} dot={{ fill: C.text, r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
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
            <span className={cn('text-sm font-mono mb-0.5 flex items-center gap-0.5', isUp ? 'text-dk-green' : 'text-dk-red')}>
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
            <span className="text-2xl font-bold font-mono text-dk-green">{totalRenewed}</span>
            <span className="text-dk-dim">/</span>
            <span className="text-2xl font-bold font-mono text-dk-red">{totalLost}</span>
          </div>
          <p className="text-xs text-dk-dim mt-0.5">업셀 {totalUpsell} · 다운셀 {totalDowngrade}</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs text-dk-muted mb-1">갱신 매출 합계</p>
          <span className="text-xl font-bold font-mono text-dk-text">
            {(totalAmount / 100_000_000).toFixed(1)}억
          </span>
          {totalUpsellAmt > 0 && (
            <p className="text-xs text-dk-blue mt-0.5">업셀 +{formatAmount(totalUpsellAmt)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 월별 차트 + 테이블 */}
        <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-dk-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-dk-muted" /> 월별 갱신 현황
          </h3>
          <RenewalChart monthly={monthly} />
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
              <span className="w-8 text-right text-dk-green">재계약</span>
              <span className="w-8 text-right text-dk-blue">업셀</span>
              <span className="w-8 text-right text-dk-orange">다운셀</span>
              <span className="w-8 text-right text-dk-red">이탈</span>
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
                <span className="text-xs text-dk-green w-8 text-right">{d.renewed}</span>
                <span className="text-xs text-dk-blue w-8 text-right">{d.upsell}</span>
                <span className="text-xs text-dk-orange w-8 text-right">{d.downgrade}</span>
                <span className="text-xs text-dk-red w-8 text-right">{d.lost}</span>
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
                { label: '재계약',  count: monthly.reduce((s, d) => s + d.renewed, 0),  color: 'bg-dk-green', text: 'text-dk-green' },
                { label: '업셀',    count: totalUpsell,    color: 'bg-dk-blue', text: 'text-dk-blue' },
                { label: '다운셀',  count: totalDowngrade, color: 'bg-dk-orange', text: 'text-dk-orange' },
                { label: '이탈',    count: totalLost,      color: 'bg-dk-red/70', text: 'text-dk-red' },
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
                      <div className="h-full bg-dk-red/70 rounded-full" style={{ width: `${r.pct}%` }} />
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
