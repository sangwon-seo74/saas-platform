'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, AlertCircle, AlertTriangle,
  CheckCircle2, FileText, Building2, ChevronRight,
  TrendingUp, TrendingDown, Loader2, X, Send,
  Plus, User, CheckSquare, Pencil, Check,
} from 'lucide-react'
import { SendModal } from '@/components/SendModal'
import { QuickActivityModal } from '@/components/QuickActivityModal'
import { cn, formatAmount, formatDate, calcDday, getDdayClass } from '@/lib/utils'
import { TASK_TYPE_LABEL } from '@/constants/domain'
import type { RenewalStatus, RiskLevel, ActivityType, TaskStatus, TaskPriority } from '@/types/domain'

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
  company: { id: string; name: string; biz_no: string | null; industry: string | null; status: string | null } | null
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

type TaskItem = {
  id: string
  title: string
  type: string | null
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  assigned_user: { id: string; name: string } | null
}

type UserOption = { id: string; name: string }

const RISK_CFG: Record<RiskLevel, { label: string; cls: string; icon: React.ElementType }> = {
  high:   { label: '위험', cls: 'bg-tint-red text-dk-red border-tint-red-border',   icon: AlertCircle },
  medium: { label: '주의', cls: 'bg-tint-amber text-dk-orange border-tint-amber-border',   icon: AlertTriangle },
  low:    { label: '안전', cls: 'bg-tint-green text-dk-green border-tint-green-border',   icon: CheckCircle2 },
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
  renewed:   'text-dk-green',
  upsell:    'text-dk-blue',
  downgrade: 'text-dk-orange',
  churned:   'text-dk-red',
}
const TASK_STATUS_CFG: Record<TaskStatus, { label: string; cls: string }> = {
  todo:        { label: '할일',   cls: 'bg-dk-surface2 text-dk-muted border-dk-border' },
  in_progress: { label: '진행중', cls: 'bg-tint-blue text-dk-blue border-tint-blue-border' },
  done:        { label: '완료',   cls: 'bg-tint-green text-dk-green border-tint-green-border' },
  cancelled:   { label: '취소',   cls: 'bg-dk-surface2 text-dk-dim border-dk-border' },
}
const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-dk-red', medium: 'bg-dk-orange', low: 'bg-dk-dim',
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
              <label className="text-xs font-medium text-dk-muted mb-1 block">시작일 <span className="text-dk-red">*</span></label>
              <input type="date" value={form.started_at} onChange={e => set('started_at', e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">만료일 <span className="text-dk-red">*</span></label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-dk-muted mb-1 block">계약금액 <span className="text-dk-red">*</span></label>
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
            <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-sm text-white bg-dk-success rounded-lg hover:bg-dk-successHover disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? '처리 중...' : '재계약 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── 업무 추가 미니 모달 ──────────────────────────────────
function AddTaskModal({ renewal, users, onClose, onSaved }: {
  renewal: RenewalDetail
  users: UserOption[]
  onClose: () => void
  onSaved: (task: TaskItem) => void
}) {
  const [title, setTitle]         = useState('')
  const [type, setType]           = useState('')
  const [priority, setPriority]   = useState<TaskPriority>('medium')
  const [dueAt, setDueAt]         = useState('')
  const [assignedId, setAssignedId] = useState(renewal.assigned_user?.id ?? '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:            title.trim(),
        type:             type || null,
        priority,
        due_at:           dueAt || null,
        assigned_user_id: assignedId || null,
        company_id:       renewal.company?.id ?? null,
        renewal_id:       renewal.id,
      }),
    })
    const json = await res.json().catch(() => null)
    setSubmitting(false)
    if (res.ok && json?.data) onSaved(json.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dk-text">업무 추가</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">제목 <span className="text-dk-red">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="업무 내용을 입력하세요" className={INPUT_CLS} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">유형</label>
              <select value={type} onChange={e => setType(e.target.value)} className={INPUT_CLS}>
                <option value="">선택</option>
                {Object.entries(TASK_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">우선순위</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className={INPUT_CLS}>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">마감일</label>
              <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">담당자</label>
              <select value={assignedId} onChange={e => setAssignedId(e.target.value)} className={INPUT_CLS}>
                <option value="">미배정</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={!title.trim() || submitting}
              className="flex-1 py-2 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RenewalDetailPage() {
  const id = useParams<{ id: string }>()?.id
  const [loading, setLoading]               = useState(true)
  const [renewal, setRenewal]               = useState<RenewalDetail | null>(null)
  const [activities, setActivities]         = useState<ActivityItem[]>([])
  const [tasks, setTasks]                   = useState<TaskItem[]>([])
  const [users, setUsers]                   = useState<UserOption[]>([])
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showSendModal, setShowSendModal]   = useState(false)
  const [showLostForm, setShowLostForm]     = useState(false)
  const [showContract, setShowContract]     = useState(false)
  const [showCompany, setShowCompany]       = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showAddTask, setShowAddTask]       = useState(false)
  const [lostReason, setLostReason]         = useState('')
  const [processing, setProcessing]         = useState(false)

  // 메모 편집
  const [editingMemo, setEditingMemo]   = useState(false)
  const [memoValue, setMemoValue]       = useState('')
  const [savingMemo, setSavingMemo]     = useState(false)

  // 담당자 변경
  const [showUserPicker, setShowUserPicker] = useState(false)
  const userPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/renewals/${id}`).then(r => r.json()),
      fetch(`/api/tasks?renewal_id=${id}&limit=50`).then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([renewalJson, tasksJson, usersJson]) => {
      const r = renewalJson.data?.renewal ?? null
      setRenewal(r)
      setMemoValue(r?.memo ?? '')
      setActivities(renewalJson.data?.activities ?? [])
      setTasks(tasksJson.data?.data ?? [])
      setUsers(usersJson.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  // 외부 클릭 시 담당자 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userPickerRef.current && !userPickerRef.current.contains(e.target as Node))
        setShowUserPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const handleSaveMemo = async () => {
    if (!renewal) return
    setSavingMemo(true)
    await fetch(`/api/renewals/${renewal.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo: memoValue.trim() || null }),
    }).catch(console.error)
    setRenewal(p => p ? { ...p, memo: memoValue.trim() || null } : p)
    setSavingMemo(false)
    setEditingMemo(false)
  }

  const handleAssignUser = async (user: UserOption) => {
    if (!renewal) return
    setShowUserPicker(false)
    await fetch(`/api/renewals/${renewal.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_user_id: user.id }),
    }).catch(console.error)
    setRenewal(p => p ? { ...p, assigned_user: user } : p)
  }

  const handleTaskStatusToggle = async (task: TaskItem) => {
    const next: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    }).catch(console.error)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
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

  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const doneTasks   = tasks.filter(t => t.status === 'done')

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* 헤더 */}
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
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-xs text-dk-dim">
              {[renewal.contract?.product?.name, renewal.contract?.contract_no].filter(Boolean).join(' · ')}
            </p>
            {/* 담당자 */}
            <div className="relative" ref={userPickerRef}>
              <button
                onClick={() => setShowUserPicker(v => !v)}
                className="flex items-center gap-1 text-xs text-dk-muted hover:text-dk-text transition-colors"
              >
                <User className="w-3 h-3" />
                {renewal.assigned_user?.name ?? '담당자 없음'}
              </button>
              {showUserPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-dk-surface border border-dk-border rounded-lg shadow-xl min-w-[140px] py-1">
                  {users.map(u => (
                    <button key={u.id} onClick={() => handleAssignUser(u)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-dk-surface2 transition-colors',
                        renewal.assigned_user?.id === u.id ? 'text-dk-blue font-medium' : 'text-dk-text'
                      )}>
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dk-blue border border-tint-blue-border rounded-lg hover:bg-tint-blue transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />메시지 발송
        </button>
      </div>

      {showSendModal && (
        <SendModal onClose={() => setShowSendModal(false)} companyId={renewal.company?.id} />
      )}

      {/* KPI 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn('border rounded-xl px-4 py-3', dday <= 7 ? 'bg-tint-red border-tint-red-border' : 'bg-dk-surface2 border-dk-border')}>
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
            (renewal.risk_score ?? 0) >= 70 ? 'text-dk-red' :
            (renewal.risk_score ?? 0) >= 40 ? 'text-dk-orange' : 'text-dk-green'
          )}>
            {renewal.risk_score ?? '—'}
          </p>
          <p className="text-[10px] text-dk-dim mt-0.5">/ 100점</p>
        </div>
      </div>

      {/* 목표 갱신일 */}
      {renewal.target_renewal_at && (
        <div className="flex items-center gap-2 text-xs text-dk-muted bg-dk-surface2 border border-dk-border rounded-lg px-3 py-2">
          <span className="text-dk-dim">목표 갱신일</span>
          <span className="text-dk-text font-medium">{formatDate(renewal.target_renewal_at)}</span>
        </div>
      )}

      {/* 진행 상태 스텝퍼 */}
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
                      isCurrent ? 'bg-dk-accent text-white shadow-sm shadow-dk-accent/30' :
                      isPast    ? 'bg-tint-green text-dk-green' :
                                  'bg-dk-surface2 text-dk-muted hover:bg-dk-border'
                    )}
                  >
                    {isPast && <span className="mr-1">✓</span>}
                    {step.label}
                  </button>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={cn('w-3 h-0.5 mx-0.5', isPast ? 'bg-dk-green/50' : 'bg-dk-border')} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 갱신완료 / 이탈처리 버튼 */}
      {renewal.status !== 'won' && renewal.status !== 'lost' && !showLostForm && (
        <div className="flex gap-2">
          <button onClick={() => setShowCompleteModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white bg-dk-successDeep hover:bg-dk-success rounded-xl transition-colors border border-tint-green-border">
            <TrendingUp className="w-4 h-4" /> 갱신 완료
          </button>
          <button onClick={() => setShowLostForm(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-dk-red border border-tint-red-border hover:bg-tint-red rounded-xl transition-colors">
            <TrendingDown className="w-4 h-4" /> 이탈 처리
          </button>
        </div>
      )}

      {/* 이탈처리 폼 */}
      {showLostForm && (
        <div className="bg-tint-red border border-tint-red-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-dk-text">❌ 이탈 처리</p>
          <div>
            <label className="text-xs text-dk-muted mb-1 block">이탈 사유</label>
            <select value={lostReason} onChange={e => setLostReason(e.target.value)}
              className="w-full px-3 py-2 border border-dk-border bg-dk-surface2 text-dk-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dk-red">
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
              className="flex-1 py-2 text-sm text-white bg-dk-danger hover:bg-dk-dangerHover rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              확인
            </button>
          </div>
        </div>
      )}

      {/* 완료/이탈 결과 배너 */}
      {(renewal.status === 'won' || renewal.status === 'lost') && (
        <div className={cn(
          'border rounded-xl p-4',
          renewal.status === 'won' ? 'bg-tint-green border-tint-green-border' : 'bg-tint-red border-tint-red-border'
        )}>
          <div className="flex items-center gap-3">
            {renewal.status === 'won'
              ? <CheckCircle2 className="w-5 h-5 text-dk-green shrink-0" />
              : <X className="w-5 h-5 text-dk-red shrink-0" />
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
                  className="text-xs text-dk-blue hover:text-dk-blueHover mt-0.5 inline-block">
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
                className="mt-3 text-xs text-dk-blue hover:text-dk-blueHover flex items-center gap-0.5 transition-colors">
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
                className="mt-3 text-xs text-dk-blue hover:text-dk-blueHover flex items-center gap-0.5 transition-colors">
                전체 업체 정보 보기 <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 업무 목록 */}
      <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-dk-border">
          <CheckSquare className="w-4 h-4 text-dk-muted" />
          <span className="text-sm font-semibold text-dk-text">업무</span>
          {tasks.length > 0 && (
            <span className="text-xs text-dk-dim bg-dk-surface2 border border-dk-border px-1.5 py-0.5 rounded-full">
              {activeTasks.length}/{tasks.length}
            </span>
          )}
          <button onClick={() => setShowAddTask(true)}
            className="ml-auto flex items-center gap-1 text-xs text-dk-blue hover:text-dk-blueHover transition-colors">
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
        </div>
        <div className="divide-y divide-dk-border">
          {tasks.length === 0 ? (
            <p className="text-sm text-dk-dim text-center py-8">업무가 없습니다</p>
          ) : (
            <>
              {activeTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <button onClick={() => handleTaskStatusToggle(t)}
                    className="shrink-0 w-4 h-4 rounded border border-dk-border bg-dk-surface2 hover:border-dk-blue transition-colors flex items-center justify-center">
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dk-text truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.type && <span className="text-[10px] text-dk-dim">{TASK_TYPE_LABEL[t.type] ?? t.type}</span>}
                      {t.due_at && <span className="text-[10px] text-dk-dim">{formatDate(t.due_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[t.priority])} />
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', TASK_STATUS_CFG[t.status].cls)}>
                      {TASK_STATUS_CFG[t.status].label}
                    </span>
                  </div>
                </div>
              ))}
              {doneTasks.length > 0 && (
                <div className="px-5 py-2">
                  <p className="text-[10px] text-dk-dim mb-1.5">완료된 업무 {doneTasks.length}개</p>
                  {doneTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-1.5">
                      <button onClick={() => handleTaskStatusToggle(t)}
                        className="shrink-0 w-4 h-4 rounded border border-dk-green bg-tint-green flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-dk-green" />
                      </button>
                      <p className="text-xs text-dk-dim line-through truncate">{t.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 활동 이력 */}
      <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-dk-border">
          <span className="text-sm font-semibold text-dk-text">활동 이력</span>
          {renewal.company && (
            <button onClick={() => setShowActivityModal(true)}
              className="ml-auto flex items-center gap-1 text-xs text-dk-blue hover:text-dk-blueHover transition-colors">
              <Plus className="w-3.5 h-3.5" /> 추가
            </button>
          )}
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
                  {a.call_result === 'connected'  && <span className="text-[10px] text-dk-green">연결됨</span>}
                  {a.call_result === 'no_answer'  && <span className="text-[10px] text-dk-dim">부재중</span>}
                </div>
                {a.summary && <p className="text-xs text-dk-dim mt-0.5 leading-relaxed">{a.summary}</p>}
              </div>
              <p className="text-[10px] text-dk-dim shrink-0">{formatDate(a.activity_at)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 메모 */}
      <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-dk-border">
          <span className="text-sm font-semibold text-dk-text">메모</span>
          {!editingMemo && (
            <button onClick={() => { setMemoValue(renewal.memo ?? ''); setEditingMemo(true) }}
              className="ml-auto text-dk-dim hover:text-dk-muted transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {editingMemo ? (
            <div className="space-y-2">
              <textarea
                value={memoValue}
                onChange={e => setMemoValue(e.target.value)}
                rows={4}
                placeholder="메모를 입력하세요..."
                className={cn(INPUT_CLS, 'resize-none')}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setEditingMemo(false)}
                  className="flex-1 py-1.5 text-xs text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
                  취소
                </button>
                <button onClick={handleSaveMemo} disabled={savingMemo}
                  className="flex-1 py-1.5 text-xs text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 flex items-center justify-center gap-1 transition-colors">
                  {savingMemo && <Loader2 className="w-3 h-3 animate-spin" />}
                  저장
                </button>
              </div>
            </div>
          ) : renewal.memo ? (
            <p className="text-sm text-dk-text leading-relaxed whitespace-pre-wrap">{renewal.memo}</p>
          ) : (
            <p className="text-sm text-dk-dim">메모 없음</p>
          )}
        </div>
      </div>

      {/* 모달들 */}
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

      {showActivityModal && renewal.company && (
        <QuickActivityModal
          company={renewal.company}
          renewalId={renewal.id}
          onClose={() => setShowActivityModal(false)}
          onSaved={() => {
            setShowActivityModal(false)
            fetch(`/api/renewals/${id}`)
              .then(r => r.json())
              .then(json => setActivities(json.data?.activities ?? []))
              .catch(console.error)
          }}
        />
      )}

      {showAddTask && (
        <AddTaskModal
          renewal={renewal}
          users={users}
          onClose={() => setShowAddTask(false)}
          onSaved={(task) => {
            setTasks(prev => [task, ...prev])
            setShowAddTask(false)
          }}
        />
      )}
    </div>
  )
}
