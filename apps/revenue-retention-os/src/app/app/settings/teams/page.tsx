'use client'

import { useState, useEffect } from 'react'
import {
  Users, Plus, Pencil, Trash2, UserCircle2, Check, X, MoreHorizontal, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TeamWithMeta = {
  id: string; name: string; created_at: string
  member_count: number; manager_name: string | null
}

const ROLE_LABEL: Record<string, string> = { admin: '관리자', manager: '팀장', sales: '영업' }
const ROLE_CLASS: Record<string, string> = {
  admin:   'bg-dk-purple/10 text-dk-purple border-dk-purple/30',
  manager: 'bg-dk-blue/10 text-dk-blue border-dk-blue/30',
  sales:   'bg-dk-surface2 text-dk-muted border-dk-border',
}

function TeamModal({ team, onClose, onSave }: {
  team?: TeamWithMeta | null; onClose: () => void; onSave: (name: string) => void
}) {
  const [name, setName] = useState(team?.name ?? '')
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dk-surface border border-dk-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-bold text-dk-text mb-4">
          {team ? '팀 편집' : '새 팀 추가'}
        </h2>
        <div>
          <label className="text-xs font-medium text-dk-muted mb-1 block">팀 이름</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="예: 서울 영업팀"
            className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue" />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
            취소
          </button>
          <button onClick={() => { if (name.trim()) onSave(name.trim()) }} disabled={!name.trim()}
            className="flex-1 py-2 text-sm text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50">
            {team ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamCard({ team, selected, onSelect, onEdit, onDelete }: {
  team: TeamWithMeta; selected: boolean
  onSelect: () => void; onEdit: () => void; onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div onClick={onSelect}
      className={cn(
        'relative p-4 rounded-xl border cursor-pointer transition-all',
        selected
          ? 'border-dk-blue bg-dk-blue/5 ring-1 ring-dk-blue'
          : 'border-dk-border bg-dk-surface hover:border-dk-border2 hover:bg-dk-surface2'
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center',
            selected ? 'bg-dk-blue/10' : 'bg-dk-surface2'
          )}>
            <Users className={cn('w-4 h-4', selected ? 'text-dk-blue' : 'text-dk-muted')} />
          </div>
          <div>
            <p className="text-sm font-semibold text-dk-text">{team.name}</p>
            <p className="text-xs text-dk-muted mt-0.5">
              {team.member_count}명{team.manager_name ? ` · ${team.manager_name}` : ''}
            </p>
          </div>
        </div>
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="p-1 rounded-lg hover:bg-dk-surface2 text-dk-dim">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 bg-dk-surface border border-dk-border rounded-xl shadow-lg py-1 w-28">
              <button onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-dk-text hover:bg-dk-surface2">
                <Pencil className="w-3.5 h-3.5" /> 편집
              </button>
              <button onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-dk-red hover:bg-dk-surface2">
                <Trash2 className="w-3.5 h-3.5" /> 삭제
              </button>
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div className="absolute top-3 right-9 w-5 h-5 rounded-full bg-dk-blue flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  )
}

export default function TeamsSettingsPage() {
  const [teams, setTeams]           = useState<TeamWithMeta[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedTeam, setSelected] = useState<string>('')
  const [showModal, setShowModal]   = useState(false)
  const [editingTeam, setEditing]   = useState<TeamWithMeta | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/settings/teams')
      .then(r => r.json())
      .then(json => {
        const rows = (json.data ?? []) as TeamWithMeta[]
        setTeams(rows)
        if (rows.length > 0 && !selectedTeam) setSelected(rows[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // 멤버는 별도 API가 없어 useState로 빈 배열 유지 (settings/users에서 확인 가능)
  const members: { id: string; name: string; role: string; email: string }[] = []
  const team = teams.find(t => t.id === selectedTeam)

  const handleAdd = async (name: string) => {
    await fetch('/api/settings/teams', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setShowModal(false)
    load()
  }
  const handleEdit = async (name: string) => {
    if (!editingTeam) return
    await fetch(`/api/settings/teams/${editingTeam.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setEditing(null)
    load()
  }
  const handleDelete = async (id: string) => {
    if (!confirm('팀을 삭제하면 소속 멤버의 팀 정보가 해제됩니다. 계속할까요?')) return
    await fetch(`/api/settings/teams/${id}`, { method: 'DELETE' })
    if (selectedTeam === id) setSelected(teams.find(t => t.id !== id)?.id ?? '')
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-dk-muted" /></div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">팀 관리</h1>
          <p className="text-sm text-dk-muted mt-0.5">영업 조직 단위로 팀을 구성하고 멤버를 배정합니다</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 bg-dk-blue text-white text-sm px-3.5 py-2 rounded-lg hover:bg-dk-blue/80">
          <Plus className="w-4 h-4" /> 팀 추가
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 space-y-2">
          {teams.map(t => (
            <TeamCard key={t.id} team={t} selected={selectedTeam === t.id}
              onSelect={() => setSelected(t.id)}
              onEdit={() => { setEditing(t); setShowModal(true) }}
              onDelete={() => handleDelete(t.id)} />
          ))}
          {teams.length === 0 && (
            <div className="p-8 border-2 border-dashed border-dk-border rounded-xl text-center">
              <Users className="w-8 h-8 text-dk-dim mx-auto mb-2" />
              <p className="text-sm text-dk-muted">팀이 없습니다</p>
            </div>
          )}
        </div>

        <div className="col-span-3">
          {team && (
            <div className="bg-dk-surface border border-dk-border rounded-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dk-border">
                <div>
                  <h3 className="text-sm font-semibold text-dk-text">{team.name}</h3>
                  <p className="text-xs text-dk-muted mt-0.5">멤버 {team.member_count}명</p>
                </div>
                <button className="flex items-center gap-1 text-xs text-dk-blue px-2.5 py-1.5 border border-dk-blue/30 rounded-lg hover:bg-dk-blue/10">
                  <Plus className="w-3.5 h-3.5" /> 멤버 추가
                </button>
              </div>
              <div className="divide-y divide-dk-border">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-dk-surface2/40 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dk-blue to-dk-purple flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {m.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dk-text">{m.name}</p>
                      <p className="text-xs text-dk-dim truncate">{m.email}</p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full border font-medium',
                      ROLE_CLASS[m.role]
                    )}>
                      {ROLE_LABEL[m.role]}
                    </span>
                    <button className="p-1 text-dk-dim hover:text-dk-red rounded-lg hover:bg-dk-red/10 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="py-12 text-center">
                    <UserCircle2 className="w-8 h-8 text-dk-dim mx-auto mb-2" />
                    <p className="text-sm text-dk-muted">멤버가 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TeamModal team={editingTeam}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={editingTeam ? handleEdit : handleAdd} />
      )}
    </div>
  )
}
