'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  FileText, Plus, Search, ChevronRight, Calendar,
  DollarSign, AlertCircle, CheckCircle2, Loader2, X,
} from 'lucide-react'
import { cn, formatAmount, formatDate, calcDday, getDdayClass } from '@/lib/utils'
import type { ContractStatus } from '@/types/domain'

type ContractRow = {
  id: string
  contract_no: string | null
  started_at: string
  expires_at: string
  amount: number
  discount_rate: number
  final_amount: number | null
  is_paid: boolean
  status: ContractStatus
  account_count: number
  company: { id: string; name: string } | null
  product: { id: string; name: string } | null
  assigned_user: { id: string; name: string } | null
}

type CompanyOption = { id: string; name: string }
type ProductOption = { id: string; name: string; unit_price: number | null }

const STATUS_CFG: Record<ContractStatus, { label: string; cls: string }> = {
  active:    { label: '계약중', cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]' },
  expired:   { label: '만료',   cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]' },
  cancelled: { label: '해지',   cls: 'bg-dk-surface2 text-dk-muted border-dk-border' },
  renewed:   { label: '갱신됨', cls: 'bg-[#1c2d4a] text-[#58A6FF] border-[#2d4a7a]' },
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

// ─── 고객사 검색 콤보박스 ─────────────────────────────────
function CompanyPicker({ companies, selectedId, onChange }: {
  companies: CompanyOption[]
  selectedId: string
  onChange: (id: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = query
    ? companies.filter(c => c.name.includes(query)).slice(0, 8)
    : companies.slice(0, 8)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={displayName || query}
        onChange={e => { setQuery(e.target.value); setDisplayName(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="고객사 검색..."
        className={INPUT_CLS}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-dk-surface2 border border-dk-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} type="button"
              onClick={() => { onChange(c.id, c.name); setDisplayName(c.name); setQuery(''); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-dk-surface transition-colors',
                c.id === selectedId ? 'text-dk-blue font-medium' : 'text-dk-text'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 계약 등록 모달 ───────────────────────────────────────
function NewContractModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (contract: ContractRow) => void
}) {
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [form, setForm] = useState({
    company_id: '', company_name: '', product_id: '',
    started_at: '', expires_at: '',
    amount: '', discount_rate: '0', account_count: '1',
    payment_method: '', memo: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/companies?limit=200').then(r => r.json())
      .then(j => setCompanies((j.data?.data ?? []) as CompanyOption[]))
      .catch(() => {})
    fetch('/api/settings/products?active=true&limit=100').then(r => r.json())
      .then(j => setProducts((j.data?.data ?? []) as ProductOption[]))
      .catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const rawAmount   = Number(form.amount) || 0
  const discountPct = Math.min(100, Math.max(0, Number(form.discount_rate) || 0))
  const finalAmount = Math.round(rawAmount * (1 - discountPct / 100))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_id) { setError('고객사를 선택해 주세요'); return }
    if (!form.started_at)  { setError('시작일을 입력해 주세요'); return }
    if (!form.expires_at)  { setError('만료일을 입력해 주세요'); return }
    if (!form.amount)      { setError('계약금액을 입력해 주세요'); return }

    setSubmitting(true); setError(null)
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id:     form.company_id,
        product_id:     form.product_id || null,
        started_at:     form.started_at,
        expires_at:     form.expires_at,
        amount:         rawAmount,
        discount_rate:  discountPct,
        account_count:  Number(form.account_count) || 1,
        payment_method: form.payment_method || null,
        memo:           form.memo || null,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '등록 중 오류가 발생했습니다')
      setSubmitting(false)
      return
    }
    const product = products.find(p => p.id === form.product_id)
    onSuccess({
      ...json.data,
      company:       { id: form.company_id, name: form.company_name },
      product:       product ? { id: product.id, name: product.name } : null,
      assigned_user: null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">계약 등록</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">고객사 <span className="text-[#FF7B72]">*</span></label>
            <CompanyPicker
              companies={companies}
              selectedId={form.company_id}
              onChange={(id, name) => setForm(p => ({ ...p, company_id: id, company_name: name }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">제품</label>
            <select value={form.product_id} onChange={e => set('product_id', e.target.value)} className={INPUT_CLS}>
              <option value="">선택 (선택사항)</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">시작일 <span className="text-[#FF7B72]">*</span></label>
              <input type="date" value={form.started_at} onChange={e => set('started_at', e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">만료일 <span className="text-[#FF7B72]">*</span></label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-dk-muted mb-1 block">계약금액 <span className="text-[#FF7B72]">*</span></label>
              <input type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0" className={cn(INPUT_CLS, 'font-mono')} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">할인율 (%)</label>
              <input type="number" min="0" max="100" value={form.discount_rate}
                onChange={e => set('discount_rate', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} />
            </div>
          </div>

          {rawAmount > 0 && (
            <div className="bg-dk-surface2 border border-dk-border rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-dk-muted">실계약금액</span>
              <span className="text-sm font-bold text-dk-text font-mono">
                {finalAmount.toLocaleString('ko-KR')}원
                {discountPct > 0 && <span className="text-xs text-[#3FB950] ml-1.5">(-{discountPct}%)</span>}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">계정 수</label>
              <input type="number" min="1" value={form.account_count}
                onChange={e => set('account_count', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">결제방법</label>
              <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={INPUT_CLS}>
                <option value="">선택</option>
                <option value="계좌이체">계좌이체</option>
                <option value="카드">카드</option>
                <option value="현금">현금</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">메모</label>
            <textarea rows={2} value={form.memo} onChange={e => set('memo', e.target.value)}
              placeholder="메모..." className={cn(INPUT_CLS, 'resize-none')} />
          </div>

          {error && (
            <p className="text-xs text-[#FF7B72] bg-[#3d1a1a] border border-[#7f2020] rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-sm text-white bg-[#1f6feb] rounded-lg hover:bg-[#388bfd] disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? '등록 중...' : '계약 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── 계약 행 ──────────────────────────────────────────────
function ContractRowItem({ contract }: { contract: ContractRow }) {
  const dday = calcDday(contract.expires_at)

  return (
    <tr className="hover:bg-dk-surface2/50 transition-colors group">
      <td className="px-5 py-3.5">
        <Link href={`/app/contracts/${contract.id}`} className="block">
          <p className="text-sm font-semibold text-dk-text group-hover:text-dk-blue transition-colors">
            {contract.company?.name ?? '—'}
          </p>
          <p className="text-xs text-dk-dim mt-0.5">{contract.product?.name ?? '—'}</p>
        </Link>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs font-mono text-dk-muted">{contract.contract_no ?? '—'}</span>
      </td>
      <td className="px-4 py-3.5">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', STATUS_CFG[contract.status].cls)}>
          {STATUS_CFG[contract.status].label}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-bold text-dk-text font-mono">
          {formatAmount(contract.final_amount ?? contract.amount)}
        </span>
        {contract.discount_rate > 0 && (
          <p className="text-xs text-[#3FB950]">-{contract.discount_rate}%</p>
        )}
      </td>
      <td className="px-4 py-3.5">
        {contract.status === 'active'
          ? <span className={cn('text-xs font-bold font-mono', getDdayClass(dday))}>{dday >= 0 ? `D-${dday}` : '만료'}</span>
          : <span className="text-xs text-dk-dim">{formatDate(contract.expires_at)}</span>
        }
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs text-dk-muted">{contract.assigned_user?.name ?? '—'}</span>
      </td>
      <td className="px-4 py-3.5">
        {contract.is_paid
          ? <CheckCircle2 className="w-4 h-4 text-[#3FB950]" />
          : <AlertCircle className="w-4 h-4 text-[#E3B341]" />
        }
      </td>
      <td className="px-4 py-3.5">
        <Link href={`/app/contracts/${contract.id}`}
          className="text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          보기 <ChevronRight className="w-3 h-3" />
        </Link>
      </td>
    </tr>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function ContractsPage() {
  const [loading, setLoading]     = useState(true)
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [q, setQ]                 = useState('')
  const [status, setStatus]       = useState<ContractStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetch('/api/contracts?limit=200')
      .then(r => r.json())
      .then(j => { setContracts((j.data?.data ?? []) as ContractRow[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  const filtered = contracts.filter(c => {
    const matchQ = !q || (c.company?.name ?? '').includes(q) || (c.contract_no ?? '').includes(q)
    const matchS = status === 'all' || c.status === status
    return matchQ && matchS
  })

  const active       = contracts.filter(c => c.status === 'active')
  const totalAmount  = active.reduce((s, c) => s + (c.final_amount ?? c.amount), 0)
  const expiringCnt  = active.filter(c => { const d = calcDday(c.expires_at); return d >= 0 && d <= 30 }).length
  const unpaidCnt    = active.filter(c => !c.is_paid).length

  return (
    <div className="flex flex-col h-full p-6 gap-5 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-dk-text">계약 현황</h1>
          <p className="text-sm text-dk-dim mt-0.5">활성 {active.length}건 · 전체 {contracts.length}건</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#1f6feb] text-white text-sm px-3.5 py-2 rounded-lg hover:bg-[#388bfd] transition-colors">
          <Plus className="w-4 h-4" /> 계약 등록
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span className="text-xs text-dk-muted">활성 계약 총액</span>
          </div>
          <p className="text-xl font-bold text-dk-text font-mono">{formatAmount(totalAmount)}</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#E3B341]" />
            <span className="text-xs text-dk-muted">30일 내 만료</span>
          </div>
          <p className={cn('text-xl font-bold font-mono', expiringCnt > 0 ? 'text-[#E3B341]' : 'text-dk-text')}>{expiringCnt}건</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#FF7B72]" />
            <span className="text-xs text-dk-muted">미납 계약</span>
          </div>
          <p className={cn('text-xl font-bold font-mono', unpaidCnt > 0 ? 'text-[#FF7B72]' : 'text-dk-text')}>{unpaidCnt}건</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2 bg-dk-surface border border-dk-border rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-dk-dim" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="고객사, 계약번호"
            className="bg-transparent text-sm text-dk-text placeholder-dk-dim focus:outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'active', 'expired', 'cancelled', 'renewed'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                status === s ? 'bg-dk-text text-dk-bg border-dk-text' : 'text-dk-muted border-dk-border bg-dk-surface hover:border-dk-border2')}>
              {s === 'all' ? '전체' : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 min-h-0 bg-dk-surface border border-dk-border rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-dk-surface2 border-b border-dk-border">
                {['고객사 / 제품', '계약번호', '상태', '금액', '만료일', '담당자', '결제', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dk-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dk-border">
              {filtered.map(c => <ContractRowItem key={c.id} contract={c} />)}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-dk-dim mx-auto mb-3 opacity-40" />
              <p className="text-sm text-dk-dim">계약 없음</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewContractModal
          onClose={() => setShowModal(false)}
          onSuccess={contract => {
            setContracts(prev => [contract, ...prev])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
