'use client'

import { useState, useEffect } from 'react'
import {
  Building2, Phone, MapPin, Mail,
  CheckCircle2, PhoneMissed, PhoneOff, CalendarClock,
  Loader2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

type ActivityContact = {
  id: string; name: string; title: string | null
  mobile: string | null; phone: string | null; email: string | null; is_primary: boolean
}

export function QuickActivityModal({
  company,
  renewalId,
  onClose,
  onSaved,
}: {
  company: { id: string; name: string }
  renewalId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType]                       = useState<'call' | 'visit' | 'email'>('call')
  const [contacts, setContacts]               = useState<ActivityContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ActivityContact | null>(null)
  const [phoneChoice, setPhoneChoice]         = useState<'mobile' | 'phone'>('mobile')
  const [callResult, setCallResult]           = useState('')
  const [visitPurpose, setVisitPurpose]       = useState('')
  const [companions, setCompanions]           = useState('')
  const [summary, setSummary]                 = useState('')
  const [nextAction, setNextAction]           = useState('')
  const [nextActionAt, setNextActionAt]       = useState('')
  const [submitting, setSubmitting]           = useState(false)

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
          renewal_id:     renewalId ?? null,
        }),
      })
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  const TYPE_TABS = [
    { value: 'call'  as const, label: '통화',   icon: Phone  },
    { value: 'visit' as const, label: '방문',   icon: MapPin },
    { value: 'email' as const, label: '이메일', icon: Mail   },
  ]

  const CALL_RESULTS = [
    { value: 'connected', label: '연결됨',   icon: CheckCircle2,  cls: 'border-tint-green-border bg-tint-green text-dk-green' },
    { value: 'no_answer', label: '부재중',   icon: PhoneMissed,   cls: 'border-tint-amber-border bg-tint-amber text-dk-orange' },
    { value: 'rejected',  label: '거절',     icon: PhoneOff,      cls: 'border-tint-red-border bg-tint-red text-dk-red' },
    { value: 'scheduled', label: '예약통화', icon: CalendarClock, cls: 'border-tint-blue-border bg-tint-blue text-dk-blue' },
  ]

  const canSave = (type !== 'call' || !!callResult) && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-dk-text">활동 추가</h3>
            <p className="text-xs text-dk-blue mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />{company.name}
            </p>
          </div>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

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
                      ? 'border-dk-blue bg-tint-blue-deep text-dk-text'
                      : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                  )}>
                  <span className="font-medium">{c.name}</span>
                  {c.title && <span className="opacity-60">{c.title}</span>}
                  {c.is_primary && <span className="text-[9px] text-dk-blue border border-dk-blue/30 px-0.5 rounded">대표</span>}
                </button>
              ))}
            </div>
          )}

          {selectedContact && type === 'call' && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedContact.mobile ? (
                <a href={`tel:${selectedContact.mobile}`} onClick={() => setPhoneChoice('mobile')}
                  className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors',
                    phoneChoice === 'mobile' ? 'border-tint-green-border bg-tint-green text-dk-green' : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
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
                    phoneChoice === 'phone' ? 'border-tint-green-border bg-tint-green text-dk-green' : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
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

          {selectedContact && type === 'email' && (
            <div className="mt-2">
              {selectedContact.email ? (
                <a href={`mailto:${selectedContact.email}`}
                  className="inline-flex items-center gap-1.5 text-xs text-tint-purple-text border border-tint-purple-border bg-tint-purple px-2.5 py-1 rounded-lg hover:bg-tint-purple-border transition-colors">
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

        {type === 'call' && (
          <div className="mb-4">
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">
              통화 결과 <span className="text-dk-red">*</span>
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

        <div className="mb-3">
          <label className="text-xs font-medium text-dk-muted mb-1.5 block">내용</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)}
            placeholder="활동 내용 요약..." rows={3} className={cn(INPUT_CLS, 'resize-none')} />
        </div>

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
            className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
