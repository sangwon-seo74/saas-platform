'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Mail, CheckCircle, XCircle, MoreHorizontal, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type User = {
  id: string; name: string; email: string; phone: string | null
  role: 'admin' | 'manager' | 'sales'
  is_active: boolean; last_login_at: string | null; created_at: string
  team: { id: string; name: string } | null
}
type PlanLimit = { max_users: number | null; current_users: number }

const ROLE_LABEL: Record<string, string> = { admin: '관리자', manager: '팀장', sales: '영업사원' }
const ROLE_CLASS: Record<string, string> = {
  admin:   'bg-dk-purple/10 text-dk-purple border-dk-purple/30',
  manager: 'bg-dk-blue/10 text-dk-blue border-dk-blue/30',
  sales:   'bg-dk-surface2 text-dk-muted border-dk-border',
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'sales' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.name.trim()) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error?.message ?? '초대에 실패했습니다'); return }
      onSuccess(); onClose()
    } catch {
      setError('요청 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">사용자 초대</h3>
          <button onClick={onClose} className="text-dk-dim hover:text-dk-text">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">이메일 *</label>
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@company.com"
              className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue" />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">이름 *</label>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="홍길동"
              className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue" />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">역할 *</label>
            <select value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue">
              <option value="sales">영업사원</option>
              <option value="manager">팀장</option>
              <option value="admin">관리자</option>
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-dk-red mt-3">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
            취소
          </button>
          <button onClick={handleSubmit}
            disabled={saving || !form.email.trim() || !form.name.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            초대 메일 발송
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersSettingPage() {
  const [loading, setLoading]     = useState(true)
  const [users, setUsers]         = useState<User[]>([])
  const [planLimit, setPlanLimit] = useState<PlanLimit>({ max_users: null, current_users: 0 })
  const [showInvite, setShowInvite] = useState(false)
  const [menuOpen, setMenuOpen]   = useState<string | null>(null)

  function loadUsers() {
    setLoading(true)
    fetch('/api/settings/users')
      .then(r => r.json())
      .then(json => {
        setUsers(json.data?.data ?? [])
        setPlanLimit(json.data?.plan_limit ?? { max_users: null, current_users: 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  const handleDeactivate = async (id: string) => {
    setMenuOpen(null)
    if (!confirm('해당 사용자를 비활성화하시겠습니까?')) return
    await fetch(`/api/settings/users/${id}`, { method: 'DELETE' }).catch(() => {})
    loadUsers()
  }

  const formatLastLogin = (at: string | null) => {
    if (!at) return '—'
    const diff = Date.now() - new Date(at).getTime()
    const h = Math.floor(diff / (1000 * 60 * 60))
    const d = Math.floor(h / 24)
    if (h < 1) return '방금 전'
    if (h < 24) return `${h}시간 전`
    return `${d}일 전`
  }

  const { max_users, current_users } = planLimit

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-dk-text">사용자 관리</h2>
          <p className="text-sm text-dk-muted mt-0.5">
            총 {current_users}명{max_users ? ` (플랜 한도: ${max_users}명)` : ''}
          </p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-dk-blue text-white text-sm font-medium rounded-lg hover:bg-dk-blue/80">
          <Plus className="w-4 h-4" />사용자 초대
        </button>
      </div>

      {max_users && (
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dk-muted">사용자 슬롯</span>
            <span className="text-xs font-mono font-semibold text-dk-text">{current_users} / {max_users}</span>
          </div>
          <div className="h-2 bg-dk-surface2 rounded-full overflow-hidden">
            <div className="h-full bg-dk-blue rounded-full"
              style={{ width: `${Math.min((current_users / max_users) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-dk-muted" />
        </div>
      ) : (
        <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-dk-surface2 border-b border-dk-border">
                {['이름', '이메일', '역할', '팀', '최근 접속', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium text-dk-dim text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-dk-border last:border-0 hover:bg-dk-surface2/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-dk-blue to-dk-purple flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user.name[0]}
                      </div>
                      <span className="text-sm font-medium text-dk-text">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-dk-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', ROLE_CLASS[user.role])}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-dk-muted">{user.team?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-dk-muted">{formatLastLogin(user.last_login_at)}</td>
                  <td className="px-4 py-3">
                    {user.is_active
                      ? <span className="flex items-center gap-1 text-xs text-dk-green"><CheckCircle className="w-3.5 h-3.5" />활성</span>
                      : <span className="flex items-center gap-1 text-xs text-dk-dim"><XCircle className="w-3.5 h-3.5" />비활성</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                        className="w-7 h-7 rounded-md hover:bg-dk-surface2 flex items-center justify-center ml-auto">
                        <MoreHorizontal className="w-4 h-4 text-dk-dim" />
                      </button>
                      {menuOpen === user.id && (
                        <div className="absolute right-0 top-8 z-10 bg-dk-surface border border-dk-border rounded-xl shadow-lg py-1 w-32">
                          {user.is_active && (
                            <button
                              onClick={() => handleDeactivate(user.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-dk-red hover:bg-dk-surface2">
                              <XCircle className="w-3.5 h-3.5" /> 비활성화
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Users className="w-8 h-8 text-dk-dim mx-auto mb-2" />
                    <p className="text-sm text-dk-muted">등록된 사용자가 없습니다</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSuccess={loadUsers} />
      )}
    </div>
  )
}
