'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, ChevronRight, Loader2
} from 'lucide-react'
import { cn, formatAmount, formatDate } from '@/lib/utils'
import type { SubscriptionStatus } from '@/types/domain'
import { PlanBadge, SubscriptionStatusBadge, SUBSCRIPTION_STATUS_CFG } from '../_components/badges'

type SubRow = {
  id: string; tenant_id: string; tenant_name: string
  plan: string; plan_code: string; billing_cycle: string
  status: SubscriptionStatus; started_at: string; expires_at: string
  next_billing_at: string | null; mrr: number; cancel_reason?: string | null
}

/** 구독 관리 페이지.
 *  모든 테넌트의 구독을 한 표에 나열하고, 상태별 카운트 + 활성 MRR 합계를 요약한다.
 *  7일 내 만료 임박 알림 배너로 즉각 조치가 필요한 항목을 강조한다. */
export default function SubscriptionsPage() {
  const [subs, setSubs]             = useState<SubRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all')

  useEffect(() => {
    fetch('/api/super-admin/subscriptions?limit=200')
      .then(r => r.json())
      .then(json => setSubs((json.data?.data ?? []) as SubRow[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = statusFilter === 'all' ? subs : subs.filter(s => s.status === statusFilter)

  const counts = {
    active:    subs.filter(s => s.status === 'active').length,
    trialing:  subs.filter(s => s.status === 'trialing').length,
    past_due:  subs.filter(s => s.status === 'past_due').length,
    cancelled: subs.filter(s => s.status === 'cancelled').length,
  }
  const activeMrr = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0)

  const now = Date.now()
  const expiring7  = subs.filter(s => s.status === 'active' && Math.ceil((new Date(s.expires_at).getTime() - now) / 86400000) <= 7)
  const expiring30 = subs.filter(s => s.status === 'active' && Math.ceil((new Date(s.expires_at).getTime() - now) / 86400000) <= 30)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">구독 관리</h1>
        <p className="text-sm text-gray-400 mt-0.5">활성 MRR {formatAmount(activeMrr)} · 전체 {subs.length}건</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '활성',     count: counts.active,    color: 'border-green-700/40 bg-green-900/20', textColor: 'text-green-400' },
          { label: '체험중',   count: counts.trialing,  color: 'border-blue-700/40 bg-blue-900/20',   textColor: 'text-blue-400' },
          { label: '결제미납', count: counts.past_due,  color: 'border-red-700/40 bg-red-900/20',     textColor: 'text-red-400' },
          { label: '해지',     count: counts.cancelled, color: 'border-gray-700/40 bg-gray-800/40',   textColor: 'text-gray-500' },
        ].map(c => (
          <div key={c.label} className={cn('rounded-xl border px-4 py-3.5', c.color)}>
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', c.textColor)}>{c.count}</p>
          </div>
        ))}
      </div>

      {expiring7.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">7일 내 만료 {expiring7.length}건</p>
            <p className="text-xs text-amber-500 mt-0.5">{expiring7.map(s => s.tenant_name).join(', ')}</p>
          </div>
          <span className="text-xs text-amber-400">{expiring30.length}건 (30일 내)</span>
        </div>
      )}

      <div className="flex gap-1.5">
        {(['all', 'active', 'trialing', 'past_due', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300')}>
            {s === 'all' ? '전체' : SUBSCRIPTION_STATUS_CFG[s].label}
            {s !== 'all' && <span className="ml-1 text-[10px]">{counts[s]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                {['테넌트', '플랜', '결제주기', '상태', '시작일', '만료일', 'MRR', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filtered.map(s => {
                const daysLeft = Math.ceil((new Date(s.expires_at).getTime() - now) / 86400000)
                const isExpiringSoon = s.status === 'active' && daysLeft <= 14
                return (
                  <tr key={s.id} className={cn('hover:bg-white/3 transition-colors group', isExpiringSoon && 'bg-amber-950/10')}>
                    <td className="px-4 py-3.5">
                      <Link href={`/super-admin/tenants/${s.tenant_id}`}
                        className="text-sm font-medium text-gray-200 hover:text-blue-400 transition-colors">{s.tenant_name}</Link>
                    </td>
                    <td className="px-4 py-3.5"><PlanBadge plan={s.plan} /></td>
                    <td className="px-4 py-3.5"><span className="text-xs text-gray-400">{s.billing_cycle === 'monthly' ? '월간' : '연간'}</span></td>
                    <td className="px-4 py-3.5"><SubscriptionStatusBadge status={s.status} /></td>
                    <td className="px-4 py-3.5"><span className="text-xs text-gray-400 font-mono">{formatDate(s.started_at)}</span></td>
                    <td className="px-4 py-3.5">
                      <div>
                        <span className={cn('text-xs font-mono', isExpiringSoon ? 'text-amber-400 font-bold' : 'text-gray-300')}>
                          {formatDate(s.expires_at)}
                        </span>
                        {isExpiringSoon && <span className="block text-[10px] text-amber-500">D-{daysLeft}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('text-xs font-mono font-bold', s.mrr > 0 ? 'text-blue-400' : 'text-gray-600')}>
                        {s.mrr > 0 ? formatAmount(s.mrr) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/super-admin/tenants/${s.tenant_id}`}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        관리 <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
