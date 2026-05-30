'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, Plus, Copy, Trash2, Loader2, AlertCircle, Check, Users } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { createTeamInviteLink, listTeamInviteLinks, deactivateTeamInviteLink, type TeamInviteLink } from '@saas/core-client'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<string, string> = { admin: '관리자', manager: '팀장', sales: '영업담당자' }
const ROLE_OPTIONS = [
  { value: 'sales',   label: '영업담당자' },
  { value: 'manager', label: '팀장' },
  { value: 'admin',   label: '관리자' },
]

export default function InviteLinksPage() {
  const [links, setLinks] = useState<TeamInviteLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [newRole, setNewRole] = useState('sales')
  const [newLabel, setNewLabel] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('')
  const [newExpiresDays, setNewExpiresDays] = useState('30')

  const getToken = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await listTeamInviteLinks(token)
      if (res.ok && res.data) setLinks(res.data)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    try {
      const token = await getToken()
      const res = await createTeamInviteLink({
        role: newRole,
        label: newLabel || undefined,
        max_uses: newMaxUses ? parseInt(newMaxUses) : undefined,
        expires_days: newExpiresDays ? parseInt(newExpiresDays) : undefined,
      }, token)
      if (!res.ok || !res.data) throw new Error(res.error?.message ?? '생성 실패')
      setLinks(prev => [res.data!, ...prev])
      setShowForm(false)
      setNewLabel('')
      setNewMaxUses('')
      setNewExpiresDays('30')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '생성 중 오류가 발생했습니다')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (link: TeamInviteLink) => {
    await navigator.clipboard.writeText(link.join_url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('이 초대 링크를 비활성화하겠습니까?')) return
    const token = await getToken()
    const res = await deactivateTeamInviteLink(id, token)
    if (res.ok) setLinks(prev => prev.map(l => l.id === id ? { ...l, is_active: false } : l))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">팀 초대 링크</h1>
          <p className="text-sm text-dk-muted mt-1">링크를 공유하면 팀원이 직접 계정을 만들고 합류할 수 있습니다</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-dk-blue hover:bg-dk-blue/80 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 링크 생성
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-dk-text">새 초대 링크 설정</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">역할</label>
              <select
                value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue"
              >
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">링크 이름 (선택)</label>
              <input
                value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="예: 서울 영업팀 초대"
                className="w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">최대 사용 횟수 (비워두면 무제한)</label>
              <input
                type="number" min={1} value={newMaxUses} onChange={e => setNewMaxUses(e.target.value)}
                placeholder="무제한"
                className="w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">만료 기간 (일)</label>
              <input
                type="number" min={1} max={365} value={newExpiresDays} onChange={e => setNewExpiresDays(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
              취소
            </button>
            <button onClick={handleCreate} disabled={creating} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-dk-blue hover:bg-dk-blue/80 rounded-lg disabled:opacity-50">
              {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />생성 중...</> : '생성'}
            </button>
          </div>
        </div>
      )}

      {/* Links list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-dk-blue" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-dk-surface border border-dk-border rounded-xl text-center">
          <Link2 className="w-10 h-10 text-dk-dim mb-3" />
          <p className="text-dk-muted text-sm">아직 초대 링크가 없습니다</p>
          <p className="text-dk-dim text-xs mt-1">위의 버튼을 눌러 첫 번째 링크를 만들어 보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div
              key={link.id}
              className={cn(
                'bg-dk-surface border rounded-xl p-4',
                link.is_active ? 'border-dk-border' : 'border-dk-border opacity-50'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-dk-text">
                      {link.label || `${ROLE_LABEL[link.role] ?? link.role} 초대 링크`}
                    </span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      link.is_active ? 'bg-tint-green border border-tint-green-border text-dk-green' : 'bg-dk-surface2 text-dk-dim'
                    )}>
                      {link.is_active ? '활성' : '비활성'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-tint-blue border border-tint-blue-border text-dk-blue rounded">
                      {ROLE_LABEL[link.role] ?? link.role}
                    </span>
                  </div>

                  <p className="text-xs text-dk-dim font-mono truncate mb-2">{link.join_url}</p>

                  <div className="flex items-center gap-3 text-xs text-dk-muted">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {link.use_count}{link.max_uses ? `/${link.max_uses}` : ''} 사용
                    </span>
                    {link.expires_at && (
                      <span>만료: {new Date(link.expires_at).toLocaleDateString('ko-KR')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {link.is_active && (
                    <>
                      <button
                        onClick={() => handleCopy(link)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dk-blue border border-tint-blue-border bg-tint-blue rounded-lg hover:bg-dk-blue/10 transition-colors"
                      >
                        {copiedId === link.id ? <><Check className="w-3 h-3" />복사됨</> : <><Copy className="w-3 h-3" />복사</>}
                      </button>
                      <button
                        onClick={() => handleDeactivate(link.id)}
                        className="p-1.5 text-dk-dim hover:text-dk-red hover:bg-tint-red rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage guide */}
      <div className="bg-tint-blue border border-tint-blue-border rounded-xl p-4">
        <p className="text-sm font-medium text-dk-blue mb-2">사용 방법</p>
        <ol className="text-xs text-dk-muted space-y-1 list-decimal list-inside">
          <li>위에서 역할과 조건을 설정해 초대 링크를 생성하세요</li>
          <li>생성된 링크를 팀원에게 슬랙, 이메일, 카카오톡 등으로 공유하세요</li>
          <li>팀원이 링크를 클릭하면 이름·이메일·비밀번호만 입력하고 바로 합류합니다</li>
          <li>사용 횟수나 만료일에 도달하면 링크는 자동으로 비활성화됩니다</li>
        </ol>
      </div>
    </div>
  )
}
