'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard, Zap, Users, Building2, MessageSquare,
  CheckCircle2, ArrowRight, TrendingUp, X, Loader2, AlertTriangle
} from 'lucide-react'
import { cn, formatAmount, formatDate } from '@/lib/utils'

type SubData = {
  subscription: {
    id: string; plan_id: string | null; plan: string; plan_code: string
    billing_cycle: string; status: string
    started_at: string; expires_at: string; next_billing_at: string | null
    cancel_reason: string | null; cancelled_at: string | null
    mrr: number
  } | null
  usage: {
    users:     { current: number; max: number | null }
    companies: { current: number; max: number | null }
    messages:  { current: number; max: number | null }
  }
  available_plans: { id: string; name: string; code: string; monthly_price: number; yearly_price: number; max_users: number | null; max_companies: number | null; max_messages: number | null }[]
}

const PLAN_FEATURES: Record<string, string[]> = {
  free:     ['사용자 3명', '고객사 50개', '메시지 500건/월', '기본 리포트'],
  standard: ['사용자 10명', '고객사 300개', '메시지 5,000건/월', '고급 리포트', 'API 연동', '팀 관리'],
  pro:      ['사용자 무제한', '고객사 무제한', '메시지 무제한', '전체 기능', '전담 CS', 'SLA 99.9%'],
}
const STATUS_LABEL: Record<string, string> = {
  active: '활성', trialing: '체험중', past_due: '결제 미납', cancelled: '해지됨',
}

/** 플랜 변경 안내 모달.
 *  자동 결제 PG 연동 전이라 슈퍼관리자에게 변경 요청을 안내하는 형태로 동작한다. */
function UpgradeModal({
  currentPlanCode, plans, onClose,
}: {
  currentPlanCode: string
  plans: SubData['available_plans']
  onClose: () => void
}) {
  const [cycle, setCycle]       = useState<'monthly' | 'yearly'>('monthly')
  const [selected, setSelected] = useState(currentPlanCode)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dk-surface border border-dk-border rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-dk-border">
          <h2 className="text-base font-bold text-dk-text">플랜 비교</h2>
          <button onClick={onClose} className="text-dk-dim hover:text-dk-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-2 flex justify-center">
          <div className="inline-flex bg-dk-surface2 rounded-xl p-1 gap-1">
            {(['monthly', 'yearly'] as const).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className={cn(
                  'text-sm px-4 py-1.5 rounded-lg font-medium transition-all',
                  cycle === c ? 'bg-dk-surface text-dk-text shadow border border-dk-border' : 'text-dk-muted'
                )}>
                {c === 'monthly' ? '월간' : '연간'}
                {c === 'yearly' && <span className="ml-1.5 text-xs text-dk-green font-semibold">2개월 할인</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-6">
          {plans.map(plan => {
            const isCurrent = plan.code === currentPlanCode
            const price = cycle === 'monthly' ? plan.monthly_price : plan.yearly_price
            return (
              <div key={plan.id} onClick={() => setSelected(plan.code)}
                className={cn(
                  'relative rounded-xl border-2 p-4 cursor-pointer transition-all',
                  selected === plan.code ? 'border-dk-blue bg-dk-blue/5' : 'border-dk-border hover:border-dk-border2'
                )}>
                {plan.code === 'pro' && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-dk-blue text-white px-2.5 py-0.5 rounded-full font-medium">
                    추천
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-2.5 right-3 text-xs bg-dk-green text-white px-2 py-0.5 rounded-full font-medium">
                    현재
                  </div>
                )}
                <p className="text-sm font-semibold text-dk-text mb-2">{plan.name}</p>
                <p className="text-2xl font-bold text-dk-text">
                  {price === 0 ? '무료' : formatAmount(price)}
                </p>
                {price > 0 && <p className="text-xs text-dk-muted">/ {cycle === 'monthly' ? '월' : '년'}</p>}
                <ul className="text-xs text-dk-muted mt-4 space-y-1.5">
                  {(PLAN_FEATURES[plan.code] ?? []).map((f, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-dk-green" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="px-6 pb-6 pt-2 bg-amber-500/5 border-t border-amber-500/20">
          <p className="text-xs text-amber-300">
            ⓘ 플랜 변경은 운영팀에서 처리합니다. 변경을 원하시면 채널/메일로 문의해 주세요.
          </p>
        </div>
      </div>
    </div>
  )
}

function UsageBar({ label, current, max, icon: Icon }: {
  label: string; current: number; max: number | null; icon: React.ElementType
}) {
  const pct = max ? Math.min((current / max) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-dk-red' : pct >= 70 ? 'bg-amber-400' : 'bg-dk-blue'
  return (
    <div>
      <div className="flex justify-between mb-1.5 items-center">
        <div className="flex items-center gap-2 text-xs text-dk-text">
          <Icon className="w-3.5 h-3.5 text-dk-muted" /> {label}
        </div>
        <span className="text-xs text-dk-muted">
          {current.toLocaleString()} / {max ? max.toLocaleString() : '무제한'}
        </span>
      </div>
      <div className="w-full bg-dk-surface2 rounded-full h-1.5">
        {max ? (
          <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
        ) : (
          <div className="h-1.5 w-full rounded-full bg-dk-green opacity-40" />
        )}
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  const [data, setData]       = useState<SubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    fetch('/api/settings/subscription')
      .then(r => r.json())
      .then(json => { if (json.data) setData(json.data as SubData) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-dk-muted" /></div>
  }
  if (!data || !data.subscription) {
    return (
      <div className="p-6 max-w-3xl">
        <h1 className="text-lg font-bold text-dk-text">구독 현황</h1>
        <p className="text-sm text-dk-muted mt-2">활성 구독이 없습니다. 운영팀에 문의해 주세요.</p>
      </div>
    )
  }

  const sub = data.subscription
  const daysToExpire = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)
  const expiringSoon = sub.status === 'active' && daysToExpire <= 14 && daysToExpire > 0
  const isPastDue    = sub.status === 'past_due'
  const isCancelled  = sub.status === 'cancelled'

  return (
    <div className="space-y-6 max-w-3xl p-6">
      <div>
        <h1 className="text-lg font-bold text-dk-text">구독 현황</h1>
        <p className="text-sm text-dk-muted mt-0.5">현재 플랜과 사용 현황을 확인합니다</p>
      </div>

      {/* 만료 임박 / 미납 / 해지 알림 */}
      {expiringSoon && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">구독이 D-{daysToExpire}일 후 만료됩니다</p>
            <p className="text-xs text-amber-400/80 mt-0.5">갱신을 위해 운영팀에 연락하세요. 만료 시 서비스가 일시 중단될 수 있습니다.</p>
          </div>
        </div>
      )}
      {isPastDue && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">결제가 미납 상태입니다</p>
            <p className="text-xs text-red-400/80 mt-0.5">결제 수단을 확인하고 운영팀에 문의해 주세요.</p>
          </div>
        </div>
      )}
      {isCancelled && (
        <div className="flex items-center gap-3 p-4 bg-gray-500/10 border border-gray-500/30 rounded-xl">
          <X className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-300">구독이 해지되었습니다</p>
            {sub.cancel_reason && <p className="text-xs text-gray-400/80 mt-0.5">사유: {sub.cancel_reason}</p>}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#1f6feb] to-[#1a4a8a] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-200" />
              <span className="text-blue-200 text-sm font-medium">현재 플랜</span>
            </div>
            <p className="text-3xl font-bold">{sub.plan}</p>
            <p className="text-blue-200 text-sm mt-1">
              {sub.billing_cycle === 'monthly' ? '월간' : '연간'} · {formatAmount(sub.mrr)}/월
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30 font-semibold">
            {STATUS_LABEL[sub.status] ?? sub.status}
          </span>
        </div>

        <div className="mt-5 pt-5 border-t border-white/20 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-200">{sub.next_billing_at ? '다음 결제일' : '만료일'}</p>
            <p className="text-sm font-semibold mt-0.5">
              {formatDate(sub.next_billing_at ?? sub.expires_at)}
              <span className="text-blue-200 text-xs ml-1">
                ({daysToExpire > 0 ? `D-${daysToExpire}` : `D+${Math.abs(daysToExpire)}`})
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-200">시작일</p>
            <p className="text-sm font-semibold mt-0.5">{formatDate(sub.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-200">구독 기간</p>
            <p className="text-sm font-semibold mt-0.5">
              {Math.ceil((Date.now() - new Date(sub.started_at).getTime()) / (1000 * 60 * 60 * 24 * 30))}개월
            </p>
          </div>
        </div>
      </div>

      <div className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-dk-text flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-dk-muted" />이번 달 사용량
        </h3>
        <UsageBar label="사용자"      current={data.usage.users.current}     max={data.usage.users.max}     icon={Users} />
        <UsageBar label="고객사"      current={data.usage.companies.current} max={data.usage.companies.max} icon={Building2} />
        <UsageBar label="메시지 발송"  current={data.usage.messages.current}  max={data.usage.messages.max}  icon={MessageSquare} />
      </div>

      <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-dk-text">플랜 변경</h3>
            <p className="text-xs text-dk-muted mt-0.5">더 많은 기능이 필요하시면 운영팀에 문의해 주세요</p>
          </div>
          <button onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-1.5 text-sm text-dk-blue hover:text-dk-blue/80 font-medium">
            플랜 비교 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-dk-surface border border-dk-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dk-text flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-dk-muted" />결제 수단
          </h3>
          <span className="text-xs text-dk-muted">운영팀 관리</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-dk-surface2 rounded-xl border border-dk-border">
          <div className="w-10 h-7 bg-gradient-to-br from-dk-dim to-dk-bg rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">PG</span>
          </div>
          <div>
            <p className="text-sm font-medium text-dk-text">자동 결제 연동 준비 중</p>
            <p className="text-xs text-dk-dim">현재는 수동 결제 방식입니다</p>
          </div>
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal currentPlanCode={sub.plan_code} plans={data.available_plans} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  )
}
