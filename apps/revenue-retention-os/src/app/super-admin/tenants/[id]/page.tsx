'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, XCircle,
  ToggleRight, ToggleLeft, Pencil, Loader2, Mail, KeyRound, Copy, X
} from 'lucide-react'
import { cn, formatAmount, formatDate } from '@/lib/utils'
import { INVOICE_STATUS_TEXT_CLS, INVOICE_STATUS_LABEL } from '../../_components/badges'
import { createBrowserClient } from '@/lib/supabase/client'
import * as coreApi from '@saas/core-client'

type TenantDetail = {
  id: string; name: string; biz_no: string | null; ceo_name: string | null
  email: string | null; phone: string | null; address: string | null
  is_active: boolean; created_at: string
  priority?: string | null
  tags?: string[] | null
  subscription: {
    plan: string; plan_code: string; status: string; billing_cycle: string
    started_at: string; expires_at: string; next_billing_at: string | null
    mrr: number; total_paid: number
  } | null
  usage: {
    users: { current: number; max: number | null }
    companies: { current: number; max: number | null }
    messages: { current: number; max: number | null }
  }
  users: { id: string; name: string; email: string; role: string; last_login_at: string | null; is_active: boolean }[]
  invoices: { id: string; invoice_no: string | null; period_start: string; period_end: string; amount: number; status: string; paid_at: string | null; billing_cycle: string | null }[]
}

type TenantNote = {
  id: string; content: string; created_by_email: string | null; created_at: string
}

const TABS = ['기본정보', '구독', '결제', '사용량', '사용자', '메모']

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await createBrowserClient().auth.getSession()
  return session?.access_token ?? ''
}

const PRIORITY_OPTIONS = [
  { value: 'vip',      label: 'VIP',      cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'standard', label: 'Standard', cls: 'bg-gray-500/20 text-gray-400 border-gray-600/30' },
  { value: 'risk',     label: 'Risk',     cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
]

/** 우상단에 액션 영역을 갖는 카드형 섹션 래퍼.
 *  탭 내부의 정보 그룹을 일관된 디자인으로 묶기 위해 사용한다. */
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
        <p className="text-sm font-semibold text-gray-200">{title}</p>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

/** 라벨-값 쌍을 표시하는 읽기 전용 필드 컴포넌트.
 *  값이 빈 문자열/null/undefined면 '—'로 폴백 표시한다. */
function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={cn('text-sm text-gray-200', mono && 'font-mono')}>{value || '—'}</p>
    </div>
  )
}

/** '기본정보' 탭.
 *  대표자/이메일/전화/주소 편집(PATCH)과 서비스 활성/비활성 토글을 제공한다.
 *  변경 후 onUpdate를 호출해 부모에서 데이터를 다시 불러온다. */
function TabBasic({ tenant, onUpdate }: { tenant: TenantDetail; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({
    ceo_name: tenant.ceo_name ?? '', email: tenant.email ?? '',
    phone: tenant.phone ?? '', address: tenant.address ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tempPw, setTempPw]         = useState<{ email: string; password: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/super-admin/tenants/${tenant.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  const toggleActive = async () => {
    if (!confirm(tenant.is_active ? '서비스를 비활성화할까요?' : '서비스를 활성화할까요?')) return
    await fetch(`/api/super-admin/tenants/${tenant.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !tenant.is_active }),
    })
    onUpdate()
  }

  const resendInvite = async () => {
    if (!confirm(`${tenant.name}의 관리자에게 초대 메일을 재발송할까요?`)) return
    setProcessing(true)
    setActionMsg(null)
    const token = await getAuthToken()
    const res = await coreApi.resendInvite(tenant.id, token)
    setProcessing(false)
    if (!res.ok || res.error) setActionMsg({ type: 'error', text: res.error?.message ?? '재발송 실패' })
    else                      setActionMsg({ type: 'success', text: res.data?.message ?? '재발송 완료' })
  }

  const resetPassword = async () => {
    if (!confirm(`${tenant.name}의 관리자 비밀번호를 임시 비밀번호로 강제 변경합니다. 진행할까요?`)) return
    setProcessing(true)
    setActionMsg(null)
    const token = await getAuthToken()
    const res = await coreApi.resetTenantPassword(tenant.id, token)
    setProcessing(false)
    if (!res.ok || res.error) {
      setActionMsg({ type: 'error', text: res.error?.message ?? '발급 실패' })
      return
    }
    if (res.data) setTempPw({ email: res.data.user.email, password: res.data.temp_password })
  }

  const forceCancel = async () => {
    const reason = prompt('해지 사유를 입력하세요 (선택)')
    if (reason === null) return  // 취소
    if (!confirm(`${tenant.name}의 구독을 강제 해지하고 서비스를 비활성화합니다. 진행할까요?`)) return
    setProcessing(true)
    setActionMsg(null)
    // 1) 구독 cancel
    const r1 = await fetch(`/api/super-admin/tenants/${tenant.id}/subscription`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', cancel_reason: reason || null }),
    })
    // 2) 서비스 비활성화
    const r2 = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })
    setProcessing(false)
    if (!r1.ok || !r2.ok) setActionMsg({ type: 'error', text: '강제 해지 중 일부 단계 실패' })
    else                  setActionMsg({ type: 'success', text: '구독 해지 + 서비스 비활성화 완료' })
    onUpdate()
  }

  return (
    <div className="space-y-4">
      <Section title="기업 정보" action={
        editing ? (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 px-2.5 py-1.5 rounded-lg border border-gray-700">취소</button>
            <button onClick={handleSave} disabled={saving}
              className="text-xs text-white bg-blue-600 px-2.5 py-1.5 rounded-lg border border-blue-600 disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
            <Pencil className="w-3 h-3" /> 편집
          </button>
        )
      }>
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            {(['ceo_name', 'email', 'phone', 'address'] as const).map(k => (
              <div key={k}>
                <label className="text-xs text-gray-500 mb-0.5 block">
                  {k === 'ceo_name' ? '대표자' : k === 'email' ? '이메일' : k === 'phone' ? '전화' : '주소'}
                </label>
                <input
                  value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="상호명"         value={tenant.name} />
            <Field label="사업자등록번호"   value={tenant.biz_no} mono />
            <Field label="대표자"         value={tenant.ceo_name} />
            <Field label="가입일"         value={formatDate(tenant.created_at)} />
            <Field label="이메일"         value={tenant.email} />
            <Field label="전화"           value={tenant.phone} />
          </div>
        )}
      </Section>
      <Section title="서비스 상태">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-200">서비스 활성화</p>
            <p className="text-xs text-gray-500 mt-0.5">비활성화 시 로그인이 차단됩니다</p>
          </div>
          <button onClick={toggleActive}
            className={cn('transition-colors', tenant.is_active ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-gray-400')}>
            {tenant.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
      </Section>

      {/* 운영 액션 */}
      {actionMsg && (
        <div className={cn('flex items-center gap-2 p-3 rounded-xl text-xs',
          actionMsg.type === 'success' ? 'bg-green-950/20 border border-green-800/40 text-green-300'
                                       : 'bg-red-950/20 border border-red-800/40 text-red-300')}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {actionMsg.text}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={resendInvite} disabled={processing}
          className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50">
          <Mail className="w-3.5 h-3.5" /> 초대 메일 재발송
        </button>
        <button onClick={resetPassword} disabled={processing}
          className="flex items-center gap-1.5 text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50">
          <KeyRound className="w-3.5 h-3.5" /> 임시 비밀번호 발급
        </button>
        <button onClick={forceCancel} disabled={processing}
          className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 ml-auto">
          <XCircle className="w-3.5 h-3.5" /> 서비스 강제 해지
        </button>
      </div>

      {/* 임시 비밀번호 표시 모달 */}
      {tempPw && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" /> 임시 비밀번호 발급 완료
              </h2>
              <button onClick={() => setTempPw(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-300">
                이 비밀번호는 <strong>지금만 표시</strong>됩니다. 안전한 채널로 즉시 전달하세요.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">대상 사용자</p>
                <p className="text-sm text-gray-200">{tempPw.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">임시 비밀번호</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-base text-amber-300 font-mono select-all">
                    {tempPw.password}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(tempPw.password); setActionMsg({ type: 'success', text: '클립보드에 복사됨' }) }}
                    className="p-2.5 text-gray-400 hover:text-white border border-gray-700 rounded-lg">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setTempPw(null)}
              className="w-full mt-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium">
              확인 완료
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** '구독' 탭.
 *  현재 플랜 카드 + 플랜 변경(plan_code 선택) + 결제 주기 토글 + 구독 해지 액션을 제공한다.
 *  변경은 PATCH /api/super-admin/tenants/[id]/subscription 호출. */
function TabSubscription({ tenantId, subscription, onUpdate }: {
  tenantId: string
  subscription: TenantDetail['subscription']
  onUpdate: () => void
}) {
  const [saving, setSaving]       = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(subscription?.plan_code ?? 'free')
  const [billing, setBilling]     = useState(subscription?.billing_cycle ?? 'monthly')

  if (!subscription) return <p className="text-sm text-gray-400">구독 정보가 없습니다.</p>
  const s = subscription
  const daysLeft = Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / 86400000)

  const applyPlanChange = async () => {
    if (selectedPlan === s.plan_code && billing === s.billing_cycle) return
    if (!confirm(`플랜을 변경하시겠습니까? (${s.plan_code} → ${selectedPlan}, ${s.billing_cycle} → ${billing})`)) return
    setSaving(true)
    await fetch(`/api/super-admin/tenants/${tenantId}/subscription`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_code: selectedPlan, billing_cycle: billing }),
    })
    setSaving(false)
    onUpdate()
  }

  const cancelSubscription = async () => {
    const reason = prompt('해지 사유를 입력하세요 (선택)')
    if (reason === null) return
    if (!confirm('구독을 해지하시겠습니까? 데이터는 보존되지만 결제는 중단됩니다.')) return
    setSaving(true)
    await fetch(`/api/super-admin/tenants/${tenantId}/subscription`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', cancel_reason: reason || null }),
    })
    setSaving(false)
    onUpdate()
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-700/30 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-blue-300">현재 플랜</p>
            <p className="text-3xl font-bold text-white mt-0.5">{s.plan}</p>
            <p className="text-xs text-blue-300 mt-1">
              {s.billing_cycle === 'monthly' ? '월간' : '연간'} · {formatAmount(s.mrr)}/월
            </p>
          </div>
          <span className={cn('text-xs px-2 py-1 rounded-full border',
            s.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30')}>
            {(s.status === 'active' ? '활성' : s.status === 'trialing' ? '체험중' : s.status === 'past_due' ? '미납' : '해지')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-blue-700/30">
          <div><p className="text-[10px] text-blue-300">시작일</p><p className="text-xs text-white font-medium mt-0.5">{formatDate(s.started_at)}</p></div>
          <div><p className="text-[10px] text-blue-300">만료일</p><p className="text-xs text-white font-medium mt-0.5">{formatDate(s.expires_at)}</p></div>
          <div><p className="text-[10px] text-blue-300">남은 일수</p>
            <p className={cn('text-xs font-bold mt-0.5', daysLeft <= 14 ? 'text-amber-400' : 'text-white')}>
              {daysLeft > 0 ? `D-${daysLeft}` : `D+${Math.abs(daysLeft)}`}
            </p>
          </div>
        </div>
      </div>

      <Section title="플랜 변경">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { code: 'free', label: 'Free' },
            { code: 'standard', label: 'Standard' },
            { code: 'pro', label: 'Pro' },
          ].map(p => (
            <button key={p.code} onClick={() => setSelectedPlan(p.code)}
              className={cn(
                'p-3 rounded-xl border text-xs font-medium transition-colors',
                selectedPlan === p.code
                  ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
              )}>
              {p.label}
              {p.code === s.plan_code && <span className="block text-[10px] text-blue-400 mt-0.5">현재</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          {(['monthly', 'yearly'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)}
              className={cn(
                'flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors',
                billing === b
                  ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              )}>
              {b === 'monthly' ? '월간 결제' : '연간 결제'}
            </button>
          ))}
        </div>
        <button onClick={applyPlanChange}
          disabled={saving || (selectedPlan === s.plan_code && billing === s.billing_cycle)}
          className="w-full py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? '처리 중...' : '플랜 변경 적용'}
        </button>
      </Section>

      {s.status !== 'cancelled' && (
        <Section title="구독 종료">
          <p className="text-xs text-gray-400 mb-3">구독을 해지하면 결제가 중단됩니다. 데이터는 보존됩니다.</p>
          <button onClick={cancelSubscription} disabled={saving}
            className="text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50">
            구독 해지 처리
          </button>
        </Section>
      )}
    </div>
  )
}

/** '결제' 탭.
 *  최근 인보이스 목록 + 누적 결제 금액. 대기/실패 건은 행 우측에서 직접 수동 완료 처리 가능. */
function TabInvoices({ invoices, total_paid, onUpdate }: {
  invoices: TenantDetail['invoices']; total_paid: number; onUpdate: () => void
}) {
  const [processingId, setProcessingId] = useState<string | null>(null)

  const markPaid = async (id: string, amount: number) => {
    if (!confirm(`${formatAmount(amount)} 인보이스를 수동 결제 완료 처리할까요?`)) return
    setProcessingId(id)
    await fetch(`/api/super-admin/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    setProcessingId(null)
    onUpdate()
  }

  return (
    <Section title="결제 이력">
      <div className="space-y-2">
        {invoices.map(inv => (
          <div key={inv.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-200">{inv.invoice_no || '—'}</p>
              <p className="text-[10px] text-gray-500">
                {formatDate(inv.period_start)} ~ {formatDate(inv.period_end)}
              </p>
            </div>
            <p className="text-sm font-bold text-white font-mono">{formatAmount(inv.amount)}</p>
            <span className={cn('text-[10px] font-semibold', INVOICE_STATUS_TEXT_CLS[inv.status] ?? 'text-gray-400')}>
              {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
            </span>
            <p className="text-[10px] text-gray-500 text-right w-20">
              {inv.paid_at ? formatDate(inv.paid_at) : '—'}
            </p>
            {(inv.status === 'pending' || inv.status === 'failed') && (
              <button onClick={() => markPaid(inv.id, inv.amount)} disabled={processingId === inv.id}
                className="flex items-center gap-1 text-[10px] text-green-400 border border-green-500/30 px-2 py-1 rounded-md hover:bg-green-500/10 transition-colors disabled:opacity-50">
                {processingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                완료처리
              </button>
            )}
            {inv.status === 'paid' && (
              <Link href={`/super-admin/invoices/${inv.id}`}
                className="text-[10px] text-blue-400 border border-blue-500/30 px-2 py-1 rounded-md hover:bg-blue-500/10 transition-colors">
                상세
              </Link>
            )}
          </div>
        ))}
        {invoices.length === 0 && <p className="text-xs text-gray-500 py-4 text-center">결제 이력이 없습니다</p>}
      </div>
      {invoices.length > 0 && (
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-400">총 결제 금액</p>
          <p className="text-sm font-bold text-white">{formatAmount(total_paid)}</p>
        </div>
      )}
    </Section>
  )
}

/** 리소스 사용량 진행 바.
 *  최대값이 있으면 70%/90% 임계치에 따라 색상이 바뀌고, 무제한이면 짧은 표시 바를 보여준다. */
function UsageBar({ label, current, max }: { label: string; current: number; max: number | null }) {
  const pct = max ? Math.min((current / max) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-gray-300">{label}</span>
        <span className="text-xs text-gray-400">{current.toLocaleString()} / {max ? max.toLocaleString() : '무제한'}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        {max ? (
          <div className={cn('h-1.5 rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500')}
            style={{ width: `${pct}%` }} />
        ) : (
          <div className="h-1.5 w-8 rounded-full bg-green-400/50" />
        )}
      </div>
    </div>
  )
}

/** '사용량' 탭.
 *  사용자/고객사/메시지 사용량을 진행 바로 표시한다. */
function TabUsage({ usage }: { usage: TenantDetail['usage'] }) {
  return (
    <Section title="리소스 사용량">
      <div className="space-y-4">
        <UsageBar label="사용자" current={usage.users.current} max={usage.users.max} />
        <UsageBar label="고객사" current={usage.companies.current} max={usage.companies.max} />
        <UsageBar label="메시지 (이번달)" current={usage.messages.current} max={usage.messages.max} />
      </div>
    </Section>
  )
}

/** '사용자' 탭 — 역할 변경 / 강제 로그아웃 / 임시 비밀번호 / 가장(Impersonate) 액션 포함. */
function TabUsers({ tenantId, users, onUpdate }: {
  tenantId: string
  users: TenantDetail['users']
  onUpdate: () => void
}) {
  const [actingId, setActingId] = useState<string | null>(null)
  const [impLink, setImpLink]   = useState<string | null>(null)

  const changeRole = async (uid: string, newRole: string) => {
    setActingId(uid)
    await fetch(`/api/super-admin/users/${uid}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setActingId(null)
    onUpdate()
  }

  const forceSignout = async (uid: string) => {
    if (!confirm('이 사용자의 모든 세션을 즉시 종료할까요?')) return
    setActingId(uid)
    await fetch(`/api/super-admin/users/${uid}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_signout: true }),
    })
    setActingId(null)
  }

  const impersonate = async (uid: string) => {
    if (!confirm('이 사용자로 가장 로그인할 magic link를 생성합니다. 시크릿 브라우저에서 열어주세요.')) return
    setActingId(uid)
    const token = await getAuthToken()
    const res = await coreApi.impersonate(uid, token)
    setActingId(null)
    if (res.ok && res.data?.impersonation_link) setImpLink(res.data.impersonation_link)
    else alert(res.error?.message ?? '가장 링크 생성 실패')
  }

  return (
    <>
      <Section title="사용자 목록" action={<span className="text-xs text-gray-500">{users.length}명</span>}>
        <div className="divide-y divide-gray-700/50">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-3.5">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                u.is_active ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-700 text-gray-500')}>
                {u.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-medium', u.is_active ? 'text-gray-200' : 'text-gray-500')}>{u.name}</p>
                  <select value={u.role} disabled={actingId === u.id}
                    onChange={e => changeRole(u.id, e.target.value)}
                    className="text-[10px] bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-white focus:outline-none">
                    <option value="admin">관리자</option>
                    <option value="manager">팀장</option>
                    <option value="sales">영업</option>
                  </select>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => impersonate(u.id)} disabled={actingId === u.id}
                  className="text-[10px] text-purple-400 border border-purple-500/30 px-1.5 py-1 rounded-md hover:bg-purple-500/10 disabled:opacity-50">
                  가장
                </button>
                <button onClick={() => forceSignout(u.id)} disabled={actingId === u.id}
                  className="text-[10px] text-amber-400 border border-amber-500/30 px-1.5 py-1 rounded-md hover:bg-amber-500/10 disabled:opacity-50">
                  로그아웃
                </button>
              </div>
              <p className="text-[10px] text-gray-500 text-right shrink-0 w-16">
                {u.last_login_at ? formatDate(u.last_login_at) : '미접속'}
              </p>
            </div>
          ))}
          {users.length === 0 && <p className="text-xs text-gray-500 py-4 text-center">사용자가 없습니다</p>}
        </div>
      </Section>
      {/* (참조 변수 활용을 위한 keep) */}
      {void tenantId}
      {impLink && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImpLink(null)}>
          <div className="bg-gray-800 border border-purple-700/40 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-3">가장 링크 발급 완료</h2>
            <div className="bg-purple-950/20 border border-purple-700/30 rounded-xl p-3 mb-3">
              <p className="text-xs text-purple-200">시크릿/별도 브라우저 창에서 열어주세요. 현재 슈퍼어드민 세션과 충돌할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-[10px] text-amber-300 font-mono truncate">{impLink}</code>
              <button onClick={() => { navigator.clipboard.writeText(impLink) }}
                className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg shrink-0">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={() => setImpLink(null)}
              className="w-full py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium">닫기</button>
          </div>
        </div>
      )}
    </>
  )
}

/** '메모' 탭 — 슈퍼어드민의 운영 메모(추가/삭제). */
function TabNotes({ tenantId }: { tenantId: string }) {
  const [notes, setNotes]       = useState<TenantNote[]>([])
  const [content, setContent]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/super-admin/tenants/${tenantId}/notes`)
      .then(r => r.json())
      .then(json => setNotes((json.data ?? []) as TenantNote[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [tenantId])  // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!content.trim()) return
    setSaving(true)
    await fetch(`/api/super-admin/tenants/${tenantId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
    setContent('')
    setSaving(false)
    load()
  }

  const remove = async (noteId: string) => {
    if (!confirm('메모를 삭제할까요?')) return
    await fetch(`/api/super-admin/notes/${noteId}`, { method: 'DELETE' })
    load()
  }

  return (
    <Section title="운영 메모">
      <div className="flex gap-2 mb-4">
        <textarea
          value={content} onChange={e => setContent(e.target.value)} rows={2}
          placeholder="통화 내용, 고객 요청, 특이사항 등 메모..."
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button onClick={add} disabled={saving || !content.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 self-start">
          {saving ? '추가 중...' : '추가'}
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-xl group">
              <div className="flex-1">
                <p className="text-xs text-gray-200 whitespace-pre-wrap">{n.content}</p>
                <p className="text-[10px] text-gray-500 mt-2">
                  {n.created_by_email ?? 'system'} · {formatDate(n.created_at)}
                </p>
              </div>
              <button onClick={() => remove(n.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {notes.length === 0 && <p className="text-xs text-gray-500 py-4 text-center">메모가 없습니다</p>}
        </div>
      )}
    </Section>
  )
}

/** 우선순위 선택 드롭다운 (헤더 영역에 표시). */
function PriorityDropdown({ tenantId, value, onChanged }: { tenantId: string; value: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const current = PRIORITY_OPTIONS.find(p => p.value === value) ?? PRIORITY_OPTIONS[1]
  const change = async (newValue: string) => {
    await fetch(`/api/super-admin/tenants/${tenantId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: newValue }),
    })
    setOpen(false)
    onChanged()
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('text-xs px-2 py-1 rounded-full border font-medium', current.cls)}>
        {current.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-40 overflow-hidden">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p.value} onClick={() => change(p.value)}
                className={cn('w-full px-3 py-2 text-xs text-left hover:bg-white/5', p.value === value && 'bg-white/5 font-bold')}>
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** 테넌트 상세 페이지.
 *  URL의 [id]로 /api/super-admin/tenants/[id]를 호출해 모든 탭에 필요한 데이터를 한 번에 받는다.
 *  탭(기본정보/구독/결제/사용량/사용자)을 전환하며 정보를 확인하고 편집할 수 있다. */
export default function TenantDetailPage() {
  const rawParams      = useParams<{ id: string }>()
  const id             = rawParams?.id ?? ''
  const [tenant, setTenant]   = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('기본정보')

  const load = () => {
    setLoading(true)
    fetch(`/api/super-admin/tenants/${id}`)
      .then(r => r.json())
      .then(json => { if (json.data) setTenant(json.data as TenantDetail) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (id) load() }, [id])  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
  }
  if (!tenant) {
    return <div className="p-6"><p className="text-gray-400">테넌트를 찾을 수 없습니다.</p></div>
  }

  const planName = tenant.subscription?.plan ?? 'Free'
  const planCode = tenant.subscription?.plan_code ?? 'free'
  const tabContent: Record<string, React.ReactNode> = {
    '기본정보': <TabBasic tenant={tenant} onUpdate={load} />,
    '구독':     <TabSubscription tenantId={tenant.id} subscription={tenant.subscription} onUpdate={load} />,
    '결제':     <TabInvoices invoices={tenant.invoices} total_paid={tenant.subscription?.total_paid ?? 0} onUpdate={load} />,
    '사용량':   <TabUsage usage={tenant.usage} />,
    '사용자':   <TabUsers tenantId={tenant.id} users={tenant.users} onUpdate={load} />,
    '메모':     <TabNotes tenantId={tenant.id} />,
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/tenants"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">
              {tenant.name[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{tenant.name}</h1>
              <p className="text-xs text-gray-400">{tenant.biz_no} · {formatDate(tenant.created_at)} 가입</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <PriorityDropdown tenantId={tenant.id} value={tenant.priority ?? 'standard'} onChanged={load} />
          <span className={cn('text-xs px-2 py-1 rounded-full border font-medium',
            planCode === 'pro' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
            planCode === 'standard' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
            'bg-gray-500/20 text-gray-400 border-gray-600/30')}>
            {planName}
          </span>
          <span className={cn('text-xs px-2 py-1 rounded-full border font-medium flex items-center gap-1',
            tenant.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-600/30')}>
            {tenant.is_active ? <><CheckCircle2 className="w-3 h-3" /> 활성</> : <><XCircle className="w-3 h-3" /> 정지</>}
          </span>
        </div>
      </div>

      <div className="flex border-b border-gray-700/50 gap-0.5">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2',
              activeTab === tab ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300')}>
            {tab}
          </button>
        ))}
      </div>

      {tabContent[activeTab]}
    </div>
  )
}
