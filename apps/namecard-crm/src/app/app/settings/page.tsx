'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, UserPlus, Mail, Trash2, Link2, ChevronRight, BarChart2, Tag, Plus, X, Check } from 'lucide-react'
import Link from 'next/link'
import type { Tag as TagType } from '@/types/domain'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'member'
  is_active: boolean
}

interface UsageStats {
  contacts: number
  companies: number
  business_cards: number
  activities: number
}

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#6B7280',
]

export default function SettingsPage() {
  const [members,     setMembers]     = useState<TeamMember[]>([])
  const [loading,     setLoading]     = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting,    setInviting]    = useState(false)
  const [inviteMsg,   setInviteMsg]   = useState('')
  const [usage,       setUsage]       = useState<UsageStats | null>(null)

  // 태그 상태
  const [tags,        setTags]        = useState<TagType[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [newTagName,  setNewTagName]  = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const [tagSaving,   setTagSaving]   = useState(false)
  const [tagError,    setTagError]    = useState('')
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    setTagsLoading(true)
    const res = await fetch('/api/tags').then(r => r.json()).catch(() => ({}))
    setTags(res.data ?? [])
    setTagsLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/settings/teams')
      .then(r => r.json())
      .then(j => { if (j.data) setMembers(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/settings/usage')
      .then(r => r.json())
      .then(j => { if (j.data) setUsage(j.data) })
      .catch(() => {})

    fetchTags()
  }, [fetchTags])

  async function invite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')
    const res = await fetch('/api/settings/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: 'member' }),
    }).then(r => r.json())
    setInviting(false)
    if (res.error) {
      setInviteMsg(`오류: ${res.error.message}`)
    } else {
      setInviteEmail('')
      setInviteMsg('초대 이메일이 발송됐습니다')
    }
  }

  async function createTag() {
    if (!newTagName.trim()) { setTagError('태그 이름을 입력하세요'); return }
    setTagSaving(true)
    setTagError('')
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    }).then(r => r.json())
    setTagSaving(false)
    if (res.error) {
      setTagError(res.error.message)
    } else {
      setNewTagName('')
      setNewTagColor(PRESET_COLORS[0])
      await fetchTags()
    }
  }

  async function deleteTag(id: string) {
    setDeletingId(id)
    await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    await fetchTags()
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-lg font-bold text-dk-text">설정</h1>

      {/* 사용량 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-dk-muted" />
          <h2 className="text-sm font-semibold text-dk-text">사용량</h2>
        </div>
        {usage ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '고객',     value: usage.contacts },
              { label: '회사',     value: usage.companies },
              { label: '명함 스캔', value: usage.business_cards },
              { label: '활동 기록', value: usage.activities },
            ].map(({ label, value }) => (
              <div key={label} className="bg-dk-surface2 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-dk-text tabular-nums">{value.toLocaleString()}</p>
                <p className="text-xs text-dk-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-dk-muted" /></div>
        )}
      </section>

      {/* 태그 관리 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-dk-muted" />
          <h2 className="text-sm font-semibold text-dk-text">태그 관리</h2>
        </div>

        {/* 태그 목록 */}
        {tagsLoading ? (
          <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-dk-muted" /></div>
        ) : tags.length === 0 ? (
          <p className="text-xs text-dk-dim">아직 태그가 없습니다. 아래에서 추가하세요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag.id}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium border"
                style={{ backgroundColor: `${tag.color}20`, borderColor: `${tag.color}50`, color: tag.color }}
              >
                {tag.name}
                <button
                  onClick={() => deleteTag(tag.id)}
                  disabled={deletingId === tag.id}
                  className="hover:opacity-70 transition-opacity disabled:opacity-40"
                  title="태그 삭제"
                >
                  {deletingId === tag.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <X className="w-3 h-3" />}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 태그 추가 폼 */}
        <div className="space-y-3 pt-3 border-t border-dk-border">
          <p className="text-xs font-medium text-dk-dim">새 태그 추가</p>

          {/* 색상 선택 */}
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: color }}
                title={color}
              >
                {newTagColor === color && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </button>
            ))}
            {/* 커스텀 컬러 */}
            <label className="w-6 h-6 rounded-full border-2 border-dashed border-dk-border hover:border-dk-border2 cursor-pointer flex items-center justify-center overflow-hidden" title="직접 입력">
              <input
                type="color"
                value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)}
                className="opacity-0 absolute w-6 h-6 cursor-pointer"
              />
              <Plus className="w-3 h-3 text-dk-dim" />
            </label>
          </div>

          {/* 이름 입력 + 추가 버튼 */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: newTagColor }}
              />
              <input
                value={newTagName}
                onChange={e => { setNewTagName(e.target.value); setTagError('') }}
                onKeyDown={e => e.key === 'Enter' && createTag()}
                placeholder="태그 이름 (예: VIP, 파트너, 잠재고객)"
                maxLength={20}
                className="w-full pl-7 pr-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50"
              />
            </div>
            <button
              onClick={createTag}
              disabled={tagSaving || !newTagName.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-dk-accent text-white rounded-lg hover:bg-dk-accentHover disabled:opacity-50 transition-colors shrink-0"
            >
              {tagSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              추가
            </button>
          </div>
          {tagError && <p className="text-xs text-dk-red">{tagError}</p>}
        </div>
      </section>

      {/* 팀 관리 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-dk-text">팀 멤버</h2>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dk-dim" />
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
              placeholder="초대할 이메일 주소"
              className="w-full pl-8 pr-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50"
            />
          </div>
          <button
            onClick={invite}
            disabled={inviting || !inviteEmail.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-dk-accent text-white rounded-lg hover:bg-dk-accentHover disabled:opacity-50 transition-colors"
          >
            {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            초대
          </button>
        </div>
        {inviteMsg && <p className={`text-xs ${inviteMsg.startsWith('오류') ? 'text-dk-red' : 'text-dk-green'}`}>{inviteMsg}</p>}

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-dk-muted" /></div>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-dk-surface2 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-sm font-bold shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dk-text">{m.name}</p>
                  <p className="text-xs text-dk-muted">{m.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${m.role === 'owner' ? 'bg-dk-blue/10 border-dk-blue/30 text-dk-blue' : 'bg-dk-surface border-dk-border text-dk-muted'}`}>
                  {m.role === 'owner' ? '관리자' : '팀원'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 팀 초대 링크 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-dk-text">팀 초대 링크</h2>
        <p className="text-xs text-dk-muted">링크를 공유하면 팀원이 직접 가입할 수 있습니다.</p>
        <Link
          href="/app/settings/invite-links"
          className="flex items-center justify-between px-3 py-2.5 bg-dk-surface2 border border-dk-border rounded-lg hover:bg-dk-surface hover:border-dk-accent/50 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <Link2 className="w-4 h-4 text-dk-blue" />
            <span className="text-sm text-dk-text">초대 링크 관리</span>
          </div>
          <ChevronRight className="w-4 h-4 text-dk-dim group-hover:text-dk-muted" />
        </Link>
      </section>

      {/* 데이터 내보내기 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-dk-text">데이터</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dk-text">연락처 내보내기 (CSV)</p>
            <p className="text-xs text-dk-muted">전체 고객 목록을 CSV 파일로 다운로드합니다</p>
          </div>
          <a
            href="/api/export/contacts"
            download
            className="px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface transition-colors"
          >
            다운로드
          </a>
        </div>
      </section>

      {/* 위험 구역 */}
      <section className="bg-tint-red border border-tint-red-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-dk-red">위험 구역</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dk-text">계정 삭제</p>
            <p className="text-xs text-dk-muted">모든 고객 데이터가 삭제됩니다. 복구 불가합니다.</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-dk-red border border-tint-red-border rounded-lg hover:bg-dk-danger/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />삭제
          </button>
        </div>
      </section>
    </div>
  )
}
