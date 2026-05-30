import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, Zap } from 'lucide-react'
import { ALL_DOMAIN_PRICING, formatPrice, type DomainPlan, type DomainPricingConfig } from '@saas/core-client'

const APP_URLS: Record<string, string> = {
  rros: process.env.NEXT_PUBLIC_RROS_URL ?? '#',
  lso:  process.env.NEXT_PUBLIC_LSO_URL  ?? '#',
  ncm:  process.env.NEXT_PUBLIC_NCM_URL  ?? '#',
}

const ACCENT: Record<string, { bg: string; border: string; text: string; btn: string; btnHover: string; glow: string }> = {
  indigo: {
    bg: 'from-indigo-900/40 to-indigo-900/20',
    border: 'border-indigo-500/40',
    text: 'text-indigo-400',
    btn: 'bg-indigo-600 hover:bg-indigo-500',
    btnHover: '',
    glow: 'bg-indigo-600/25',
  },
  orange: {
    bg: 'from-orange-900/40 to-orange-900/20',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    btn: 'bg-orange-600 hover:bg-orange-500',
    btnHover: '',
    glow: 'bg-orange-600/25',
  },
  teal: {
    bg: 'from-teal-900/40 to-teal-900/20',
    border: 'border-teal-500/40',
    text: 'text-teal-400',
    btn: 'bg-teal-600 hover:bg-teal-500',
    btnHover: '',
    glow: 'bg-teal-600/25',
  },
}

export async function generateStaticParams() {
  return Object.keys(ALL_DOMAIN_PRICING).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const config = ALL_DOMAIN_PRICING[slug]
  if (!config) return { title: '요금제' }
  return { title: `${config.name} 요금제` }
}

function PlanCard({
  plan,
  accent,
  appUrl,
  domain,
}: {
  plan: DomainPlan
  accent: typeof ACCENT[string]
  appUrl: string
  domain: string
}) {
  const isEnterprise = plan.monthlyPrice === 0 && plan.code.endsWith('_pro')

  return (
    <div className={`relative flex flex-col rounded-2xl p-7 border transition-all ${
      plan.highlight
        ? `z-10 bg-gradient-to-b ${accent.bg} ${accent.border} shadow-xl`
        : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
    }`}>
      {plan.highlight && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold text-white ${accent.btn.split(' ')[0]}`}>
          추천
        </div>
      )}

      <div className="mb-6">
        <p className="text-slate-300 font-semibold text-sm mb-3">{plan.name}</p>
        <div className="flex items-end gap-1.5 mb-1">
          <span className="text-3xl font-bold text-white">
            {plan.monthlyPrice === 0 && !isEnterprise ? '무료' : isEnterprise ? '문의' : formatPrice(plan.monthlyPrice)}
          </span>
          {plan.monthlyPrice > 0 && (
            <span className="text-slate-500 text-sm pb-1">/ 월</span>
          )}
        </div>
        {plan.yearlyPrice > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            연간 결제 시 {formatPrice(plan.yearlyPrice)} (월 {formatPrice(Math.round(plan.yearlyPrice / 12))})
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {plan.maxUsers > 0 && <span>사용자 {plan.maxUsers}명</span>}
          {plan.maxUsers === 0 && <span>사용자 무제한</span>}
          {plan.maxCompanies > 0 && <span>· 거래처/고객 {plan.maxCompanies.toLocaleString()}개</span>}
          {plan.maxCompanies === 0 && <span>· 거래처/고객 무제한</span>}
        </div>
      </div>

      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? accent.text : 'text-slate-500'}`} />
            <span className={f.highlight ? 'text-white font-medium' : 'text-slate-300'}>{f.text}</span>
          </li>
        ))}
      </ul>

      {isEnterprise ? (
        <a
          href="mailto:contact@saas-platform.io"
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl border border-white/10 hover:border-white/25 text-slate-300 hover:text-white transition-all"
        >
          도입 문의
        </a>
      ) : (
        <Link
          href={`${appUrl}/signup?plan=${plan.code}`}
          className={`flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition-all ${
            plan.highlight
              ? `${accent.btn} text-white shadow-lg`
              : 'border border-white/10 hover:border-white/25 text-slate-300 hover:text-white'
          }`}
        >
          {plan.ctaLabel}
          {plan.highlight && <ArrowRight className="w-4 h-4" />}
        </Link>
      )}
    </div>
  )
}

function YearlyBadge({ config, appUrl }: { config: DomainPricingConfig; appUrl: string }) {
  const stdPlan = config.plans.find(p => p.highlight)
  if (!stdPlan || stdPlan.yearlyPrice === 0) return null
  const monthlyCost = stdPlan.monthlyPrice * 12
  const savings = monthlyCost - stdPlan.yearlyPrice
  if (savings <= 0) return null

  return (
    <div className="flex items-center justify-center mb-12">
      <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/[0.04] border border-white/10">
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-sm text-slate-300">
          연간 결제 시 <span className="text-white font-semibold">{formatPrice(savings)}</span> 절약
        </span>
      </div>
    </div>
  )
}

export default async function PricingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = ALL_DOMAIN_PRICING[slug]
  if (!config) notFound()

  const accent = ACCENT[config.accentColor] ?? ACCENT.indigo
  const appUrl = APP_URLS[slug] ?? '#'

  return (
    <div className="bg-[#020209] min-h-screen">
      {/* Ambient glow */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] ${accent.glow} rounded-full blur-[120px] pointer-events-none opacity-30`} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Back */}
        <div className="mb-12">
          <Link href="/#solutions" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            솔루션으로 돌아가기
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${accent.text}`}>요금제</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{config.name}</h1>
          <p className="text-slate-400 text-lg">{config.tagline}</p>
        </div>

        <YearlyBadge config={config} appUrl={appUrl} />

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto pt-5 mb-16">
          {config.plans.map(plan => (
            <PlanCard key={plan.code} plan={plan} accent={accent} appUrl={appUrl} domain={slug} />
          ))}
        </div>

        {/* FAQ / guarantee */}
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center mb-16">
            {[
              { title: '신용카드 불필요', desc: '무료 플랜은 카드 정보 없이 즉시 시작' },
              { title: '언제든지 해지', desc: '위약금 없이 언제든 플랜 변경·해지 가능' },
              { title: '데이터 보장', desc: '해지 후 30일간 데이터 다운로드 가능' },
            ].map(item => (
              <div key={item.title} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-sm mb-4">
              도입 관련 문의나 대량 계약은 아래로 연락해 주세요.
            </p>
            <a
              href="mailto:contact@saas-platform.io"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/25 text-slate-300 hover:text-white text-sm transition-all"
            >
              도입 문의하기
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
