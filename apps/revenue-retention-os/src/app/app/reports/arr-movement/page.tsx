'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type MonthRow = {
  month: string
  base_arr: number
  renewed_arr: number
  upsell_gain: number
  downgrade_loss: number
  churn_loss: number
  net_change: number
  nrr: number | null
}
type Summary = {
  total_base: number; total_renewed: number; total_nrr: number | null
  total_upsell: number; total_downgrade: number; total_churn: number
}

function YearSelector({ years, year, onChange }: { years: number[]; year: number; onChange: (y: number) => void }) {
  const list = years.length > 0 ? years : [new Date().getFullYear()]
  return (
    <div className="flex bg-dk-surface2 rounded-lg p-0.5 border border-dk-border">
      {list.map(y => (
        <button key={y} onClick={() => onChange(y)}
          className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            year === y ? 'bg-dk-surface text-dk-text shadow-sm border border-dk-border' : 'text-dk-muted hover:text-dk-text')}>
          {y}
        </button>
      ))}
    </div>
  )
}

export default function ArrMovementPage() {
  const currentYear = new Date().getFullYear()
  const [loading, setLoading] = useState(true)
  const [years, setYears]     = useState<number[]>([])
  const [year, setYear]       = useState(currentYear)
  const [monthly, setMonthly] = useState<MonthRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  function loadData(y: number) {
    setYear(y)
    setLoading(true)
    fetch(`/api/reports/arr-movement?year=${y}`)
      .then(r => r.json())
      .then(json => {
        setMonthly(json.data?.monthly ?? [])
        setSummary(json.data?.summary ?? null)
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
        const res = await fetch(`/api/reports/arr-movement?year=${targetYear}`)
        const data = await res.json()
        if (cancelled) return
        setMonthly(data.data?.monthly ?? [])
        setSummary(data.data?.summary ?? null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentYear])

  const maxBase = Math.max(...monthly.map(m => m.base_arr), 1)

  return (
    <div className="space-y-5 p-6">
      {/* 헤더 — 항상 표시 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">ARR 순변동</h1>
          <p className="text-sm text-dk-muted mt-0.5">{year}년 기존 ARR 대비 갱신 ARR 변동 분석</p>
        </div>
        <YearSelector years={years} year={year} onChange={loadData} />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
        </div>
      )}

      {/* KPI */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
            <p className="text-xs text-dk-muted mb-1">순수익 유지율 (NRR)</p>
            <div className="flex items-end gap-2">
              <span className={cn('text-2xl font-bold font-mono',
                summary.total_nrr === null ? 'text-dk-dim' :
                summary.total_nrr >= 100 ? 'text-[#3FB950]' :
                summary.total_nrr >= 80  ? 'text-[#E3B341]' : 'text-[#FF7B72]')}>
                {summary.total_nrr !== null ? `${summary.total_nrr}%` : '—'}
              </span>
              {summary.total_nrr !== null && (
                summary.total_nrr >= 100
                  ? <TrendingUp className="w-4 h-4 text-[#3FB950] mb-0.5" />
                  : <TrendingDown className="w-4 h-4 text-[#FF7B72] mb-0.5" />
              )}
            </div>
            <p className="text-[10px] text-dk-dim mt-1">갱신 ARR / 기존 ARR</p>
          </div>
          <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
            <p className="text-xs text-dk-muted mb-1">기존 ARR</p>
            <span className="text-xl font-bold font-mono text-dk-text">
              {(summary.total_base / 100_000_000).toFixed(1)}억
            </span>
            <p className="text-[10px] text-dk-dim mt-1">만료 계약 합계</p>
          </div>
          <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
            <p className="text-xs text-dk-muted mb-1">업셀 증가</p>
            <span className="text-xl font-bold font-mono text-[#58A6FF]">
              +{(summary.total_upsell / 100_000_000).toFixed(1)}억
            </span>
            <p className="text-[10px] text-dk-dim mt-1">기존 대비 증가분</p>
          </div>
          <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
            <p className="text-xs text-dk-muted mb-1">손실 (다운셀 + 이탈)</p>
            <span className="text-xl font-bold font-mono text-[#FF7B72]">
              -{((summary.total_downgrade + summary.total_churn) / 100_000_000).toFixed(1)}억
            </span>
            <p className="text-[10px] text-dk-dim mt-1">
              다운셀 {(summary.total_downgrade / 1_000_000).toFixed(0)}만 · 이탈 {(summary.total_churn / 1_000_000).toFixed(0)}만
            </p>
          </div>
        </div>
      )}

      {!loading && monthly.length === 0 && (
        <div className="bg-dk-surface border border-dk-border rounded-xl py-16 text-center">
          <p className="text-sm text-dk-dim">해당 연도에 완료된 갱신 데이터가 없습니다</p>
        </div>
      )}

      {!loading && monthly.length > 0 && (
<>
          {/* 월별 ARR 변동 차트 */}
          <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-dk-text mb-5">월별 ARR 변동 구성</h3>
            <div className="space-y-3">
              {monthly.map(m => {
                const mo = m.month.slice(5)
                const baseW    = m.base_arr / maxBase * 100
                const renewW   = m.base_arr > 0 ? (m.renewed_arr - m.upsell_gain) / maxBase * 100 : 0
                const upsellW  = m.upsell_gain   / maxBase * 100
                const downW    = m.downgrade_loss / maxBase * 100
                const churnW   = m.churn_loss     / maxBase * 100
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-dk-dim w-8 shrink-0">{mo}월</span>
                    <div className="flex-1 flex gap-0.5 h-6 items-center">
                      <div className="bg-[#3FB950] rounded-l-sm h-full" style={{ width: `${renewW}%`, minWidth: renewW > 0 ? 2 : 0 }} title="재계약" />
                      <div className="bg-[#58A6FF] h-full"              style={{ width: `${upsellW}%`, minWidth: upsellW > 0 ? 2 : 0 }} title="업셀 증가" />
                      <div className="bg-[#E3B341] h-full"              style={{ width: `${downW}%`,   minWidth: downW > 0 ? 2 : 0 }} title="다운셀 손실" />
                      <div className="bg-[#FF7B72]/70 rounded-r-sm h-full" style={{ width: `${churnW}%`, minWidth: churnW > 0 ? 2 : 0 }} title="이탈 손실" />
                      <div className="bg-dk-surface2 flex-1 h-full rounded-r-sm" style={{ display: (renewW + upsellW + downW + churnW) >= baseW ? 'none' : 'block' }} />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={cn('text-xs font-mono font-semibold w-14 text-right',
                        m.nrr === null ? 'text-dk-dim' : m.nrr >= 100 ? 'text-[#3FB950]' : 'text-[#FF7B72]')}>
                        {m.nrr !== null ? `${m.nrr}%` : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-4 flex-wrap">
              {[
                { color: 'bg-[#3FB950]',    label: '재계약' },
                { color: 'bg-[#58A6FF]',    label: '업셀 증가' },
                { color: 'bg-[#E3B341]',    label: '다운셀 손실' },
                { color: 'bg-[#FF7B72]/70', label: '이탈 손실' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={cn('w-2.5 h-2.5 rounded-sm', l.color)} />
                  <span className="text-xs text-dk-muted">{l.label}</span>
                </div>
              ))}
              <span className="text-xs text-dk-dim ml-auto">우측 % = NRR</span>
            </div>
          </div>

          {/* 월별 상세 테이블 */}
          <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-dk-text mb-4">월별 상세</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-dk-dim border-b border-dk-border">
                    <th className="text-left pb-2 font-medium">월</th>
                    <th className="text-right pb-2 font-medium">기존 ARR</th>
                    <th className="text-right pb-2 font-medium text-[#3FB950]">갱신 ARR</th>
                    <th className="text-right pb-2 font-medium text-[#58A6FF]">업셀 +</th>
                    <th className="text-right pb-2 font-medium text-[#E3B341]">다운셀 -</th>
                    <th className="text-right pb-2 font-medium text-[#FF7B72]">이탈 -</th>
                    <th className="text-right pb-2 font-medium">순변동</th>
                    <th className="text-right pb-2 font-medium">NRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dk-border">
                  {monthly.slice().reverse().map(m => (
                    <tr key={m.month} className="hover:bg-dk-surface2/50">
                      <td className="py-2 font-mono text-dk-dim">{m.month.slice(2).replace('-', '.')}</td>
                      <td className="py-2 text-right font-mono text-dk-text">{(m.base_arr / 1_000_000).toFixed(0)}만</td>
                      <td className="py-2 text-right font-mono text-[#3FB950]">{(m.renewed_arr / 1_000_000).toFixed(0)}만</td>
                      <td className="py-2 text-right font-mono text-[#58A6FF]">
                        {m.upsell_gain > 0 ? `+${(m.upsell_gain / 1_000_000).toFixed(0)}만` : '—'}
                      </td>
                      <td className="py-2 text-right font-mono text-[#E3B341]">
                        {m.downgrade_loss > 0 ? `-${(m.downgrade_loss / 1_000_000).toFixed(0)}만` : '—'}
                      </td>
                      <td className="py-2 text-right font-mono text-[#FF7B72]">
                        {m.churn_loss > 0 ? `-${(m.churn_loss / 1_000_000).toFixed(0)}만` : '—'}
                      </td>
                      <td className={cn('py-2 text-right font-mono font-semibold',
                        m.net_change >= 0 ? 'text-[#3FB950]' : 'text-[#FF7B72]')}>
                        {m.net_change >= 0 ? '+' : ''}{(m.net_change / 1_000_000).toFixed(0)}만
                      </td>
                      <td className={cn('py-2 text-right font-mono font-bold',
                        m.nrr === null ? 'text-dk-dim' : m.nrr >= 100 ? 'text-[#3FB950]' : m.nrr >= 80 ? 'text-[#E3B341]' : 'text-[#FF7B72]')}>
                        {m.nrr !== null ? `${m.nrr}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
