'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import {
  ArrowLeft, Phone, Mail, Users, CheckSquare,
  AlertTriangle, AlertCircle, CheckCircle2,
  Plus, ChevronRight, MoreHorizontal, Loader2, X,
  Pencil, Trash2, MapPin, Send,
} from 'lucide-react'
import { SendModal } from '@/components/SendModal'
import { cn, formatAmount, formatDate, formatDateTime, calcDday, getDdayClass } from '@/lib/utils'
import { KakaoMap } from '@/components/KakaoMap'
import type { RiskLevel, ContractStatus, ActivityType } from '@/types/domain'

// ─── Types ───────────────────────────────────────────────
type Company = {
  id: string; name: string; biz_no: string | null; industry: string | null
  website: string | null; company_size: string | null
  address_zip: string | null; address_road: string | null; address_detail: string | null
  status: string; grade: string | null; renewal_risk: RiskLevel | null
  assigned_user: { id: string; name: string; phone?: string; email?: string } | null
  team: { id: string; name: string } | null
  memo: string | null; created_at: string; updated_at: string
  lat: number | null; lng: number | null
}
type Contact = {
  id: string; name: string; title: string | null; department: string | null
  phone: string | null; mobile: string | null; email: string | null
  is_primary: boolean; is_decision_maker: boolean; preferred_channel: string | null
}
type Contract = {
  id: string; contract_no: string; started_at: string; expires_at: string
  final_amount: number; status: ContractStatus; is_paid: boolean
  product: { id: string; name: string } | null
}
type Activity = {
  id: string; type: ActivityType; activity_at: string
  call_result: string | null; summary: string | null
  next_action: string | null; next_action_at: string | null
  contact_value: string | null
  contact?: { id: string; name: string; title: string | null } | null
  user: { id: string; name: string } | null
}
type TaskItem = {
  id: string; title: string; type: string | null
  priority: string; status: string; due_at: string | null; is_auto: boolean
  created_at?: string
}
type Message = {
  id: string; channel: string; content: string
  status: string; sent_at: string; read_at: string | null
}

// ─── Constants ────────────────────────────────────────────
const TABS = ['개요', '담당자', '계약', '활동이력', '발송이력']

const ACTIVITY_ICON_CLS: Record<string, string> = {
  call:  'bg-tint-blue text-dk-blue',
  visit: 'bg-tint-green-hover text-dk-green',
  email: 'bg-tint-purple text-tint-purple-text',
  sms:   'bg-tint-purple text-tint-purple-text',
  kakao: 'bg-tint-purple text-tint-purple-text',
}
const CALL_RESULT_CLS: Record<string, string> = {
  connected: 'text-dk-green', no_answer: 'text-dk-dim', rejected: 'text-dk-red', scheduled: 'text-dk-blue'
}
const CALL_RESULT_LABEL: Record<string, string> = {
  connected: '연결', no_answer: '부재중', rejected: '거절', scheduled: '예약'
}
const RISK_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  high:   { label: '위험', cls: 'bg-tint-red text-dk-red border-tint-red-border',   icon: AlertCircle },
  medium: { label: '주의', cls: 'bg-tint-amber text-dk-orange border-tint-amber-border',   icon: AlertTriangle },
  low:    { label: '안전', cls: 'bg-tint-green text-dk-green border-tint-green-border',   icon: CheckCircle2 },
}
const CONTRACT_STATUS_CLS: Record<ContractStatus, string> = {
  active:    'bg-tint-green text-dk-green border-tint-green-border',
  expired:   'bg-tint-red text-dk-red border-tint-red-border',
  cancelled: 'bg-dk-surface2 text-dk-muted border-dk-border',
  renewed:   'bg-tint-blue text-dk-blue border-tint-blue-border',
}
const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  active: '활성', expired: '만료', cancelled: '해지', renewed: '갱신됨'
}
const CH_ICON: Record<string, string> = { email: '📧', sms: '💬', kakao: '💛' }
const MSG_STATUS_CLS: Record<string, string> = {
  sent: 'text-dk-dim', delivered: 'text-dk-blue', failed: 'text-dk-red', read: 'text-dk-green'
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

// ─── Section wrapper ──────────────────────────────────────
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

// ─── Add Contact Modal ────────────────────────────────────
function AddContactModal({
  companyId,
  onClose,
  onSuccess,
}: {
  companyId: string
  onClose: () => void
  onSuccess: (contact: Contact) => void
}) {
  const [form, setForm] = useState({
    name: '', title: '', department: '', phone: '', mobile: '', email: '',
    is_primary: false, is_decision_maker: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('이름은 필수입니다'); return }
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id:        companyId,
        name:              form.name.trim(),
        title:             form.title.trim()      || null,
        department:        form.department.trim() || null,
        phone:             form.phone.trim()      || null,
        mobile:            form.mobile.trim()     || null,
        email:             form.email.trim()      || null,
        is_primary:        form.is_primary,
        is_decision_maker: form.is_decision_maker,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '등록 중 오류가 발생했습니다')
      setSubmitting(false)
      return
    }
    onSuccess(json.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">담당자 추가</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">이름 <span className="text-dk-red">*</span></label>
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="홍길동" className={INPUT_CLS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">직책</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="팀장" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">부서</label>
              <input value={form.department} onChange={e => set('department', e.target.value)}
                placeholder="구매팀" className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">휴대폰</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                placeholder="010-0000-0000" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">유선번호</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="02-0000-0000" className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">이메일</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="name@company.com" className={INPUT_CLS} />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_primary}
                onChange={e => set('is_primary', e.target.checked)}
                className="w-4 h-4 rounded accent-dk-blue" />
              <span className="text-sm text-dk-muted">대표 담당자</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_decision_maker}
                onChange={e => set('is_decision_maker', e.target.checked)}
                className="w-4 h-4 rounded accent-dk-blue" />
              <span className="text-sm text-dk-muted">결정권자</span>
            </label>
          </div>

          {error && (
            <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={!form.name.trim() || submitting}
              className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? '등록 중...' : '담당자 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Contact Modal ───────────────────────────────────
function EditContactModal({
  contact,
  onClose,
  onSuccess,
}: {
  contact: Contact
  onClose: () => void
  onSuccess: (contact: Contact) => void
}) {
  const [form, setForm] = useState({
    name:              contact.name,
    title:             contact.title             ?? '',
    department:        contact.department        ?? '',
    phone:             contact.phone             ?? '',
    mobile:            contact.mobile            ?? '',
    email:             contact.email             ?? '',
    is_primary:        contact.is_primary,
    is_decision_maker: contact.is_decision_maker,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('이름은 필수입니다'); return }
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:              form.name.trim(),
        title:             form.title.trim()      || null,
        department:        form.department.trim() || null,
        phone:             form.phone.trim()      || null,
        mobile:            form.mobile.trim()     || null,
        email:             form.email.trim()      || null,
        is_primary:        form.is_primary,
        is_decision_maker: form.is_decision_maker,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '수정 중 오류가 발생했습니다')
      setSubmitting(false)
      return
    }
    onSuccess(json.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">담당자 수정</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">이름 <span className="text-dk-red">*</span></label>
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="홍길동" className={INPUT_CLS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">직책</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="팀장" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">부서</label>
              <input value={form.department} onChange={e => set('department', e.target.value)}
                placeholder="구매팀" className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">휴대폰</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                placeholder="010-0000-0000" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">유선번호</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="02-0000-0000" className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">이메일</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="name@company.com" className={INPUT_CLS} />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_primary}
                onChange={e => set('is_primary', e.target.checked)}
                className="w-4 h-4 rounded accent-dk-blue" />
              <span className="text-sm text-dk-muted">대표 담당자</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_decision_maker}
                onChange={e => set('is_decision_maker', e.target.checked)}
                className="w-4 h-4 rounded accent-dk-blue" />
              <span className="text-sm text-dk-muted">결정권자</span>
            </label>
          </div>

          {error && (
            <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={!form.name.trim() || submitting}
              className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Contact Modal ─────────────────────────────────
function DeleteContactModal({
  contact,
  onClose,
  onSuccess,
}: {
  contact: Contact
  onClose: () => void
  onSuccess: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '삭제 중 오류가 발생했습니다')
      setDeleting(false)
      return
    }
    onSuccess(contact.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-dk-text">담당자 삭제</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-dk-muted mb-1">
          <span className="font-semibold text-dk-text">{contact.name}</span> 담당자를 삭제하시겠습니까?
        </p>
        <p className="text-xs text-dk-dim mb-5">이 작업은 되돌릴 수 없습니다.</p>
        {error && (
          <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2 mb-3">{error}</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 text-sm text-white bg-dk-danger rounded-lg hover:bg-dk-dangerHover disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Task Modal ─────────────────────────────────────
function EditTaskModal({
  task,
  onClose,
  onSuccess,
}: {
  task: TaskItem
  onClose: () => void
  onSuccess: (task: TaskItem) => void
}) {
  const [form, setForm] = useState({
    title:    task.title,
    type:     task.type    ?? '',
    priority: task.priority,
    due_at:   task.due_at  ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('제목은 필수입니다'); return }
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:    form.title.trim(),
        type:     form.type    || null,
        priority: form.priority,
        due_at:   form.due_at  || null,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error?.message ?? '수정 중 오류가 발생했습니다')
      setSubmitting(false)
      return
    }
    onSuccess({
      id:       task.id,
      title:    json.data.title,
      type:     json.data.type,
      priority: json.data.priority,
      status:   json.data.status,
      due_at:   json.data.due_at,
      is_auto:  task.is_auto,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">업무 수정</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">제목 <span className="text-dk-red">*</span></label>
            <input autoFocus value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="업무 내용 입력..." className={INPUT_CLS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">유형</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={INPUT_CLS}>
                <option value="">일반</option>
                <option value="call">통화</option>
                <option value="visit">방문</option>
                <option value="email">이메일</option>
                <option value="renewal">갱신</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">우선순위</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={INPUT_CLS}>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">마감일</label>
              <input type="date" value={form.due_at} onChange={e => set('due_at', e.target.value)}
                className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">등록일시</label>
              <div className={cn(INPUT_CLS, 'text-dk-dim cursor-default select-none')}>
                {formatDateTime(task.created_at)}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={!form.title.trim() || submitting}
              className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? '수정 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Task Modal ────────────────────────────────────
function DeleteTaskModal({
  task,
  onClose,
  onSuccess,
}: {
  task: TaskItem
  onClose: () => void
  onSuccess: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      setError(json?.error?.message ?? '삭제 중 오류가 발생했습니다')
      setDeleting(false)
      return
    }
    onSuccess(task.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-dk-text mb-2">업무 삭제</h3>
        <p className="text-sm text-dk-muted mb-1">다음 업무를 삭제하시겠습니까?</p>
        <p className="text-sm text-dk-text font-medium mb-4 truncate">{task.title}</p>
        {error && (
          <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2 mb-3">{error}</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 text-sm text-white bg-dk-danger rounded-lg hover:bg-dk-dangerHover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Unified Activity Modal ───────────────────────────────
type ActivityContact = {
  id: string; name: string; title: string | null
  phone: string | null; mobile: string | null; email: string | null; is_primary: boolean
}

function UnifiedActivityModal({
  companyId,
  companyName,
  onClose,
  onSuccess,
}: {
  companyId: string
  companyName: string
  onClose: () => void
  onSuccess: (activity: Activity | null, task: TaskItem | null) => void
}) {
  const nowLocal = () => {
    const d = new Date(), pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  type ActType = 'call' | 'visit' | 'email' | 'task'
  const [type, setType]             = useState<ActType>('call')
  const [activityAt, setActivityAt] = useState(nowLocal())
  const [summary, setSummary]       = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionAt, setNextActionAt] = useState('')
  const [callResult, setCallResult] = useState('')
  const [scheduledAt, setScheduledAt]   = useState('')
  const [visitPurpose, setVisitPurpose] = useState('')
  const [taskTitle, setTaskTitle]   = useState('')
  const [priority, setPriority]     = useState('medium')
  const [dueAt, setDueAt]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const [contacts, setContacts]               = useState<ActivityContact[]>([])
  const [selectedContact, setSelectedContact] = useState<ActivityContact | null>(null)
  // 통화 시 어떤 번호로 걸지: 'mobile' | 'phone'
  const [phoneChoice, setPhoneChoice] = useState<'mobile' | 'phone'>('mobile')

  useEffect(() => {
    fetch(`/api/contacts?company_id=${companyId}`)
      .then(r => r.json())
      .then(json => {
        const list = (json.data ?? []) as ActivityContact[]
        setContacts(list)
        const primary = list.find(c => c.is_primary)
        if (primary) setSelectedContact(primary)
      })
      .catch(() => {})
  }, [companyId])

  // 담당자가 바뀔 때 사용 가능한 번호로 phoneChoice 보정
  useEffect(() => {
    if (!selectedContact) return
    if (phoneChoice === 'mobile' && !selectedContact.mobile && selectedContact.phone) {
      setPhoneChoice('phone')
    } else if (phoneChoice === 'phone' && !selectedContact.phone && selectedContact.mobile) {
      setPhoneChoice('mobile')
    }
  }, [selectedContact, phoneChoice])

  // 활동 저장 시 contact_value (사용된 번호/이메일) 결정
  const resolveContactValue = (): string | null => {
    if (!selectedContact) return null
    if (type === 'call')  return phoneChoice === 'mobile' ? selectedContact.mobile : selectedContact.phone
    if (type === 'email') return selectedContact.email
    return null
  }

  const TYPE_TABS: { value: ActType; label: string; Icon: React.ElementType; cls: string }[] = [
    { value: 'call',  label: '통화',   Icon: Phone,       cls: 'border-tint-blue-border bg-tint-blue text-dk-blue' },
    { value: 'visit', label: '방문',   Icon: Users,       cls: 'border-tint-green-border bg-tint-green text-dk-green' },
    { value: 'email', label: '이메일', Icon: Mail,        cls: 'border-tint-purple-border bg-tint-purple text-tint-purple-text' },
    { value: 'task',  label: '업무',   Icon: CheckSquare, cls: 'border-dk-border3 bg-dk-surface2 text-dk-text' },
  ]
  const CALL_BTNS = [
    { value: 'connected', label: '연결됨',   cls: 'border-tint-green-border bg-tint-green text-dk-green' },
    { value: 'no_answer', label: '부재중',   cls: 'border-tint-amber-border bg-tint-amber text-dk-orange' },
    { value: 'rejected',  label: '거절',     cls: 'border-tint-red-border bg-tint-red text-dk-red' },
    { value: 'scheduled', label: '예약통화', cls: 'border-tint-blue-border bg-tint-blue text-dk-blue' },
  ]

  const handleSubmit = async () => {
    if (type === 'call' && !callResult) { setError('통화 결과를 선택해주세요'); return }
    if (type === 'call' && callResult === 'scheduled' && !scheduledAt) { setError('약속 일시를 입력해주세요'); return }
    if (type === 'task' && !taskTitle.trim()) { setError('업무 제목을 입력해주세요'); return }
    setSubmitting(true); setError(null)

    if (type === 'task') {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:  companyId,
          title:       taskTitle.trim(),
          priority,
          due_at:      dueAt || null,
          description: summary || null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) { setError(json?.error?.message ?? '등록 중 오류가 발생했습니다'); setSubmitting(false); return }
      onSuccess(null, {
        id: json.data.id, title: json.data.title, type: json.data.type,
        priority: json.data.priority, status: json.data.status,
        due_at: json.data.due_at, is_auto: false, created_at: json.data.created_at,
      })
    } else {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:     companyId,
          contact_id:     selectedContact?.id ?? null,
          contact_value:  resolveContactValue(),
          type,
          activity_at:    new Date(activityAt).toISOString(),
          call_result:    type === 'call' ? callResult : null,
          visit_purpose:  type === 'visit' ? (visitPurpose || null) : null,
          summary:        summary || null,
          next_action:    type === 'call' && callResult === 'scheduled' ? '예약 통화' : (nextAction || null),
          next_action_at: type === 'call' && callResult === 'scheduled'
            ? new Date(scheduledAt).toISOString()
            : (nextActionAt || null),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) { setError(json?.error?.message ?? '등록 중 오류가 발생했습니다'); setSubmitting(false); return }
      onSuccess({
        id: json.data.id, type, activity_at: json.data.activity_at,
        call_result: json.data.call_result, summary: json.data.summary,
        next_action: json.data.next_action, next_action_at: json.data.next_action_at,
        contact_value: json.data.contact_value ?? null,
        contact: selectedContact ? { id: selectedContact.id, name: selectedContact.name, title: selectedContact.title } : null,
        user: null,
      }, null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">활동 추가</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        {/* 유형 선택 */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {TYPE_TABS.map(({ value, label, Icon, cls }) => (
            <button key={value}
              onClick={() => { setType(value); setError(null); setCallResult('') }}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all',
                type === value ? cls : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2 hover:text-dk-text'
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* 고객사 */}
        <div className="mb-3">
          <label className="text-xs font-medium text-dk-muted mb-1 block">고객사</label>
          <div className={cn(INPUT_CLS, 'text-dk-dim cursor-default select-none')}>{companyName}</div>
        </div>

        {/* 담당자 선택 */}
        {contacts.length > 0 && (
          <div className="mb-4">
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">담당자</label>
            <div className="flex flex-wrap gap-2">
              {contacts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedContact(prev => prev?.id === c.id ? null : c)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    selectedContact?.id === c.id
                      ? 'border-dk-blue bg-tint-blue-deep text-dk-blue'
                      : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2 hover:text-dk-text'
                  )}
                >
                  {c.name}
                  {c.title && <span className="text-[10px] opacity-70">{c.title}</span>}
                  {c.is_primary && <span className="text-[9px] border border-current px-1 rounded opacity-70">대표</span>}
                </button>
              ))}
            </div>

            {/* 선택된 담당자 연락처 */}
            {selectedContact && (type === 'call' || type === 'email') && (
              <div className="mt-2 space-y-1.5">
                {/* 통화: 휴대폰 / 유선번호 — 없으면 비활성 표시 */}
                {type === 'call' && (
                  <>
                    <p className="text-[10px] text-dk-dim">사용할 번호 선택 (저장 시 함께 기록)</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.mobile ? (
                        <a
                          href={`tel:${selectedContact.mobile}`}
                          onClick={() => setPhoneChoice('mobile')}
                          className={cn(
                            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            phoneChoice === 'mobile'
                              ? 'border-tint-green-border bg-tint-green text-dk-green'
                              : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                          )}
                        >
                          <Phone className="w-3 h-3" />
                          <span>{selectedContact.mobile}</span>
                          <span className="text-[9px] opacity-70">휴대폰</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dk-border bg-dk-surface2 text-dk-dim opacity-50 cursor-not-allowed">
                          <Phone className="w-3 h-3" />
                          <span>번호 없음</span>
                          <span className="text-[9px] opacity-70">휴대폰</span>
                        </span>
                      )}
                      {selectedContact.phone ? (
                        <a
                          href={`tel:${selectedContact.phone}`}
                          onClick={() => setPhoneChoice('phone')}
                          className={cn(
                            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            phoneChoice === 'phone'
                              ? 'border-tint-green-border bg-tint-green text-dk-green'
                              : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                          )}
                        >
                          <Phone className="w-3 h-3" />
                          <span>{selectedContact.phone}</span>
                          <span className="text-[9px] opacity-70">유선</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dk-border bg-dk-surface2 text-dk-dim opacity-50 cursor-not-allowed">
                          <Phone className="w-3 h-3" />
                          <span>번호 없음</span>
                          <span className="text-[9px] opacity-70">유선</span>
                        </span>
                      )}
                    </div>
                  </>
                )}
                {/* 이메일 — 없으면 비활성 표시 */}
                {type === 'email' && (
                  selectedContact.email ? (
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="inline-flex items-center gap-1.5 text-xs text-tint-purple-text border border-tint-purple-border bg-tint-purple px-3 py-1.5 rounded-lg hover:bg-tint-purple-border transition-colors max-w-full truncate"
                      title={selectedContact.email}
                    >
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{selectedContact.email}</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-dk-dim border border-dk-border bg-dk-surface2 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed">
                      <Mail className="w-3 h-3 shrink-0" />
                      이메일 없음
                    </span>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 통화 ── */}
        {type === 'call' && (<>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">통화 일시</label>
            <input type="datetime-local" value={activityAt} onChange={e => setActivityAt(e.target.value)} className={INPUT_CLS} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">통화 결과 <span className="text-dk-red">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {CALL_BTNS.map(btn => (
                <button key={btn.value} onClick={() => setCallResult(btn.value)}
                  className={cn(
                    'flex items-center justify-center p-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                    callResult === btn.value ? btn.cls : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                  )}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          {callResult === 'connected' && (<>
            <div className="mb-3">
              <label className="text-xs font-medium text-dk-muted mb-1 block">상담 내용</label>
              <textarea value={summary} onChange={e => setSummary(e.target.value)}
                placeholder="통화 내용 요약..." rows={3} className={cn(INPUT_CLS, 'resize-none')} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1 block">다음 액션</label>
                <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="예: 제안서 발송" className={INPUT_CLS} />
              </div>
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1 block">예정일</label>
                <input type="date" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)} className={INPUT_CLS} />
              </div>
            </div>
          </>)}
          {callResult === 'scheduled' && (
            <div className="mb-3 p-3 rounded-xl border border-tint-blue-border bg-tint-blue-deep">
              <label className="text-xs font-medium text-dk-blue mb-1.5 block">약속 일시 <span className="text-dk-red">*</span></label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className={INPUT_CLS} />
              <p className="text-[10px] text-dk-dim mt-1.5">약속 시간에 맞춰 업무가 자동 등록됩니다</p>
            </div>
          )}
        </>)}

        {/* ── 방문 ── */}
        {type === 'visit' && (<>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">방문 일시</label>
            <input type="datetime-local" value={activityAt} onChange={e => setActivityAt(e.target.value)} className={INPUT_CLS} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">방문 목적</label>
            <input value={visitPurpose} onChange={e => setVisitPurpose(e.target.value)} placeholder="예: 정기 미팅, 제안 발표" className={INPUT_CLS} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">상담 내용</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="방문 내용 요약..." rows={3} className={cn(INPUT_CLS, 'resize-none')} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">다음 액션</label>
              <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="예: 제안서 발송" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">예정일</label>
              <input type="date" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
        </>)}

        {/* ── 이메일 ── */}
        {type === 'email' && (<>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">발송 일시</label>
            <input type="datetime-local" value={activityAt} onChange={e => setActivityAt(e.target.value)} className={INPUT_CLS} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">내용 요약</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="이메일 내용 요약..." rows={3} className={cn(INPUT_CLS, 'resize-none')} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">다음 액션</label>
              <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="예: 회신 확인" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">예정일</label>
              <input type="date" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
        </>)}

        {/* ── 업무 ── */}
        {type === 'task' && (<>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">업무 제목 <span className="text-dk-red">*</span></label>
            <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="업무 내용을 입력하세요" className={INPUT_CLS} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">우선순위</label>
            <div className="flex gap-2">
              {([
                { v: 'high',   l: '높음', cls: 'border-tint-red-border bg-tint-red text-dk-red' },
                { v: 'medium', l: '보통', cls: 'border-tint-amber-border bg-tint-amber text-dk-orange' },
                { v: 'low',    l: '낮음', cls: 'border-dk-border3 bg-dk-surface2 text-dk-muted' },
              ] as const).map(({ v, l, cls }) => (
                <button key={v} onClick={() => setPriority(v)}
                  className={cn(
                    'flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all',
                    priority === v ? cls : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                  )}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">마감일</label>
            <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} className={INPUT_CLS} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-dk-muted mb-1 block">메모</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="추가 내용..." rows={2} className={cn(INPUT_CLS, 'resize-none')} />
          </div>
        </>)}

        {error && <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

const INDUSTRY_OPTIONS = [
  'IT서비스', '자동차IT', '금융IT', '통신', '제조', '유통/물류', '의료/바이오', '건설/부동산', '교육', '기타',
]

// ─── Edit Company Modal ───────────────────────────────────
type UserOption = { id: string; name: string }
type TeamOption = { id: string; name: string }

function EditCompanyModal({ company, onClose, onSaved }: {
  company: Company; onClose: () => void; onSaved: (updated: Partial<Company>) => void
}) {
  const [form, setForm] = useState({
    name:             company.name,
    biz_no:           company.biz_no         ?? '',
    industry:         company.industry       ?? '',
    company_size:     company.company_size   ?? '',
    website:          company.website        ?? '',
    address_zip:      company.address_zip    ?? '',
    address_road:     company.address_road   ?? '',
    address_detail:   company.address_detail ?? '',
    memo:             company.memo           ?? '',
    assigned_user_id: company.assigned_user?.id ?? '',
    team_id:          company.team?.id          ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [users, setUsers]   = useState<UserOption[]>([])
  const [teams, setTeams]   = useState<TeamOption[]>([])
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data ?? [])).catch(() => {})
    fetch('/api/settings/teams').then(r => r.json()).then(j => setTeams(j.data ?? [])).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) { setError('회사명은 필수입니다'); return }
    setSaving(true); setError(null)
    const res = await fetch(`/api/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:             form.name.trim(),
        biz_no:           form.biz_no.trim()         || null,
        industry:         form.industry              || null,
        company_size:     form.company_size          || null,
        website:          form.website.trim()        || null,
        address_zip:      form.address_zip           || null,
        address_road:     form.address_road          || null,
        address_detail:   form.address_detail.trim() || null,
        memo:             form.memo.trim()           || null,
        assigned_user_id: form.assigned_user_id      || null,
        team_id:          form.team_id               || null,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { setError(json?.error?.message ?? '저장 실패'); setSaving(false); return }
    const resolvedUser = form.assigned_user_id
      ? (users.find(u => u.id === form.assigned_user_id) ?? null)
      : null
    const resolvedTeam = form.team_id
      ? (teams.find(t => t.id === form.team_id) ?? null)
      : null
    onSaved({
      name:           form.name.trim(),
      biz_no:         form.biz_no.trim()         || null,
      industry:       form.industry              || null,
      company_size:   form.company_size          || null,
      website:        form.website.trim()        || null,
      address_zip:    form.address_zip           || null,
      address_road:   form.address_road          || null,
      address_detail: form.address_detail.trim() || null,
      memo:           form.memo.trim()           || null,
      assigned_user:  resolvedUser,
      team:           resolvedTeam,
    })
    onClose()
  }

  const IC = 'w-full px-3 py-2 border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dk-blue'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">기업 정보 수정</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">회사명 <span className="text-dk-red">*</span></label>
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)} placeholder="(주)회사명" className={IC} />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">사업자등록번호</label>
            <input value={form.biz_no} onChange={e => set('biz_no', e.target.value)} placeholder="000-00-00000" className={IC} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">업종</label>
              <select value={form.industry} onChange={e => set('industry', e.target.value)} className={IC}>
                <option value="">선택</option>
                {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">기업 규모</label>
              <select value={form.company_size} onChange={e => set('company_size', e.target.value)} className={IC}>
                <option value="">선택</option>
                <option value="large">대기업</option>
                <option value="medium">중견기업</option>
                <option value="small">중소기업</option>
                <option value="startup">스타트업</option>
              </select>
            </div>
          </div>
          {users.length > 0 && (
            <div className={cn('grid gap-3', teams.length > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1 block">담당자</label>
                <select value={form.assigned_user_id} onChange={e => set('assigned_user_id', e.target.value)} className={IC}>
                  <option value="">없음</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              {teams.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-dk-muted mb-1 block">팀</label>
                  <select value={form.team_id} onChange={e => set('team_id', e.target.value)} className={IC}>
                    <option value="">없음</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">주소</label>
            <div className="flex gap-2 mb-2">
              <input readOnly value={form.address_zip} placeholder="우편번호"
                className={cn(IC, 'w-24 bg-dk-surface cursor-default')} />
              <button type="button"
                onClick={() => new window.daum.Postcode({
                  oncomplete: (d: DaumAddr) => {
                    set('address_zip', d.zonecode)
                    set('address_road', d.userSelectedType === 'J' ? d.jibunAddress : d.roadAddress)
                  }
                }).open()}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover shrink-0">
                <MapPin className="w-3.5 h-3.5" /> 주소 검색
              </button>
            </div>
            <input readOnly value={form.address_road} placeholder="도로명주소 (검색 후 자동 입력)"
              className={cn(IC, 'mb-2 bg-dk-surface cursor-default')} />
            <input value={form.address_detail} onChange={e => set('address_detail', e.target.value)}
              placeholder="상세주소 (동/호수, 층 등)" className={IC} />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">웹사이트</label>
            <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" className={IC} />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">메모</label>
            <textarea value={form.memo} onChange={e => set('memo', e.target.value)}
              rows={3} placeholder="특이사항, 영업 배경..." className={IC + ' resize-none'} />
          </div>
          {error && <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 flex items-center justify-center gap-1 transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Address Modal ───────────────────────────────────
declare global {
  interface Window {
    daum: { Postcode: new (opts: { oncomplete: (d: DaumAddr) => void }) => { open: () => void } }
  }
}
type DaumAddr = { zonecode: string; roadAddress: string; jibunAddress: string; userSelectedType: 'R' | 'J' }

function EditAddressModal({ company, onClose, onSaved }: {
  company: Company; onClose: () => void; onSaved: (updated: Partial<Company>) => void
}) {
  const [zip, setZip]       = useState(company.address_zip    ?? '')
  const [road, setRoad]     = useState(company.address_road   ?? '')
  const [detail, setDetail] = useState(company.address_detail ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const searchAddress = () => {
    new window.daum.Postcode({
      oncomplete: (d: DaumAddr) => {
        setZip(d.zonecode)
        setRoad(d.userSelectedType === 'J' ? d.jibunAddress : d.roadAddress)
      },
    }).open()
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    const res = await fetch(`/api/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address_zip: zip || null, address_road: road || null, address_detail: detail || null }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { setError(json?.error?.message ?? '저장 실패'); setSaving(false); return }
    onSaved({ address_zip: zip || null, address_road: road || null, address_detail: detail || null })
    onClose()
  }

  const INPUT_CLS = 'w-full px-3 py-2 border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dk-blue'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">주소 수정</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">우편번호 · 도로명주소</label>
            <div className="flex gap-2 mb-2">
              <input readOnly value={zip} placeholder="우편번호" className={cn(INPUT_CLS, 'w-24 bg-dk-surface cursor-default')} />
              <button type="button" onClick={searchAddress}
                className="px-3 py-2 text-xs font-medium text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover flex items-center gap-1 shrink-0">
                <MapPin className="w-3.5 h-3.5" /> 주소 검색
              </button>
            </div>
            <input readOnly value={road} placeholder="도로명주소" className={cn(INPUT_CLS, 'bg-dk-surface cursor-default')} />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">상세주소</label>
            <input value={detail} onChange={e => setDetail(e.target.value)}
              placeholder="동/호수, 층 등" className={INPUT_CLS} />
          </div>
          {error && <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 flex items-center justify-center gap-1 transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: 개요 ────────────────────────────────────────────
function TabOverview({ company: initialCompany, contracts }: { company: Company; contracts: Contract[] }) {
  const [company, setCompany] = useState(initialCompany)
  const [showEditCompany, setShowEditCompany] = useState(false)
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null)
  const [locSaving, setLocSaving] = useState(false)

  const handleMarkerChange = useCallback((lat: number, lng: number) => {
    setMarkerPos({ lat, lng })
  }, [])

  const saveCoords = async () => {
    if (!markerPos) return
    setLocSaving(true)
    const res = await fetch(`/api/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: markerPos.lat, lng: markerPos.lng }),
    })
    setLocSaving(false)
    if (res.ok) {
      setCompany(prev => ({ ...prev, lat: markerPos.lat, lng: markerPos.lng }))
      setMarkerPos(null)
    }
  }

  const clearCoords = async () => {
    setLocSaving(true)
    const res = await fetch(`/api/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: null, lng: null }),
    })
    setLocSaving(false)
    if (res.ok) {
      setCompany(prev => ({ ...prev, lat: null, lng: null }))
      setMarkerPos(null)
    }
  }

  const activeContract = contracts.find(co => co.status === 'active')
  const dday = activeContract ? calcDday(activeContract.expires_at) : null
  const risk = company.renewal_risk ? RISK_CFG[company.renewal_risk] : null
  const RiskIcon = risk?.icon

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Section title="기업 정보" action={
          <button onClick={() => setShowEditCompany(true)}
            className="flex items-center gap-1.5 text-xs text-dk-blue border border-tint-blue-border px-3 py-1.5 rounded-lg hover:bg-tint-blue transition-colors">
            <Pencil className="w-3.5 h-3.5" /> 정보수정
          </button>
        }>
          <div className="space-y-3">
            {[
              { label: '사업자번호', value: company.biz_no },
              { label: '업종',       value: company.industry },
              { label: '규모',       value: company.company_size === 'large' ? '대기업' : company.company_size ? '중소기업' : null },
              { label: '담당자',     value: company.assigned_user ? `${company.assigned_user.name}${company.team ? ` · ${company.team.name}` : ''}` : null },
            ].filter(f => f.value).map(f => (
              <div key={f.label} className="flex justify-between">
                <span className="text-xs text-dk-dim">{f.label}</span>
                <span className="text-xs text-dk-text font-medium">{f.value}</span>
              </div>
            ))}
            {company.website && (
              <div className="flex justify-between">
                <span className="text-xs text-dk-dim">웹사이트</span>
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-dk-blue hover:underline truncate max-w-[150px]">
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs text-dk-dim shrink-0">주소</span>
              {(company.address_zip || company.address_road) ? (
                <span className="text-xs text-dk-text text-right">
                  {company.address_zip && <span className="text-dk-dim mr-1">[{company.address_zip}]</span>}
                  {company.address_road}
                  {company.address_detail && <span className="text-dk-muted"> {company.address_detail}</span>}
                </span>
              ) : (
                <span className="text-xs text-dk-dim">—</span>
              )}
            </div>
          </div>
        </Section>

        <div className="flex flex-col gap-3 h-full">
          <div className={cn(
            'flex-1 border rounded-xl p-4',
            !activeContract
              ? 'bg-dk-surface border-dk-border'
              : dday !== null && dday <= 14
                ? 'bg-tint-red border-tint-red-border'
                : dday !== null && dday <= 30
                  ? 'bg-tint-amber border-tint-amber-border'
                  : 'bg-dk-surface2 border-dk-border'
          )}>
            <p className="text-xs text-dk-muted mb-1">현재 계약</p>
            {activeContract && dday !== null ? (
              <>
                <p className="text-xl font-bold text-dk-text font-mono">{formatAmount(activeContract.final_amount)}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-dk-muted">{activeContract.product?.name ?? '—'}</p>
                  <span className={cn('text-sm font-bold font-mono', getDdayClass(dday))}>
                    {dday >= 0 ? `D-${dday}` : '만료'}
                  </span>
                </div>
                <Link href={`/app/contracts/${activeContract.id}`}
                  className="mt-2 text-xs text-dk-blue hover:underline flex items-center gap-0.5">
                  계약 상세 <ChevronRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-dk-dim font-mono">—</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-dk-dim">등록된 계약 없음</p>
                  <span className="text-sm font-bold font-mono text-dk-dim">—</span>
                </div>
                <span className="mt-2 text-xs invisible flex items-center gap-0.5">계약 상세</span>
              </>
            )}
          </div>
          <div className={cn('border rounded-xl p-4', risk ? risk.cls : 'bg-dk-surface border-dk-border')}>
            <div className="flex items-center gap-2">
              {risk && RiskIcon
                ? <><RiskIcon className="w-4 h-4" /><span className="text-sm font-semibold">{risk.label} 위험도</span></>
                : <><AlertCircle className="w-4 h-4 text-dk-dim" /><span className="text-sm font-semibold text-dk-dim">위험도 미산정</span></>
              }
            </div>
          </div>
        </div>
      </div>

      {company.memo && (
        <Section title="메모">
          <p className="text-sm text-dk-muted leading-relaxed">{company.memo}</p>
        </Section>
      )}

      {company.address_road && (
        <Section title="회사 위치" action={
          <div className="flex items-center gap-2">
            <button
              onClick={saveCoords}
              disabled={!markerPos || locSaving}
              className="flex items-center gap-1.5 text-xs text-dk-blue border border-tint-blue-border px-3 py-1.5 rounded-lg hover:bg-tint-blue transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {locSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              변경위치 저장
            </button>
            <button
              onClick={clearCoords}
              disabled={locSaving || (company.lat === null && company.lng === null)}
              className="flex items-center gap-1.5 text-xs text-dk-blue border border-tint-blue-border px-3 py-1.5 rounded-lg hover:bg-tint-blue transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              주소로 표기
            </button>
          </div>
        }>
          <KakaoMap
            address={company.address_detail ? `${company.address_road} ${company.address_detail}` : company.address_road}
            savedLat={company.lat}
            savedLng={company.lng}
            onMarkerChange={handleMarkerChange}
          />
        </Section>
      )}

      {showEditCompany && (
        <EditCompanyModal
          company={company}
          onClose={() => setShowEditCompany(false)}
          onSaved={updated => setCompany(prev => ({ ...prev, ...updated }))}
        />
      )}
    </div>
  )
}

// ─── Tab: 담당자 ──────────────────────────────────────────
function TabContacts({ contacts: initialContacts, companyId }: { contacts: Contact[]; companyId: string }) {
  const [contacts, setContacts]           = useState(initialContacts)
  const [showAddModal, setShowAddModal]   = useState(false)
  const [editContact, setEditContact]     = useState<Contact | null>(null)
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null)
  const [openMenu, setOpenMenu]           = useState<string | null>(null)
  const [sendContact, setSendContact]     = useState<Contact | null>(null)

  const handleAddSuccess = (contact: Contact) => {
    setContacts(prev => [contact, ...prev])
    setShowAddModal(false)
  }

  const handleEditSuccess = (updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditContact(null)
  }

  const handleDeleteSuccess = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id))
    setDeleteContact(null)
  }

  // 권한순 정렬: 대표담당자 → 결정권자 → 일반
  const sorted = [...contacts].sort((a, b) => {
    const score = (c: Contact) => c.is_primary ? 2 : c.is_decision_maker ? 1 : 0
    return score(b) - score(a)
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs text-dk-blue border border-tint-blue-border px-3 py-1.5 rounded-lg hover:bg-tint-blue transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 담당자 추가
        </button>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-dk-dim text-center py-8">등록된 담당자가 없습니다</p>
      )}
      {sorted.map(ct => (
        <div key={ct.id} className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue font-bold text-sm shrink-0">
                {ct.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-dk-text">{ct.name}</p>
                  {ct.is_primary && <span className="text-[10px] bg-tint-blue text-dk-blue px-1.5 py-0.5 rounded-full">대표담당</span>}
                  {ct.is_decision_maker && <span className="text-[10px] bg-tint-purple text-dk-purple px-1.5 py-0.5 rounded-full">결정권자</span>}
                </div>
                <p className="text-xs text-dk-dim mt-0.5">{[ct.title, ct.department].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === ct.id ? null : ct.id)}
                className="p-1 rounded-lg hover:bg-dk-surface2 text-dk-dim"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {openMenu === ct.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                  <div className="absolute right-0 top-7 z-20 bg-dk-surface2 border border-dk-border rounded-lg shadow-xl py-1 w-28">
                    <button
                      onClick={() => { setEditContact(ct); setOpenMenu(null) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dk-text hover:bg-dk-surface transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-dk-muted" /> 수정
                    </button>
                    <button
                      onClick={() => { setDeleteContact(ct); setOpenMenu(null) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dk-red hover:bg-tint-red transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dk-border flex-wrap">
            {ct.mobile && <a href={`tel:${ct.mobile}`} className="flex items-center gap-1 text-xs text-dk-muted hover:text-dk-blue"><Phone className="w-3 h-3" />{ct.mobile}</a>}
            {ct.phone  && <a href={`tel:${ct.phone}`}  className="flex items-center gap-1 text-xs text-dk-muted hover:text-dk-blue"><Phone className="w-3 h-3" />{ct.phone}<span className="text-[9px] text-dk-dim ml-0.5">유선</span></a>}
            {ct.email  && <a href={`mailto:${ct.email}`} className="flex items-center gap-1 text-xs text-dk-muted hover:text-dk-blue"><Mail className="w-3 h-3" />{ct.email}</a>}
            {(ct.mobile || ct.email) && (
              <button
                onClick={() => setSendContact(ct)}
                className="ml-auto flex items-center gap-1 text-xs text-dk-blue hover:text-dk-blue/70 transition-colors"
              >
                <Send className="w-3 h-3" />메시지 발송
              </button>
            )}
          </div>
        </div>
      ))}

      {showAddModal && (
        <AddContactModal
          companyId={companyId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
      {editContact && (
        <EditContactModal
          contact={editContact}
          onClose={() => setEditContact(null)}
          onSuccess={handleEditSuccess}
        />
      )}
      {deleteContact && (
        <DeleteContactModal
          contact={deleteContact}
          onClose={() => setDeleteContact(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
      {sendContact && (
        <SendModal
          onClose={() => setSendContact(null)}
          initialChannel={sendContact.email && !sendContact.mobile ? 'email' : 'sms'}
          initialTo={sendContact.mobile ?? sendContact.email ?? ''}
          companyId={companyId}
          contactId={sendContact.id}
        />
      )}
    </div>
  )
}

// ─── Add Contract Modal ───────────────────────────────────
function AddContractModal({
  companyId,
  onClose,
  onSuccess,
}: {
  companyId: string
  onClose: () => void
  onSuccess: (contract: Contract) => void
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
    if (!form.started_at)  { setError('시작일을 입력해 주세요'); return }
    if (!form.expires_at)  { setError('만료일을 입력해 주세요'); return }
    if (!form.amount)      { setError('계약금액을 입력해 주세요'); return }

    setSubmitting(true); setError(null)
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id:     companyId,
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
      id:           json.data.id,
      contract_no:  json.data.contract_no ?? '',
      started_at:   json.data.started_at,
      expires_at:   json.data.expires_at,
      final_amount: json.data.final_amount ?? finalAmount,
      status:       json.data.status,
      is_paid:      json.data.is_paid,
      product:      product ? { id: product.id, name: product.name } : null,
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
            <label className="text-xs font-medium text-dk-muted mb-1 block">제품</label>
            <select value={form.product_id} onChange={e => set('product_id', e.target.value)} className={INPUT_CLS}>
              <option value="">선택 (선택사항)</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

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
              <span className="text-sm font-bold text-dk-text font-mono">
                {finalAmount.toLocaleString('ko-KR')}원
                {discountPct > 0 && <span className="text-xs text-dk-green ml-1.5">(-{discountPct}%)</span>}
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
            <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? '등록 중...' : '계약 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tab: 계약 ────────────────────────────────────────────
function TabContracts({ contracts: initialContracts, companyId }: { contracts: Contract[]; companyId: string }) {
  const [contracts, setContracts] = useState(initialContracts)
  const [showModal, setShowModal] = useState(false)

  const handleSuccess = (contract: Contract) => {
    setContracts(prev => [contract, ...prev])
    setShowModal(false)
  }

  const sorted = [...contracts].sort((a, b) =>
    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-xs text-dk-blue border border-tint-blue-border px-3 py-1.5 rounded-lg hover:bg-tint-blue transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 계약 등록
        </button>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-dk-dim text-center py-8">등록된 계약이 없습니다</p>
      )}
      {sorted.map(co => {
        const dday = calcDday(co.expires_at)
        return (
          <Link key={co.id} href={`/app/contracts/${co.id}`}
            className="block bg-dk-surface border border-dk-border rounded-xl p-4 hover:border-dk-blue/40 hover:bg-dk-surface2 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-dk-text">{co.product?.name ?? '—'}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', CONTRACT_STATUS_CLS[co.status])}>
                    {CONTRACT_STATUS_LABEL[co.status]}
                  </span>
                </div>
                <p className="text-xs text-dk-dim mt-0.5">{co.contract_no}</p>
                <p className="text-xs text-dk-dim">{formatDate(co.started_at)} ~ {formatDate(co.expires_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-dk-text font-mono">{formatAmount(co.final_amount)}</p>
                {co.status === 'active' && (
                  <span className={cn('text-xs font-mono', getDdayClass(dday))}>D-{dday}</span>
                )}
              </div>
            </div>
          </Link>
        )
      })}

      {showModal && (
        <AddContractModal
          companyId={companyId}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

// ─── Edit Activity Modal ──────────────────────────────────
function EditActivityModal({
  activity,
  onClose,
  onSuccess,
}: {
  activity: Activity
  onClose: () => void
  onSuccess: (updated: Activity) => void
}) {
  const toLocalDT = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [callResult, setCallResult] = useState(activity.call_result ?? '')
  const [activityAt, setActivityAt] = useState(toLocalDT(activity.activity_at))
  const [summary, setSummary]       = useState(activity.summary ?? '')
  const [nextAction, setNextAction] = useState(activity.next_action ?? '')
  const [nextActionAt, setNextActionAt] = useState(activity.next_action_at?.slice(0,10) ?? '')
  const [scheduledAt, setScheduledAt]   = useState(
    activity.call_result === 'scheduled' && activity.next_action_at
      ? toLocalDT(activity.next_action_at)
      : ''
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const RESULT_BTNS = [
    { value: 'connected', label: '연결됨',  cls: 'border-tint-green-border bg-tint-green text-dk-green' },
    { value: 'no_answer', label: '부재중',  cls: 'border-tint-amber-border bg-tint-amber text-dk-orange' },
    { value: 'rejected',  label: '거절',    cls: 'border-tint-red-border bg-tint-red text-dk-red' },
    { value: 'scheduled', label: '예약통화', cls: 'border-tint-blue-border bg-tint-blue text-dk-blue' },
  ]

  const handleSubmit = async () => {
    if (callResult === 'scheduled' && !scheduledAt) {
      setError('약속 일시를 입력해주세요'); return
    }
    setSubmitting(true); setError(null)
    const body: Record<string, unknown> = {
      activity_at:    new Date(activityAt).toISOString(),
      summary:        summary        || null,
      next_action:    callResult === 'scheduled' ? '예약 통화' : (nextAction || null),
      next_action_at: callResult === 'scheduled'
        ? new Date(scheduledAt).toISOString()
        : (nextActionAt || null),
    }
    if (activity.type === 'call') body.call_result = callResult || null

    const res = await fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { setError(json?.error?.message ?? '수정 중 오류가 발생했습니다'); setSubmitting(false); return }
    onSuccess({
      ...activity,
      activity_at:    json.data.activity_at,
      call_result:    json.data.call_result,
      summary:        json.data.summary,
      next_action:    json.data.next_action,
      next_action_at: json.data.next_action_at,
    })
  }

  const ACTIVITY_LABEL: Record<string, string> = { call: '통화', visit: '방문', email: '이메일', sms: 'SMS', kakao: '카카오' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">
            {ACTIVITY_LABEL[activity.type] ?? '활동'} 수정
          </h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">일시</label>
            <input type="datetime-local" value={activityAt} onChange={e => setActivityAt(e.target.value)}
              className={INPUT_CLS} />
          </div>

          {activity.type === 'call' && (
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">통화 결과</label>
              <div className="grid grid-cols-2 gap-2">
                {RESULT_BTNS.map(btn => (
                  <button key={btn.value} onClick={() => setCallResult(btn.value)}
                    className={cn(
                      'flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                      callResult === btn.value ? btn.cls : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border'
                    )}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">내용</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="내용 입력..." rows={3} className={cn(INPUT_CLS, 'resize-none')} />
          </div>

          {callResult === 'scheduled' ? (
            <div className="p-3 rounded-xl border border-tint-blue-border bg-tint-blue-deep">
              <label className="text-xs font-medium text-dk-blue mb-1.5 block">
                약속 일시 <span className="text-dk-red">*</span>
              </label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className={INPUT_CLS} />
              <p className="text-[10px] text-dk-dim mt-1.5">약속 시간에 맞춰 업무가 자동 등록됩니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1 block">다음 액션</label>
                <input value={nextAction} onChange={e => setNextAction(e.target.value)}
                  placeholder="예: 제안서 발송" className={INPUT_CLS} />
              </div>
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1 block">예정일</label>
                <input type="date" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)}
                  className={INPUT_CLS} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg px-3 py-2 mt-3">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: 활동이력 (활동 + 업무 통합) ────────────────────
type MixedItem =
  | { kind: 'activity'; data: Activity;  date: string }
  | { kind: 'task';     data: TaskItem;  date: string }

function TabActivityHistory({
  activities,
  tasks: initialTasks,
  companyId,
  companyName,
}: {
  activities: Activity[]
  tasks: TaskItem[]
  companyId: string
  companyName: string
}) {
  const [localActivities, setLocalActivities] = useState(activities)
  const [tasks, setTasks]             = useState(initialTasks)

  useEffect(() => {
    setLocalActivities(prev => {
      const knownIds = new Set(prev.map(a => a.id))
      const added = activities.filter(a => !knownIds.has(a.id))
      return added.length > 0 ? [...added, ...prev] : prev
    })
  }, [activities])
  const [showUnified, setShowUnified] = useState(false)
  // 업무 ··· 메뉴
  const [openMenu, setOpenMenu]       = useState<string | null>(null)
  const [menuPos, setMenuPos]         = useState<{ top: number; right: number } | null>(null)
  const [editTask, setEditTask]       = useState<TaskItem | null>(null)
  const [deleteTask, setDeleteTask]   = useState<TaskItem | null>(null)
  // 활동 ··· 메뉴
  const [openActMenu, setOpenActMenu] = useState<string | null>(null)
  const [actMenuPos, setActMenuPos]   = useState<{ top: number; right: number } | null>(null)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)

  const fmtDate = (d: Date) => d.toISOString().slice(0, 10)
  const todayStr = fmtDate(new Date())
  const weekAgo  = fmtDate(new Date(Date.now() - 6 * 864e5))
  const [from, setFrom] = useState(weekAgo)
  const [to,   setTo]   = useState(todayStr)

  const handleUnifiedSuccess = (activity: Activity | null, task: TaskItem | null) => {
    if (activity) setLocalActivities(prev => [activity, ...prev])
    if (task) setTasks(prev => [task, ...prev])
    setShowUnified(false)
  }
  const handleTaskEdit   = (updated: TaskItem) => { setTasks(prev => prev.map(t => t.id === updated.id ? updated : t)); setEditTask(null) }
  const handleTaskDelete = (id: string)        => { setTasks(prev => prev.filter(t => t.id !== id)); setDeleteTask(null) }
  const handleActivityEdit = (updated: Activity) => {
    setLocalActivities(prev => prev.map(a => a.id === updated.id ? updated : a))
    setEditActivity(null)
  }

  const buildMixed = (): MixedItem[] => {
    const acts: MixedItem[] = localActivities.map(a => ({ kind: 'activity', data: a, date: a.activity_at }))
    const tsks: MixedItem[] = tasks.map(t => ({ kind: 'task', data: t, date: t.created_at ?? '' }))
    return [...acts, ...tsks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const allItems = buildMixed()
  const displayItems = (from && to)
    ? allItems.filter(item => {
        const d = new Date(item.date).getTime()
        return d >= new Date(from).getTime() && d <= new Date(to + 'T23:59:59').getTime()
      })
    : allItems

  const callCnt  = displayItems.filter(i => i.kind === 'activity' && (i.data as Activity).type === 'call').length
  const visitCnt = displayItems.filter(i => i.kind === 'activity' && (i.data as Activity).type === 'visit').length
  const emailCnt = displayItems.filter(i => i.kind === 'activity' && (i.data as Activity).type === 'email').length
  const taskCnt  = displayItems.filter(i => i.kind === 'task').length

  const activeMenuTask = openMenu && menuPos
    ? (tasks.find(x => x.id === openMenu) ?? null)
    : null
  const activeActMenuActivity = openActMenu && actMenuPos
    ? (localActivities.find(x => x.id === openActMenu) ?? null)
    : null

  const ACTIVITY_TYPE_LABEL: Record<string, string> = { call: '통화', visit: '방문', email: '이메일', sms: 'SMS', kakao: '카카오' }

  return (
    <div className="flex flex-col h-full gap-2">
      {/* 검색바 — 고정 */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap pb-1">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="text-xs bg-dk-surface2 border border-dk-border rounded-lg px-2 py-1.5 text-dk-text focus:outline-none focus:border-dk-blue" />
        <span className="text-xs text-dk-dim">~</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className="text-xs bg-dk-surface2 border border-dk-border rounded-lg px-2 py-1.5 text-dk-text focus:outline-none focus:border-dk-blue" />
        <button
          onClick={() => { setFrom(weekAgo); setTo(todayStr) }}
          className="text-xs text-dk-muted hover:text-dk-text border border-dk-border px-2 py-1.5 rounded-lg hover:bg-dk-surface2 transition-colors"
        >최근 7일</button>
        <div className="flex-1" />
        <button onClick={() => setShowUnified(true)}
          className="flex items-center gap-1.5 text-xs text-dk-blue border border-tint-blue-border px-3 py-1.5 rounded-lg hover:bg-tint-blue transition-colors">
          <Plus className="w-3.5 h-3.5" /> 활동 추가
        </button>
      </div>

      {/* 집계 */}
      <div className="shrink-0 flex items-center gap-3 px-1 py-1.5 bg-dk-surface2 border border-dk-border rounded-lg text-xs">
        <span className="text-dk-dim pl-1">{from} ~ {to}</span>
        <span className="text-dk-border">|</span>
        <span className="text-dk-muted">통화 <strong className="text-dk-text">{callCnt}</strong></span>
        <span className="text-dk-muted">방문 <strong className="text-dk-text">{visitCnt}</strong></span>
        <span className="text-dk-muted">이메일 <strong className="text-dk-text">{emailCnt}</strong></span>
        <span className="text-dk-muted">업무 <strong className="text-dk-text">{taskCnt}</strong></span>
        <span className="text-dk-dim ml-auto pr-1">총 {displayItems.length}건</span>
      </div>

      {/* 통합 목록 — 스크롤 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-20">
        {displayItems.length === 0 && (
          <p className="text-sm text-dk-dim text-center py-8">해당 기간에 이력이 없습니다</p>
        )}

        {displayItems.map(item => {
          if (item.kind === 'activity') {
            const a = item.data
            return (
              <div key={`a-${a.id}`} className="flex items-start gap-3 bg-dk-surface border border-dk-border rounded-xl px-4 py-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', ACTIVITY_ICON_CLS[a.type] ?? 'bg-dk-surface2 text-dk-muted')}>
                  {a.type === 'call'  ? <Phone       className="w-3.5 h-3.5" /> :
                   a.type === 'visit' ? <Users       className="w-3.5 h-3.5" /> :
                                        <Mail        className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-dk-text">{ACTIVITY_TYPE_LABEL[a.type] ?? a.type}</span>
                    {a.call_result && (
                      <span className={cn('text-xs', CALL_RESULT_CLS[a.call_result])}>
                        {CALL_RESULT_LABEL[a.call_result]}
                      </span>
                    )}
                    {a.contact && (
                      <span className="text-[10px] text-dk-dim">
                        {a.contact.name}{a.contact.title ? ` · ${a.contact.title}` : ''}
                      </span>
                    )}
                    <span className="text-[10px] text-dk-dim ml-auto">{a.user?.name}</span>
                  </div>
                  {/* 사용된 연락처 표기 */}
                  {a.contact_value && (a.type === 'call' || a.type === 'email') && (
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      {a.type === 'call'
                        ? <span className="inline-flex items-center gap-1 text-dk-green border border-tint-green-border bg-tint-green px-1.5 py-0.5 rounded">
                            <Phone className="w-2.5 h-2.5" />
                            {a.contact_value}
                          </span>
                        : <span className="inline-flex items-center gap-1 text-tint-purple-text border border-tint-purple-border bg-tint-purple px-1.5 py-0.5 rounded max-w-full">
                            <Mail className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{a.contact_value}</span>
                          </span>
                      }
                    </div>
                  )}
                  {a.summary && <p className="text-xs text-dk-muted mt-0.5">{a.summary}</p>}
                  {a.next_action_at && (
                    <p className="text-[10px] text-dk-blue mt-0.5">다음: {a.next_action} ({formatDate(a.next_action_at)})</p>
                  )}
                </div>
                <p className="text-[10px] text-dk-dim shrink-0">{formatDate(a.activity_at)}</p>
                <div className="shrink-0">
                  <button
                    onClick={(e) => {
                      if (openActMenu === a.id) { setOpenActMenu(null); setActMenuPos(null) }
                      else {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const dropH = 48
                        const top = window.innerHeight - rect.bottom < dropH + 8 ? rect.top - dropH - 4 : rect.bottom + 4
                        setActMenuPos({ top, right: window.innerWidth - rect.right })
                        setOpenActMenu(a.id)
                      }
                    }}
                    className="p-1 rounded text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          }

          // task
          const t = item.data
          return (
            <div key={`t-${t.id}`} className="flex items-center gap-3 bg-dk-surface border border-dk-border rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-dk-surface2 border border-dk-border flex items-center justify-center shrink-0">
                <CheckSquare className="w-3.5 h-3.5 text-dk-muted" />
              </div>
              <p className="flex-1 text-sm text-dk-text">{t.title}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded border shrink-0', TASK_STATUS_CLS[t.status] ?? 'text-dk-dim border-dk-border')}>
                {TASK_STATUS_LABEL[t.status] ?? t.status}
              </span>
              {t.is_auto && <span className="text-[9px] border border-tint-blue-border text-dk-blue px-1 py-0.5 rounded shrink-0">자동</span>}
              {t.type && (
                <span className="text-[10px] text-dk-dim px-1.5 py-0.5 bg-dk-surface2 rounded border border-dk-border shrink-0">
                  {t.type === 'call' ? '통화' : t.type === 'visit' ? '방문' : t.type === 'email' ? '이메일' : t.type === 'renewal' ? '갱신' : t.type}
                </span>
              )}
              {t.due_at && <p className="text-xs text-dk-dim shrink-0">{formatDate(t.due_at)}</p>}
              <div className="shrink-0">
                <button
                  onClick={(e) => {
                    if (openMenu === t.id) { setOpenMenu(null); setMenuPos(null) }
                    else {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const dropH = 80
                      const top = window.innerHeight - rect.bottom < dropH + 8
                        ? rect.top - dropH - 4
                        : rect.bottom + 4
                      setMenuPos({ top, right: window.innerWidth - rect.right })
                      setOpenMenu(t.id)
                    }
                  }}
                  className="p-1 rounded text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ··· 드롭다운 — fixed */}
      {activeMenuTask && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpenMenu(null); setMenuPos(null) }} />
          <div className="fixed z-50 w-24 bg-dk-surface border border-dk-border rounded-lg shadow-xl overflow-hidden"
            style={{ top: menuPos.top, right: menuPos.right }}>
            <button onClick={() => { setEditTask(activeMenuTask); setOpenMenu(null); setMenuPos(null) }}
              className="w-full text-left px-3 py-2 text-xs text-dk-text hover:bg-dk-surface2 transition-colors">수정</button>
            <button onClick={() => { setDeleteTask(activeMenuTask); setOpenMenu(null); setMenuPos(null) }}
              className="w-full text-left px-3 py-2 text-xs text-dk-red hover:bg-dk-surface2 transition-colors">삭제</button>
          </div>
        </>
      )}

      {/* 활동 ··· 드롭다운 — fixed */}
      {activeActMenuActivity && actMenuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpenActMenu(null); setActMenuPos(null) }} />
          <div className="fixed z-50 w-20 bg-dk-surface border border-dk-border rounded-lg shadow-xl overflow-hidden"
            style={{ top: actMenuPos.top, right: actMenuPos.right }}>
            <button onClick={() => { setEditActivity(activeActMenuActivity); setOpenActMenu(null); setActMenuPos(null) }}
              className="w-full text-left px-3 py-2 text-xs text-dk-text hover:bg-dk-surface2 transition-colors">수정</button>
          </div>
        </>
      )}

      {showUnified && <UnifiedActivityModal companyId={companyId} companyName={companyName} onClose={() => setShowUnified(false)} onSuccess={handleUnifiedSuccess} />}
      {editTask && <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSuccess={handleTaskEdit} />}
      {deleteTask && <DeleteTaskModal task={deleteTask} onClose={() => setDeleteTask(null)} onSuccess={handleTaskDelete} />}
      {editActivity && <EditActivityModal activity={editActivity} onClose={() => setEditActivity(null)} onSuccess={handleActivityEdit} />}
    </div>
  )
}

// ─── Tab: 발송이력 ────────────────────────────────────────
function TabMessages({ messages }: { messages: Message[] }) {
  const sorted = [...messages].sort((a, b) =>
    new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  )

  return (
    <div className="space-y-2">
      {sorted.length === 0 && (
        <p className="text-sm text-dk-dim text-center py-8">발송 이력이 없습니다</p>
      )}
      {sorted.map(m => (
        <div key={m.id} className="flex items-start gap-3 bg-dk-surface border border-dk-border rounded-xl px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">{CH_ICON[m.channel] ?? '📋'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-dk-muted leading-relaxed">{m.content}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={cn('text-[10px] font-medium capitalize', MSG_STATUS_CLS[m.status] ?? 'text-dk-dim')}>{m.status}</p>
            <p className="text-[10px] text-dk-dim mt-0.5">{formatDate(m.sent_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const TASK_STATUS_CLS: Record<string, string> = {
  todo:       'text-dk-muted  bg-dk-surface2  border-dk-border',
  in_progress:'text-dk-blue bg-tint-blue   border-tint-blue-border',
  done:       'text-dk-green bg-tint-green   border-tint-green-border',
  cancelled:  'text-dk-muted bg-dk-surface2  border-dk-border',
}
const TASK_STATUS_LABEL: Record<string, string> = {
  todo: '미완료', in_progress: '진행중', done: '완료', cancelled: '취소',
}

// ─── Main ─────────────────────────────────────────────────
export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [tab, setTab] = useState('개요')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<{
    company: Company
    contacts: Contact[]
    contracts: Contract[]
    activities: Activity[]
    tasks: TaskItem[]
    messages: Message[]
  } | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/companies/${id}`)
      .then(r => r.json())
      .then(json => { setDetail(json.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="p-6 text-center text-sm text-dk-dim">
        고객사를 불러올 수 없습니다.
        <Link href="/app/companies" className="ml-2 text-dk-blue hover:underline">목록으로</Link>
      </div>
    )
  }

  const { company, contacts, contracts, activities, tasks, messages } = detail
  const risk = company.renewal_risk ? RISK_CFG[company.renewal_risk] : null

  const tabContent: Record<string, React.ReactNode> = {
    '개요':    <TabOverview company={company} contracts={contracts} />,
    '담당자':  <TabContacts contacts={contacts} companyId={company.id} />,
    '계약':    <TabContracts contracts={contracts} companyId={company.id} />,
    '활동이력': <TabActivityHistory activities={activities} tasks={tasks} companyId={company.id} companyName={company.name} />,
    '발송이력': <TabMessages messages={messages} />,
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-6 pt-6 pb-0 max-w-3xl w-full space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/app/companies" className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-tint-blue flex items-center justify-center text-dk-blue font-bold text-base shrink-0">
            {company.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-dk-text">{company.name}</h1>
              {company.grade && (
                <span className="text-xs bg-dk-surface2 text-dk-muted px-2 py-0.5 rounded-full font-semibold border border-dk-border">{company.grade}등급</span>
              )}
              {risk && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', risk.cls)}>
                  {risk.label}
                </span>
              )}
            </div>
            <p className="text-xs text-dk-dim mt-0.5">
              {[company.biz_no, company.industry].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <div className="flex border-b border-dk-border gap-0.5">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2',
                tab === t ? 'text-dk-blue border-dk-blue' : 'text-dk-muted border-transparent hover:text-dk-text')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
        <div className="max-w-3xl w-full flex-1 min-h-0 flex flex-col">
          {TABS.map(t => (
            <div key={t} className={cn(
              'flex-1 min-h-0',
              t === '활동이력' ? 'flex flex-col' : 'overflow-y-auto',
              t !== tab && 'hidden'
            )}>
              {tabContent[t]}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
