'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { TaskStatus, TaskPriority } from '@/types/domain'

// ─── Mock 데이터 ──────────────────────────────────────────
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

const MOCK_MEMBERS: MemberRow[] = [
  {
    id: 'u1', name: '김영업', role: 'manager', team: '서울 영업팀',
    tasks: [
      { id: 't1', title: '[갱신 D-7] 삼성SDS(주)', type: 'renewal', status: 'todo', priority: 'high', due_at: '2024-06-16T00:00:00Z', company_name: '삼성SDS(주)', is_auto: true },
      { id: 't2', title: '[갱신 D-14] 현대글로비스', type: 'renewal', status: 'todo', priority: 'high', due_at: '2024-06-20T00:00:00Z', company_name: '현대글로비스', is_auto: true },
      { id: 't3', title: '계약서 초안 검토', type: 'manual', status: 'in_progress', priority: 'medium', due_at: '2024-06-18T00:00:00Z', company_name: null, is_auto: false },
      { id: 't4', title: '제안서 작성', type: 'manual', status: 'todo', priority: 'low', due_at: '2024-06-21T00:00:00Z', company_name: null, is_auto: false },
    ]
  },
  {
    id: 'u2', name: '이담당', role: 'sales', team: '서울 영업팀',
    tasks: [
      { id: 't5', title: '[갱신 D-30] LG전자(주)', type: 'renewal', status: 'todo', priority: 'medium', due_at: '2024-07-01T00:00:00Z', company_name: 'LG전자(주)', is_auto: true },
      { id: 't6', title: '통화 후 Follow-up', type: 'call', status: 'todo', priority: 'medium', due_at: '2024-06-17T00:00:00Z', company_name: 'SK하이닉스', is_auto: false },
      { id: 't7', title: '방문 미팅 준비', type: 'visit', status: 'done', priority: 'high', due_at: '2024-06-14T00:00:00Z', company_name: '포스코', is_auto: false },
    ]
  },
  {
    id: 'u3', name: '박상담', role: 'sales', team: '서울 영업팀',
    tasks: [
      { id: 't8', title: '[갱신 D-7] KT(주)', type: 'renewal', status: 'in_progress', priority: 'high', due_at: '2024-06-16T00:00:00Z', company_name: 'KT(주)', is_auto: true },
      { id: 't9', title: '[갱신 D-14] GS칼텍스', type: 'renewal', status: 'todo', priority: 'high', due_at: '2024-06-20T00:00:00Z', company_name: 'GS칼텍스', is_auto: true },
    ]
  },
  {
    id: 'u4', name: '최영업', role: 'sales', team: '경기 영업팀',
    tasks: [
      { id: 't10', title: '[갱신 D-30] 롯데케미칼', type: 'renewal', status: 'todo', priority: 'medium', due_at: '2024-07-05T00:00:00Z', company_name: '롯데케미칼', is_auto: true },
    ]
  },
  {
    id: 'u5', name: '정영업', role: 'sales', team: '경기 영업팀',
    tasks: [] // 업무 없음
  },
]

// ─── 상수 ────────────────────────────────────────────────
const STATUS_CLS: Record<TaskStatus, string> = {
  todo:        'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  done:        'bg-green-50 text-green-700 border-green-200',
  cancelled:   'bg-gray-100 text-gray-400 border-gray-200',
}
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '할일', in_progress: '진행중', done: '완료', cancelled: '취소',
}
const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-gray-400',
}
const ROLE_LABEL: Record<string, string> = {
  admin: '관리자', manager: '팀장', sales: '영업',
}

// ─── 멤버 카드 ────────────────────────────────────────────
function MemberCard({ member }: { member: MemberRow }) {
  const [expanded, setExpanded] = useState(true)

  const overdue = member.tasks.filter(t =>
    t.status !== 'done' && t.status !== 'cancelled' &&
    t.due_at && new Date(t.due_at) < new Date()
  )
  const todo       = member.tasks.filter(t => t.status === 'todo')
  const inProgress = member.tasks.filter(t => t.status === 'in_progress')
  const done       = member.tasks.filter(t => t.status === 'done')
  const highCount  = member.tasks.filter(t => t.priority === 'high' && t.status !== 'done').length

  // 부하 게이지: 5개 이하 정상, 10개 이상 과부하
  const total = member.tasks.filter(t => t.status !== 'done').length
  const loadPct = Math.min(total / 10 * 100, 100)
  const loadColor = total >= 8 ? 'bg-red-500' : total >= 5 ? 'bg-amber-400' : 'bg-green-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {member.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{member.name}</p>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200">
              {ROLE_LABEL[member.role]}
            </span>
            <span className="text-[10px] text-gray-400">{member.team}</span>
          </div>
          {/* 부하 게이지 */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 max-w-24 bg-gray-100 rounded-full h-1.5">
              <div className={cn('h-1.5 rounded-full transition-all', loadColor)} style={{ width: `${loadPct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">
              진행 {total}건
            </span>
          </div>
        </div>

        {/* 통계 배지 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {overdue.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-2.5 h-2.5" /> {overdue.length}
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
              긴급 {highCount}
            </span>
          )}
          <div className="flex gap-1 text-[10px] text-gray-400">
            <span>{todo.length} 대기</span>
            <span className="text-gray-300">·</span>
            <span className="text-blue-600">{inProgress.length} 진행</span>
            <span className="text-gray-300">·</span>
            <span className="text-green-600">{done.length} 완료</span>
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>

      {/* 태스크 목록 */}
      {expanded && (
        <div className="border-t border-gray-100">
          {member.tasks.length === 0 ? (
            <div className="px-5 py-5 text-center">
              <p className="text-sm text-gray-400">할당된 업무가 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {member.tasks.map(t => {
                const isOverdue = t.status !== 'done' && t.due_at && new Date(t.due_at) < new Date()
                return (
                  <div key={t.id} className={cn(
                    'flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors',
                    isOverdue && 'bg-red-50/30'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_DOT[t.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm truncate',
                        t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
                      )}>
                        {t.title}
                      </p>
                      {t.company_name && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{t.company_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.is_auto && (
                        <span className="text-[9px] text-blue-500 border border-blue-200 px-1 py-0.5 rounded bg-blue-50">자동</span>
                      )}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', STATUS_CLS[t.status])}>
                        {STATUS_LABEL[t.status]}
                      </span>
                      {t.due_at && (
                        <span className={cn(
                          'text-[10px] font-mono',
                          isOverdue ? 'text-red-500 font-bold' : 'text-gray-400'
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
  const [teamFilter, setTeamFilter] = useState<string>('all')

  const teams = ['all', ...Array.from(new Set(MOCK_MEMBERS.map(m => m.team)))]
  const filtered = teamFilter === 'all'
    ? MOCK_MEMBERS
    : MOCK_MEMBERS.filter(m => m.team === teamFilter)

  // 전체 통계
  const allTasks = MOCK_MEMBERS.flatMap(m => m.tasks)
  const stats = {
    total:    allTasks.filter(t => t.status !== 'done').length,
    overdue:  allTasks.filter(t => t.status !== 'done' && t.due_at && new Date(t.due_at) < new Date()).length,
    high:     allTasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
    done:     allTasks.filter(t => t.status === 'done').length,
  }

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">팀 업무 현황</h1>
        <p className="text-sm text-gray-500 mt-0.5">팀원별 업무 부하와 현황을 한눈에 확인합니다</p>
      </div>

      {/* 전체 통계 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '진행 중', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200' },
          { label: '기한 초과', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-600' : 'text-gray-400', bg: stats.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200' },
          { label: '긴급', value: stats.high, color: stats.high > 0 ? 'text-amber-600' : 'text-gray-400', bg: stats.high > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200' },
          { label: '오늘 완료', value: stats.done, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border px-4 py-3', s.bg)}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 팀 필터 */}
      <div className="flex items-center gap-2">
        {teams.map(t => (
          <button
            key={t}
            onClick={() => setTeamFilter(t)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              teamFilter === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-gray-500 border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            {t === 'all' ? '전체 팀' : t}
            <span className="ml-1 text-[10px] opacity-70">
              ({t === 'all' ? MOCK_MEMBERS.length : MOCK_MEMBERS.filter(m => m.team === t).length})
            </span>
          </button>
        ))}
      </div>

      {/* 멤버별 카드 */}
      <div className="space-y-3">
        {filtered.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}
