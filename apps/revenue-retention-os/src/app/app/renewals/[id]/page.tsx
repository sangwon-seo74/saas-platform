'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, AlertCircle, AlertTriangle,
  CheckCircle2, FileText, Building2, ChevronRight,
  TrendingUp, TrendingDown, Loader2, X
} from 'lucide-react'
import { cn, formatAmount, formatDate, calcDday, getDdayClass } from '@/lib/utils'
import type { RenewalStatus, RiskLevel, ActivityType } from '@/types/domain'

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

type RenewalDetail = {
  id: string
  status: RenewalStatus
  risk_level: RiskLevel
  risk_score: number | null
  contract_expires_at: string
  target_renewal_at: string | null
  memo: string | null
  result: string | null
  result_contract_id: string | null
  company: { id: string; name: string; biz_no: string | null; industry: string | null; address_city: string | null; status: string | null } | null
  contract: {
    id: string; contract_no: string | null; started_at: string; final_amount: number; amount: number | null
    is_paid: boolean; payment_method: string | null; account_count: number; status: string
    product?: { id: string; name: string } | null
  } | null
  assigned_user: { id: string; name: string } | null
}

type ActivityItem = {
  id: string
  type: ActivityType
  activity_at: string
  call_result: string | null
  summary: string | null
  user: { id: string; name: string } | null
}

const RISK_CFG: Record<RiskLevel, { label: string; cls: string; icon: React.ElementType }> = {
  high:   { label: '위험', cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]',   icon: AlertCircle },
  medium: { label: '주의', cls: 'bg-[#3d2b0d] text-[#E3B341] border-[#7a5000]',   icon: AlertTriangle },
  low:    { label: '안전', cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]',   icon: CheckCircle2 },
}
const STATUS_STEPS: { key: RenewalStatus; label: string }[] = [
  { key: 'pending',     label: '대기' },
  { key: 'contacted',   label: '접촉' },
  { key: 'negotiating', label: '협의중' },
  { key: 'won',         label: '완료' },
]
const ACTIVITY_ICON: Record<string, string> = {
  call: '📞', visit: '🤝', email: '📧', sms: '💬', kakao: '💛'
}
const RESULT_LABEL: Record<string, string> = {
  renewed: '재계약', upsell: '업셀', downgrade: '다운셀', churned: '이탈'
}
const RESULT_CLS: Record<string, string> = {
  renewed:   'text-[#3FB950]',
  upsell:    'text-[#58A6FF]',
  downgrade: 'text-[#E3B341]',
  churned:   'text-[#FF7B72]',
}

// ─── 재계약 등록 모달 ─────────────────────────────────────
function RenewalCompleteModal({ renewal, onClose, onSuccess }: {
  renewal: RenewalDetail
  onClose: () => void
  onSuccess: (result: 'renewed' | 'upsell' | 'downgrade', newContractId: string) => void
}) {
  const origExpires = new Date(renewal.contract_expires_at)
  const defaultStart = new Date(origExpires)
  defaultStart.setDate(defaultStart.getDate() + 1)
  const defaultEnd = new Date(defaultStart)
  defaultEnd.setFullYear(defaultEnd.getFullYear() + 1)
  defaultEnd.setDate(defaultEnd.getDate() - 1)

  const [form, setForm] = useState({
    started_at:     defaultStart.toISOString().split('T')[0],
    expires_at:     defaultEnd.toISOString().split('T')[0],
    amount:         String(renewal.contract?.final_amount ?? 0),
    discount_rate:  '0',
    payment_method: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const rawAmount  = Number(form.amount) || 0
  const discountPct = Math.min(100, Math.max(0, Number(form.discount_rate) || 0))
  const finalAmount = Math.round(rawAmount * (1 - discountPct / 100))
  const origFinal   = renewal.contract?.final_amount ?? 0
  const result: 'renewed' | 'upsell' | 'downgrade' =
    finalAmount > origFinal ? 'upsell' : finalAmount < origFinal ? 'downgrade' : 'renewed'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rawAmount <= 0) { setError('계약금액을 입력해 주세요'); return }

    setSubmitting(true); setError(null)

    const contractRes = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id:     renewal.company?.id,
        product_id:     renewal.contract?.product?.id ?? null,
        started_at:     form.started_at,
        expires_at:     form.expires_at,
        amount:         rawAmount,
        discount_rate:  discountPct,
        payment_method: form.payment_method || null,
      }),
    })
    const contractJson = await contractRes.json().catch(() => null)
    if (!contractRes.ok) {
      setError(contractJson?.error?.message ?? '계약 생성 중 오류가 발생했습니다')
      setSubmitting(false); return
    }

    const renewalRes = await fetch(`/api/renewals/${renewal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, result_contract_id: contractJson.data.id }),
    })
    const renewalJson = await renewalRes.json().catch(() => null)
    if (!renewalRes.ok) {
      setError(renewalJson?.error?.message ?? '갱신 처리 중 오류가 발생했습니다')
      setSubmitting(false); return
    }

    onSuccess(result, contractJson.data.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">재계약 등록</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-dk-surface2 border border-dk-border rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-dk-muted mb-1.5">기존 계약</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-dk-text">{renewal.contract?.product?.name ?? '—'}</span>
            <span className="text-sm font-mono font-bold text-dk-text">{formatAmount(origFinal)}</span>
          </div>
          <p className="text-xs text-dk-dim mt-0.5">만료 {formatDate(renewal.contract_expires_at)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-dk-text font-mono">
                  {finalAmount.toLocaleString('ko-KR')}원
                </span>
                <span className={cn('text-xs font-medium', RESULT_CLS[result])}>
                  {RESULT_LABEL[result]}
                </span>
              </div>
            </div>
          )}

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

          {error && (
            <p className="text-xs text-[#FF7B72] bg-[#3d1a1a] border border-[#7f2020] rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-sm text-white bg-[#238636] rounded-lg hover:bg-[#2ea043] disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? '처리 중...' : '재계약 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RenewalDetailPage() {
  const id = useParams<{ id: string }>()?.id
  const [loading, setLoading]             = useState(true)
  const [renewal, setRenewal]             = useState<RenewalDetail | null>(null)
  const [activities, setActivities]       = useState<ActivityItem[]>([])
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showLostForm, setShowLostForm]   = useState(false)
  const [showContract, setShowContract]   = useState(false)
  const [showCompany, setShowCompany]     = useState(false)
  const [lostReason, setLostReason]       = useState('')
  const [processing, setProcessing]       = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/renewals/${id}`)
      .then(r => r.json())
      .then(json => {
        setRenewal(json.data?.renewal ?? null)
        setActivities(json.data?.activities ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (status: RenewalStatus) => {
    if (!renewal) return
    fetch(`/api/renewals/${renewal.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(console.error)
    setRenewal(p => p ? { ...p, status } : p)
  }

  const handleLost = async () => {
    if (!renewal) return
    setProcessing(true)
    try {
      await fetch(`/api/renewals/${renewal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: 'churned', lost_reason: lostReason || null }),
      })
      setRenewal(p => p ? { ...p, status: 'lost', result: 'churned' } : p)
      setShowLostForm(false)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  if (!renewal) {
    return (
      <div className="p-6 text-center text-sm text-dk-dim">
        갱신 정보를 불러올 수 없습니다.
        <Link href="/app/renewals" className="ml-2 text-dk-blue hover:underline">목록으로</Link>
      </div>
    )
  }

  const dday = calcDday(renewal.contract_expires_at)
  const risk = RISK_CFG[renewal.risk_level] ?? RISK_CFG['low']
  const RiskIcon = risk.icon
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === renewal.status)
  const discountRate = renewal.contract?.amount && renewal.contract?.final_amount
    ? Math.round((1 - renewal.contract.final_amount / renewal.contract.amount) * 100)
    : 0

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/app/renewals"
          className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-dk-text">{renewal.company?.name ?? '—'}</h1>
            <span className={cn('inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border font-medium', risk.cls)}>
              <RiskIcon className="w-3 h-3" /> {risk.label}
            </span>
          </div>
          <p className="text-xs text-dk-dim mt-0.5">
            {[renewal.contract?.product?.name, renewal.contract?.contract_no].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={cn('border rounded-xl px-4 py-3', dday <= 7 ? 'bg-[#3d1a1a] border-[#7f2020]' : 'bg-dk-surface2 border-dk-border')}>
          <p className="text-xs text-dk-muted">만료까지</p>
          <p className={cn('text-2xl font-bold font-mono', getDdayClass(dday))}>D-{dday}</p>
          <p className="text-[10px] text-dk-dim mt-0.5">{formatDate(renewal.contract_expires_at)}</p>
        </div>
        <div className="bg-dk-surface2 border border-dk-border rounded-xl px-4 py-3">
          <p className="text-xs text-dk-muted">계약금액</p>
          <p className="text-xl font-bold text-dk-text font-mono">
            {formatAmount(renewal.contract?.final_amount ?? 0)}
          </p>
          {discountRate > 0 && (
            <p className="text-[10px] text-dk-dim mt-0.5">할인 {discountRate}%</p>
          )}
        </div>
        <div className="bg-dk-surface2 border border-dk-border rounded-xl px-4 py-3">
          <p className="text-xs text-dk-muted">위험도 점수</p>
          <p className={cn(
            'text-2xl font-bold',
            (renewal.risk_score ?? 0) >= 70 ? 'text-[#FF7B72]' :
            (renewal.risk_score ?? 0) >= 40 ? 'text-[#E3B341]' : 'text-[#3FB950]'
          )}>
            {renewal.risk_score ?? '—'}
          </p>
          <p className="text-[10px] text-dk-dim mt-0.5">/ 100점</p>
        </div>
      </div>

      {renewal.status !== 'won' && renewal.status !== 'lost' && (
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <p className="text-xs font-semibold text-dk-muted mb-3">진행 상태</p>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, idx) => {
              const isPast    = idx < currentStepIdx
              const isCurrent = idx === currentStepIdx
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <button
                    onClick={() => handleStatusChange(step.key)}
                    className={cn(
                      'flex-1 py-2 text-xs font-medium text-center rounded-lg transition-all',
                      isCurrent ? 'bg-[#1f6feb] text-white shadow-sm shadow-[#1f6feb]/30' :
                      isPast    ? 'bg-[#0f2d1c] text-[#3FB950]' :
                                  'bg-dk-surface2 text-dk-muted hover:bg-dk-border'
                    )}
                  >
                    {isPast && <span className="mr-1">✓</span>}
                    {step.label}
                  </button>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={cn('w-3 h-0.5 mx-0.5', isPast ? 'bg-[#3FB950]/50' : 'bg-dk-border')} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {renewal.status !== 'won' && renewal.status !== 'lost' && !showLostForm && (
        <div className="flex gap-2">
          <button onClick={() => setShowCompleteModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white bg-[#1c6b3a] hover:bg-[#238636] rounded-xl transition-colors border border-[#1c5c35]">
            <TrendingUp className="w-4 h-4" /> 갱신 완료
          </button>
          <button onClick={() => setShowLostForm(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-[#FF7B72] border border-[#7f2020] hover:bg-[#3d1a1a] rounded-xl transition-colors">
            <TrendingDown className="w-4 h-4" /> 이탈 처리
          </button>
        </div>
      )}

      {showLostForm && (
        <div className="bg-[#3d1a1a] border border-[#7f2020] rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-dk-text">❌ 이탈 처리</p>
          <div>
            <label className="text-xs text-dk-muted mb-1 block">이탈 사유</label>
            <select value={lostReason} onChange={e => setLostReason(e.target.value)}
              className="w-full px-3 py-2 border border-dk-border bg-dk-surface2 text-dk-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B72]">
              <option value="">선택하세요</option>
              {['가격', '경쟁사 전환', '서비스 불만', '예산 삭감', '사업 축소', '기타'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowLostForm(false)}
              className="flex-1 py-2 text-sm text-dk-muted border border-dk-border bg-dk-surface2 rounded-lg hover:bg-dk-border transition-colors">
              취소
            </button>
            <button onClick={handleLost} disabled={processing}
              className="flex-1 py-2 text-sm text-white bg-[#da3633] hover:bg-[#f85149] rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              확인
            </button>
          </div>
        </div>
      )}

      {(renewal.status === 'won' || renewal.status === 'lost') && (
        <div className={cn(
          'border rounded-xl p-4',
          renewal.status === 'won' ? 'bg-[#0f2d1c] border-[#1c5c35]' : 'bg-[#3d1a1a] border-[#7f2020]'
        )}>
          <div className="flex items-center gap-3">
            {renewal.status === 'won'
              ? <CheckCircle2 className="w-5 h-5 text-[#3FB950] shrink-0" />
              : <X className="w-5 h-5 text-[#FF7B72] shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dk-text">
                {renewal.status === 'won'
                  ? `갱신 완료${renewal.result ? ` · ${RESULT_LABEL[renewal.result] ?? renewal.result}` : ''}`
                  : '이탈 처리됨'
                }
              </p>
              {renewal.status === 'won' && renewal.result_contract_id && (
                <Link href={`/app/contracts/${renewal.result_contract_id}`}
                  className="text-xs text-dk-blue hover:text-[#79BAFF] mt-0.5 inline-block">
                  신규 계약 보기 →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 계약 정보 */}
      <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
        <button onClick={() => setShowContract(v => !v)}
          className="w-full flex items-center gap-2 px-5 py-3.5 hover:bg-dk-surface2/50 transition-colors">
          <FileText className="w-4 h-4 text-dk-muted" />
          <span className="text-sm font-semibold text-dk-text">계약 정보</span>
          <ChevronRight className={cn('w-4 h-4 text-dk-dim ml-auto transition-transform', showContract && 'rotate-90')} />
        </button>
        {showContract && (
          <div className="border-t border-dk-border px-5 py-4">
            <div className="space-y-0">
              {[
                { label: '상품',     value: renewal.contract?.product?.name },
                { label: '계약번호', value: renewal.contract?.contract_no, mono: true },
                { label: '계약기간', value: renewal.contract?.started_at
                    ? `${formatDate(renewal.contract.started_at)} ~ ${formatDate(renewal.contract_expires_at)}`
                    : formatDate(renewal.contract_expires_at) },
                { label: '계약금액', value: formatAmount(renewal.contract?.final_amount ?? 0), mono: true },
                { label: '결제방법', value: renewal.contract?.payment_method },
                { label: '결제여부', value: renewal.contract?.is_paid ? '결제완료' : '미납' },
                { label: '계정 수',  value: renewal.contract?.account_count ? `${renewal.contract.account_count}개` : null },
              ].map(({ label, value, mono }) => value ? (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-dk-border last:border-0">
                  <span className="text-xs text-dk-dim">{label}</span>
                  <span className={cn('text-sm text-dk-text', mono && 'font-mono')}>{value}</span>
                </div>
              ) : null)}
            </div>
            {renewal.contract?.id && (
              <Link href={`/app/contracts/${renewal.contract.id}`}
                className="mt-3 text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-0.5 transition-colors">
                전체 계약 정보 보기 <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 업체 정보 */}
      <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
        <button onClick={() => setShowCompany(v => !v)}
          className="w-full flex items-center gap-2 px-5 py-3.5 hover:bg-dk-surface2/50 transition-colors">
          <Building2 className="w-4 h-4 text-dk-muted" />
          <span className="text-sm font-semibold text-dk-text">업체 정보</span>
          <ChevronRight className={cn('w-4 h-4 text-dk-dim ml-auto transition-transform', showCompany && 'rotate-90')} />
        </button>
        {showCompany && (
          <div className="border-t border-dk-border px-5 py-4">
            <div className="space-y-0">
              {[
                { label: '업체명',    value: renewal.company?.name },
                { label: '사업자번호', value: renewal.company?.biz_no, mono: true },
                { label: '업종',      value: renewal.company?.industry },
                { label: '소재지',    value: renewal.company?.address_city },
                { label: '상태',      value: renewal.company?.status },
              ].map(({ label, value, mono }) => value ? (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-dk-border last:border-0">
                  <span className="text-xs text-dk-dim">{label}</span>
                  <span className={cn('text-sm text-dk-text', mono && 'font-mono')}>{value}</span>
                </div>
              ) : null)}
            </div>
            {renewal.company?.id && (
              <Link href={`/app/companies/${renewal.company.id}`}
                className="mt-3 text-xs text-dk-blue hover:text-[#79BAFF] flex items-center gap-0.5 transition-colors">
                전체 업체 정보 보기 <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="bg-dk-surface border border-dk-border rounded-xl">
        <div className="px-5 py-3.5 border-b border-dk-border">
          <p className="text-sm font-semibold text-dk-text">활동 이력</p>
        </div>
        <div className="divide-y divide-dk-border">
          {activities.length === 0 ? (
            <p className="text-sm text-dk-dim text-center py-8">활동 이력이 없습니다</p>
          ) : activities.map(a => (
            <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className="text-base shrink-0 mt-0.5">{ACTIVITY_ICON[a.type] ?? '📋'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-dk-muted">{a.user?.name ?? '—'}</span>
                  {a.call_result === 'connected'  && <span className="text-[10px] text-[#3FB950]">연결됨</span>}
                  {a.call_result === 'no_answer'  && <span className="text-[10px] text-dk-dim">부재중</span>}
                </div>
                {a.summary && <p className="text-xs text-dk-dim mt-0.5 leading-relaxed">{a.summary}</p>}
              </div>
              <p className="text-[10px] text-dk-dim shrink-0">{formatDate(a.activity_at)}</p>
            </div>
          ))}
        </div>
      </div>

      {renewal.memo && (
        <div className="bg-[#3d2b0d]/50 border border-[#7a5000] rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-[#E3B341] mb-1">메모</p>
          <p className="text-sm text-[#E3B341]/80">{renewal.memo}</p>
        </div>
      )}

      {showCompleteModal && (
        <RenewalCompleteModal
          renewal={renewal}
          onClose={() => setShowCompleteModal(false)}
          onSuccess={(result, newContractId) => {
            setRenewal(p => p ? { ...p, status: 'won', result, result_contract_id: newContractId } : p)
            setShowCompleteModal(false)
          }}
        />
      )}
    </div>
  )
}
