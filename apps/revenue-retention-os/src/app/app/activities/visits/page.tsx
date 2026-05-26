'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Plus, Users, Clock, ChevronRight, Loader2, X } from 'lucide-react'
import { formatDate, formatRelative } from '@/lib/utils'
import type { Activity } from '@/types/domain'

const VISIT_PURPOSE_LABEL: Record<string, string> = {
  demo:      '제품 시연',
  proposal:  '제안',
  contract:  '계약',
  followup:  '사후관리',
}

const VISIT_PURPOSE_CLASS: Record<string, string> = {
  demo:      'bg-tint-purple text-tint-purple-text border-tint-purple-border',
  proposal:  'bg-tint-blue text-dk-blue border-tint-blue-border',
  contract:  'bg-tint-green text-dk-green border-tint-green-border',
  followup:  'bg-dk-surface2 text-dk-muted border-dk-border',
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'

type CompanyOption = { id: string; name: string }
type ContactOption = { id: string; name: string; title: string | null }

function AddVisitModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [companyQ,       setCompanyQ]       = useState('')
  const [companySuggestions, setCompanySuggestions] = useState<CompanyOption[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null)
  const [contacts,       setContacts]       = useState<ContactOption[]>([])
  const [contactId,      setContactId]      = useState('')
  const [visitPurpose,   setVisitPurpose]   = useState('')
  const [visitDate,      setVisitDate]      = useState(new Date().toISOString().split('T')[0])
  const [companions,     setCompanions]     = useState('')
  const [summary,        setSummary]        = useState('')
  const [nextAction,     setNextAction]     = useState('')
  const [nextActionAt,   setNextActionAt]   = useState('')
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  useEffect(() => {
    if (companyQ.length < 1) { setCompanySuggestions([]); return }
    const id = setTimeout(() => {
      fetch(`/api/companies?q=${encodeURIComponent(companyQ)}&limit=8`)
        .then(r => r.json())
        .then(j => setCompanySuggestions(j.data?.data ?? []))
    }, 200)
    return () => clearTimeout(id)
  }, [companyQ])

  const selectCompany = async (c: CompanyOption) => {
    setSelectedCompany(c)
    setCompanyQ(c.name)
    setCompanySuggestions([])
    const r = await fetch(`/api/contacts?company_id=${c.id}`)
    const j = await r.json()
    setContacts(j.data?.data ?? [])
  }

  const handleSave = async () => {
    if (!selectedCompany) { setError('고객사를 선택해주세요'); return }
    if (!visitPurpose)    { setError('방문 목적을 선택해주세요'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:     selectedCompany.id,
          contact_id:     contactId || null,
          type:           'visit',
          activity_at:    visitDate ? `${visitDate}T09:00:00` : new Date().toISOString(),
          visit_purpose:  visitPurpose,
          companions:     companions.trim() || null,
          summary:        summary.trim() || null,
          next_action:    nextAction.trim() || null,
          next_action_at: nextActionAt || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error?.message ?? '저장 실패'); return }
      onSaved()
      onClose()
    } catch {
      setError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-tint-purple flex items-center justify-center">
              <MapPin className="w-4 h-4 text-tint-purple-text" />
            </div>
            <h3 className="text-base font-semibold text-dk-text">방문 기록</h3>
          </div>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* 고객사 */}
          <div className="relative">
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">고객사 *</label>
            <input
              value={companyQ}
              onChange={e => { setCompanyQ(e.target.value); setSelectedCompany(null) }}
              placeholder="고객사 검색..."
              className={INPUT_CLS}
            />
            {companySuggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-dk-surface border border-dk-border rounded-lg shadow-lg overflow-hidden">
                {companySuggestions.map(c => (
                  <li key={c.id}>
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-dk-text hover:bg-dk-surface2"
                      onClick={() => selectCompany(c)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 담당자 */}
          {contacts.length > 0 && (
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">담당자</label>
              <select value={contactId} onChange={e => setContactId(e.target.value)} className={INPUT_CLS}>
                <option value="">선택 안 함</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.title ? ` (${c.title})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">방문 목적 *</label>
              <select value={visitPurpose} onChange={e => setVisitPurpose(e.target.value)} className={INPUT_CLS}>
                <option value="">선택</option>
                <option value="demo">제품 시연</option>
                <option value="proposal">제안</option>
                <option value="contract">계약</option>
                <option value="followup">사후관리</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">방문일 *</label>
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">동행자</label>
            <input value={companions} onChange={e => setCompanions(e.target.value)}
              placeholder="예: 솔루션팀 강대리" className={INPUT_CLS} />
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">미팅 내용</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="미팅 내용 요약..." rows={3}
              className={`${INPUT_CLS} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
        </div>

        {error && <p className="mt-3 text-xs text-dk-red">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VisitCard({ visit }: { visit: Activity }) {
  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl p-4 hover:border-dk-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-tint-purple flex items-center justify-center">
          <MapPin className="w-4 h-4 text-tint-purple-text" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-dk-text">
              {visit.company?.name}
            </span>
            {visit.contact && (
              <span className="text-xs text-dk-muted">
                {visit.contact.name} {visit.contact.title}
              </span>
            )}
            {visit.visit_purpose && (
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border
                ${VISIT_PURPOSE_CLASS[visit.visit_purpose] ?? 'bg-dk-surface2 text-dk-muted border-dk-border'}`}>
                {VISIT_PURPOSE_LABEL[visit.visit_purpose] ?? visit.visit_purpose}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-dk-dim mb-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelative(visit.activity_at)}
            </span>
            {visit.companions && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {visit.companions}
              </span>
            )}
          </div>

          {visit.summary && (
            <p className="text-sm text-dk-muted leading-relaxed line-clamp-2">
              {visit.summary}
            </p>
          )}

          {visit.next_action && visit.next_action_at && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-dk-blue">
              <ChevronRight className="w-3 h-3" />
              <span>다음: {visit.next_action} ({formatDate(visit.next_action_at)})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VisitsPage() {
  const [visits,        setVisits]        = useState<Activity[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [filterPurpose, setFilterPurpose] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/activities?type=visit&limit=50')
      .then(r => r.json())
      .then(j => setVisits(j.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filterPurpose
    ? visits.filter(v => v.visit_purpose === filterPurpose)
    : visits

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">방문 기록</h1>
          <p className="text-sm text-dk-muted mt-0.5">
            {loading ? '로딩 중...' : `총 ${visits.length}건`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-dk-blue text-white text-sm font-medium rounded-lg hover:bg-dk-blue/80 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          방문 기록
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={filterPurpose}
          onChange={e => setFilterPurpose(e.target.value)}
          className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue"
        >
          <option value="">전체 목적</option>
          <option value="demo">제품 시연</option>
          <option value="proposal">제안</option>
          <option value="contract">계약</option>
          <option value="followup">사후관리</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-dk-dim" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-dk-dim">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">방문 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(v => <VisitCard key={v.id} visit={v} />)}
        </div>
      )}

      {showModal && (
        <AddVisitModal onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </div>
  )
}
