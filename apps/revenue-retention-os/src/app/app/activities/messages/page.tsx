'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Mail, Phone, Search, Check, Eye, Loader2, Send, X, ChevronDown, FileText } from 'lucide-react'
import {
  MESSAGE_CHANNEL_LABEL, MESSAGE_STATUS_LABEL, MESSAGE_STATUS_CLASS,
} from '@/constants/domain'
import type { Message, MessageTemplate } from '@/types/domain'

type Channel = 'sms' | 'kakao' | 'email'

// ─── 발송 모달 ─────────────────────────────────────────────────────────────────

function SendModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [channel, setChannel]                   = useState<Channel>('sms')
  const [to, setTo]                             = useState('')
  const [text, setText]                         = useState('')
  const [emailSubject, setEmailSubject]         = useState('')
  const [emailHtml, setEmailHtml]               = useState('')
  const [kakaoTemplate, setKakaoTemplate]       = useState('')
  const [sending, setSending]                   = useState(false)
  const [sendError, setSendError]               = useState<string | null>(null)
  const [templates, setTemplates]               = useState<MessageTemplate[]>([])
  const [loadingTpl, setLoadingTpl]             = useState(false)
  const [showTplPicker, setShowTplPicker]       = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    setLoadingTpl(true)
    setSelectedTemplateId(null)
    fetch(`/api/settings/templates?channel=${channel}&active=true&limit=50`)
      .then(r => r.json())
      .then(j => setTemplates(j.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingTpl(false))
  }, [channel])

  const applyTemplate = (t: MessageTemplate) => {
    setText(t.content)
    if (t.channel === 'email' && t.subject) setEmailSubject(t.subject)
    setSelectedTemplateId(t.id)
    setShowTplPicker(false)
    setSendError(null)
  }

  const handleSend = async () => {
    if (!to.trim() || !text.trim()) { setSendError('수신처와 내용을 입력하세요'); return }
    if (channel === 'email' && !emailSubject.trim()) { setSendError('이메일 제목을 입력하세요'); return }
    if (channel === 'kakao' && !kakaoTemplate.trim()) { setSendError('알림톡 템플릿 코드를 입력하세요'); return }

    setSending(true)
    setSendError(null)
    try {
      const body: Record<string, string> = { to, text, channel }
      if (channel === 'email')  { body.email_subject = emailSubject; if (emailHtml) body.email_html = emailHtml }
      if (channel === 'kakao')  body.kakao_template_code = kakaoTemplate
      if (selectedTemplateId)   body.template_id = selectedTemplateId

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setSendError(json.error?.message ?? '발송 실패'); return }
      onSent()
      onClose()
    } catch {
      setSendError('네트워크 오류')
    } finally {
      setSending(false)
    }
  }

  const CHANNEL_TABS: { key: Channel; label: string }[] = [
    { key: 'sms',   label: '문자 (SMS)' },
    { key: 'kakao', label: '카카오 알림톡' },
    { key: 'email', label: '이메일' },
  ]

  const selectedTplName = selectedTemplateId
    ? templates.find(t => t.id === selectedTemplateId)?.name
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-dk-surface border border-dk-border rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-dk-text">새 메시지 발송</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-dk-surface2 flex items-center justify-center">
            <X className="w-4 h-4 text-dk-dim" />
          </button>
        </div>

        {/* 채널 탭 */}
        <div className="flex gap-1 p-1 bg-dk-surface2 rounded-xl mb-3">
          {CHANNEL_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setChannel(t.key); setSendError(null); setShowTplPicker(false) }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                channel === t.key
                  ? 'bg-dk-blue text-white'
                  : 'text-dk-muted hover:text-dk-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 템플릿 선택 */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowTplPicker(v => !v)}
            disabled={loadingTpl}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-left hover:bg-dk-surface2/70 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-dk-muted shrink-0" />
            <span className={selectedTplName ? 'text-dk-text flex-1 truncate' : 'text-dk-dim flex-1 truncate'}>
              {loadingTpl ? '로딩 중...' : selectedTplName ?? '템플릿 선택 (선택 사항)'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-dk-muted shrink-0" />
          </button>
          {showTplPicker && (
            <div className="absolute z-10 top-full mt-1 w-full bg-dk-surface border border-dk-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-xs text-dk-dim px-4 py-3 text-center">
                  이 채널의 템플릿이 없습니다. 설정 → 템플릿에서 생성하세요.
                </p>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left px-4 py-2.5 hover:bg-dk-surface2 transition-colors"
                  >
                    <p className="text-sm text-dk-text font-medium truncate">{t.name}</p>
                    <p className="text-xs text-dk-dim truncate mt-0.5">{t.content}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* 수신처 */}
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">
              {channel === 'email' ? '수신 이메일' : '수신 번호'}
            </label>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder={channel === 'email' ? 'user@company.com' : '010-1234-5678'}
              className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue"
            />
          </div>

          {/* 이메일 제목 */}
          {channel === 'email' && (
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">제목</label>
              <input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="이메일 제목"
                className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue"
              />
            </div>
          )}

          {/* 알림톡 템플릿 코드 */}
          {channel === 'kakao' && (
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">템플릿 코드 (Solapi)</label>
              <input
                value={kakaoTemplate}
                onChange={e => setKakaoTemplate(e.target.value)}
                placeholder="KA01TP..."
                className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue font-mono"
              />
            </div>
          )}

          {/* 내용 */}
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">
              {channel === 'email' ? '본문 (HTML 또는 텍스트)' : '내용'}
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={channel === 'email' ? 6 : 4}
              placeholder={channel === 'kakao' ? '템플릿과 동일한 내용을 입력하세요' : '메시지를 입력하세요'}
              className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue resize-none"
            />
            {channel === 'sms' && (
              <p className="text-xs text-dk-dim mt-1">
                90바이트 초과 시 LMS로 자동 전환됩니다
              </p>
            )}
          </div>

          {/* 이메일 HTML 본문 (선택) */}
          {channel === 'email' && (
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">HTML 본문 (선택 — 입력 시 텍스트 대신 사용)</label>
              <textarea
                value={emailHtml}
                onChange={e => setEmailHtml(e.target.value)}
                rows={4}
                placeholder="<p>HTML 내용...</p>"
                className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue resize-none font-mono text-xs"
              />
            </div>
          )}
        </div>

        {sendError && (
          <p className="mt-3 text-xs text-dk-red">{sendError}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2"
          >
            취소
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? '발송 중...' : '발송'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 목록 컴포넌트 ─────────────────────────────────────────────────────────────

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

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [messages,       setMessages]       = useState<Message[]>([])
  const [loading,        setLoading]        = useState(true)
  const [filterChannel,  setFilterChannel]  = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [search,         setSearch]         = useState('')
  const [showSendModal,  setShowSendModal]  = useState(false)

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
      {showSendModal && (
        <SendModal
          onClose={() => setShowSendModal(false)}
          onSent={load}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dk-text">발송 이력</h1>
          <p className="text-sm text-dk-muted mt-0.5">
            {loading ? '로딩 중...' : `총 ${stats.total}건 · 열람률 ${readRate}%`}
          </p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80"
        >
          <Send className="w-4 h-4" />
          새 메시지 발송
        </button>
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
