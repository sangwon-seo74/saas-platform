'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Users, CheckCircle2, Clock,
  Plus, Pencil, ChevronRight, Copy, MoreHorizontal,
  Loader2, RefreshCw, Trash2, X,
} from 'lucide-react'
import { cn, formatAmount, formatDate, calcDday, getDdayClass } from '@/lib/utils'
import type { ContractStatus, RenewalStatus, RiskLevel } from '@/types/domain'

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

// ─── Types ───────────────────────────────────────────────
type ContractDetail = {
  id: string
  contract_no: string | null
  started_at: string
  expires_at: string
  amount: number
  discount_rate: number
  final_amount: number
  is_paid: boolean
  paid_at: string | null
  payment_method: string | null
  account_count: number
  status: ContractStatus
  renewal_count: number
  memo: string | null
  created_at: string
  company:        { id: string; name: string; biz_no: string | null; address_city: string | null } | null
  product:        { id: string; name: string; billing_cycle: string } | null
  assigned_user:  { id: string; name: string } | null
  contract_accounts: ContractAccount[]
  renewals: RenewalItem[]
}

type ContractAccount = {
  id: string
  account_id: string
  issued_at: string | null
  expires_at: string | null
  note: string | null
}

type RenewalItem = {
  id: string
  status: RenewalStatus
  risk_level: RiskLevel | null
  risk_score: number | null
  contract_expires_at: string
  result: string | null
  created_at: string
}

// ─── 상수 ────────────────────────────────────────────────
const CONTRACT_STATUS_CFG: Record<ContractStatus, { label: string; cls: string }> = {
  active:    { label: '활성',   cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]' },
  expired:   { label: '만료',   cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]' },
  cancelled: { label: '해지',   cls: 'bg-dk-surface2 text-dk-muted border-dk-border' },
  renewed:   { label: '갱신됨', cls: 'bg-[#1c2d4a] text-[#58A6FF] border-[#2d4a7a]' },
}

const RENEWAL_STATUS_CFG: Record<RenewalStatus, { label: string; cls: string }> = {
  pending:     { label: '대기중',   cls: 'bg-dk-surface2 text-dk-muted border-dk-border' },
  contacted:   { label: '접촉',     cls: 'bg-[#1c2d4a] text-[#58A6FF] border-[#2d4a7a]' },
  negotiating: { label: '협의중',   cls: 'bg-[#3d2b0d] text-[#E3B341] border-[#7a5000]' },
  won:         { label: '갱신완료', cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]' },
  lost:        { label: '이탈',     cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]' },
}

const RISK_CFG: Record<string, { label: string; cls: string }> = {
  high:   { label: '위험', cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]' },
  medium: { label: '주의', cls: 'bg-[#3d2b0d] text-[#E3B341] border-[#7a5000]' },
  low:    { label: '안전', cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]' },
}

const TABS = ['개요', '갱신 이력', '발급 계정', '결제']

// ─── 섹션 래퍼 ───────────────────────────────────────────
function Section({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-dk-border">
        <p className="text-sm font-semibold text-dk-text">{title}</p>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-dk-border last:border-0">
      <span className="text-xs text-dk-dim">{label}</span>
      <span className={cn('text-sm text-dk-text', mono && 'font-mono')}>{value ?? '—'}</span>
    </div>
  )
}

// ─── Edit Contract Modal ──────────────────────────────────
function EditContractModal({
  contract,
  onClose,
  onSuccess,
}: {
  contract: ContractDetail
  onClose: () => void
  onSuccess: (updated: ContractDetail) => void
}) {
  type ProductOption = { id: string; name: string }
  const [products, setProducts] = useState<ProductOption[]>([])
  const [form, setForm] = useState({
    product_id:     contract.product?.id      ?? '',
    started_at:     contract.started_at.slice(0, 10),
    expires_at:     contract.expires_at.slice(0, 10),
    amount:         String(contract.amount),
    discount_rate:  String(contract.discount_rate),
    payment_method: contract.payment_method   ?? '',
    status:         contract.status,
    memo:           contract.memo             ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/products?active=true&limit=100')
      .then(r => r.json())
      .then(j => setProducts((j.data?.data ?? []) as ProductOption[]))
      .catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const rawAmount   = Number(form.amount) || 0
  const discountPct = Math.min(100, Math.max(0, Number(form.discount_rate) || 0))
  const previewFinal = Math.round(rawAmount * (1 - discountPct / 100))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.started_at) { setError('시작일을 입력해 주세요'); return }
    if (!form.expires_at) { setError('만료일을 입력해 주세요'); return }
    if (!form.amount)     { setError('계약금액을 입력해 주세요'); return }

    setSubmitting(true); setError(null)
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id:     form.product_id     || null,
        started_at:     form.started_at,
        expires_at:     form.expires_at,
        amount:         rawAmount,
        discount_rate:  discountPct,
        payment_method: form.payment_method || null,
        status:         form.status,
        memo:           form.memo           || null,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '수정 중 오류가 발생했습니다')
      setSubmitting(false)
      return
    }
    const product = products.find(p => p.id === form.product_id)
    onSuccess({
      ...contract,
      ...json.data,
      product: product
        ? { id: product.id, name: product.name, billing_cycle: contract.product?.billing_cycle ?? '' }
        : contract.product,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">계약 수정</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
                className={cn(INPUT_CLS, 'font-mono')} />
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
                {previewFinal.toLocaleString('ko-KR')}원
                {discountPct > 0 && <span className="text-xs text-[#3FB950] ml-1.5">(-{discountPct}%)</span>}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">상태</label>
              <select value={form.status} onChange={e => set('status', e.target.value as ContractStatus)} className={INPUT_CLS}>
                <option value="active">계약중</option>
                <option value="expired">만료</option>
                <option value="cancelled">해지</option>
                <option value="renewed">갱신됨</option>
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
              {submitting ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Contract Modal ────────────────────────────────
function DeleteContractModal({
  contract,
  onClose,
  onDeleted,
}: {
  contract: ContractDetail
  onClose: () => void
  onDeleted: () => void
}) {
  const isActive = contract.status === 'active'
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true); setError(null)
    const res = await fetch(`/api/contracts/${contract.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '처리 중 오류가 발생했습니다')
      setDeleting(false)
      return
    }
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-dk-text">계약 {isActive ? '해지' : '삭제'}</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-dk-muted mb-1">
          <span className="font-semibold text-dk-text">{contract.company?.name ?? '—'}</span> 계약을{' '}
          {isActive ? '해지 처리' : '삭제'}하시겠습니까?
        </p>
        <p className="text-xs text-dk-dim mb-5">
          {isActive
            ? '활성 계약은 삭제되지 않고 상태가 "해지"로 변경됩니다.'
            : '이 작업은 되돌릴 수 없습니다.'}
        </p>
        {error && (
          <p className="text-xs text-[#FF7B72] bg-[#3d1a1a] border border-[#7f2020] rounded-lg px-3 py-2 mb-3">{error}</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 text-sm text-white bg-[#da3633] rounded-lg hover:bg-[#f85149] disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? '처리 중...' : isActive ? '해지 처리' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 탭: 개요 ─────────────────────────────────────────────
function TabOverview({ c }: { c: ContractDetail }) {
  const dday    = calcDday(c.expires_at)
  const ddayCls = getDdayClass(dday)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dk-surface border border-dk-border rounded-xl px-4 py-3.5">
          <p className="text-xs text-dk-muted">계약금액</p>
          <p className="text-xl font-bold text-dk-text font-mono mt-0.5">{formatAmount(c.final_amount)}</p>
          {c.discount_rate > 0 && (
            <p className="text-xs text-dk-dim mt-0.5">정가 {formatAmount(c.amount)} ({c.discount_rate}% 할인)</p>
          )}
        </div>
        <div className={cn('border rounded-xl px-4 py-3.5',
          dday <= 7 ? 'bg-[#3d1a1a] border-[#7f2020]' : dday <= 30 ? 'bg-[#3d2b0d] border-[#7a5000]' : 'bg-dk-surface border-dk-border'
        )}>
          <p className="text-xs text-dk-muted">만료까지</p>
          <p className={cn('text-xl font-bold font-mono mt-0.5', ddayCls)}>
            {dday >= 0 ? `D-${dday}` : `만료`}
          </p>
          <p className="text-xs text-dk-dim mt-0.5">{formatDate(c.expires_at)}</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl px-4 py-3.5">
          <p className="text-xs text-dk-muted">갱신 횟수</p>
          <p className="text-xl font-bold text-dk-text mt-0.5">{c.renewal_count}회</p>
          <p className="text-xs text-dk-dim mt-0.5">{c.renewal_count >= 3 ? '장기 우수고객' : c.renewal_count >= 1 ? '갱신 고객' : '신규 계약'}</p>
        </div>
      </div>

      <Section title="계약 정보">
        <div>
          <InfoRow label="계약번호" value={c.contract_no} mono />
          <InfoRow label="고객사" value={
            c.company ? (
              <Link href={`/app/companies/${c.company.id}`}
                className="text-dk-blue hover:text-[#79BAFF] flex items-center gap-1 transition-colors">
                {c.company.name} <ChevronRight className="w-3 h-3" />
              </Link>
            ) : '—'
          } />
          <InfoRow label="제품" value={c.product?.name} />
          <InfoRow label="담당자" value={c.assigned_user?.name} />
          <InfoRow label="계약 기간" value={`${formatDate(c.started_at)} ~ ${formatDate(c.expires_at)}`} />
          <InfoRow label="계정 수" value={`${c.account_count}개`} />
          <InfoRow label="상태" value={
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', CONTRACT_STATUS_CFG[c.status].cls)}>
              {CONTRACT_STATUS_CFG[c.status].label}
            </span>
          } />
        </div>
      </Section>

      {c.memo && (
        <Section title="메모">
          <p className="text-sm text-dk-muted leading-relaxed">{c.memo}</p>
        </Section>
      )}
    </div>
  )
}

// ─── 탭: 갱신 이력 ────────────────────────────────────────
function TabRenewals({ renewals }: { renewals: RenewalItem[] }) {
  if (renewals.length === 0) {
    return (
      <div className="py-16 text-center">
        <RefreshCw className="w-10 h-10 text-dk-dim mx-auto mb-3 opacity-40" />
        <p className="text-sm text-dk-dim">갱신 이력이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {renewals.map((r, i) => {
        const statusCfg = RENEWAL_STATUS_CFG[r.status]
        const riskCfg   = r.risk_level ? RISK_CFG[r.risk_level] : null
        return (
          <div key={r.id} className={cn(
            'border rounded-xl p-4',
            i === 0 ? 'bg-[#1c2d4a]/30 border-[#2d4a7a]' : 'bg-dk-surface border-dk-border'
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {i === 0 && (
                  <span className="text-[10px] bg-[#1f6feb] text-white px-1.5 py-0.5 rounded font-medium">현재</span>
                )}
                <div>
                  <p className="text-sm font-semibold text-dk-text">
                    {formatDate(r.contract_expires_at)} 만료 계약
                  </p>
                  <p className="text-xs text-dk-dim mt-0.5">생성 {formatDate(r.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {riskCfg && (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', riskCfg.cls)}>
                    {riskCfg.label}
                  </span>
                )}
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', statusCfg.cls)}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
            {r.result && (
              <div className="mt-3 pt-3 border-t border-dk-border flex items-center gap-1">
                {r.result === 'churned' ? (
                  <>
                    <X className="w-3.5 h-3.5 text-[#FF7B72]" />
                    <span className="text-xs text-[#FF7B72]">이탈</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className={cn('w-3.5 h-3.5',
                      r.result === 'upsell' ? 'text-[#58A6FF]' : r.result === 'downgrade' ? 'text-[#E3B341]' : 'text-[#3FB950]'
                    )} />
                    <span className={cn('text-xs',
                      r.result === 'upsell' ? 'text-[#58A6FF]' : r.result === 'downgrade' ? 'text-[#E3B341]' : 'text-[#3FB950]'
                    )}>
                      {r.result === 'renewed' ? '재계약' : r.result === 'upsell' ? '업셀' : '다운셀'}
                    </span>
                  </>
                )}
              </div>
            )}
            {i === 0 && (
              <div className="mt-3">
                <Link href={`/app/renewals/${r.id}`}
                  className="text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-1 transition-colors">
                  갱신 관리로 이동 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── 탭: 발급 계정 ────────────────────────────────────────
function TabAccounts({ accounts, accountCount }: { accounts: ContractAccount[]; accountCount: number }) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-dk-border">
        <p className="text-sm font-semibold text-dk-text">발급된 계정 ({accounts.length}/{accountCount})</p>
        <button className="flex items-center gap-1 text-xs text-dk-blue border border-[#2d4a7a] px-2.5 py-1.5 rounded-lg hover:bg-[#1c2d4a] transition-colors">
          <Plus className="w-3.5 h-3.5" /> 계정 추가
        </button>
      </div>
      {accounts.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="w-8 h-8 text-dk-dim mx-auto mb-2 opacity-40" />
          <p className="text-sm text-dk-dim">발급된 계정이 없습니다</p>
        </div>
      ) : (
        <div className="divide-y divide-dk-border">
          {accounts.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-dk-surface2/50 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#1c2d4a] flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 text-dk-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-dk-text">{a.account_id}</p>
                  <button onClick={() => handleCopy(a.account_id)}
                    className="text-dk-dim hover:text-dk-blue transition-colors">
                    {copied === a.account_id
                      ? <CheckCircle2 className="w-3 h-3 text-[#3FB950]" />
                      : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                {a.note && <p className="text-xs text-dk-dim mt-0.5">{a.note}</p>}
              </div>
              <div className="text-right shrink-0">
                {a.issued_at && <p className="text-xs text-dk-dim">{formatDate(a.issued_at)} 발급</p>}
                {a.expires_at && <p className="text-xs text-dk-dim">{formatDate(a.expires_at)} 만료</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 탭: 결제 ─────────────────────────────────────────────
function TabPayment({ c, onPaid }: { c: ContractDetail; onPaid: () => void }) {
  const [isPaid, setIsPaid]   = useState(c.is_paid)
  const [paidAt, setPaidAt]   = useState(c.paid_at)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleMarkPaid = async () => {
    setSaving(true); setError(null)
    const res = await fetch(`/api/contracts/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_paid: true }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '처리 중 오류가 발생했습니다')
      setSaving(false)
      return
    }
    setIsPaid(true)
    setPaidAt(json.data?.paid_at ?? new Date().toISOString())
    setSaving(false)
    onPaid()
  }

  return (
    <div className="space-y-4">
      <div className={cn('border rounded-xl p-5', isPaid ? 'bg-[#0f2d1c] border-[#1c5c35]' : 'bg-[#3d2b0d] border-[#7a5000]')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPaid
              ? <CheckCircle2 className="w-5 h-5 text-[#3FB950]" />
              : <Clock className="w-5 h-5 text-[#E3B341]" />
            }
            <span className={cn('text-sm font-semibold', isPaid ? 'text-[#3FB950]' : 'text-[#E3B341]')}>
              {isPaid ? '결제 완료' : '결제 대기중'}
            </span>
          </div>
          {!isPaid && (
            <button onClick={handleMarkPaid} disabled={saving}
              className="text-xs text-white bg-[#1f6feb] hover:bg-[#388bfd] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? '처리 중...' : '결제 완료 처리'}
            </button>
          )}
        </div>
        {isPaid && paidAt && (
          <p className="text-xs text-[#3FB950]/70 mt-1.5">{formatDate(paidAt)} 결제 확인</p>
        )}
      </div>

      {error && (
        <p className="text-xs text-[#FF7B72] bg-[#3d1a1a] border border-[#7f2020] rounded-lg px-3 py-2">{error}</p>
      )}

      <Section title="결제 정보">
        <div>
          <InfoRow label="계약금액 (정가)" value={<span className="font-mono">{formatAmount(c.amount)}</span>} />
          {c.discount_rate > 0 && <InfoRow label="할인율" value={`${c.discount_rate}%`} />}
          <InfoRow label="실계약금액" value={
            <span className="font-mono font-bold text-dk-blue">{formatAmount(c.final_amount)}</span>
          } />
          <InfoRow label="결제 수단" value={c.payment_method ?? '미설정'} />
          <InfoRow label="결제일" value={paidAt ? formatDate(paidAt) : '—'} />
        </div>
      </Section>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function ContractDetailPage() {
  const params   = useParams<{ id: string }>()
  const router   = useRouter()
  const id       = params?.id

  const [loading, setLoading]         = useState(true)
  const [contract, setContract]       = useState<ContractDetail | null>(null)
  const [notFound, setNotFound]       = useState(false)
  const [activeTab, setActiveTab]     = useState('개요')
  const [showMenu, setShowMenu]       = useState(false)
  const [showEdit, setShowEdit]       = useState(false)
  const [showDelete, setShowDelete]   = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/contracts/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) { setNotFound(true); setLoading(false); return }
        setContract(j.data)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  if (notFound || !contract) {
    return (
      <div className="p-6 text-center">
        <FileText className="w-10 h-10 text-dk-dim mx-auto mb-3 opacity-40" />
        <p className="text-sm text-dk-dim">계약을 찾을 수 없습니다</p>
        <Link href="/app/contracts" className="mt-3 text-xs text-dk-blue hover:underline inline-block">
          목록으로
        </Link>
      </div>
    )
  }

  const statusCfg = CONTRACT_STATUS_CFG[contract.status]

  const tabContent: Record<string, React.ReactNode> = {
    '개요':     <TabOverview c={contract} />,
    '갱신 이력': <TabRenewals renewals={contract.renewals ?? []} />,
    '발급 계정': <TabAccounts accounts={contract.contract_accounts ?? []} accountCount={contract.account_count} />,
    '결제':     <TabPayment c={contract} onPaid={() => setContract(prev => prev ? { ...prev, is_paid: true } : prev)} />,
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/app/contracts"
          className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-bold text-dk-text">{contract.company?.name ?? '—'}</h1>
            {contract.contract_no && (
              <span className="text-xs text-dk-dim font-mono">{contract.contract_no}</span>
            )}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', statusCfg.cls)}>
              {statusCfg.label}
            </span>
          </div>
          <p className="text-xs text-dk-dim mt-0.5">
            {contract.product?.name ?? '—'}{contract.assigned_user ? ` · ${contract.assigned_user.name}` : ''}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-9 z-20 bg-dk-surface2 border border-dk-border rounded-lg shadow-xl py-1 w-32">
                <button
                  onClick={() => { setShowEdit(true); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dk-text hover:bg-dk-surface transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-dk-muted" /> 수정
                </button>
                <button
                  onClick={() => { setShowDelete(true); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FF7B72] hover:bg-[#3d1a1a] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {contract.status === 'active' ? '해지' : '삭제'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-dk-border gap-0.5">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2',
              activeTab === tab
                ? 'text-dk-blue border-dk-blue'
                : 'text-dk-muted border-transparent hover:text-dk-text'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      {tabContent[activeTab]}

      {showEdit && contract && (
        <EditContractModal
          contract={contract}
          onClose={() => setShowEdit(false)}
          onSuccess={updated => { setContract(updated); setShowEdit(false) }}
        />
      )}
      {showDelete && contract && (
        <DeleteContractModal
          contract={contract}
          onClose={() => setShowDelete(false)}
          onDeleted={() => router.push('/app/contracts')}
        />
      )}
    </div>
  )
}
