'use client'

import { useState, useEffect } from 'react'
import {
  Receipt, Download, CheckCircle2, XCircle,
  Clock, RefreshCw, ChevronDown, Loader2
} from 'lucide-react'
import { cn, formatAmount, formatDate } from '@/lib/utils'
import type { InvoiceStatus } from '@/types/domain'

type InvoiceRowData = {
  id: string; invoice_no: string; plan: string; billing_cycle: string
  period_start: string; period_end: string
  amount: number; credit_amount: number
  status: InvoiceStatus
  payment_method: string | null
  paid_at: string | null; due_at: string | null
  tax_invoice_status: string | null; tax_invoice_no: string | null
  memo: string | null  // public_memo from server
}

const STATUS_CFG: Record<InvoiceStatus, { label: string; cls: string; icon: React.ElementType }> = {
  paid:     { label: '결제완료', cls: 'bg-dk-green/10 text-dk-green border-dk-green/30',     icon: CheckCircle2 },
  pending:  { label: '결제대기', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock },
  failed:   { label: '결제실패', cls: 'bg-dk-red/10 text-dk-red border-dk-red/30',          icon: XCircle },
  refunded: { label: '환불',     cls: 'bg-dk-surface2 text-dk-dim border-dk-border',         icon: RefreshCw },
}

const TAX_STATUS_LABEL: Record<string, string> = {
  not_required: '발행 불필요',
  pending:      '발행 대기',
  issued:       '발행 완료',
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CFG[status]
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium', cfg.cls)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

/** 인보이스 행 — 클릭 시 세부 정보(결제 수단/세금계산서/메모) 펼침. */
function InvoiceRow({ invoice }: { invoice: InvoiceRowData }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr onClick={() => setOpen(!open)} className="hover:bg-dk-surface2/40 cursor-pointer transition-colors">
        <td className="px-5 py-3.5">
          <p className="text-sm font-medium text-dk-text">{invoice.invoice_no || '—'}</p>
          <p className="text-xs text-dk-dim mt-0.5">
            {formatDate(invoice.period_start)} ~ {formatDate(invoice.period_end)}
          </p>
        </td>
        <td className="px-5 py-3.5">
          <p className="text-xs text-dk-muted">{invoice.plan}</p>
          <p className="text-xs text-dk-dim">{invoice.billing_cycle === 'monthly' ? '월간' : '연간'} 구독</p>
        </td>
        <td className="px-5 py-3.5 text-right">
          <p className={cn('text-sm font-bold', invoice.status === 'refunded' ? 'text-dk-dim line-through' : 'text-dk-text')}>
            {formatAmount(invoice.amount)}
          </p>
          {invoice.credit_amount > 0 && (
            <p className="text-[10px] text-dk-green mt-0.5">크레딧 -{formatAmount(invoice.credit_amount)}</p>
          )}
        </td>
        <td className="px-5 py-3.5"><StatusBadge status={invoice.status} /></td>
        <td className="px-5 py-3.5">
          <p className="text-xs text-dk-muted">
            {invoice.paid_at ? formatDate(invoice.paid_at) : '—'}
          </p>
        </td>
        <td className="px-5 py-3.5 text-right">
          <ChevronDown className={cn('w-4 h-4 text-dk-dim transition-transform inline-block', open && 'rotate-180')} />
        </td>
      </tr>
      {open && (
        <tr className="bg-dk-surface2/30">
          <td colSpan={6} className="px-5 py-4 border-b border-dk-border">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-dk-dim mb-1">결제 수단</p>
                <p className="text-dk-text">{invoice.payment_method ?? '—'}</p>
              </div>
              <div>
                <p className="text-dk-dim mb-1">만기일</p>
                <p className="text-dk-text">{invoice.due_at ? formatDate(invoice.due_at) : '—'}</p>
              </div>
              <div>
                <p className="text-dk-dim mb-1">세금계산서</p>
                <p className="text-dk-text">
                  {invoice.tax_invoice_status ? (TAX_STATUS_LABEL[invoice.tax_invoice_status] ?? invoice.tax_invoice_status) : '—'}
                  {invoice.tax_invoice_no && <span className="ml-2 text-dk-dim font-mono">{invoice.tax_invoice_no}</span>}
                </p>
              </div>
              {invoice.memo && (
                <div className="col-span-3 pt-3 border-t border-dk-border">
                  <p className="text-dk-dim mb-1">안내</p>
                  <p className="text-dk-text">{invoice.memo}</p>
                </div>
              )}
              <div className="col-span-3 flex gap-2 pt-2">
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs text-dk-muted border border-dk-border px-3 py-1.5 rounded-lg hover:border-dk-border2 hover:text-dk-text">
                  <Download className="w-3 h-3" /> 인쇄/PDF
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRowData[]>([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  useEffect(() => {
    fetch('/api/settings/invoices?limit=100')
      .then(r => r.json())
      .then(json => setInvoices((json.data?.data ?? []) as InvoiceRowData[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter)

  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalFailed  = invoices.filter(i => i.status === 'failed').length
  const totalPending = invoices.filter(i => i.status === 'pending').length

  return (
    <div className="space-y-5 max-w-5xl p-6">
      <div>
        <h1 className="text-lg font-bold text-dk-text">결제 이력</h1>
        <p className="text-sm text-dk-muted mt-0.5">
          총 {invoices.length}건 · 누적 결제 {formatAmount(totalPaid)}
        </p>
      </div>

      {(totalFailed > 0 || totalPending > 0) && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 text-sm text-amber-300">
            {totalFailed > 0 && <span className="font-semibold">결제 실패 {totalFailed}건</span>}
            {totalFailed > 0 && totalPending > 0 && <span className="text-amber-500 mx-2">·</span>}
            {totalPending > 0 && <span>결제 대기 {totalPending}건</span>}
            <span className="text-amber-400/80 ml-2">— 운영팀에 확인이 필요할 수 있습니다.</span>
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              statusFilter === s ? 'bg-dk-blue text-white border-dk-blue' : 'text-dk-muted border-dk-border hover:border-dk-border2 hover:text-dk-text')}>
            {s === 'all' ? '전체' : STATUS_CFG[s as InvoiceStatus]?.label ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-dk-muted" /></div>
      ) : (
        <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dk-border">
                {['인보이스 / 기간', '플랜', '금액', '상태', '결제일', ''].map(h => (
                  <th key={h} className={cn('px-5 py-3 text-xs font-medium text-dk-dim', h === '금액' ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dk-border">
              {filtered.map(inv => <InvoiceRow key={inv.id} invoice={inv} />)}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Receipt className="w-10 h-10 text-dk-dim mx-auto mb-3" />
              <p className="text-sm text-dk-muted">결제 이력이 없습니다</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
