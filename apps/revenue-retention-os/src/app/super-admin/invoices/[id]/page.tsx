'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, RefreshCw, Receipt, AlertTriangle, Save, Loader2,
  Printer, FileText
} from 'lucide-react'
import { formatAmount, formatDate } from '@/lib/utils'
import type { InvoiceStatus } from '@/types/domain'
import { InvoiceStatusBadge } from '../../_components/badges'

type InvoiceDetail = {
  id: string; invoice_no: string; tenant_id: string; tenant_name: string; plan: string
  billing_cycle: string; period_start: string; period_end: string
  amount: number; status: InvoiceStatus; payment_method: string | null
  paid_at: string | null; due_at: string | null; pg_payment_id: string | null
  memo: string | null; created_at: string
  credit_amount?: number; tax_invoice_status?: string | null
  tax_invoice_no?: string | null; public_memo?: string | null
}

/** 인보이스 상세 페이지.
 *  실패한 결제의 수동 완료 처리, 결제 완료 건의 환불, 대기 건의 입금 확인 처리를 제공한다.
 *  운영 메모는 PATCH로 별도 저장. PG 결제번호는 수동 처리 시 'MANUAL-{timestamp}'로 기록. */
export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const [invoice, setInvoice]   = useState<InvoiceDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [memo, setMemo]         = useState('')
  const [processing, setProcessing] = useState(false)
  const [savingMemo, setSavingMemo] = useState(false)
  const [processed, setProcessed]   = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/super-admin/invoices/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setInvoice(json.data as InvoiceDetail)
          setMemo(json.data.memo ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const patchStatus = async (status: InvoiceStatus) => {
    if (!invoice) return
    const label = status === 'paid' ? '수동 완료 처리' : '환불 처리'
    if (!confirm(`${invoice.tenant_name}의 ${formatAmount(invoice.amount)} 인보이스를 ${label}할까요?`)) return
    setProcessing(true)
    const res  = await fetch(`/api/super-admin/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (res.ok && json.data) {
      setInvoice(prev => prev ? {
        ...prev, status,
        paid_at:       status === 'paid' ? new Date().toISOString() : null,
        pg_payment_id: status === 'paid' ? `MANUAL-${Date.now()}` : prev.pg_payment_id,
      } : prev)
      setProcessed(true)
    }
    setProcessing(false)
  }

  const saveMemo = async () => {
    if (!invoice) return
    setSavingMemo(true)
    await fetch(`/api/super-admin/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    })
    setSavingMemo(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
  }
  if (!invoice) {
    return <div className="p-6"><p className="text-gray-400">인보이스를 찾을 수 없습니다.</p></div>
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/invoices"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">{invoice.invoice_no || invoice.id.slice(0, 8)}</h1>
            <InvoiceStatusBadge status={invoice.status} size="md" />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(invoice.period_start)} ~ {formatDate(invoice.period_end)} 구독료
          </p>
        </div>
      </div>

      {invoice.status === 'failed' && !processed && (
        <div className="flex items-start gap-3 p-4 bg-red-950/20 border border-red-800/40 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">결제가 실패했습니다</p>
            {invoice.memo && <p className="text-xs text-red-400/80 mt-0.5">{invoice.memo}</p>}
          </div>
        </div>
      )}

      {processed && (
        <div className="flex items-center gap-2 p-4 bg-green-950/20 border border-green-800/40 rounded-xl text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4" /> 처리 완료
        </div>
      )}

      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700/50">
          <Receipt className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-200">인보이스 정보</p>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: '테넌트', value: <Link href={`/super-admin/tenants/${invoice.tenant_id}`} className="text-sm text-blue-400 hover:text-blue-300 font-medium">{invoice.tenant_name}</Link> },
            { label: '플랜', value: <span className="text-sm text-gray-200">{invoice.plan} ({invoice.billing_cycle === 'monthly' ? '월간' : '연간'})</span> },
            { label: '청구 기간', value: <span className="text-sm text-gray-200 font-mono">{formatDate(invoice.period_start)} ~ {formatDate(invoice.period_end)}</span> },
            { label: '청구 금액', value: <span className="text-xl font-bold text-white font-mono">{formatAmount(invoice.amount)}</span> },
            { label: '결제 수단', value: <span className="text-sm text-gray-300">{invoice.payment_method ?? '—'}</span> },
            { label: '만기일', value: <span className="text-sm text-gray-300 font-mono">{invoice.due_at ? formatDate(invoice.due_at) : '—'}</span> },
            { label: '결제일', value: <span className="text-sm text-gray-300 font-mono">{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</span> },
            { label: 'PG 결제번호', value: <span className="text-xs text-gray-400 font-mono">{invoice.pg_payment_id ?? '—'}</span> },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-3 border-b border-gray-700/30 last:border-0">
              <span className="text-xs text-gray-500">{row.label}</span>
              {row.value}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
          <p className="text-sm font-semibold text-gray-200">운영 메모</p>
          <button onClick={saveMemo} disabled={savingMemo}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50">
            <Save className="w-3 h-3" /> {savingMemo ? '저장 중...' : '저장'}
          </button>
        </div>
        <div className="p-5">
          <textarea
            value={memo} onChange={e => setMemo(e.target.value)} rows={3}
            placeholder="운영 메모를 입력하세요..."
            className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* 크레딧 / 세금계산서 / 사용자 노출 메모 */}
      <ExtraFieldsSection invoice={invoice} onSaved={() => location.reload()} />

      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-200 mb-3">수동 처리</p>
        <div className="flex gap-2 flex-wrap">
          {invoice.status === 'failed' && (
            <button onClick={() => patchStatus('paid')} disabled={processing || processed}
              className="flex items-center gap-1.5 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors">
              <CheckCircle2 className="w-4 h-4" />
              {processing ? '처리 중...' : '수동 결제 완료 처리'}
            </button>
          )}
          {invoice.status === 'paid' && (
            <button onClick={() => patchStatus('refunded')} disabled={processing}
              className="flex items-center gap-1.5 text-sm text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" /> 환불 처리
            </button>
          )}
          {invoice.status === 'pending' && (
            <button onClick={() => patchStatus('paid')} disabled={processing}
              className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors">
              <CheckCircle2 className="w-4 h-4" /> 입금 확인 후 완료 처리
            </button>
          )}
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 text-sm text-gray-300 border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors ml-auto">
            <Printer className="w-4 h-4" /> 인쇄 / PDF 저장
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">수동 처리는 운영자 기록에 남습니다. 인쇄/PDF는 브라우저 인쇄 다이얼로그를 사용합니다.</p>
      </div>
    </div>
  )
}

/** 크레딧 부여 + 세금계산서 발행 상태 + 사용자 노출 메모 편집 섹션. */
function ExtraFieldsSection({ invoice, onSaved }: { invoice: InvoiceDetail; onSaved: () => void }) {
  const [credit, setCredit]   = useState(String(invoice.credit_amount ?? 0))
  const [taxStatus, setTaxStatus] = useState(invoice.tax_invoice_status ?? 'not_required')
  const [taxNo, setTaxNo]     = useState(invoice.tax_invoice_no ?? '')
  const [pubMemo, setPubMemo] = useState(invoice.public_memo ?? '')
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch(`/api/super-admin/invoices/${invoice.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credit_amount: Number(credit) || 0,
        tax_invoice_status: taxStatus,
        tax_invoice_no: taxNo || null,
        public_memo: pubMemo || null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
        <p className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" /> 추가 정보
        </p>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-2 py-1 rounded-lg hover:bg-blue-500/10 disabled:opacity-50">
          <Save className="w-3 h-3" /> {saving ? '저장 중...' : '저장'}
        </button>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">차감 크레딧 (원)</label>
          <input type="number" value={credit} onChange={e => setCredit(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-[10px] text-gray-500 mt-1">차회 결제에서 차감되는 금액</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">세금계산서 상태</label>
          <select value={taxStatus} onChange={e => setTaxStatus(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="not_required">발행 불필요</option>
            <option value="pending">발행 대기</option>
            <option value="issued">발행 완료</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">세금계산서 번호</label>
          <input value={taxNo} onChange={e => setTaxNo(e.target.value)} placeholder="20260522-XXXX"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">사용자 노출 메모</label>
          <input value={pubMemo} onChange={e => setPubMemo(e.target.value)} placeholder="결제 실패 사유 등 (사용자에게 노출됨)"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
    </div>
  )
}
