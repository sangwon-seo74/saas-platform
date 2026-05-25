// Super-admin 공통 뱃지 컴포넌트 — 페이지 간 중복 제거용

import { CheckCircle2, Clock, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubscriptionStatus, InvoiceStatus, UserRole } from '@/types/domain'

// ─── 플랜 뱃지 ────────────────────────────────────────────
/** 플랜 이름(Free/Standard/Pro)을 색상 구분된 뱃지로 표시한다. */
export function PlanBadge({ plan }: { plan: string }) {
  const cls = plan === 'Pro'
    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    : plan === 'Standard'
    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    : 'bg-gray-500/20 text-gray-400 border-gray-600/30'
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cls)}>
      {plan}
    </span>
  )
}

// ─── 구독 상태 ────────────────────────────────────────────
export const SUBSCRIPTION_STATUS_CFG: Record<SubscriptionStatus, { label: string; cls: string; icon: React.ElementType }> = {
  active:    { label: '활성',     cls: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle2 },
  trialing:  { label: '체험중',   cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   icon: Clock },
  past_due:  { label: '결제미납', cls: 'bg-red-500/15 text-red-400 border-red-500/30',      icon: AlertTriangle },
  cancelled: { label: '해지',     cls: 'bg-gray-500/15 text-gray-500 border-gray-600/30',   icon: XCircle },
}

/** 구독 상태(활성/체험중/결제미납/해지)를 아이콘+라벨 뱃지로 표시한다.
 *  알 수 없는 상태 값이 들어오면 '해지'로 폴백한다. */
export function SubscriptionStatusBadge({ status }: { status: string }) {
  const cfg = SUBSCRIPTION_STATUS_CFG[status as SubscriptionStatus] ?? SUBSCRIPTION_STATUS_CFG.cancelled
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cfg.cls)}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  )
}

// ─── 인보이스 상태 ────────────────────────────────────────
export const INVOICE_STATUS_CFG: Record<InvoiceStatus, { label: string; cls: string; icon: React.ElementType }> = {
  paid:     { label: '결제완료', cls: 'bg-green-500/15 text-green-400 border-green-500/30',  icon: CheckCircle2 },
  pending:  { label: '결제대기', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  failed:   { label: '결제실패', cls: 'bg-red-500/15 text-red-400 border-red-500/30',       icon: XCircle },
  refunded: { label: '환불',     cls: 'bg-gray-500/15 text-gray-400 border-gray-600/30',    icon: RefreshCw },
}

/** 인보이스 상태(결제완료/대기/실패/환불)를 아이콘+라벨 뱃지로 표시한다.
 *  size='md'는 상세 페이지용 큰 사이즈, 'sm'은 목록용 작은 사이즈. */
export function InvoiceStatusBadge({ status, size = 'sm' }: { status: InvoiceStatus; size?: 'sm' | 'md' }) {
  const cfg = INVOICE_STATUS_CFG[status]
  const Icon = cfg.icon
  return size === 'md' ? (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium', cfg.cls)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  ) : (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cfg.cls)}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  )
}

// ─── 역할 뱃지 ────────────────────────────────────────────
const ROLE_LABEL: Record<UserRole, string> = { admin: '관리자', manager: '팀장', sales: '영업' }
const ROLE_CLS: Record<UserRole, string> = {
  admin:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  manager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  sales:   'bg-gray-600/20 text-gray-400 border-gray-600/30',
}

/** 사용자 역할(관리자/팀장/영업) 뱃지를 표시한다.
 *  알 수 없는 role 값이 들어오면 'sales'(영업)으로 폴백한다. */
export function RoleBadge({ role }: { role: string }) {
  const r = (['admin', 'manager', 'sales'].includes(role) ? role : 'sales') as UserRole
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', ROLE_CLS[r])}>
      {ROLE_LABEL[r]}
    </span>
  )
}

// ─── 인보이스 상태 색상 (텍스트 only — 테넌트 상세의 결제 이력용) ──
export const INVOICE_STATUS_TEXT_CLS: Record<string, string> = {
  paid:     'text-green-400',
  pending:  'text-amber-400',
  failed:   'text-red-400',
  refunded: 'text-gray-400',
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: '결제완료', pending: '대기중', failed: '실패', refunded: '환불',
}
