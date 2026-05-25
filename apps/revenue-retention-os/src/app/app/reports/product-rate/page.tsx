'use client'

import { useState, useEffect } from 'react'
import { Package, Loader2 } from 'lucide-react'
import { cn, formatAmount } from '@/lib/utils'

type ProductRow = {
  product_id: string; product_name: string
  won: number; lost: number; total: number; rate: number
  renewed: number; upsell: number; downgrade: number
  won_amount: number
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

export default function ProductRatePage() {
  const currentYear = new Date().getFullYear()
  const [loading, setLoading]   = useState(true)
  const [years, setYears]       = useState<number[]>([])
  const [year, setYear]         = useState(currentYear)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [sort, setSort]         = useState<'won_amount' | 'rate' | 'total'>('won_amount')

  function loadData(y: number) {
    setYear(y)
    setLoading(true)
    fetch(`/api/reports/product-rate?year=${y}`)
      .then(r => r.json())
      .then(json => setProducts(json.data?.products ?? []))
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
        const res = await fetch(`/api/reports/product-rate?year=${targetYear}`)
        const data = await res.json()
        if (cancelled) return
        setProducts(data.data?.products ?? [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentYear])

  const sorted = [...products].sort((a, b) => b[sort] - a[sort])
  const maxAmount = Math.max(...products.map(p => p.won_amount), 1)

  return (
    <div className="space-y-5 p-6">
      {/* 헤더 — 항상 표시 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">상품별 갱신율</h1>
          <p className="text-sm text-dk-muted mt-0.5">{year}년 상품 단위 갱신 성과</p>
        </div>
        <YearSelector years={years} year={year} onChange={loadData} />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
        </div>
      )}

      {/* 정렬 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dk-muted">정렬:</span>
        {[
          { key: 'won_amount', label: '갱신 매출' },
          { key: 'rate',       label: '갱신율' },
          { key: 'total',      label: '건수' },
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

      {!loading && sorted.length === 0 && (
        <div className="bg-dk-surface border border-dk-border rounded-xl py-16 text-center">
          <p className="text-sm text-dk-dim">해당 연도에 완료된 갱신 데이터가 없습니다</p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((p, idx) => (
            <div key={p.product_id} className="bg-dk-surface border border-dk-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                {/* 순위 + 이름 */}
                <div className="shrink-0 flex items-center gap-2 w-8">
                  <span className="text-sm font-bold text-dk-dim font-mono">{idx + 1}</span>
                </div>
                <div className="flex items-center gap-2 w-40 shrink-0">
                  <Package className="w-3.5 h-3.5 text-dk-muted shrink-0" />
                  <p className="text-sm font-semibold text-dk-text truncate">{p.product_name}</p>
                </div>

                {/* 갱신율 + 바 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-bold font-mono',
                        p.rate >= 80 ? 'text-[#3FB950]' :
                        p.rate >= 50 ? 'text-[#E3B341]' : 'text-[#FF7B72]')}>
                        {p.rate}%
                      </span>
                      <span className="text-xs text-dk-dim">{p.won}/{p.total}건</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-dk-text shrink-0">
                      {formatAmount(p.won_amount)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full',
                      p.rate >= 80 ? 'bg-[#3FB950]' :
                      p.rate >= 50 ? 'bg-[#E3B341]' : 'bg-[#FF7B72]')}
                      style={{ width: `${p.rate}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px]">
                    <span className="text-[#3FB950]">재계약 {p.renewed}</span>
                    {p.upsell > 0    && <span className="text-[#58A6FF]">업셀 {p.upsell}</span>}
                    {p.downgrade > 0 && <span className="text-[#E3B341]">다운셀 {p.downgrade}</span>}
                    {p.lost > 0      && <span className="text-[#FF7B72]">이탈 {p.lost}</span>}
                  </div>
                </div>

                {/* 매출 바 */}
                <div className="w-28 shrink-0">
                  <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-dk-blue rounded-full"
                      style={{ width: `${p.won_amount / maxAmount * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
