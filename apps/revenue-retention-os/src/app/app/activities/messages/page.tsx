'use client'

import { useState } from 'react'
import { MessageSquare, Mail, Phone, Search, Plus, Check, Eye } from 'lucide-react'
import {
  MESSAGE_CHANNEL_LABEL, MESSAGE_STATUS_LABEL, MESSAGE_STATUS_CLASS,
} from '@/constants/domain'
import type { Message } from '@/types/domain'

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1', tenant_id: 't1', company_id: 'c1', contact_id: 'ct1',
    user_id: 'u1', activity_id: null,
    channel: 'kakao', template_id: 'tmpl1',
    recipient: '010-1234-5678',
    content: '[갱신 안내] 안녕하세요 삼성SDS 김철수 과장님, 계약 만료 30일 전 안내 드립니다...',
    status: 'delivered',
    sent_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    read_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    company: { id: 'c1', name: '삼성SDS' },
    contact: { id: 'ct1', name: '김철수' },
  },
  {
    id: 'm2', tenant_id: 't1', company_id: 'c2', contact_id: 'ct2',
    user_id: 'u1', activity_id: null,
    channel: 'email', template_id: 'tmpl2',
    recipient: 'yhlee@lgcns.com',
    content: '안녕하세요, LG CNS 이영희 팀장님께 계약 갱신 관련 제안서를 첨부하여 보내드립니다...',
    status: 'read',
    sent_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    read_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    company: { id: 'c2', name: 'LG CNS' },
    contact: { id: 'ct2', name: '이영희' },
  },
  {
    id: 'm3', tenant_id: 't1', company_id: 'c4', contact_id: null,
    user_id: 'u2', activity_id: null,
    channel: 'sms', template_id: null,
    recipient: '010-5678-1234',
    content: '[Revenue OS] 현대오토에버 계약 만료 7일 전입니다. 갱신 문의: 02-1234-5678',
    status: 'sent',
    sent_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read_at: null,
    company: { id: 'c4', name: '현대오토에버' },
    contact: undefined,
  },
  {
    id: 'm4', tenant_id: 't1', company_id: 'c3', contact_id: 'ct3',
    user_id: 'u3', activity_id: null,
    channel: 'kakao', template_id: 'tmpl1',
    recipient: '010-9876-5432',
    content: '[갱신 안내] 안녕하세요 SK C&C 박민수 부장님...',
    status: 'failed',
    sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read_at: null,
    company: { id: 'c3', name: 'SK C&C' },
    contact: { id: 'ct3', name: '박민수' },
  },
]

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'email': return <Mail className="w-4 h-4 text-blue-500" />
    case 'sms': return <Phone className="w-4 h-4 text-green-500" />
    case 'kakao': return <MessageSquare className="w-4 h-4 text-yellow-500" />
    default: return <MessageSquare className="w-4 h-4 text-slate-400" />
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MESSAGE_STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {MESSAGE_STATUS_LABEL[status] ?? status}
    </span>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  const [showContent, setShowContent] = useState(false)

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        {/* 채널 아이콘 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <ChannelIcon channel={msg.channel} />
        </div>

        {/* 회사 & 수신자 */}
        <div className="w-32 flex-shrink-0">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {msg.company?.name}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {msg.contact?.name ?? msg.recipient}
          </div>
        </div>

        {/* 내용 미리보기 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{msg.content}</p>
        </div>

        {/* 채널 */}
        <div className="flex-shrink-0 w-16 text-xs text-slate-500 text-center">
          {MESSAGE_CHANNEL_LABEL[msg.channel]}
        </div>

        {/* 상태 */}
        <div className="flex-shrink-0 w-20 text-center">
          <StatusBadge status={msg.status} />
        </div>

        {/* 발송 시간 */}
        <div className="flex-shrink-0 w-28 text-xs text-slate-500 text-right">
          {new Date(msg.sent_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* 보기 버튼 */}
        <button
          onClick={() => setShowContent(!showContent)}
          className="flex-shrink-0 w-7 h-7 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {showContent && (
        <div className="px-4 pb-3 ml-11">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {msg.content}
          </div>
          {msg.read_at && (
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Check className="w-3 h-3 text-green-500" />
              읽음: {new Date(msg.read_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function MessagesPage() {
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const filtered = MOCK_MESSAGES.filter(m => {
    if (filterChannel && m.channel !== filterChannel) return false
    if (filterStatus && m.status !== filterStatus) return false
    if (search && !m.company?.name.includes(search)) return false
    return true
  })

  const stats = {
    total: MOCK_MESSAGES.length,
    delivered: MOCK_MESSAGES.filter(m => m.status === 'delivered' || m.status === 'read').length,
    read: MOCK_MESSAGES.filter(m => m.status === 'read').length,
    failed: MOCK_MESSAGES.filter(m => m.status === 'failed').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">발송 이력</h1>
          <p className="text-sm text-slate-500 mt-0.5">오늘 {stats.total}건 발송 · 열람률 {Math.round(stats.read / stats.total * 100)}%</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          메시지 발송
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '발송', count: stats.total, cls: 'text-slate-700' },
          { label: '수신', count: stats.delivered, cls: 'text-green-600' },
          { label: '읽음', count: stats.read, cls: 'text-blue-600' },
          { label: '실패', count: stats.failed, cls: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${s.cls}`}>{s.count}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="고객사 검색..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterChannel}
          onChange={e => setFilterChannel(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 채널</option>
          <option value="email">이메일</option>
          <option value="sms">문자</option>
          <option value="kakao">카카오</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 상태</option>
          <option value="sent">발송</option>
          <option value="delivered">수신</option>
          <option value="read">읽음</option>
          <option value="failed">실패</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500">
          <div className="w-8 flex-shrink-0" />
          <div className="w-32 flex-shrink-0">고객사</div>
          <div className="flex-1">내용</div>
          <div className="w-16 flex-shrink-0 text-center">채널</div>
          <div className="w-20 flex-shrink-0 text-center">상태</div>
          <div className="w-28 flex-shrink-0 text-right">발송시간</div>
          <div className="w-7 flex-shrink-0" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">발송 이력이 없습니다</p>
          </div>
        ) : (
          filtered.map(m => <MessageRow key={m.id} msg={m} />)
        )}
      </div>
    </div>
  )
}
