'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckSquare, Plus, Clock, AlertCircle, Building2,
  RefreshCw, Phone, Mail, MapPin, Star, Check, Loader2,
  ChevronRight, X, User, CalendarClock, Ban,
} from 'lucide-react'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { TASK_PRIORITY_CLASS, TASK_PRIORITY_LABEL } from '@/constants/domain'
import type { Task } from '@/types/domain'

const TASK_STATUS_CLS: Record<string, string> = {
  todo:        'text-dk-muted  bg-dk-surface2 border-dk-border',
  in_progress: 'text-[#58A6FF] bg-[#1c2d4a]  border-[#2d4a7a]',
  done:        'text-[#3fb950] bg-[#0f2d17]  border-[#2d6a3f]',
  cancelled:   'text-[#8B949E] bg-dk-surface2 border-dk-border',
}
const TASK_STATUS_LABEL: Record<string, string> = {
  todo: '미완료', in_progress: '진행중', done: '완료', cancelled: '취소',
}

function TaskTypeIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'renewal': return <RefreshCw className="w-3.5 h-3.5 text-dk-blue" />
    case 'call':    return <Phone     className="w-3.5 h-3.5 text-[#3FB950]" />
    case 'email':   return <Mail      className="w-3.5 h-3.5 text-dk-purple" />
    case 'visit':   return <MapPin    className="w-3.5 h-3.5 text-[#D2A8FF]" />
    default:        return <Star      className="w-3.5 h-3.5 text-dk-dim" />
  }
}

// ─── 업무 카드 ─────────────────────────────────────────────
function TaskCard({
  task, selected, onSelect, onToggle,
}: {
  task: Task
  selected: boolean
  onSelect: (t: Task) => void
  onToggle: (id: string) => void
}) {
  const isOverdue   = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'done' && task.status !== 'cancelled'
  const isDone      = task.status === 'done'
  const isCancelled = task.status === 'cancelled'

  return (
    <div
      onClick={() => onSelect(task)}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer',
        selected
          ? 'border-dk-blue bg-[#111d30]'
          : isDone || isCancelled
            ? 'bg-dk-surface2/50 border-dk-border opacity-60 hover:opacity-80'
            : isOverdue
              ? 'bg-[#3d1a1a]/30 border-[#7f2020] hover:border-[#a03030]'
              : 'bg-dk-surface border-dk-border hover:border-dk-border2'
      )}
    >
      {/* 체크박스 — 완료 탭에서는 숨김 */}
      {!isDone && !isCancelled && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(task.id) }}
          className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-dk-border2 hover:border-dk-blue flex items-center justify-center transition-all"
        />
      )}
      {isDone && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(task.id) }}
          className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-[#3FB950] bg-[#3FB950] flex items-center justify-center transition-all"
        >
          <Check className="w-3 h-3 text-white" />
        </button>
      )}
      {isCancelled && (
        <div className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-dk-border flex items-center justify-center">
          <Ban className="w-3 h-3 text-dk-dim" />
        </div>
      )}

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <TaskTypeIcon type={task.type} />
          <span className={cn('text-sm font-medium truncate', isDone || isCancelled ? 'line-through text-dk-dim' : 'text-dk-text')}>
            {task.title}
          </span>
          {task.is_auto && (
            <span className="flex-shrink-0 text-[10px] bg-[#1c2d4a] text-dk-blue border border-[#2d4a7a] px-1.5 py-0.5 rounded">
              자동
            </span>
          )}
        </div>
        {task.company && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-dk-dim">
            <Building2 className="w-3 h-3" />{task.company.name}
          </div>
        )}
      </div>

      {/* 우측 메타 */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', TASK_PRIORITY_CLASS[task.priority])}>
          {task.priority === 'high' ? '높음' : task.priority === 'medium' ? '보통' : '낮음'}
        </span>
        {task.due_at && (
          <span className={cn('text-xs font-mono', isOverdue && !isDone ? 'text-[#FF7B72] font-semibold' : 'text-dk-dim')}>
            {isOverdue && !isDone ? '⚠ ' : ''}{formatDate(task.due_at)}
          </span>
        )}
        {isDone && task.done_at && (
          <span className="text-[10px] text-[#3FB950] font-mono">{formatDate(task.done_at)} 완료</span>
        )}
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-dk-dim shrink-0" />
    </div>
  )
}

// ─── 활성 그룹 ─────────────────────────────────────────────
function TaskGroup({
  title, tasks, icon, onToggle, onSelect, selected, defaultOpen = true,
}: {
  title: string; tasks: Task[]; icon: React.ReactNode
  onToggle: (id: string) => void; onSelect: (t: Task) => void
  selected: Task | null; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (tasks.length === 0) return null
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 mb-2 w-full text-left group">
        {icon}
        <span className="text-xs font-semibold text-dk-muted uppercase tracking-wide">{title}</span>
        <span className="text-xs bg-dk-surface2 text-dk-dim px-1.5 py-0.5 rounded-full border border-dk-border">{tasks.length}</span>
        <span className="ml-auto text-xs text-dk-dim">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-2">
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} selected={selected?.id === t.id} onSelect={onSelect} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 상세 패널 ─────────────────────────────────────────────
function TaskDetail({ task, onClose, onToggle }: { task: Task; onClose: () => void; onToggle: (id: string) => void }) {
  const isDone = task.status === 'done'
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-dk-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-dk-surface2 border border-dk-border flex items-center justify-center shrink-0">
            <TaskTypeIcon type={task.type} />
          </div>
          <div>
            <p className="text-sm font-semibold text-dk-text">업무 상세</p>
            <p className="text-[10px] text-dk-dim">{formatDateTime(task.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.status !== 'cancelled' && (
            <button
              onClick={() => onToggle(task.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                isDone
                  ? 'border-[#2d6a3f] text-[#3fb950] bg-[#0f2d17] hover:bg-[#1a4a26]'
                  : 'border-dk-border text-dk-muted bg-dk-surface2 hover:text-dk-text hover:bg-dk-surface'
              )}
            >
              <Check className="w-3.5 h-3.5" />
              {isDone ? '완료 취소' : '완료 처리'}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">제목</p>
          <p className={cn('text-sm font-medium leading-relaxed', isDone || task.status === 'cancelled' ? 'line-through text-dk-dim' : 'text-dk-text')}>
            {task.title}
          </p>
        </div>

        {task.company && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">고객사</p>
            <Link href={`/app/companies/${task.company.id}`} className="flex items-center gap-2 text-sm text-dk-blue hover:text-[#79BAFF] transition-colors">
              <Building2 className="w-3.5 h-3.5" />
              {task.company.name}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">상태</p>
            <span className={cn('text-xs px-2 py-1 rounded-lg border font-medium', TASK_STATUS_CLS[task.status] ?? '')}>
              {TASK_STATUS_LABEL[task.status] ?? task.status}
            </span>
          </div>
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">우선순위</p>
            <span className={cn('text-xs px-2 py-1 rounded-lg font-medium', TASK_PRIORITY_CLASS[task.priority] ?? '')}>
              {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}
            </span>
          </div>
        </div>

        {task.due_at && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">마감일</p>
            <div className="flex items-center gap-1.5 text-sm text-dk-text">
              <CalendarClock className="w-3.5 h-3.5 text-dk-dim" />
              {formatDate(task.due_at)}
            </div>
          </div>
        )}

        {task.done_at && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">완료일</p>
            <div className="flex items-center gap-1.5 text-sm text-[#3FB950]">
              <Check className="w-3.5 h-3.5" />
              {formatDateTime(task.done_at)}
            </div>
          </div>
        )}

        {task.assigned_user && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">담당자</p>
            <div className="flex items-center gap-1.5 text-sm text-dk-text">
              <User className="w-3.5 h-3.5 text-dk-dim" />
              {task.assigned_user.name}
            </div>
          </div>
        )}

        {task.type && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">유형</p>
            <div className="flex items-center gap-1.5 text-sm text-dk-text">
              <TaskTypeIcon type={task.type} />
              {task.type === 'call' ? '통화' : task.type === 'visit' ? '방문' : task.type === 'email' ? '이메일' : task.type === 'renewal' ? '갱신' : task.type}
            </div>
          </div>
        )}

        {task.is_auto && (
          <div className="flex items-center gap-2 bg-[#111d30] border border-[#2d4a7a] rounded-xl px-3 py-2">
            <span className="text-[10px] border border-[#2d4a7a] text-dk-blue px-1.5 py-0.5 rounded font-medium">자동</span>
            <span className="text-xs text-dk-dim">예약 통화에서 자동 생성된 업무입니다</span>
          </div>
        )}

        {task.description && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">메모</p>
            <p className="text-sm text-dk-text leading-relaxed whitespace-pre-wrap bg-dk-surface2 rounded-xl p-3 border border-dk-border">
              {task.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 업무 추가 모달 ────────────────────────────────────────
function AddTaskModal({ onClose }: { onClose: () => void }) {
  const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-dk-text">업무 추가</h3>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text text-xl">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">제목 *</label>
            <input placeholder="업무 내용..." className={INPUT_CLS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">유형</label>
              <select className={INPUT_CLS}>
                <option value="manual">일반</option>
                <option value="call">통화</option>
                <option value="visit">방문</option>
                <option value="email">이메일</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1.5 block">우선순위</label>
              <select className={INPUT_CLS}>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1.5 block">마감일</label>
            <input type="date" className={INPUT_CLS} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">취소</button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#1f6feb] rounded-lg hover:bg-[#388bfd] transition-colors">저장</button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────
type TabType = 'active' | 'done' | 'cancelled'

export default function MyTasksPage() {
  const [loading, setLoading]           = useState(true)
  const [tasks, setTasks]               = useState<Task[]>([])
  const [showModal, setShowModal]       = useState(false)
  const [selected, setSelected]         = useState<Task | null>(null)
  const [tab, setTab]                   = useState<TabType>('active')

  useEffect(() => {
    fetch('/api/tasks?mine=true&limit=200')
      .then(r => r.json())
      .then(json => { setTasks(json.data?.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    const newDoneAt = newStatus === 'done' ? new Date().toISOString() : null
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, done_at: newDoneAt } : t))
    setSelected(prev => prev?.id === id ? { ...prev, status: newStatus, done_at: newDoneAt } : prev)
    fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(console.error)
  }

  const handleSelect = (task: Task) => {
    setSelected(prev => prev?.id === task.id ? null : task)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const endOfToday   = new Date(); endOfToday.setHours(23, 59, 59, 999)

  const active    = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const overdue   = active.filter(t => t.due_at && new Date(t.due_at) < startOfToday)
  const todayList = active.filter(t => t.due_at && new Date(t.due_at) >= startOfToday && new Date(t.due_at) <= endOfToday)
  const upcoming  = active.filter(t => t.due_at && new Date(t.due_at) > endOfToday)
  const noDue     = active.filter(t => !t.due_at)
  const cancelled = tasks.filter(t => t.status === 'cancelled')
  const doneToday = tasks.filter(t => t.status === 'done' && t.done_at && new Date(t.done_at) >= startOfToday)

  const completedToday = doneToday.length
  const commonProps    = { onToggle: toggleTask, onSelect: handleSelect, selected }

  const TABS: { key: TabType; label: string; count: number }[] = [
    { key: 'active',    label: '활성',  count: active.length },
    { key: 'done',      label: '완료',  count: completedToday },
    { key: 'cancelled', label: '취소',  count: cancelled.length },
  ]

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── 왼쪽 ────────────────────────────────────────── */}
      <div className={cn('flex flex-col min-h-0 transition-all duration-200', selected ? 'w-[55%]' : 'w-full')}>

        {/* 헤더 */}
        <div className="shrink-0 px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-semibold text-dk-text">내 업무</h1>
              <p className="text-sm text-dk-muted mt-0.5">
                오늘 {todayList.length}개 남음 · {completedToday}개 완료
                {overdue.length > 0 && (
                  <span className="ml-2 text-[#FF7B72] font-medium">⚠ 기한초과 {overdue.length}개</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#1f6feb] text-white text-sm font-medium rounded-lg hover:bg-[#388bfd] transition-colors"
            >
              <Plus className="w-4 h-4" />
              {!selected && <span>업무 추가</span>}
            </button>
          </div>

          {/* 진행률 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-dk-dim">오늘 진행률</span>
              <span className="text-[11px] font-mono text-dk-blue">
                {completedToday} / {todayList.length + completedToday}
              </span>
            </div>
            <div className="h-1.5 bg-dk-surface2 rounded-full overflow-hidden">
              <div
                className="h-full bg-dk-blue rounded-full transition-all"
                style={{
                  width: `${todayList.length + completedToday > 0
                    ? Math.round(completedToday / (todayList.length + completedToday) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 border-b border-dk-border">
            {TABS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                  tab === key
                    ? 'border-dk-blue text-dk-blue'
                    : 'border-transparent text-dk-muted hover:text-dk-text'
                )}
              >
                {label}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  tab === key ? 'bg-dk-blue/20 text-dk-blue' : 'bg-dk-surface2 text-dk-dim'
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">

          {/* 활성 탭 */}
          {tab === 'active' && (
            <>
              <TaskGroup title="기한 초과" tasks={overdue}   icon={<AlertCircle className="w-4 h-4 text-[#FF7B72]" />} {...commonProps} />
              <TaskGroup title="오늘"      tasks={todayList} icon={<Clock       className="w-4 h-4 text-dk-blue"   />} {...commonProps} />
              <TaskGroup title="예정"      tasks={upcoming}  icon={<CheckSquare className="w-4 h-4 text-dk-muted"  />} {...commonProps} />
              <TaskGroup title="기한 없음" tasks={noDue}     icon={<Star        className="w-4 h-4 text-dk-dim"    />} {...commonProps} defaultOpen={false} />
              {active.length === 0 && (
                <div className="text-center py-16 text-dk-dim">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">활성 업무가 없습니다</p>
                </div>
              )}
            </>
          )}

          {/* 완료 탭 — 오늘 완료한 업무만 */}
          {tab === 'done' && (
            <div className="space-y-2">
              {doneToday.length === 0 ? (
                <div className="text-center py-16 text-dk-dim">
                  <Check className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">오늘 완료한 업무가 없습니다</p>
                </div>
              ) : (
                doneToday.map(t => (
                  <TaskCard key={t.id} task={t} selected={selected?.id === t.id} onSelect={handleSelect} onToggle={toggleTask} />
                ))
              )}
            </div>
          )}

          {/* 취소 탭 */}
          {tab === 'cancelled' && (
            <div className="space-y-2">
              {cancelled.length === 0 ? (
                <div className="text-center py-16 text-dk-dim">
                  <Ban className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">취소된 업무가 없습니다</p>
                </div>
              ) : (
                cancelled.map(t => (
                  <TaskCard key={t.id} task={t} selected={selected?.id === t.id} onSelect={handleSelect} onToggle={toggleTask} />
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── 오른쪽: 상세 패널 ──────────────────────────── */}
      {selected && (
        <div className="w-[45%] shrink-0 border-l border-dk-border bg-dk-surface flex flex-col min-h-0 overflow-hidden">
          <TaskDetail task={selected} onClose={() => setSelected(null)} onToggle={toggleTask} />
        </div>
      )}

      {showModal && <AddTaskModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
