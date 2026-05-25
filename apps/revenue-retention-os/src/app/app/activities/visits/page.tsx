'use client'

import { useState } from 'react'
import { MapPin, Plus, Users, Clock, ChevronRight } from 'lucide-react'
import { formatDate, formatRelative } from '@/lib/utils'
import type { Activity } from '@/types/domain'

const VISIT_PURPOSE_LABEL: Record<string, string> = {
  demo: '제품 시연',
  proposal: '제안',
  contract: '계약',
  followup: '사후관리',
}

const VISIT_PURPOSE_CLASS: Record<string, string> = {
  demo: 'bg-purple-50 text-purple-600',
  proposal: 'bg-blue-50 text-blue-600',
  contract: 'bg-green-50 text-green-600',
  followup: 'bg-slate-100 text-slate-600',
}

const MOCK_VISITS: Activity[] = [
  {
    id: 'v1', tenant_id: 't1', company_id: 'c1', contact_id: 'ct1',
    user_id: 'u1', contract_id: 'co1', renewal_id: null,
    type: 'visit',
    activity_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    call_result: null, call_duration: null,
    visit_purpose: 'proposal',
    companions: '솔루션팀 강대리',
    summary: '기업신용조회 Standard → Pro 업그레이드 제안. 비용 대비 효과 설명 완료. 내부 검토 후 연락 예정.',
    next_action: '제안서 재발송',
    next_action_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contact_value: null,
    created_at: new Date().toISOString(),
    company: { id: 'c1', name: '삼성SDS' },
    contact: { id: 'ct1', name: '김철수', title: '과장' },
    user: { id: 'u1', name: '홍길동' },
  },
  {
    id: 'v2', tenant_id: 't1', company_id: 'c5', contact_id: 'ct5',
    user_id: 'u2', contract_id: 'co5', renewal_id: 'r5',
    type: 'visit',
    activity_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    call_result: null, call_duration: null,
    visit_purpose: 'followup',
    companions: null,
    summary: '이탈 방지 미팅. 경쟁사 제품 대비 차별점 설명. 3개월 추가 무료 이용 제안으로 잔류 의사 확인.',
    next_action: '무료 연장 계약서 발송',
    next_action_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contact_value: null,
    created_at: new Date().toISOString(),
    company: { id: 'c5', name: 'KT DS' },
    contact: { id: 'ct5', name: '최지현', title: '차장' },
    user: { id: 'u2', name: '김영수' },
  },
  {
    id: 'v3', tenant_id: 't1', company_id: 'c3', contact_id: 'ct3',
    user_id: 'u1', contract_id: null, renewal_id: null,
    type: 'visit',
    activity_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    call_result: null, call_duration: null,
    visit_purpose: 'demo',
    companions: '기술지원팀 이팀장',
    summary: '신규 기능 시연. API 연동 방식 문의 많음. 기술 검토 후 POC 진행 예정.',
    next_action: 'POC 환경 셋업',
    next_action_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contact_value: null,
    created_at: new Date().toISOString(),
    company: { id: 'c3', name: 'SK C&C' },
    contact: { id: 'ct3', name: '박민수', title: '부장' },
    user: { id: 'u1', name: '홍길동' },
  },
]

function VisitCard({ visit }: { visit: Activity }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-indigo-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {visit.company?.name}
            </span>
            {visit.contact && (
              <span className="text-xs text-slate-500">
                {visit.contact.name} {visit.contact.title}
              </span>
            )}
            {visit.visit_purpose && (
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full
                ${VISIT_PURPOSE_CLASS[visit.visit_purpose] ?? 'bg-slate-100 text-slate-500'}`}>
                {VISIT_PURPOSE_LABEL[visit.visit_purpose]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
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
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
              {visit.summary}
            </p>
          )}

          {visit.next_action_at && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <ChevronRight className="w-3 h-3" />
              <span>다음: {visit.next_action} ({formatDate(visit.next_action_at)})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddVisitModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">방문 기록</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">고객사 *</label>
            <input
              placeholder="고객사 검색..."
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">방문 목적 *</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">선택</option>
                <option value="demo">제품 시연</option>
                <option value="proposal">제안</option>
                <option value="contract">계약</option>
                <option value="followup">사후관리</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">방문일 *</label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">동행자</label>
            <input
              placeholder="예: 솔루션팀 강대리"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">미팅 내용</label>
            <textarea
              placeholder="미팅 내용 요약..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">다음 액션</label>
              <input
                placeholder="예: 제안서 발송"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">예정일</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            취소
          </button>
          <button className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VisitsPage() {
  const [showModal, setShowModal] = useState(false)
  const [filterPurpose, setFilterPurpose] = useState('')

  const filtered = MOCK_VISITS.filter(v =>
    !filterPurpose || v.visit_purpose === filterPurpose
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">방문 기록</h1>
          <p className="text-sm text-slate-500 mt-0.5">이번 달 {MOCK_VISITS.length}건 방문</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          방문 기록
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={filterPurpose}
          onChange={e => setFilterPurpose(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 목적</option>
          <option value="demo">제품 시연</option>
          <option value="proposal">제안</option>
          <option value="contract">계약</option>
          <option value="followup">사후관리</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">방문 기록이 없습니다</p>
          </div>
        ) : (
          filtered.map(v => <VisitCard key={v.id} visit={v} />)
        )}
      </div>

      {showModal && <AddVisitModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
