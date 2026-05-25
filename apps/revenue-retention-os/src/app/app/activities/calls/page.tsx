'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Phone, Plus, Search,
  Clock, User,
  CheckCircle,
  PhoneMissed, PhoneOff, CalendarClock, Loader2, X,
} from 'lucide-react'
import {
  CALL_RESULT_LABEL, CALL_RESULT_CLASS,
} from '@/constants/domain'
import { formatDuration, formatRelative, formatDate } from '@/lib/utils'
import type { Activity } from '@/types/domain'

type CompanyOption = { id: string; name: string }
type ContactOption = { id: string; name: string; title: string | null; phone: string | null; mobile: string | null; email: string | null; is_primary: boolean }

function CallResultIcon({ result }: { result: string | null }) {
  switch (result) {
    case 'connected': return <CheckCircle   className="w-4 h-4 text-[#3FB950]" />
    case 'no_answer': return <PhoneMissed   className="w-4 h-4 text-[#E3B341]" />
    case 'rejected':  return <PhoneOff      className="w-4 h-4 text-[#FF7B72]" />
    case 'scheduled': return <CalendarClock className="w-4 h-4 text-[#58A6FF]" />
    default:          return <Phone         className="w-4 h-4 text-dk-dim" />
  }
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

function QuickCallModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [companyQuery, setCompanyQuery]         = useState('')
  const [companyResults, setCompanyResults]     = useState<CompanyOption[]>([])
  const [companyLoading, setCompanyLoading]     = useState(false)
  const [showCompanyList, setShowCompanyList]   = useState(false)
  const [selectedCompany, setSelectedCompany]   = useState<CompanyOption | null>(null)

  const [contacts, setContacts]                 = useState<ContactOption[]>([])
  const [contactsLoading, setContactsLoading]   = useState(false)
  const [selectedContact, setSelectedContact]   = useState<ContactOption | null>(null)
  const [phoneChoice, setPhoneChoice]           = useState<'mobile' | 'phone'>('mobile')

  const [result, setResult]         = useState('')
  const [summary, setSummary]       = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionAt, setNextActionAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const companyRef  = useRef<HTMLDivElement>(null)

  // 고객사 검색 (debounce 300ms)
  useEffect(() => {
    if (!companyQuery.trim() || selectedCompany) return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setCompanyLoading(true)
      try {
        const res  = await fetch(`/api/companies?q=${encodeURIComponent(companyQuery)}&limit=8`)
        const json = await res.json()
        setCompanyResults((json.data?.data ?? []) as CompanyOption[])
        setShowCompanyList(true)
      } finally {
        setCompanyLoading(false)
      }
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [companyQuery, selectedCompany])

  // 회사 선택 후 담당자 로드
  const selectCompany = useCallback(async (c: CompanyOption) => {
    setSelectedCompany(c)
    setCompanyQuery(c.name)
    setShowCompanyList(false)
    setSelectedContact(null)
    setContactsLoading(true)
    try {
      const res  = await fetch(`/api/contacts?company_id=${c.id}`)
      const json = await res.json()
      const list = (json.data ?? []) as ContactOption[]
      setContacts(list)
      if (list.length === 1) setSelectedContact(list[0])
    } finally {
      setContactsLoading(false)
    }
  }, [])

  // 목록 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowCompanyList(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSave = async () => {
    if (!selectedCompany || !result) return
    setSubmitting(true)
    const contactValue = selectedContact
      ? (phoneChoice === 'mobile' ? selectedContact.mobile : selectedContact.phone)
      : null
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:     selectedCompany.id,
          contact_id:     selectedContact?.id ?? null,
          contact_value:  contactValue,
          type:           'call',
          call_result:    result,
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

  const resultButtons = [
    { value: 'connected', label: '연결됨',  icon: CheckCircle,   cls: 'border-[#1c5c35] bg-[#0f2d1c] text-[#3FB950]' },
    { value: 'no_answer', label: '부재중',  icon: PhoneMissed,   cls: 'border-[#7a5000] bg-[#3d2b0d] text-[#E3B341]' },
    { value: 'rejected',  label: '거절',    icon: PhoneOff,      cls: 'border-[#7f2020] bg-[#3d1a1a] text-[#FF7B72]' },
    { value: 'scheduled', label: '예약통화', icon: CalendarClock, cls: 'border-[#2d4a7a] bg-[#1c2d4a] text-[#58A6FF]' },
  ]

  const canSave = !!selectedCompany && !!result && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1c2d4a] flex items-center justify-center">
              <Phone className="w-4 h-4 text-dk-blue" />
            </div>
            <h3 className="text-base font-semibold text-dk-text">통화 기록</h3>
          </div>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 고객사 검색 */}
        <div className="mb-4" ref={companyRef}>
          <label className="text-xs font-medium text-dk-muted mb-1.5 block">고객사 <span className="text-[#FF7B72]">*</span></label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dk-dim" />
            {companyLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-dk-dim" />}
            <input
              value={companyQuery}
              onChange={e => { setCompanyQuery(e.target.value); setSelectedCompany(null); setContacts([]); setSelectedContact(null) }}
              onFocus={() => { if (companyResults.length > 0 && !selectedCompany) setShowCompanyList(true) }}
              placeholder="고객사명 검색..."
              className={'pl-9 pr-9 py-2 ' + INPUT_CLS}
            />
            {showCompanyList && companyResults.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-dk-surface border border-dk-border rounded-xl shadow-xl overflow-hidden">
                {companyResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCompany(c)}
                    className="w-full text-left px-4 py-2.5 text-sm text-dk-text hover:bg-dk-surface2 transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 담당자 선택 */}
        {selectedCompany && (
          <div className="mb-4">
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">담당자</label>
            {contactsLoading ? (
              <div className="flex items-center gap-2 text-sm text-dk-dim py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 불러오는 중...
              </div>
            ) : contacts.length === 0 ? (
              <p className="text-xs text-dk-dim py-1">등록된 담당자가 없습니다</p>
            ) : (
              <div className="space-y-1.5">
                {contacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedContact(prev => prev?.id === c.id ? null : c)
                      // 새 담당자 선택 시 휴대폰 우선
                      if (c.mobile) setPhoneChoice('mobile')
                      else if (c.phone) setPhoneChoice('phone')
                    }}
                    className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      selectedContact?.id === c.id
                        ? 'border-dk-blue bg-[#111d30] text-dk-text'
                        : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-dk-text">{c.name}</span>
                      {c.title && <span className="ml-2 text-xs text-dk-dim">{c.title}</span>}
                      {c.is_primary && <span className="ml-2 text-[10px] text-dk-blue border border-dk-blue/30 px-1 rounded">대표</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 휴대폰/유선번호 — 클릭 시 선택 + 발신 */}
            {selectedContact && (
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-dk-dim">발신:</span>
                {selectedContact.mobile ? (
                  <a
                    href={`tel:${selectedContact.mobile}`}
                    onClick={() => setPhoneChoice('mobile')}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      phoneChoice === 'mobile'
                        ? 'border-[#1c5c35] bg-[#0f2d1c] text-[#3FB950]'
                        : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    {selectedContact.mobile}
                    <span className="text-[9px] opacity-70">휴대폰</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dk-border bg-dk-surface2 text-dk-dim opacity-50 cursor-not-allowed">
                    <Phone className="w-3 h-3" />
                    번호 없음
                    <span className="text-[9px] opacity-70">휴대폰</span>
                  </span>
                )}
                {selectedContact.phone ? (
                  <a
                    href={`tel:${selectedContact.phone}`}
                    onClick={() => setPhoneChoice('phone')}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      phoneChoice === 'phone'
                        ? 'border-[#1c5c35] bg-[#0f2d1c] text-[#3FB950]'
                        : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    {selectedContact.phone}
                    <span className="text-[9px] opacity-70">유선</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dk-border bg-dk-surface2 text-dk-dim opacity-50 cursor-not-allowed">
                    <Phone className="w-3 h-3" />
                    번호 없음
                    <span className="text-[9px] opacity-70">유선</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 통화 결과 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-dk-muted mb-1.5 block">통화 결과 <span className="text-[#FF7B72]">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {resultButtons.map(btn => (
              <button
                key={btn.value}
                onClick={() => setResult(btn.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all
                  ${result === btn.value ? btn.cls + ' shadow-sm' : 'border-dk-border bg-dk-surface2 text-dk-muted hover:border-dk-border2'}`}
              >
                <btn.icon className="w-4 h-4" />
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {result === 'connected' && (
          <>
            <div className="mb-4">
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">상담 내용</label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="통화 내용 요약..."
                rows={3}
                className={INPUT_CLS + ' resize-none'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1.5 block">다음 액션</label>
                <input value={nextAction} onChange={e => setNextAction(e.target.value)}
                  placeholder="예: 제안서 발송"
                  className={INPUT_CLS} />
              </div>
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1.5 block">예정일</label>
                <input type="date" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)}
                  className={INPUT_CLS} />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#1f6feb] rounded-lg hover:bg-[#388bfd] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CallCard({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl hover:border-dk-border2 transition-colors">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
            ${activity.call_result === 'connected' ? 'bg-[#0f2d1c]' :
              activity.call_result === 'no_answer' ? 'bg-[#3d2b0d]' :
              activity.call_result === 'rejected'  ? 'bg-[#3d1a1a]' :
              'bg-[#1c2d4a]'}`}
          >
            <CallResultIcon result={activity.call_result} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-dk-text truncate">
                {activity.company?.name}
              </span>
              {activity.contact && (
                <span className="text-xs text-dk-dim">
                  {activity.contact.name}{activity.contact.title ? ` · ${activity.contact.title}` : ''}
                </span>
              )}
              <span className={`ml-auto flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full
                ${CALL_RESULT_CLASS[activity.call_result ?? ''] ?? 'bg-dk-surface2 text-dk-muted'}`}>
                {CALL_RESULT_LABEL[activity.call_result ?? ''] ?? '—'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-dk-dim flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelative(activity.activity_at)}
              </span>
              {activity.call_duration && (
                <span>{formatDuration(activity.call_duration)}</span>
              )}
              {activity.contact_value && (
                <a href={`tel:${activity.contact_value}`}
                  className="inline-flex items-center gap-1 text-[#3FB950] border border-[#1c5c35] bg-[#0f2d1c] px-1.5 py-0.5 rounded hover:bg-[#1c3528] transition-colors">
                  <Phone className="w-2.5 h-2.5" />
                  {activity.contact_value}
                </a>
              )}
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {activity.user?.name}
              </span>
            </div>

            {activity.summary && (
              <p className={`mt-2 text-sm text-dk-muted leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                {activity.summary}
              </p>
            )}

            {activity.next_action_at && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-dk-blue">
                <CalendarClock className="w-3 h-3" />
                <span>다음 액션: {activity.next_action} ({formatDate(activity.next_action_at)})</span>
              </div>
            )}
          </div>
        </div>

        {activity.summary && activity.summary.length > 80 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 ml-12 text-xs text-dk-dim hover:text-dk-muted"
          >
            {expanded ? '접기' : '더보기'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function CallsPage() {
  const [loading, setLoading]           = useState(true)
  const [activities, setActivities]     = useState<Activity[]>([])
  const [showModal, setShowModal]       = useState(false)
  const [search, setSearch]             = useState('')
  const [filterResult, setFilterResult] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/activities?type=call&limit=50')
      .then(r => r.json())
      .then(json => setActivities((json.data?.data ?? []) as Activity[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  const filtered = activities.filter(a => {
    if (search && !a.company?.name.includes(search)) return false
    if (filterResult && a.call_result !== filterResult) return false
    return true
  })

  const todayCalls = activities.filter(a => {
    const today = new Date().toDateString()
    return new Date(a.activity_at).toDateString() === today
  }).length

  const connectedRate = activities.length > 0
    ? Math.round((activities.filter(a => a.call_result === 'connected').length / activities.length) * 100)
    : 0

  const stats = [
    { label: '전체',   count: activities.length,                                               cls: 'text-dk-text',     val: '' },
    { label: '연결됨', count: activities.filter(a => a.call_result === 'connected').length, cls: 'text-[#3FB950]',   val: 'connected' },
    { label: '부재중', count: activities.filter(a => a.call_result === 'no_answer').length, cls: 'text-[#E3B341]',   val: 'no_answer' },
    { label: '거절',   count: activities.filter(a => a.call_result === 'rejected').length,  cls: 'text-[#FF7B72]',   val: 'rejected' },
  ]

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">통화 기록</h1>
          <p className="text-sm text-dk-muted mt-0.5">오늘 {todayCalls}건 통화 · 연결률 {connectedRate}%</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1f6feb] text-white text-sm font-medium rounded-lg hover:bg-[#388bfd] transition-colors"
        >
          <Plus className="w-4 h-4" />
          통화 기록
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map(stat => (
          <button
            key={stat.label}
            onClick={() => setFilterResult(filterResult === stat.val ? '' : stat.val)}
            className="bg-dk-surface border border-dk-border rounded-xl p-3 text-center hover:border-dk-border2 transition-colors"
          >
            <div className={`text-2xl font-bold font-mono ${stat.cls}`}>{stat.count}</div>
            <div className="text-xs text-dk-muted mt-0.5">{stat.label}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dk-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="고객사 검색..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue"
          />
        </div>
        <select
          value={filterResult}
          onChange={e => setFilterResult(e.target.value)}
          className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue"
        >
          <option value="">전체 결과</option>
          <option value="connected">연결됨</option>
          <option value="no_answer">부재중</option>
          <option value="rejected">거절</option>
          <option value="scheduled">예약통화</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-dk-dim">
            <Phone className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">통화 기록이 없습니다</p>
          </div>
        ) : (
          filtered.map(a => <CallCard key={a.id} activity={a} />)
        )}
      </div>

      {showModal && (
        <QuickCallModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
