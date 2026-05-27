'use client'

import { useState, useEffect } from 'react'
import { Loader2, Send, X, ChevronDown, FileText } from 'lucide-react'
import type { MessageTemplate } from '@/types/domain'

type Channel = 'sms' | 'kakao' | 'email'

interface SendModalProps {
  onClose: () => void
  onSent?: () => void
  initialChannel?: Channel
  initialTo?: string
  companyId?: string
  contactId?: string
}

export function SendModal({ onClose, onSent, initialChannel = 'sms', initialTo = '', companyId, contactId }: SendModalProps) {
  const [channel, setChannel]                   = useState<Channel>(initialChannel)
  const [to, setTo]                             = useState(initialTo)
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
      if (companyId)            body.company_id = companyId
      if (contactId)            body.contact_id = contactId

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setSendError(json.error?.message ?? '발송 실패'); return }
      onSent?.()
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
                channel === t.key ? 'bg-dk-blue text-white' : 'text-dk-muted hover:text-dk-text'
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
                  <button key={t.id} onClick={() => applyTemplate(t)}
                    className="w-full text-left px-4 py-2.5 hover:bg-dk-surface2 transition-colors">
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
              <p className="text-xs text-dk-dim mt-1">90바이트 초과 시 LMS로 자동 전환됩니다</p>
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

        {sendError && <p className="mt-3 text-xs text-dk-red">{sendError}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
            취소
          </button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? '발송 중...' : '발송'}
          </button>
        </div>
      </div>
    </div>
  )
}
