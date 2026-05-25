'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  CheckCircle2,
  Plus, Bell, Megaphone, Wrench, X, Loader2
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type AccessLog = {
  id: string; tenant_name: string; user_name: string; email: string
  action: string; ip: string; ua: string; at: string; result: string
}

// ─── Mock 데이터 — 공지사항 ───────────────────────────────
type AnnouncementType = 'notice' | 'maintenance' | 'update'
type Announcement = {
  id: string
  type: AnnouncementType
  title: string
  content: string
  is_active: boolean
  starts_at: string
  ends_at: string | null
  created_at: string
}

/** datetime-local input(타임존 없음)을 ISO 문자열로 변환.
 *  빈 문자열이면 null 반환. */
function toIso(dt: string): string | null {
  if (!dt) return null
  return new Date(dt).toISOString()
}

/** ISO 문자열을 datetime-local input 형식("YYYY-MM-DDTHH:mm")으로 변환. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── 탭 ──────────────────────────────────────────────────
const TABS = ['접속 로그', '공지/점검']

// ─── 로그 액션 레이블 ─────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  login: '로그인',
  logout: '로그아웃',
  settings_change: '설정 변경',
  data_export: '데이터 내보내기',
}

// ─── 공지 타입 ────────────────────────────────────────────
const ANN_CFG: Record<AnnouncementType, { label: string; cls: string; icon: React.ElementType }> = {
  notice:      { label: '공지',     cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',    icon: Bell },
  maintenance: { label: '점검',     cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Wrench },
  update:      { label: '업데이트', cls: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle2 },
}

// ─── 공지 작성/편집 모달 ──────────────────────────────────
/** 공지/점검 작성·편집 모달.
 *  editing=null이면 신규 작성(POST), 객체가 들어오면 편집(PATCH) 모드로 동작한다.
 *  성공 시 부모의 onSaved 콜백으로 목록을 새로고침한다. */
function AnnouncementModal({
  editing, onClose, onSaved,
}: {
  editing: Announcement | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    type:      (editing?.type ?? 'notice') as AnnouncementType,
    title:     editing?.title ?? '',
    content:   editing?.content ?? '',
    starts_at: toLocalInput(editing?.starts_at ?? null),
    ends_at:   toLocalInput(editing?.ends_at ?? null),
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.starts_at) {
      setError('제목, 내용, 게시 시작은 필수입니다')
      return
    }
    setSaving(true)
    setError('')
    const url    = editing
      ? `/api/super-admin/announcements/${editing.id}`
      : '/api/super-admin/announcements'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:      form.type,
        title:     form.title.trim(),
        content:   form.content.trim(),
        starts_at: toIso(form.starts_at),
        ends_at:   toIso(form.ends_at),
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) { setError(json.error?.message ?? '저장 실패'); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{editing ? '공지 편집' : '공지 작성'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">유형</label>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="notice">공지</option>
              <option value="maintenance">점검</option>
              <option value="update">업데이트</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">제목 *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="공지 제목"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">내용 *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)}
              rows={4} placeholder="공지 내용"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">게시 시작</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">게시 종료 (선택)</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700">
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? '저장 중...' : editing ? '저장' : '게시'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────
/** 시스템 관리 페이지.
 *  탭: 접속 로그(audit_logs 실데이터) / 공지·점검 관리(announcements 실데이터).
 *  접속 로그는 검색/액션/결과 필터 + 최대 100건. 공지는 신규/편집/토글/삭제 지원. */
export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState('접속 로그')
  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<string>('all')
  const [logs, setLogs]               = useState<AccessLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [totalLogs, setTotalLogs]     = useState(0)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [editingAnn, setEditingAnn]   = useState<Announcement | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loadingAnn, setLoadingAnn]   = useState(true)

  const loadAnnouncements = () => {
    setLoadingAnn(true)
    fetch('/api/super-admin/announcements')
      .then(r => r.json())
      .then(json => setAnnouncements((json.data ?? []) as Announcement[]))
      .catch(() => {})
      .finally(() => setLoadingAnn(false))
  }

  const toggleAnnouncementActive = async (ann: Announcement) => {
    await fetch(`/api/super-admin/announcements/${ann.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !ann.is_active }),
    })
    loadAnnouncements()
  }

  const deleteAnnouncement = async (ann: Announcement) => {
    if (!confirm(`"${ann.title}" 공지를 삭제할까요?`)) return
    await fetch(`/api/super-admin/announcements/${ann.id}`, { method: 'DELETE' })
    loadAnnouncements()
  }

  const loadLogs = () => {
    setLoadingLogs(true)
    const params = new URLSearchParams({ limit: '100' })
    if (q)            params.set('q', q)
    if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter)
    if (resultFilter && resultFilter !== 'all') params.set('result', resultFilter)
    fetch(`/api/super-admin/system/logs?${params}`)
      .then(r => r.json())
      .then(json => {
        setLogs((json.data?.data ?? []) as AccessLog[])
        setTotalLogs(json.data?.count ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoadingLogs(false))
  }

  useEffect(() => {
    if (activeTab === '접속 로그')  loadLogs()
    if (activeTab === '공지/점검') loadAnnouncements()
  }, [activeTab, actionFilter, resultFilter])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">시스템 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">접속 로그 및 공지 관리</p>
        </div>
        {activeTab === '공지/점검' && (
          <button
            onClick={() => { setEditingAnn(null); setShowAnnouncementModal(true) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> 공지 작성
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-700/50 gap-0.5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2',
              activeTab === tab
                ? 'text-blue-400 border-blue-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── 접속 로그 탭 ── */}
      {activeTab === '접속 로그' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadLogs()}
                placeholder="이메일, IP 검색 (Enter)"
                className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none flex-1"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'login', 'logout', 'settings_change'] as const).map(a => (
                <button key={a} onClick={() => setActionFilter(a)}
                  className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
                    actionFilter === a ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300')}>
                  {a === 'all' ? '액션 전체' : ACTION_LABEL[a] ?? a}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(['all', 'success', 'fail'] as const).map(r => (
                <button key={r} onClick={() => setResultFilter(r)}
                  className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
                    resultFilter === r ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300')}>
                  {r === 'all' ? '결과 전체' : r === 'success' ? '성공' : '실패'}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500 ml-auto">전체 {totalLogs}건</span>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['일시', '테넌트', '사용자', '액션', 'IP', '환경', '결과'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {logs.map(log => (
                  <tr key={log.id} className={cn(
                    'hover:bg-white/3 transition-colors',
                    log.result === 'fail' && 'bg-red-950/10'
                  )}>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-300 font-mono">{formatDate(log.at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-200">{log.tenant_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-200">{log.user_name}</p>
                      <p className="text-[10px] text-gray-500">{log.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-300">{ACTION_LABEL[log.action] ?? log.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400 font-mono">{log.ip}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{log.ua}</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.result === 'success'
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <X className="w-4 h-4 text-red-400" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-500">로그가 없습니다</p>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ── 공지/점검 탭 ── */}
      {activeTab === '공지/점검' && (
        loadingAnn ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const cfg = ANN_CFG[ann.type]
            const Icon = cfg.icon
            return (
              <div key={ann.id} className={cn(
                'bg-gray-800/60 border rounded-xl p-5',
                ann.is_active ? 'border-gray-700/50' : 'border-gray-800/50 opacity-60'
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium mt-0.5 shrink-0', cfg.cls)}>
                      <Icon className="w-2.5 h-2.5" /> {cfg.label}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-200">{ann.title}</p>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ann.content}</p>
                      <p className="text-[10px] text-gray-500 mt-2">
                        {formatDate(ann.starts_at)}
                        {ann.ends_at && ` ~ ${formatDate(ann.ends_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleAnnouncementActive(ann)}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full border font-medium cursor-pointer transition-colors',
                        ann.is_active
                          ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25'
                          : 'bg-gray-700/30 text-gray-500 border-gray-700/30 hover:bg-gray-700/50'
                      )}>
                      {ann.is_active ? '게시중' : '종료'}
                    </button>
                    <button onClick={() => { setEditingAnn(ann); setShowAnnouncementModal(true) }}
                      className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteAnnouncement(ann)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {announcements.length === 0 && (
            <div className="py-16 text-center">
              <Megaphone className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">등록된 공지가 없습니다</p>
            </div>
          )}
        </div>
        )
      )}

      {showAnnouncementModal && (
        <AnnouncementModal
          editing={editingAnn}
          onClose={() => { setShowAnnouncementModal(false); setEditingAnn(null) }}
          onSaved={loadAnnouncements}
        />
      )}
    </div>
  )
}

/** Pencil 아이콘 fallback. lucide-react의 Pencil을 별도로 import하지 않고 인라인 SVG로 대체한다.
 *  공지 카드의 편집 버튼에서 사용. */
function Pencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}
