'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, Loader2, Download, Phone,
} from 'lucide-react'
import { cn, formatAmount, calcDday } from '@/lib/utils'
import type { RenewalStatus, RiskLevel } from '@/types/domain'
import { QuickActivityModal } from '@/components/QuickActivityModal'

const PAGE_SIZE = 50

type RenewalCard = {
  id: string
  company_id: string
  company_name: string
  product_name: string
  expires_at: string
  final_amount: number
  risk: RiskLevel
  status: RenewalStatus
  assigned_user: string
}

type User = { id: string; name: string }

const BUCKETS = [
  { key: 'D-90', label: 'D-90', from: 61, to: 90, color: 'border-dk-border bg-dk-surface2/30' },
  { key: 'D-60', label: 'D-60', from: 31, to: 60, color: 'border-dk-border bg-dk-surface2/30' },
  { key: 'D-30', label: 'D-30', from: 15, to: 30, color: 'border-tint-amber-border bg-tint-amber/30' },
  { key: 'D-14', label: 'D-14', from: 8,  to: 14, color: 'border-tint-amber-border bg-tint-amber/40' },
  { key: 'D-7',  label: 'D-7',  from: 0,  to: 7,  color: 'border-tint-red-border bg-tint-red/40' },
]

const RISK_CFG: Record<RiskLevel, { cls: string; borderCls: string; icon: React.ElementType }> = {
  high:   { cls: 'bg-tint-red text-dk-red border-tint-red-border',         borderCls: 'border-l-dk-red',    icon: AlertCircle },
  medium: { cls: 'bg-tint-amber text-dk-orange border-tint-amber-border',  borderCls: 'border-l-dk-orange', icon: AlertTriangle },
  low:    { cls: 'bg-tint-green text-dk-green border-tint-green-border',   borderCls: 'border-l-dk-green',  icon: CheckCircle2 },
}

const STATUS_LABEL: Record<RenewalStatus, string> = {
  pending: '대기', contacted: '접촉', negotiating: '협의중', won: '완료', lost: '이탈'
}
const STATUS_CLS: Record<RenewalStatus, string> = {
  pending:     'bg-dk-surface2 text-dk-muted',
  contacted:   'bg-tint-blue text-dk-blue',
  negotiating: 'bg-tint-amber text-dk-orange',
  won:         'bg-tint-green text-dk-green',
  lost:        'bg-tint-red text-dk-red',
}

function RenewalKanbanCard({
  renewal,
  onLogActivity,
}: {
  renewal: RenewalCard
  onLogActivity: (r: RenewalCard) => void
}) {
  const router = useRouter()
  const dday = calcDday(renewal.expires_at)
  const risk = RISK_CFG[renewal.risk]
  const RiskIcon = risk.icon

  return (
    <div
      onClick={() => router.push(`/app/renewals/${renewal.id}`)}
      className={cn(
        'group bg-dk-surface rounded-xl border border-dk-border border-l-4 p-3',
        'hover:border-dk-border2 hover:scale-[1.01] transition-all cursor-pointer',
        risk.borderCls
      )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-dk-text leading-tight">{renewal.company_name}</p>
        <span className={cn('inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0', risk.cls)}>
          <RiskIcon className="w-2.5 h-2.5" />
          {renewal.risk === 'high' ? '위험' : renewal.risk === 'medium' ? '주의' : '안전'}
        </span>
      </div>

      <p className="text-[10px] text-dk-dim truncate mb-2">{renewal.product_name || '—'}</p>

      <p className="text-sm font-bold text-dk-text font-mono mb-2">
        {formatAmount(renewal.final_amount)}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded',
            dday <= 7  ? 'bg-tint-red text-dk-red' :
            dday <= 14 ? 'bg-tint-amber text-dk-orange' :
                         'bg-dk-surface2 text-dk-muted'
          )}>
            D-{dday}
          </span>
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', STATUS_CLS[renewal.status])}>
            {STATUS_LABEL[renewal.status]}
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onLogActivity(renewal) }}
          title="활동 기록"
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-dk-muted hover:text-dk-blue hover:bg-tint-blue px-1.5 py-0.5 rounded-md transition-all">
          <Phone className="w-3 h-3" /> 활동
        </button>
      </div>
    </div>
  )
}

function mapRenewal(r: Record<string, unknown>): RenewalCard {
  return {
    id:            r.id as string,
    company_id:    (r.company as { id: string } | null)?.id ?? '',
    company_name:  (r.company as { name: string } | null)?.name ?? '',
    product_name:  ((r.contract as { product?: { name: string } } | null)?.product?.name) ?? '',
    expires_at:    r.contract_expires_at as string,
    final_amount:  (r.contract as { final_amount: number } | null)?.final_amount ?? 0,
    risk:          (r.risk_level as RiskLevel) ?? 'low',
    status:        r.status as RenewalStatus,
    assigned_user: (r.assigned_user as { name: string } | null)?.name ?? '',
  }
}

export default function RenewalsPage() {
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [renewals, setRenewals]     = useState<RenewalCard[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore]       = useState(false)
  const [userFilter, setUserFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [users, setUsers]           = useState<User[]>([])
  const [activityTarget, setActivityTarget] = useState<RenewalCard | null>(null)

  // IntersectionObserver 콜백 내에서 최신값을 읽기 위해 ref로 관리
  const pageRef       = useRef(1)
  const hasMoreRef    = useRef(false)
  const isFetchingRef = useRef(false)
  // 모든 컬럼 하단 sentinel 요소를 하나의 observer가 감시
  const observerRef   = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(json => setUsers(json.data ?? []))
      .catch(() => {})
  }, [])

  const fetchPage = useCallback(async (pg: number, reset: boolean) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (reset) setLoading(true)
    else setLoadingMore(true)

    const params = new URLSearchParams({
      limit:   String(PAGE_SIZE),
      page:    String(pg),
      days_to: '90',
    })
    if (userFilter !== 'all') params.set('user_id', userFilter)
    if (riskFilter !== 'all') params.set('risk', riskFilter)

    try {
      const json = await fetch(`/api/renewals?${params}`).then(r => r.json())
      const mapped = ((json.data?.data ?? []) as Record<string, unknown>[]).map(mapRenewal)
      const total  = json.data?.count ?? 0

      setTotalCount(total)
      setRenewals(prev => reset ? mapped : [...prev, ...mapped])

      const loaded = (pg - 1) * PAGE_SIZE + mapped.length
      const more   = loaded < total
      setHasMore(more)
      hasMoreRef.current = more
      pageRef.current    = pg
    } catch {
      // 네트워크 오류 시 기존 데이터 유지
    } finally {
      isFetchingRef.current = false
      if (reset) setLoading(false)
      else setLoadingMore(false)
    }
  }, [userFilter, riskFilter])

  // 필터 변경 시 1페이지부터 재조회
  useEffect(() => {
    pageRef.current    = 1
    hasMoreRef.current = false
    fetchPage(1, true)
  }, [fetchPage])

  // 각 컬럼 하단 sentinel을 감시하는 공용 observer 생성
  // fetchPage가 바뀌면(=필터 변경 시) observer도 재생성되어 sentinel을 재등록
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(e => e.isIntersecting)
        if (visible && hasMoreRef.current && !isFetchingRef.current) {
          fetchPage(pageRef.current + 1, false)
        }
      },
      { threshold: 0.1 }
    )
    return () => observerRef.current?.disconnect()
  }, [fetchPage])

  // 컬럼 하단 sentinel 요소를 observer에 등록하는 콜백 ref
  const attachSentinel = useCallback((node: HTMLDivElement | null) => {
    if (node && observerRef.current) observerRef.current.observe(node)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  const bucketData = BUCKETS.map(b => ({
    ...b,
    cards: renewals.filter(r => {
      const d = calcDday(r.expires_at)
      return d >= b.from && d <= b.to
    }),
  }))

  const totalAmount = renewals.reduce((s, r) => s + r.final_amount, 0)

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-4 min-h-0">
      {activityTarget && (
        <QuickActivityModal
          company={{ id: activityTarget.company_id, name: activityTarget.company_name }}
          renewalId={activityTarget.id}
          onClose={() => setActivityTarget(null)}
          onSaved={() => setActivityTarget(null)}
        />
      )}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-dk-text flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-dk-blue" /> 갱신 관리
          </h1>
          <p className="text-sm text-dk-dim mt-0.5">
            진행 중 {renewals.length}건
            {hasMore && ` (전체 ${totalCount}건 중)`}
            {' · '}예상 ARR {formatAmount(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/api/export/renewals" download
            className="hidden sm:flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg border border-dk-border text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
            <Download className="w-4 h-4" /> 내보내기
          </a>
          {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-dk-muted" />}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'high', 'medium', 'low'] as const).map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                riskFilter === r
                  ? 'bg-dk-text text-dk-bg border-dk-text'
                  : 'text-dk-muted border-dk-border bg-dk-surface hover:border-dk-border2')}>
              {r === 'all' ? '위험도 전체' : r === 'high' ? '⚠ 위험' : r === 'medium' ? '△ 주의' : '✓ 안전'}
            </button>
          ))}
        </div>

        {users.length > 0 && (
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-dk-border bg-dk-surface text-dk-muted font-medium focus:outline-none focus:border-dk-border2 cursor-pointer">
            <option value="all">담당자 전체</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto pb-2">
        {bucketData.map(bucket => (
          <div key={bucket.key} className="shrink-0 w-[210px] flex flex-col min-h-0">
            <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 shrink-0', bucket.color)}>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-bold',
                  bucket.key === 'D-7'  ? 'text-dk-red' :
                  bucket.key === 'D-14' ? 'text-dk-orange' :
                  bucket.key === 'D-30' ? 'text-dk-orange' : 'text-dk-muted'
                )}>
                  {bucket.label}
                </span>
                <span className="text-xs text-dk-dim">({bucket.cards.length}건)</span>
              </div>
              {bucket.cards.length > 0 && (
                <span className="text-[10px] text-dk-dim">
                  {formatAmount(bucket.cards.reduce((s, c) => s + c.final_amount, 0)).replace('원', '')}
                </span>
              )}
            </div>
            <div className={cn('flex-1 min-h-0 overflow-y-auto p-2 space-y-2 rounded-b-xl border', bucket.color)}>
              {bucket.cards.map(r => <RenewalKanbanCard key={r.id} renewal={r} onLogActivity={setActivityTarget} />)}
              {bucket.cards.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-dk-dim">없음</p>
                </div>
              )}
              {/* 각 컬럼 하단에 sentinel 배치 — hasMore일 때만 observer 대상 */}
              {hasMore && <div ref={attachSentinel} className="h-1" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
