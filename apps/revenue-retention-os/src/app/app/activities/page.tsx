'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Phone, Mail, Users, CheckSquare,
  CheckCircle, PhoneMissed, PhoneOff, CalendarClock,
  Search, Loader2, Clock, User, X,
  ChevronRight, Building2,
} from 'lucide-react'
import { cn, formatDate, formatDateTime, formatDuration } from '@/lib/utils'
import {
  CALL_RESULT_LABEL, CALL_RESULT_CLASS,
  VISIT_PURPOSE_LABEL, TASK_PRIORITY_CLASS, TASK_PRIORITY_LABEL,
} from '@/constants/domain'
import type { Activity, Task } from '@/types/domain'

// ─── 상수 ─────────────────────────────────────────────────
const ACTIVITY_ICON: Record<string, React.ElementType> = {
  call:  Phone,
  visit: Users,
  email: Mail,
  sms:   Mail,
  kakao: Mail,
}
const ACTIVITY_ICON_CLS: Record<string, string> = {
  call:  'bg-tint-blue text-dk-blue',
  visit: 'bg-tint-green-hover text-dk-green',
  email: 'bg-tint-purple text-tint-purple-text',
  sms:   'bg-tint-purple text-tint-purple-text',
  kakao: 'bg-tint-purple text-tint-purple-text',
}
const ACTIVITY_LABEL: Record<string, string> = {
  call: '통화', visit: '방문', email: '이메일', sms: 'SMS', kakao: '카카오',
}
const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-dk-red', medium: 'bg-dk-orange', low: 'bg-dk-dim',
}
const TASK_STATUS_CLS: Record<string, string> = {
  todo:        'text-dk-muted  bg-dk-surface2 border-dk-border',
  in_progress: 'text-dk-blue bg-tint-blue  border-tint-blue-border',
  done:        'text-dk-green bg-tint-green  border-tint-green-border',
  cancelled:   'text-dk-muted bg-dk-surface2 border-dk-border',
}
const TASK_STATUS_LABEL: Record<string, string> = {
  todo: '미완료', in_progress: '진행중', done: '완료', cancelled: '취소',
}

type MixedItem =
  | { kind: 'activity'; data: Activity; date: string }
  | { kind: 'task';     data: Task;     date: string }

// ─── 집계 카드 ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number; sub?: string; color: string
}) {
  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold font-mono text-dk-text">{value}</p>
        <p className="text-xs text-dk-muted">{label}</p>
        {sub && <p className="text-[10px] text-dk-dim">{sub}</p>}
      </div>
    </div>
  )
}

// ─── 활동 행 ──────────────────────────────────────────────
function ActivityRow({ a, selected, onClick }: { a: Activity; selected: boolean; onClick: () => void }) {
  const Icon = ACTIVITY_ICON[a.type] ?? Phone
  const resultIcon =
    a.call_result === 'connected' ? <CheckCircle  className="w-3.5 h-3.5 text-dk-green" /> :
    a.call_result === 'no_answer' ? <PhoneMissed  className="w-3.5 h-3.5 text-dk-orange" /> :
    a.call_result === 'rejected'  ? <PhoneOff     className="w-3.5 h-3.5 text-dk-red" /> :
    a.call_result === 'scheduled' ? <CalendarClock className="w-3.5 h-3.5 text-dk-blue" /> :
    null

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-dk-surface border rounded-xl px-4 py-3 cursor-pointer transition-colors',
        selected
          ? 'border-dk-blue bg-tint-blue-deep'
          : 'border-dk-border hover:border-dk-border2 hover:bg-dk-surface2/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', ACTIVITY_ICON_CLS[a.type] ?? 'bg-dk-surface2 text-dk-muted')}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-dk-text">{a.company?.name ?? '—'}</span>
            <span className="text-[10px] text-dk-dim">{ACTIVITY_LABEL[a.type]}</span>
            {resultIcon && (
              <span className="flex items-center gap-1">
                {resultIcon}
                <span className={cn('text-xs', CALL_RESULT_CLASS[a.call_result ?? ''] ?? '')}>
                  {CALL_RESULT_LABEL[a.call_result ?? ''] ?? ''}
                </span>
              </span>
            )}
            {a.call_duration ? <span className="text-[10px] text-dk-dim">{formatDuration(a.call_duration)}</span> : null}
            <span className="flex items-center gap-1 text-[10px] text-dk-dim ml-auto">
              <User className="w-3 h-3" />{a.user?.name}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-dk-dim" />
            <span className="text-[10px] text-dk-dim">{formatDateTime(a.activity_at)}</span>
            {a.contact_value && (a.type === 'call' || a.type === 'email') && (
              <span className={cn(
                'ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border max-w-[200px] truncate',
                a.type === 'call'
                  ? 'text-dk-green border-tint-green-border bg-tint-green'
                  : 'text-tint-purple-text border-tint-purple-border bg-tint-purple'
              )}>
                {a.type === 'call' ? <Phone className="w-2.5 h-2.5 shrink-0" /> : <Mail className="w-2.5 h-2.5 shrink-0" />}
                <span className="truncate">{a.contact_value}</span>
              </span>
            )}
          </div>
          {a.summary && (
            <p className="text-xs text-dk-muted mt-1.5 leading-relaxed line-clamp-2">{a.summary}</p>
          )}
          {a.next_action_at && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-dk-blue">
              <CalendarClock className="w-3 h-3" />
              다음: {a.next_action} ({formatDate(a.next_action_at)})
            </div>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-dk-dim shrink-0 mt-1" />
      </div>
    </div>
  )
}

// ─── 업무 행 ──────────────────────────────────────────────
function TaskRow({ t, selected, onClick }: { t: Task; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-dk-surface border rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors',
        selected
          ? 'border-dk-blue bg-tint-blue-deep'
          : 'border-dk-border hover:border-dk-border2 hover:bg-dk-surface2/30'
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-dk-surface2 border border-dk-border flex items-center justify-center shrink-0">
        <CheckSquare className="w-3.5 h-3.5 text-dk-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-dk-text">{t.company?.name ?? '—'}</span>
          <span className="text-[10px] text-dk-dim">업무</span>
        </div>
        <p className="text-xs text-dk-muted mt-0.5 truncate">{t.title}</p>
        <span className="flex items-center gap-1 text-[10px] text-dk-dim mt-0.5">
          <Clock className="w-3 h-3" />{formatDateTime(t.created_at)}
        </span>
      </div>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_DOT[t.priority] ?? 'bg-dk-dim')} />
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border shrink-0', TASK_STATUS_CLS[t.status] ?? '')}>
        {TASK_STATUS_LABEL[t.status] ?? t.status}
      </span>
      {t.due_at && <p className="text-[10px] text-dk-dim shrink-0">마감 {formatDate(t.due_at)}</p>}
      <ChevronRight className="w-3.5 h-3.5 text-dk-dim shrink-0" />
    </div>
  )
}

// ─── 활동 상세 패널 ────────────────────────────────────────
function ActivityDetail({ a, onClose }: { a: Activity; onClose: () => void }) {
  const Icon = ACTIVITY_ICON[a.type] ?? Phone

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-dk-border">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', ACTIVITY_ICON_CLS[a.type] ?? 'bg-dk-surface2 text-dk-muted')}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dk-text">{ACTIVITY_LABEL[a.type]} 상세</p>
            <p className="text-[10px] text-dk-dim">{formatDateTime(a.activity_at)}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* 고객사 */}
        {a.company && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">고객사</p>
            <Link
              href={`/app/companies/${a.company.id}`}
              className="flex items-center gap-2 text-sm text-dk-blue hover:text-dk-blueHover transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              {a.company.name}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 통화 결과 */}
        {a.call_result && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">통화 결과</p>
            <div className="flex items-center gap-2">
              {a.call_result === 'connected' ? <CheckCircle  className="w-4 h-4 text-dk-green" /> :
               a.call_result === 'no_answer' ? <PhoneMissed  className="w-4 h-4 text-dk-orange" /> :
               a.call_result === 'rejected'  ? <PhoneOff     className="w-4 h-4 text-dk-red" /> :
               a.call_result === 'scheduled' ? <CalendarClock className="w-4 h-4 text-dk-blue" /> : null}
              <span className={cn('text-sm font-medium px-2 py-0.5 rounded-full text-xs', CALL_RESULT_CLASS[a.call_result])}>
                {CALL_RESULT_LABEL[a.call_result]}
              </span>
              {a.call_duration && (
                <span className="text-xs text-dk-dim">{formatDuration(a.call_duration)}</span>
              )}
            </div>
          </div>
        )}

        {/* 방문 목적 */}
        {a.visit_purpose && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">방문 목적</p>
            <p className="text-sm text-dk-text">{VISIT_PURPOSE_LABEL[a.visit_purpose] ?? a.visit_purpose}</p>
          </div>
        )}

        {/* 담당자 */}
        {a.contact && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">담당자</p>
            <p className="text-sm text-dk-text">
              {a.contact.name}
              {a.contact.title && <span className="text-dk-dim ml-1.5 text-xs">{a.contact.title}</span>}
            </p>
          </div>
        )}

        {/* 사용된 연락처 (통화/이메일) */}
        {a.contact_value && (a.type === 'call' || a.type === 'email') && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">
              {a.type === 'call' ? '발신 번호' : '발송 이메일'}
            </p>
            {a.type === 'call' ? (
              <a href={`tel:${a.contact_value}`}
                className="inline-flex items-center gap-1.5 text-sm text-dk-green border border-tint-green-border bg-tint-green px-2.5 py-1 rounded-lg hover:bg-tint-green-hover transition-colors">
                <Phone className="w-3.5 h-3.5" />
                {a.contact_value}
              </a>
            ) : (
              <a href={`mailto:${a.contact_value}`}
                className="inline-flex items-center gap-1.5 text-sm text-tint-purple-text border border-tint-purple-border bg-tint-purple px-2.5 py-1 rounded-lg hover:bg-tint-purple-border transition-colors max-w-full">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{a.contact_value}</span>
              </a>
            )}
          </div>
        )}

        {/* 작성자 */}
        {a.user && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">작성자</p>
            <div className="flex items-center gap-1.5 text-sm text-dk-text">
              <User className="w-3.5 h-3.5 text-dk-dim" />
              {a.user.name}
            </div>
          </div>
        )}

        {/* 상담 내용 */}
        {a.summary && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">상담 내용</p>
            <p className="text-sm text-dk-text leading-relaxed whitespace-pre-wrap bg-dk-surface2 rounded-xl p-3 border border-dk-border">
              {a.summary}
            </p>
          </div>
        )}

        {/* 다음 액션 */}
        {a.next_action && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">다음 액션</p>
            <div className="flex items-center gap-2 bg-tint-blue-deep border border-tint-blue-border rounded-xl p-3">
              <CalendarClock className="w-4 h-4 text-dk-blue shrink-0" />
              <div>
                <p className="text-sm text-dk-text">{a.next_action}</p>
                {a.next_action_at && (
                  <p className="text-xs text-dk-blue mt-0.5">{formatDate(a.next_action_at)}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 업무 상세 패널 ────────────────────────────────────────
function TaskDetail({ t, onClose }: { t: Task; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-dk-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-dk-surface2 border border-dk-border flex items-center justify-center shrink-0">
            <CheckSquare className="w-3.5 h-3.5 text-dk-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dk-text">업무 상세</p>
            <p className="text-[10px] text-dk-dim">{formatDateTime(t.created_at)}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* 제목 */}
        <div>
          <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">제목</p>
          <p className="text-sm font-medium text-dk-text leading-relaxed">{t.title}</p>
        </div>

        {/* 고객사 */}
        {t.company && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">고객사</p>
            <Link
              href={`/app/companies/${t.company.id}`}
              className="flex items-center gap-2 text-sm text-dk-blue hover:text-dk-blueHover transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              {t.company.name}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 상태 & 우선순위 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">상태</p>
            <span className={cn('text-xs px-2 py-1 rounded-lg border font-medium', TASK_STATUS_CLS[t.status] ?? '')}>
              {TASK_STATUS_LABEL[t.status] ?? t.status}
            </span>
          </div>
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">우선순위</p>
            <span className={cn('text-xs px-2 py-1 rounded-lg font-medium', TASK_PRIORITY_CLASS[t.priority] ?? '')}>
              {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
            </span>
          </div>
        </div>

        {/* 마감일 */}
        {t.due_at && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">마감일</p>
            <div className="flex items-center gap-1.5 text-sm text-dk-text">
              <CalendarClock className="w-3.5 h-3.5 text-dk-dim" />
              {formatDate(t.due_at)}
            </div>
          </div>
        )}

        {/* 담당자 */}
        {t.assigned_user && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">담당자</p>
            <div className="flex items-center gap-1.5 text-sm text-dk-text">
              <User className="w-3.5 h-3.5 text-dk-dim" />
              {t.assigned_user.name}
            </div>
          </div>
        )}

        {/* 유형 */}
        {t.type && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">유형</p>
            <p className="text-sm text-dk-text">
              {t.type === 'call' ? '통화' : t.type === 'visit' ? '방문' : t.type === 'email' ? '이메일' : t.type === 'renewal' ? '갱신' : t.type}
            </p>
          </div>
        )}

        {/* 자동 생성 */}
        {t.is_auto && (
          <div className="flex items-center gap-2 bg-tint-blue-deep border border-tint-blue-border rounded-xl px-3 py-2">
            <span className="text-[10px] border border-tint-blue-border text-dk-blue px-1.5 py-0.5 rounded font-medium">자동</span>
            <span className="text-xs text-dk-dim">예약 통화에서 자동 생성된 업무입니다</span>
          </div>
        )}

        {/* 메모 */}
        {t.description && (
          <div>
            <p className="text-[10px] text-dk-dim mb-1.5 font-medium uppercase tracking-wide">메모</p>
            <p className="text-sm text-dk-text leading-relaxed whitespace-pre-wrap bg-dk-surface2 rounded-xl p-3 border border-dk-border">
              {t.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks]           = useState<Task[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]               = useState('')
  const [typeFilter, setTypeFilter]       = useState('')
  const [taskStatusFilter, setTaskStatusFilter] = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [selected, setSelected]           = useState<MixedItem | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/activities?limit=200').then(r => r.json()),
      fetch('/api/tasks?limit=200').then(r => r.json()),
    ]).then(([actJson, taskJson]) => {
      setActivities(actJson.data?.data ?? [])
      setTasks(taskJson.data?.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ── 집계 ──────────────────────────────────────────────
  const calls      = activities.filter(a => a.type === 'call')
  const visits     = activities.filter(a => a.type === 'visit')
  const emails     = activities.filter(a => a.type === 'email')
  const connected  = calls.filter(a => a.call_result === 'connected').length
  const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length

  // ── 혼합 목록 ──────────────────────────────────────────
  const allItems: MixedItem[] = [
    ...activities.map(a => ({ kind: 'activity' as const, data: a, date: a.activity_at })),
    ...tasks.map(t => ({
      kind: 'task' as const,
      data: t,
      // 완료 상태 필터링 시 done_at 기준으로 정렬
      date: (taskStatusFilter === 'done' && t.done_at) ? t.done_at : t.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filtered = allItems.filter(item => {
    if (typeFilter) {
      if (typeFilter === 'task' && item.kind !== 'task') return false
      if (typeFilter !== 'task' && (item.kind !== 'activity' || item.data.type !== typeFilter)) return false
    }
    if (taskStatusFilter && item.kind === 'task') {
      if (taskStatusFilter === 'active' && (item.data.status === 'done' || item.data.status === 'cancelled')) return false
      if (taskStatusFilter === 'done'   &&  item.data.status !== 'done') return false
      if (taskStatusFilter === 'cancelled' && item.data.status !== 'cancelled') return false
    }
    if (search) {
      const name = item.data.company?.name
      if (!name?.includes(search)) return false
    }
    // 완료 업무는 done_at 기준, 그 외는 item.date(activity_at / created_at) 기준
    const filterDate = (taskStatusFilter === 'done' && item.kind === 'task' && item.data.done_at)
      ? item.data.done_at
      : item.date
    if (dateFrom && new Date(filterDate) < new Date(dateFrom)) return false
    if (dateTo   && new Date(filterDate) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const handleSelect = (item: MixedItem) => {
    setSelected(prev => {
      const isSame =
        prev?.kind === item.kind && prev?.data.id === item.data.id
      return isSame ? null : item
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
    </div>
  )

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── 왼쪽: 목록 ─────────────────────────────────── */}
      <div className={cn(
        'flex flex-col min-h-0 transition-all duration-200',
        selected ? 'w-[55%]' : 'w-full'
      )}>
        <div className="shrink-0 px-6 pt-6 pb-4 space-y-4">
          <h1 className="text-xl font-semibold text-dk-text">활동이력</h1>

          {/* 집계 카드 */}
          <div className={cn('grid gap-3', selected ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4')}>
            <StatCard icon={Phone}       label="통화"  value={calls.length}
              sub={`연결 ${connected}건`}  color="bg-tint-blue text-dk-blue" />
            <StatCard icon={Users}       label="방문"  value={visits.length}
              color="bg-tint-green-hover text-dk-green" />
            {!selected && <>
              <StatCard icon={Mail}        label="이메일" value={emails.length}
                color="bg-tint-purple text-tint-purple-text" />
              <StatCard icon={CheckSquare} label="업무"  value={tasks.length}
                sub={`미완료 ${pendingTasks}건`} color="bg-dk-surface2 text-dk-muted" />
            </>}
          </div>

          {/* 필터 */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dk-dim" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="고객사 검색..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-1 focus:ring-dk-blue" />
            </div>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setTaskStatusFilter('') }}
              className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-1 focus:ring-dk-blue"
            >
              <option value="">전체 유형</option>
              <option value="call">통화</option>
              <option value="visit">방문</option>
              <option value="email">이메일</option>
              <option value="task">업무</option>
            </select>
            {typeFilter === 'task' && (
              <select
                value={taskStatusFilter}
                onChange={e => setTaskStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-1 focus:ring-dk-blue"
              >
                <option value="">전체 상태</option>
                <option value="active">활성</option>
                <option value="done">완료</option>
                <option value="cancelled">취소</option>
              </select>
            )}
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-1 focus:ring-dk-blue" />
            <span className="self-center text-xs text-dk-dim">~</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-dk-border bg-dk-surface text-dk-text rounded-lg focus:outline-none focus:ring-1 focus:ring-dk-blue" />
            {(search || typeFilter || taskStatusFilter || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setTypeFilter(''); setTaskStatusFilter(''); setDateFrom(''); setDateTo('') }}
                className="px-3 py-2 text-sm text-dk-muted hover:text-dk-text border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors"
              >
                초기화
              </button>
            )}
          </div>
          <p className="text-[11px] text-dk-dim">{filtered.length}건</p>
        </div>

        {/* 목록 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-dk-dim text-center py-16">이력이 없습니다</p>
          )}
          {filtered.map(item =>
            item.kind === 'activity'
              ? <ActivityRow
                  key={`a-${item.data.id}`}
                  a={item.data}
                  selected={selected?.kind === 'activity' && selected.data.id === item.data.id}
                  onClick={() => handleSelect(item)}
                />
              : <TaskRow
                  key={`t-${item.data.id}`}
                  t={item.data}
                  selected={selected?.kind === 'task' && selected.data.id === item.data.id}
                  onClick={() => handleSelect(item)}
                />
          )}
        </div>
      </div>

      {/* ── 오른쪽: 상세 패널 ──────────────────────────── */}
      {selected && (
        <div className="w-[45%] shrink-0 border-l border-dk-border bg-dk-surface flex flex-col min-h-0 overflow-hidden">
          {selected.kind === 'activity'
            ? <ActivityDetail a={selected.data} onClose={() => setSelected(null)} />
            : <TaskDetail     t={selected.data} onClose={() => setSelected(null)} />
          }
        </div>
      )}

    </div>
  )
}
