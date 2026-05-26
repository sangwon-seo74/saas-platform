'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Mail, Phone, Search, Check, Eye, Loader2 } from 'lucide-react'
import {
  MESSAGE_CHANNEL_LABEL, MESSAGE_STATUS_LABEL, MESSAGE_STATUS_CLASS,
} from '@/constants/domain'
import type { Message } from '@/types/domain'

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'email': return <Mail        className="w-4 h-4 text-dk-blue" />
    case 'sms':   return <Phone       className="w-4 h-4 text-dk-green" />
    case 'kakao': return <MessageSquare className="w-4 h-4 text-dk-orange" />
    default:      return <MessageSquare className="w-4 h-4 text-dk-dim" />
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MESSAGE_STATUS_CLASS[status] ?? 'bg-dk-surface2 text-dk-muted'}`}>
      {MESSAGE_STATUS_LABEL[status] ?? status}
    </span>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  const [showContent, setShowContent] = useState(false)

  return (
    <div className="border-b border-dk-border last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-dk-surface2/40 transition-colors">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-dk-surface2 flex items-center justify-center">
          <ChannelIcon channel={msg.channel} />
        </div>

        <div className="w-32 flex-shrink-0">
          <div className="text-sm font-medium text-dk-text truncate">{msg.company?.name}</div>
          <div className="text-xs text-dk-dim truncate">{msg.contact?.name ?? msg.recipient}</div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-dk-muted truncate">{msg.content}</p>
        </div>

        <div className="flex-shrink-0 w-16 text-xs text-dk-dim text-center">
          {MESSAGE_CHANNEL_LABEL[msg.channel] ?? msg.channel}
        </div>

        <div className="flex-shrink-0 w-20 text-center">
          <StatusBadge status={msg.status} />
        </div>

        <div className="flex-shrink-0 w-28 text-xs text-dk-dim text-right">
          {new Date(msg.sent_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>

        <button
          onClick={() => setShowContent(!showContent)}
          className="flex-shrink-0 w-7 h-7 rounded-md hover:bg-dk-surface2 flex items-center justify-center transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-dk-dim" />
        </button>
      </div>

      {showContent && (
        <div className="px-4 pb-3 ml-11">
          <div className="bg-dk-surface2 rounded-lg p-3 text-sm text-dk-muted leading-relaxed">
            {msg.content}
          </div>
          {msg.read_at && (
            <p className="text-xs text-dk-dim mt-1.5 flex items-center gap-1">
              <Check className="w-3 h-3 text-dk-green" />
              읽음: {new Date(msg.read_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function MessagesPage() {
  const [messages,       setMessages]       = useState<Message[]>([])
  const [loading,        setLoading]        = useState(true)
  const [filterChannel,  setFilterChannel]  = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [search,         setSearch]         = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (filterChannel) params.set('channel', filterChannel)
    if (filterStatus)  params.set('status', filterStatus)
    fetch(`/api/messages?${params}`)
      .then(r => r.json())
      .then(j => setMessages(j.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [filterChannel, filterStatus])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? messages.filter(m => m.company?.name?.includes(search) || m.recipient.includes(search))
    : messages

  const stats = {
    total:     messages.length,
    delivered: messages.filter(m => m.status === 'delivered' || m.status === 'read').length,
    read:      messages.filter(m => m.status === 'read').length,
    failed:    messages.filter(m => m.status === 'failed').length,
  }
  const readRate = stats.total > 0 ? Math.round(stats.read / stats.total * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">발송 이력</h1>
          <p className="text-sm text-dk-muted mt-0.5">
            {loading ? '로딩 중...' : `총 ${stats.total}건 · 열람률 ${readRate}%`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dk-dim px-3 py-2 border border-dk-border rounded-lg">
            메시지 발송은 연동 설정 후 지원됩니다
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '발송',  count: stats.total,     cls: 'text-dk-text' },
          { label: '수신',  count: stats.delivered, cls: 'text-dk-green' },
          { label: '읽음',  count: stats.read,      cls: 'text-dk-blue' },
          { label: '실패',  count: stats.failed,    cls: 'text-dk-red' },
        ].map(s => (
          <div key={s.label} className="bg-dk-surface border border-dk-border rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${s.cls}`}>{s.count}</div>
            <div className="text-xs text-dk-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dk-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="고객사 검색..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue"
          />
        </div>
        <select
          value={filterChannel}
          onChange={e => setFilterChannel(e.target.value)}
          className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue"
        >
          <option value="">전체 채널</option>
          <option value="email">이메일</option>
          <option value="sms">문자</option>
          <option value="kakao">카카오</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue"
        >
          <option value="">전체 상태</option>
          <option value="sent">발송</option>
          <option value="delivered">수신</option>
          <option value="read">읽음</option>
          <option value="failed">실패</option>
        </select>
      </div>

      <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-dk-surface2/50 border-b border-dk-border text-xs font-medium text-dk-muted">
          <div className="w-8 flex-shrink-0" />
          <div className="w-32 flex-shrink-0">고객사</div>
          <div className="flex-1">내용</div>
          <div className="w-16 flex-shrink-0 text-center">채널</div>
          <div className="w-20 flex-shrink-0 text-center">상태</div>
          <div className="w-28 flex-shrink-0 text-right">발송시간</div>
          <div className="w-7 flex-shrink-0" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-dk-dim" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-dk-dim">
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
