'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Mail, Phone, Edit, Copy, Trash2, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageTemplate, MessageChannel } from '@/types/domain'

type TemplateCategory = 'renewal' | 'intro' | 'followup' | 'custom'

const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail, sms: Phone, kakao: MessageSquare,
}
const CHANNEL_CLASS: Record<string, string> = {
  email: 'bg-dk-blue/10 text-dk-blue border-dk-blue/30',
  sms:   'bg-dk-green/10 text-dk-green border-dk-green/30',
  kakao: 'bg-dk-orange/10 text-dk-orange border-dk-orange/30',
}
const CHANNEL_LABEL: Record<string, string>   = { email: '이메일', sms: '문자', kakao: '카카오' }
const CATEGORY_LABEL: Record<string, string>  = {
  renewal: '갱신', intro: '인사', followup: '사후관리', custom: '커스텀',
}

const VARS = ['company_name', 'contact_name', 'expires_at', 'amount', 'sales_name', 'sales_phone', 'start_at', 'days_left', 'product_name']

function TemplateEditor({ template, onClose, onSaved }: {
  template?: MessageTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name:     template?.name                               ?? '',
    channel:  (template?.channel  ?? 'kakao')              as MessageChannel,
    category: (template?.category ?? 'renewal')            as TemplateCategory,
    subject:  template?.subject  ?? '',
    content:  template?.content  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const insertVar = (v: string) => setForm(f => ({ ...f, content: f.content + `{${v}}` }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) return
    if (form.channel === 'email' && !form.subject.trim()) {
      setError('이메일 템플릿은 제목이 필요합니다'); return
    }
    setSaving(true); setError('')
    try {
      const payload = {
        name:     form.name.trim(),
        channel:  form.channel,
        category: form.category || null,
        subject:  form.channel === 'email' ? form.subject.trim() : null,
        content:  form.content.trim(),
      }
      const url    = template ? `/api/settings/templates/${template.id}` : '/api/settings/templates'
      const method = template ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error?.message ?? '저장에 실패했습니다'); return }
      onSaved(); onClose()
    } catch {
      setError('요청 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const preview = form.content
    .replace(/\{company_name\}/g, '삼성SDS')
    .replace(/\{contact_name\}/g, '김철수')
    .replace(/\{expires_at\}/g, '2026-06-01')
    .replace(/\{sales_name\}/g, '홍길동')
    .replace(/\{sales_phone\}/g, '010-1234-5678')
    .replace(/\{amount\}/g, '24,000,000')
    .replace(/\{days_left\}/g, '30')
    .replace(/\{product_name\}/g, '고객관리 솔루션')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">
            {template ? '템플릿 편집' : '템플릿 생성'}
          </h3>
          <button onClick={onClose} className="text-dk-dim hover:text-dk-text"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">템플릿명 *</label>
              <input value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 갱신 D-30 안내"
                className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue" />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">채널 *</label>
              <select value={form.channel}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value as MessageChannel }))}
                className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue">
                <option value="kakao">카카오</option>
                <option value="email">이메일</option>
                <option value="sms">문자</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">카테고리</label>
              <select value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as TemplateCategory }))}
                className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue">
                <option value="renewal">갱신</option>
                <option value="intro">인사</option>
                <option value="followup">사후관리</option>
                <option value="custom">커스텀</option>
              </select>
            </div>
            {form.channel === 'email' && (
              <div>
                <label className="text-xs font-medium text-dk-muted mb-1.5 block">이메일 제목 *</label>
                <input value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="이메일 제목..."
                  className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">사용 가능한 변수</label>
            <div className="flex flex-wrap gap-1.5">
              {VARS.map(v => (
                <button key={v} onClick={() => insertVar(v)}
                  className="text-xs px-2 py-1 bg-dk-surface2 text-dk-muted rounded-md hover:bg-dk-blue/10 hover:text-dk-blue transition-colors font-mono border border-dk-border">
                  {`{${v}}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">본문 *</label>
            <textarea value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={6} placeholder="메시지 내용..."
              className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim resize-none focus:outline-none focus:ring-2 focus:ring-dk-blue font-mono" />
            <p className="text-xs text-dk-dim mt-1">{form.content.length}자</p>
          </div>

          {form.content && (
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">미리보기</label>
              <div className="bg-dk-surface2 border border-dk-border rounded-xl p-4 text-sm text-dk-text whitespace-pre-wrap leading-relaxed">
                {preview}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-dk-red mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
            취소
          </button>
          <button onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.content.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesSettingPage() {
  const [loading, setLoading]         = useState(true)
  const [templates, setTemplates]     = useState<MessageTemplate[]>([])
  const [showEditor, setShowEditor]   = useState<MessageTemplate | null | 'new'>(null)
  const [filterChannel, setFilterChannel] = useState('')

  function loadTemplates() {
    setLoading(true)
    fetch('/api/settings/templates?limit=100')
      .then(r => r.json())
      .then(json => setTemplates(json.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTemplates() }, [])

  const handleDelete = async (t: MessageTemplate) => {
    if (!confirm(`"${t.name}" 템플릿을 삭제하시겠습니까?`)) return
    await fetch(`/api/settings/templates/${t.id}`, { method: 'DELETE' }).catch(() => {})
    loadTemplates()
  }

  const handleCopy = async (t: MessageTemplate) => {
    const payload = {
      name: `${t.name} (복사)`, channel: t.channel, category: t.category,
      subject: t.subject, content: t.content,
    }
    await fetch('/api/settings/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
    loadTemplates()
  }

  const filtered = templates.filter(t => !filterChannel || t.channel === filterChannel)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-dk-text">메시지 템플릿</h2>
          <p className="text-sm text-dk-muted mt-0.5">갱신 안내, 인사 등 자주 쓰는 메시지 템플릿</p>
        </div>
        <button onClick={() => setShowEditor('new')}
          className="flex items-center gap-2 px-4 py-2 bg-dk-blue text-white text-sm font-medium rounded-lg hover:bg-dk-blue/80">
          <Plus className="w-4 h-4" />템플릿 생성
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { value: '', label: '전체' },
          { value: 'kakao', label: '카카오' },
          { value: 'email', label: '이메일' },
          { value: 'sms', label: '문자' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilterChannel(f.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
              filterChannel === f.value
                ? 'bg-dk-blue/10 text-dk-blue border-dk-blue/30'
                : 'text-dk-muted border-dk-border hover:bg-dk-surface2'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-dk-muted" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="bg-dk-surface border border-dk-border rounded-xl py-16 text-center">
              <MessageSquare className="w-10 h-10 text-dk-dim mx-auto mb-3" />
              <p className="text-sm text-dk-muted">등록된 템플릿이 없습니다</p>
            </div>
          )}
          {filtered.map(tmpl => {
            const Icon = CHANNEL_ICON[tmpl.channel]
            return (
              <div key={tmpl.id}
                className={cn(
                  'bg-dk-surface border border-dk-border rounded-xl p-4',
                  !tmpl.is_active && 'opacity-50'
                )}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-dk-surface2 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-dk-muted" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-dk-text">{tmpl.name}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', CHANNEL_CLASS[tmpl.channel])}>
                        {CHANNEL_LABEL[tmpl.channel]}
                      </span>
                      {tmpl.category && (
                        <span className="text-xs text-dk-dim">{CATEGORY_LABEL[tmpl.category] ?? tmpl.category}</span>
                      )}
                      {!tmpl.is_active && (
                        <span className="text-xs bg-dk-surface2 text-dk-dim px-1.5 py-0.5 rounded border border-dk-border">비활성</span>
                      )}
                    </div>
                    <p className="text-xs text-dk-muted line-clamp-1">{tmpl.content}</p>
                    {tmpl.variables && tmpl.variables.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {tmpl.variables.slice(0, 4).map(v => (
                          <span key={v} className="text-[10px] px-1.5 py-0.5 bg-dk-surface2 text-dk-dim rounded font-mono">{`{${v}}`}</span>
                        ))}
                        {tmpl.variables.length > 4 && (
                          <span className="text-[10px] text-dk-dim">+{tmpl.variables.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    <button onClick={() => setShowEditor(tmpl)}
                      className="w-7 h-7 rounded-md hover:bg-dk-surface2 flex items-center justify-center">
                      <Edit className="w-3.5 h-3.5 text-dk-dim" />
                    </button>
                    <button onClick={() => handleCopy(tmpl)}
                      className="w-7 h-7 rounded-md hover:bg-dk-surface2 flex items-center justify-center">
                      <Copy className="w-3.5 h-3.5 text-dk-dim" />
                    </button>
                    <button onClick={() => handleDelete(tmpl)}
                      className="w-7 h-7 rounded-md hover:bg-dk-red/10 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-dk-red" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showEditor !== null && (
        <TemplateEditor
          template={showEditor === 'new' ? null : showEditor}
          onClose={() => setShowEditor(null)}
          onSaved={loadTemplates} />
      )}
    </div>
  )
}
