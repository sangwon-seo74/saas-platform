'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, Loader2,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { TaskStatus, TaskPriority } from '@/types/domain'

type MemberTask = {
  id: string
  title: string
  type: string
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  company_name: string | null
  is_auto: boolean
}

type MemberRow = {
  id: string
  name: string
  role: string
  team: string
  tasks: MemberTask[]
}

// ─── 상수 ────────────────────────────────────────────────
const STATUS_CLS: Record<TaskStatus, string> = {
  todo:        'bg-tint-blue text-dk-blue border-tint-blue-border',
  in_progress: 'bg-tint-purple text-tint-purple-text border-tint-purple-border',
  done:        'bg-tint-green text-dk-green border-tint-green-border',
  cancelled:   'bg-dk-surface2 text-dk-dim border-dk-border',
}
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '할일', in_progress: '진행중', done: '완료', cancelled: '취소',
}
const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-dk-red', medium: 'bg-dk-orange', low: 'bg-dk-dim',
}
const ROLE_LABEL: Record<string, string> = {
  admin: '관리자', manager: '팀장', sales: '영업',
}

// ─── 멤버 카드 ────────────────────────────────────────────
function MemberCard({ member }: { member: MemberRow }) {
  const [expanded, setExpanded] = useState(true)

  const now = new Date()
  const overdue = member.tasks.filter(t =>
    t.status !== 'done' && t.status !== 'cancelled' &&
    t.due_at && new Date(t.due_at) < now
  )
  const todo       = member.tasks.filter(t => t.status === 'todo')
  const inProgress = member.tasks.filter(t => t.status === 'in_progress')
  const done       = member.tasks.filter(t => t.status === 'done')
  const highCount  = member.tasks.filter(t => t.priority === 'high' && t.status !== 'done').length

  const total = member.tasks.filter(t => t.status !== 'done').length
  const loadPct = Math.min(total / 10 * 100, 100)
  const loadColor = total >= 8 ? 'bg-dk-red' : total >= 5 ? 'bg-dk-orange' : 'bg-dk-green'

  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-dk-surface2/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-dk-blue to-tint-purple-text flex items-center justify-center text-white text-sm font-bold shrink-0">
          {member.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-dk-text">{member.name}</p>
            <span className="text-[10px] bg-dk-surface2 text-dk-muted px-1.5 py-0.5 rounded-full border border-dk-border">
              {ROLE_LABEL[member.role] ?? member.role}
            </span>
            {member.team && <span className="text-[10px] text-dk-dim">{member.team}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 max-w-24 bg-dk-surface2 rounded-full h-1.5">
              <div className={cn('h-1.5 rounded-full transition-all', loadColor)} style={{ width: `${loadPct}%` }} />
            </div>
            <span className="text-[10px] text-dk-dim">진행 {total}건</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {overdue.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] bg-tint-red text-dk-red border border-tint-red-border px-1.5 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-2.5 h-2.5" /> {overdue.length}
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] bg-tint-amber text-dk-orange border border-tint-amber-border px-1.5 py-0.5 rounded-full font-medium">
              긴급 {highCount}
            </span>
          )}
          <div className="flex gap-1 text-[10px] text-dk-dim">
            <span>{todo.length} 대기</span>
            <span className="text-dk-border">·</span>
            <span className="text-dk-blue">{inProgress.length} 진행</span>
            <span className="text-dk-border">·</span>
            <span className="text-dk-green">{done.length} 완료</span>
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-dk-dim" /> : <ChevronDown className="w-3.5 h-3.5 text-dk-dim" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-dk-border">
          {member.tasks.length === 0 ? (
            <div className="px-5 py-5 text-center">
              <p className="text-sm text-dk-dim">할당된 업무가 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-dk-border/50">
              {member.tasks.map(t => {
                const isOverdue = t.status !== 'done' && t.status !== 'cancelled' &&
                  t.due_at && new Date(t.due_at) < new Date()
                return (
                  <div key={t.id} className={cn(
                    'flex items-center gap-3 px-5 py-3 hover:bg-dk-surface2/40 transition-colors',
                    isOverdue && 'bg-tint-red/30'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_DOT[t.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm truncate',
                        t.status === 'done' ? 'text-dk-dim line-through' : 'text-dk-text'
                      )}>
                        {t.title}
                      </p>
                      {t.company_name && (
                        <p className="text-[10px] text-dk-dim mt-0.5 truncate">{t.company_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.is_auto && (
                        <span className="text-[9px] text-dk-blue border border-tint-blue-border px-1 py-0.5 rounded bg-tint-blue">자동</span>
                      )}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', STATUS_CLS[t.status])}>
                        {STATUS_LABEL[t.status]}
                      </span>
                      {t.due_at && (
                        <span className={cn(
                          'text-[10px] font-mono',
                          isOverdue ? 'text-dk-red font-bold' : 'text-dk-dim'
                        )}>
                          {isOverdue && '⚠ '}{formatDate(t.due_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────
export default function TeamTasksPage() {
  const [loading,    setLoading]    = useState(true)
  const [members,    setMembers]    = useState<MemberRow[]>([])
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [usersRes, tasksRes] = await Promise.all([
          fetch('/api/settings/users?limit=100'),
          fetch('/api/tasks?limit=100'),
        ])
        const [usersJson, tasksJson] = await Promise.all([usersRes.json(), tasksRes.json()])

        type UserRow = { id: string; name: string; role: string; team: { id: string; name: string } | null }
        type TaskRow = {
          id: string; title: string; type: string; status: TaskStatus; priority: TaskPriority
          due_at: string | null; is_auto: boolean
          company: { id: string; name: string } | null
          assigned_user: { id: string; name: string } | null
        }

        const users: UserRow[] = usersJson.data?.data ?? []
        const tasks: TaskRow[] = tasksJson.data?.data ?? []

        const tasksByUser: Record<string, MemberTask[]> = {}
        for (const t of tasks) {
          const uid = t.assigned_user?.id
          if (!uid) continue
          if (!tasksByUser[uid]) tasksByUser[uid] = []
          tasksByUser[uid].push({
            id:           t.id,
            title:        t.title,
            type:         t.type,
            status:       t.status,
            priority:     t.priority,
            due_at:       t.due_at,
            company_name: t.company?.name ?? null,
            is_auto:      t.is_auto,
          })
        }

        const rows: MemberRow[] = users.map(u => ({
          id:    u.id,
          name:  u.name,
          role:  u.role,
          team:  u.team?.name ?? '',
          tasks: tasksByUser[u.id] ?? [],
        }))

        setMembers(rows)
      } catch {
        setError('데이터를 불러올 수 없습니다')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const teams = ['all', ...Array.from(new Set(members.map(m => m.team).filter(Boolean)))]
  const filtered = teamFilter === 'all' ? members : members.filter(m => m.team === teamFilter)

  const allTasks = members.flatMap(m => m.tasks)
  const now = new Date()
  const stats = {
    total:   allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
    overdue: allTasks.filter(t =>
      t.status !== 'done' && t.status !== 'cancelled' &&
      t.due_at && new Date(t.due_at) < now
    ).length,
    high:    allTasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
    done:    allTasks.filter(t => t.status === 'done').length,
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-dk-dim" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-dk-red">{error}</div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-dk-text">팀 업무 현황</h1>
        <p className="text-sm text-dk-muted mt-0.5">팀원별 업무 부하와 현황을 한눈에 확인합니다</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '진행 중',   value: stats.total,   color: 'text-dk-text',   bg: 'bg-dk-surface2 border-dk-border' },
          { label: '기한 초과', value: stats.overdue, color: stats.overdue > 0 ? 'text-dk-red'    : 'text-dk-dim', bg: stats.overdue > 0 ? 'bg-tint-red border-tint-red-border'       : 'bg-dk-surface2 border-dk-border' },
          { label: '긴급',      value: stats.high,    color: stats.high > 0    ? 'text-dk-orange'  : 'text-dk-dim', bg: stats.high > 0    ? 'bg-tint-amber border-tint-amber-border' : 'bg-dk-surface2 border-dk-border' },
          { label: '오늘 완료', value: stats.done,    color: 'text-dk-green',  bg: 'bg-tint-green border-tint-green-border' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border px-4 py-3', s.bg)}>
            <p className="text-xs text-dk-muted">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {teams.map(t => (
          <button
            key={t}
            onClick={() => setTeamFilter(t)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              teamFilter === t
                ? 'bg-dk-blue text-white border-dk-blue'
                : 'text-dk-muted border-dk-border hover:border-dk-muted bg-dk-surface'
            )}
          >
            {t === 'all' ? '전체 팀' : t}
            <span className="ml-1 text-[10px] opacity-70">
              ({t === 'all' ? members.length : members.filter(m => m.team === t).length})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-dk-dim text-center py-10">팀원이 없습니다</p>
        ) : (
          filtered.map(member => (
            <MemberCard key={member.id} member={member} />
          ))
        )}
      </div>
    </div>
  )
}
