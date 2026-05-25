'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2, Plus, Search, ChevronRight,
  AlertCircle, AlertTriangle, CheckCircle2,
  MapPin, Loader2, X, FileText,
  Phone, Mail, PhoneMissed, PhoneOff, CalendarClock,
} from 'lucide-react'
import { cn, formatAmount, calcDday, getDdayClass } from '@/lib/utils'
import type { CompanyStatus, RiskLevel } from '@/types/domain'

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

type CompanyRow = {
  id: string
  name: string
  biz_no: string | null
  industry: string | null
  status: CompanyStatus
  grade: string | null
  renewal_risk: RiskLevel | null
  address_city: string | null
  assigned_user: { id: string; name: string } | null
  active_contract: { expires_at: string; final_amount: number } | null
}

const STATUS_CFG: Record<CompanyStatus, { label: string; cls: string }> = {
  prospect: { label: '발굴',   cls: 'bg-[#1c2d4a] text-[#58A6FF] border-[#2d4a7a]' },
  active:   { label: '계약',   cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]' },
  dormant:  { label: '미접촉', cls: 'bg-dk-surface2 text-dk-muted border-dk-border' },
  churned:  { label: '해지',   cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]' },
}
const RISK_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  high:   { label: '위험', cls: 'bg-[#3d1a1a] text-[#FF7B72] border-[#7f2020]',       icon: AlertCircle },
  medium: { label: '주의', cls: 'bg-[#3d2b0d] text-[#E3B341] border-[#7a5000]',       icon: AlertTriangle },
  low:    { label: '안전', cls: 'bg-[#0f2d1c] text-[#3FB950] border-[#1c5c35]',       icon: CheckCircle2 },
}

type ActivityCompany = { id: string; name: string }
type ActivityContact = {
  id: string; name: string; title: string | null
  mobile: string | null; phone: string | null; email: string | null; is_primary: boolean
}

// ─── 빠른 활동 추가 모달 ──────────────────────────────────
function QuickActivityModal({
  company,
  onClose,
  onSaved,
}: {
  company: ActivityCompany
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType]                         = useState<'call' | 'visit' | 'email'>('call')
  const [contacts, setContacts]                 = useState<ActivityContact[]>([])
  const [contactsLoading, setContactsLoading]   = useState(false)
  const [selectedContact, setSelectedContact]   = useState<ActivityContact | null>(null)
  const [phoneChoice, setPhoneChoice]           = useState<'mobile' | 'phone'>('mobile')
  const [callResult, setCallResult]             = useState('')
  const [visitPurpose, setVisitPurpose]         = useState('')
  const [companions, setCompanions]             = useState('')
  const [summary, setSummary]                   = useState('')
  const [nextAction, setNextAction]             = useState('')
  const [nextActionAt, setNextActionAt]         = useState('')
  const [submitting, setSubmitting]             = useState(false)

  useEffect(() => {
    setContactsLoading(true)
    fetch(`/api/contacts?company_id=${company.id}`)
      .then(r => r.json())
      .then(json => {
        const list = (json.data ?? []) as ActivityContact[]
        setContacts(list)
        const primary = list.find(c => c.is_primary) ?? list[0] ?? null
        setSelectedContact(primary)
        if (primary) {
          if (primary.mobile) setPhoneChoice('mobile')
          else if (primary.phone) setPhoneChoice('phone')
        }
      })
      .finally(() => setContactsLoading(false))
  }, [company.id])

  const selectContact = (c: ActivityContact) => {
    setSelectedContact(prev => prev?.id === c.id ? null : c)
    if (c.mobile) setPhoneChoice('mobile')
    else if (c.phone) setPhoneChoice('phone')
  }

  const resolveContactValue = () => {
    if (!selectedContact) return null
    if (type === 'call') return phoneChoice === 'mobile' ? selectedContact.mobile : selectedContact.phone
    if (type === 'email') return selectedContact.email
    return null
  }

  const handleSave = async () => {
    if (type === 'call' && !callResult) return
    setSubmitting(true)
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:     company.id,
          contact_id:     selectedContact?.id ?? null,
          contact_value:  resolveContactValue(),
          type,
          call_result:    type === 'call' ? callResult : null,
          visit_purpose:  type === 'visit' ? visitPurpose || null : null,
          companions:     type === 'visit' ? companions.trim() || null : null,
          summary:        summary.trim() || null,
          next_action:    nextAction.trim() || null,
          next_action_at: nextActionAt || null,
        }),
      })
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  const TYPE_TABS = [
    { value: 'call'  as const, label: '통화',    icon: Phone   },
    { value: 'visit' as const, label: '방문',    icon: MapPin  },
    { value: 'email' as const, label: '이메일',  icon: Mail    },
  ]

  const CALL_RESULTS = [
    { value: 'connected', label: '연결됨',   icon: CheckCircle2,  cls: 'border-[#1c5c35] bg-[#0f2d1c] text-[#3FB950]' },
    { value: 'no_answer', label: '부재중',   icon: PhoneMissed,   cls: 'border-[#7a5000] bg-[#3d2b0d] text-[#E3B341]' },
    { value: 'rejected',  label: '거절',     icon: PhoneOff,      cls: 'border-[#7f2020] bg-[#3d1a1a] text-[#FF7B72]' },
    { value: 'scheduled', label: '예약통화', icon: CalendarClock, cls: 'border-[#2d4a7a] bg-[#1c2d4a] text-[#58A6FF]' },
  ]

  const canSave = (type !== 'call' || !!callResult) && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-dk-text">활동 추가</h3>
            <p className="text-xs text-dk-blue mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />{company.name}
            </p>
          </div>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        {/* 활동 타입 탭 */}
        <div className="flex gap-1 mb-4 p-1 bg-dk-surface2 rounded-xl border border-dk-border">
          {TYPE_TABS.map(tab => (
            <button key={tab.value} type="button" onClick={() => setType(tab.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                type === tab.value
                  ? 'bg-dk-surface text-dk-text shadow-sm border border-dk-border'
                  : 'text-dk-muted hover:text-dk-text'
              )}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>

        {/* 담당자 선택 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-dk-muted mb-1.5 block">담당자</label>
          {contactsLoading ? (
            <div className="flex items-center gap-2 text-sm text-dk-dim py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 불러오는 중...
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-xs text-dk-dim py-1">등록된 담당자가 없습니다</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {contacts.map(c => (
                <button key={c.id} type="button" onClick={() => selectContact(c)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                    selectedContact?.id === c.id
                      ? 'border-dk-blue bg-[#111d30] text-dk-text'
                      : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                  )}>
                  <span className="font-medium">{c.name}</span>
                  {c.title && <span className="opacity-60">{c.title}</span>}
                  {c.is_primary && <span className="text-[9px] text-dk-blue border border-dk-blue/30 px-0.5 rounded">대표</span>}
                </button>
              ))}
            </div>
          )}

          {/* 통화: 번호 선택 */}
          {selectedContact && type === 'call' && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedContact.mobile ? (
                <a href={`tel:${selectedContact.mobile}`} onClick={() => setPhoneChoice('mobile')}
                  className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors',
                    phoneChoice === 'mobile' ? 'border-[#1c5c35] bg-[#0f2d1c] text-[#3FB950]' : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                  )}>
                  <Phone className="w-3 h-3" />{selectedContact.mobile}
                  <span className="text-[9px] opacity-70">휴대폰</span>
                </a>
              ) : (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dk-border bg-dk-surface2 text-dk-dim opacity-50 cursor-not-allowed">
                  <Phone className="w-3 h-3" />번호 없음<span className="text-[9px] opacity-70">휴대폰</span>
                </span>
              )}
              {selectedContact.phone ? (
                <a href={`tel:${selectedContact.phone}`} onClick={() => setPhoneChoice('phone')}
                  className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors',
                    phoneChoice === 'phone' ? 'border-[#1c5c35] bg-[#0f2d1c] text-[#3FB950]' : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                  )}>
                  <Phone className="w-3 h-3" />{selectedContact.phone}
                  <span className="text-[9px] opacity-70">유선</span>
                </a>
              ) : (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dk-border bg-dk-surface2 text-dk-dim opacity-50 cursor-not-allowed">
                  <Phone className="w-3 h-3" />번호 없음<span className="text-[9px] opacity-70">유선</span>
                </span>
              )}
            </div>
          )}

          {/* 이메일: 주소 표시 */}
          {selectedContact && type === 'email' && (
            <div className="mt-2">
              {selectedContact.email ? (
                <a href={`mailto:${selectedContact.email}`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#b07fff] border border-[#3d2060] bg-[#2d1c4a] px-2.5 py-1 rounded-lg hover:bg-[#3d2060] transition-colors">
                  <Mail className="w-3 h-3" />{selectedContact.email}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-dk-dim border border-dk-border bg-dk-surface2 px-2.5 py-1 rounded-lg opacity-50 cursor-not-allowed">
                  <Mail className="w-3 h-3" />이메일 없음
                </span>
              )}
            </div>
          )}
        </div>

        {/* 통화 결과 */}
        {type === 'call' && (
          <div className="mb-4">
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">
              통화 결과 <span className="text-[#FF7B72]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CALL_RESULTS.map(btn => (
                <button key={btn.value} type="button" onClick={() => setCallResult(btn.value)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                    callResult === btn.value ? btn.cls + ' shadow-sm' : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                  )}>
                  <btn.icon className="w-4 h-4" />{btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 방문 목적 / 동행자 */}
        {type === 'visit' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">방문 목적</label>
              <select value={visitPurpose} onChange={e => setVisitPurpose(e.target.value)} className={INPUT_CLS}>
                <option value="">선택</option>
                <option value="demo">제품 시연</option>
                <option value="proposal">제안</option>
                <option value="contract">계약</option>
                <option value="followup">사후관리</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">동행자</label>
              <input value={companions} onChange={e => setCompanions(e.target.value)}
                placeholder="예: 솔루션팀 강대리" className={INPUT_CLS} />
            </div>
          </div>
        )}

        {/* 내용 */}
        <div className="mb-3">
          <label className="text-xs font-medium text-dk-muted mb-1.5 block">내용</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)}
            placeholder="활동 내용 요약..." rows={3} className={cn(INPUT_CLS, 'resize-none')} />
        </div>

        {/* 다음 액션 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">다음 액션</label>
            <input value={nextAction} onChange={e => setNextAction(e.target.value)}
              placeholder="예: 제안서 발송" className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">예정일</label>
            <input type="date" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)} className={INPUT_CLS} />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave}
            className="flex-1 py-2.5 text-sm text-white bg-[#1f6feb] rounded-lg hover:bg-[#388bfd] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 빠른 계약 등록 모달 ──────────────────────────────────
function QuickContractModal({
  company,
  onClose,
  onSuccess,
}: {
  company: { id: string; name: string }
  onClose: () => void
  onSuccess: (result: { expires_at: string; final_amount: number }) => void
}) {
  type ProductOption = { id: string; name: string }
  const [products, setProducts] = useState<ProductOption[]>([])
  const [form, setForm] = useState({
    product_id: '', started_at: '', expires_at: '',
    amount: '', discount_rate: '0', account_count: '1',
    payment_method: '', memo: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/products?active=true&limit=100')
      .then(r => r.json())
      .then(j => setProducts((j.data?.data ?? []) as ProductOption[]))
      .catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const rawAmount   = Number(form.amount) || 0
  const discountPct = Math.min(100, Math.max(0, Number(form.discount_rate) || 0))
  const finalAmount = Math.round(rawAmount * (1 - discountPct / 100))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.started_at) { setError('시작일을 입력해 주세요'); return }
    if (!form.expires_at) { setError('만료일을 입력해 주세요'); return }
    if (!form.amount)     { setError('계약금액을 입력해 주세요'); return }
    setSubmitting(true); setError(null)

    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id:     company.id,
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
    onSuccess({
      expires_at:   json.data.expires_at,
      final_amount: json.data.final_amount ?? finalAmount,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-dk-text">계약 등록</h3>
            <p className="text-xs text-dk-blue mt-0.5 flex items-center gap-1">
              <FileText className="w-3 h-3" />{company.name}
            </p>
          </div>
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

// ─── 고객사 행 ────────────────────────────────────────────
function CompanyRowItem({
  company,
  onAddContract,
  onAddActivity,
}: {
  company: CompanyRow
  onAddContract: (company: { id: string; name: string }) => void
  onAddActivity: (company: { id: string; name: string }) => void
}) {
  const dday = company.active_contract ? calcDday(company.active_contract.expires_at) : null
  const risk = company.renewal_risk ? RISK_CFG[company.renewal_risk] : null
  const RiskIcon = risk?.icon

  return (
    <tr className="hover:bg-dk-surface2/50 transition-colors group">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1c2d4a] flex items-center justify-center text-dk-blue text-xs font-bold shrink-0">
            {company.name[0]}
          </div>
          <div>
            <Link href={`/app/companies/${company.id}`}
              className="text-sm font-semibold text-dk-text hover:text-dk-blue transition-colors">
              {company.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              {company.address_city && (
                <span className="text-[10px] text-dk-dim flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />{company.address_city}
                </span>
              )}
              {company.industry && (
                <span className="text-[10px] text-dk-dim">{company.industry}</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', STATUS_CFG[company.status].cls)}>
          {STATUS_CFG[company.status].label}
        </span>
      </td>
      <td className="px-4 py-3.5">
        {company.grade && (
          <span className="text-xs font-bold text-dk-muted bg-dk-surface2 w-6 h-6 rounded-full flex items-center justify-center border border-dk-border">
            {company.grade}
          </span>
        )}
      </td>
      <td className="px-4 py-3.5">
        {company.assigned_user && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#1c2d4a] flex items-center justify-center text-[9px] text-dk-blue font-bold">
              {company.assigned_user.name[0]}
            </div>
            <span className="text-xs text-dk-muted">{company.assigned_user.name}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        {company.active_contract ? (
          <span className="text-sm font-bold text-dk-text font-mono">
            {formatAmount(company.active_contract.final_amount)}
          </span>
        ) : <span className="text-xs text-dk-dim">—</span>}
      </td>
      <td className="px-4 py-3.5">
        {dday !== null ? (
          <span className={cn('text-xs font-bold font-mono', getDdayClass(dday))}>
            {dday >= 0 ? `D-${dday}` : `만료`}
          </span>
        ) : <span className="text-xs text-dk-dim">—</span>}
      </td>
      <td className="px-4 py-3.5">
        {risk && RiskIcon && (
          <span className={cn('inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium', risk.cls)}>
            <RiskIcon className="w-2.5 h-2.5" />{risk.label}
          </span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddActivity({ id: company.id, name: company.name })}
            className="text-xs text-[#58A6FF] hover:text-[#79BAFF] flex items-center gap-0.5 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" /> 활동
          </button>
          <button
            onClick={() => onAddContract({ id: company.id, name: company.name })}
            className="text-xs text-[#3FB950] hover:text-[#56d364] flex items-center gap-0.5 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" /> 계약
          </button>
          <Link href={`/app/companies/${company.id}`}
            className="text-xs text-dk-muted hover:text-dk-text flex items-center gap-0.5">
            보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </td>
    </tr>
  )
}

export default function CompaniesPage() {
  const [loading, setLoading]         = useState(true)
  const [companies, setCompanies]     = useState<CompanyRow[]>([])
  const [totalCount, setTotalCount]   = useState(0)
  const [q,         setQ]             = useState('')
  const [status,    setStatus]        = useState<CompanyStatus | 'all'>('all')
  const [risk,      setRisk]          = useState<RiskLevel | 'all'>('all')
  const [contractTarget, setContractTarget] = useState<{ id: string; name: string } | null>(null)
  const [activityTarget, setActivityTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    fetch('/api/companies?limit=100')
      .then(r => r.json())
      .then(json => {
        setCompanies((json.data?.data ?? []) as CompanyRow[])
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

  const filtered = companies.filter(c => {
    const matchQ = !q || c.name.includes(q) || (c.biz_no ?? '').includes(q)
    const matchS = status === 'all' || c.status === status
    const matchR = risk === 'all' || c.renewal_risk === risk
    return matchQ && matchS && matchR
  })

  return (
    <div className="flex flex-col h-full p-6 gap-5 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-dk-text">고객사 관리</h1>
          <p className="text-sm text-dk-dim mt-0.5">
            전체 {companies.length}개 · 활성 {companies.filter(c => c.status === 'active').length}개
          </p>
        </div>
        <Link href="/app/companies/new"
          className="flex items-center gap-1.5 bg-[#1f6feb] text-white text-sm px-3.5 py-2 rounded-lg hover:bg-[#388bfd] transition-colors">
          <Plus className="w-4 h-4" /> 고객사 등록
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2 bg-dk-surface border border-dk-border rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-dk-dim" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="회사명, 사업자번호"
            className="bg-transparent text-sm text-dk-text placeholder-dk-dim focus:outline-none flex-1" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'prospect', 'dormant', 'churned'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                status === s ? 'bg-dk-text text-dk-bg border-dk-text' : 'text-dk-muted border-dk-border bg-dk-surface hover:border-dk-border2')}>
              {s === 'all' ? '전체' : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'high', 'medium', 'low'] as const).map(r => (
            <button key={r} onClick={() => setRisk(r)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                risk === r ? 'bg-dk-text text-dk-bg border-dk-text' : 'text-dk-muted border-dk-border bg-dk-surface hover:border-dk-border2')}>
              {r === 'all' ? '위험도 전체' : RISK_CFG[r].label}
            </button>
          ))}
        </div>
      </div>

      {totalCount > companies.length && (
        <div className="bg-amber-500/10 border border-[#7a5000] text-[#E3B341] text-xs rounded-lg px-4 py-2.5 shrink-0">
          전체 {totalCount}개 중 상위 100개만 표시됩니다. 나머지 {totalCount - companies.length}개는 검색·필터를 활용해 확인하세요.
        </div>
      )}

      <div className="flex-1 min-h-0 bg-dk-surface border border-dk-border rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-dk-surface2 border-b border-dk-border">
                {['고객사', '상태', '등급', '담당자', '계약금액', '만료일', '위험도', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dk-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dk-border">
              {filtered.map(c => (
                <CompanyRowItem
                  key={c.id}
                  company={c}
                  onAddContract={setContractTarget}
                  onAddActivity={setActivityTarget}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Building2 className="w-10 h-10 text-dk-dim mx-auto mb-3 opacity-40" />
              <p className="text-sm text-dk-dim">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {contractTarget && (
        <QuickContractModal
          company={contractTarget}
          onClose={() => setContractTarget(null)}
          onSuccess={({ expires_at, final_amount }) => {
            setCompanies(prev => prev.map(c =>
              c.id === contractTarget.id
                ? { ...c, status: 'active', active_contract: { expires_at, final_amount } }
                : c
            ))
            setContractTarget(null)
          }}
        />
      )}

      {activityTarget && (
        <QuickActivityModal
          company={activityTarget}
          onClose={() => setActivityTarget(null)}
          onSaved={() => setActivityTarget(null)}
        />
      )}
    </div>
  )
}
