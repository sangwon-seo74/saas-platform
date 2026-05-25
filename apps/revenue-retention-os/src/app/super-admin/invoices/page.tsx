'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, ChevronRight, Loader2, Download
} from 'lucide-react'
import { cn, formatAmount, formatDate } from '@/lib/utils'
import type { InvoiceStatus } from '@/types/domain'
import { InvoiceStatusBadge, INVOICE_STATUS_CFG } from '../_components/badges'
import { downloadCsv } from '../_components/csv'

type InvoiceRow = {
  id: string; invoice_no: string; tenant_id: string; tenant_name: string; plan: string
  billing_cycle: string; period_start: string; period_end: string
  amount: number; status: InvoiceStatus; payment_method: string | null
  paid_at: string | null; due_at: string | null; memo: string | null
}

/** 결제(인보이스) 관리 페이지.
 *  모든 인보이스를 상태(완료/대기/실패/환불) 필터와 함께 표로 보여주고,
 *  실패/대기 건이 있을 때는 상단 경고 배너로 알린다. 상세 행 클릭 시 수동 처리 페이지로 이동. */
export default function InvoicesPage() {
  const [invoices, setInvoices]     = useState<InvoiceRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  useEffect(() => {
    fetch('/api/super-admin/invoices?limit=200')
      .then(r => r.json())
      .then(json => setInvoices((json.data?.data ?? []) as InvoiceRow[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter)

  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalFailed  = invoices.filter(i => i.status === 'failed').length
  const totalPending = invoices.filter(i => i.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">결제 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">총 수납 {formatAmount(totalPaid)}</p>
        </div>
        <button
          onClick={() => downloadCsv(`invoices_${new Date().toISOString().slice(0, 10)}.csv`, invoices.map(i => ({
            인보이스번호: i.invoice_no, 테넌트: i.tenant_name, 플랜: i.plan,
            결제주기: i.billing_cycle, 시작: i.period_start, 종료: i.period_end,
            금액: i.amount, 상태: i.status, 결제수단: i.payment_method,
            결제일: i.paid_at, 만기일: i.due_at, 메모: i.memo,
          })))}
          className="flex items-center gap-1.5 text-gray-300 border border-gray-700 hover:border-gray-500 text-sm px-3 py-2 rounded-lg transition-colors">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {(totalFailed > 0 || totalPending > 0) && (
        <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-800/40 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1 text-sm text-red-300">
            {totalFailed > 0 && <span className="font-semibold">결제 실패 {totalFailed}건</span>}
            {totalFailed > 0 && totalPending > 0 && <span className="text-red-500 mx-2">·</span>}
            {totalPending > 0 && <span>결제 대기 {totalPending}건</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '결제완료', count: invoices.filter(i => i.status === 'paid').length,     color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
          { label: '결제대기', count: totalPending,                                          color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/30' },
          { label: '결제실패', count: totalFailed,                                           color: 'text-red-400',   bg: 'bg-red-900/20 border-red-700/30' },
          { label: '환불',     count: invoices.filter(i => i.status === 'refunded').length, color: 'text-gray-400',  bg: 'bg-gray-800/40 border-gray-700/30' },
        ].map(c => (
          <div key={c.label} className={cn('rounded-xl border px-4 py-3.5', c.bg)}>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', c.color)}>{c.count}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300')}>
            {s === 'all' ? '전체' : INVOICE_STATUS_CFG[s as InvoiceStatus]?.label ?? s}
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
                {['인보이스', '테넌트', '플랜', '금액', '상태', '결제일', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-mono text-gray-300">{inv.invoice_no || '—'}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {inv.billing_cycle === 'monthly' ? '월간' : '연간'} · {formatDate(inv.period_start)} ~ {formatDate(inv.period_end)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/super-admin/tenants/${inv.tenant_id}`}
                      className="text-sm text-gray-200 hover:text-blue-400 transition-colors">{inv.tenant_name}</Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                      inv.plan === 'Pro' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30')}>
                      {inv.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className={cn('text-sm font-bold font-mono', inv.status === 'refunded' ? 'text-gray-500 line-through' : 'text-white')}>
                      {formatAmount(inv.amount)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <InvoiceStatusBadge status={inv.status} />
                      {inv.memo && <p className="text-[10px] text-gray-500 mt-0.5">{inv.memo}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-400 font-mono">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/super-admin/invoices/${inv.id}`}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                        상세 <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center"><p className="text-sm text-gray-500">인보이스가 없습니다</p></div>
          )}
        </div>
      )}
    </div>
  )
}
