import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, BarChart3, RefreshCw,
  Bell, Users, Shield, Zap, Globe, Menu, CreditCard, Wine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const RROS_URL = process.env.NEXT_PUBLIC_RROS_URL ?? '#'
const NCM_URL  = process.env.NEXT_PUBLIC_NCM_URL  ?? '#'
const LSO_URL  = process.env.NEXT_PUBLIC_LSO_URL  ?? '#'

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-[#020209]/80">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">SaaS Platform</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#solutions" className="text-slate-400 hover:text-white text-sm transition-colors">솔루션</a>
          <a href="#features"  className="text-slate-400 hover:text-white text-sm transition-colors">플랫폼 특징</a>
          <a href="#contact"   className="text-slate-400 hover:text-white text-sm transition-colors">문의</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={RROS_URL}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
          >
            로그인
          </Link>
          <Link
            href={`${RROS_URL}/signup`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-lg shadow-indigo-900/40"
          >
            무료 시작
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        {/* Launch badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Revenue Retention OS 정식 출시
          <ArrowRight className="w-3 h-3" />
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
          <span className="text-white">비즈니스 성장을</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300">
            가속화하는 플랫폼
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          B2B 운영의 모든 영역을 자동화하는 검증된 SaaS 솔루션.
          <br className="hidden sm:block" />
          고객 갱신부터 팀 업무 관리까지, 하나의 플랫폼에서.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`${RROS_URL}/signup`}
            className="flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-900/50 hover:shadow-indigo-800/70 hover:-translate-y-0.5"
          >
            무료로 시작하기
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#solutions"
            className="flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all"
          >
            솔루션 살펴보기
          </a>
        </div>

        {/* Social proof */}
        <p className="mt-10 text-xs text-slate-600">
          신용카드 불필요 · 즉시 시작 · 언제든지 해지
        </p>
      </div>
    </section>
  )
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function Stats() {
  const items = [
    { value: '30%↑',  label: '평균 갱신율 향상' },
    { value: '5분',   label: '팀 온보딩 시간' },
    { value: '3채널', label: 'SMS·이메일·카카오 통합' },
    { value: '무료',  label: '신용카드 없이 시작' },
  ]
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map(s => (
          <div key={s.label} className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1.5">{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Solutions ───────────────────────────────────────────────────────────────
function Solutions() {
  const features = [
    '갱신 파이프라인 관리',
    '고객 이탈 위험 자동 감지',
    'SMS · 이메일 · 카카오 알림',
    '팀 업무 자동 배분',
    '방문 활동 기록 관리',
    '실시간 매출 대시보드',
  ]

  return (
    <section id="solutions" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">솔루션</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            검증된 SaaS 솔루션
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            각 비즈니스 영역에 최적화된 솔루션을 순차적으로 제공합니다
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {/* RROS card */}
          <div className="relative group flex flex-col bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-indigo-500/40 rounded-2xl p-8 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">운영 중</span>
            </div>

            <div className="relative flex flex-col flex-1">
              <div className="mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50 mb-4">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Revenue Retention OS</h3>
                <p className="text-slate-400 text-sm mt-1">B2B 고객 갱신·리텐션 운영 솔루션</p>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                고객 계약 갱신과 이탈 방지를 자동화하는 영업 운영 플랫폼. 갱신 파이프라인
                관리부터 자동 알림 발송, 팀 업무 배분까지 B2B 세일즈의 전 과정을 지원합니다.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex gap-3">
                <Link
                  href="/pricing/rros"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-900/40"
                >
                  플랜 보기
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={RROS_URL}
                  className="px-4 py-3 text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>

          {/* NCM card */}
          <div className="relative group flex flex-col bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-teal-500/40 rounded-2xl p-8 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">운영 중</span>
            </div>
            <div className="relative flex flex-col flex-1">
              <div className="mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/50 mb-4">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Namecard CRM</h3>
                <p className="text-slate-400 text-sm mt-1">AI 명함 인식 고객관리 솔루션</p>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                명함 촬영 한 장으로 고객 정보를 자동 등록. AI가 인식한 연락처를 즉시 CRM에 저장하고 활동 이력과 VIP 관리로 장기 고객 관계를 유지합니다.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                {['AI 명함 자동 인식', '고객 활동 이력 기록', 'VIP 고객 관리', '실시간 연락처 검색'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-3">
                <Link
                  href="/pricing/ncm"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors shadow-lg shadow-teal-900/40"
                >
                  플랜 보기
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={NCM_URL}
                  className="px-4 py-3 text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>

          {/* LSO card */}
          <div className="relative group flex flex-col bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-orange-500/40 rounded-2xl p-8 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">운영 중</span>
            </div>
            <div className="relative flex flex-col flex-1">
              <div className="mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-900/50 mb-4">
                  <Wine className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">주류영업 관리</h3>
                <p className="text-slate-400 text-sm mt-1">영업담당자 방문·거래처 관리 솔루션</p>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                주류업체 영업담당자의 거래처 방문을 지도 기반으로 실시간 파악. 담당자는 모바일로 쉽게 체크인하고, 관리자는 PC에서 동선과 영업 현황을 한눈에 확인합니다.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                {['카카오맵 기반 영업 현황', '모바일 GPS 체크인', '거래처·방문기록 관리', '담당자 동선 추적'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-3">
                <Link
                  href="/pricing/lso"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl transition-colors shadow-lg shadow-orange-900/40"
                >
                  플랜 보기
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={LSO_URL}
                  className="px-4 py-3 text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── Features ────────────────────────────────────────────────────────────────
interface FeatureItem {
  icon: LucideIcon
  title: string
  desc: string
}

function Features() {
  const items: FeatureItem[] = [
    {
      icon: Zap,
      title: '빠른 도입',
      desc: '설치 없이 브라우저에서 즉시 시작. 팀 초대부터 운영까지 하루면 충분합니다.',
    },
    {
      icon: Shield,
      title: '엔터프라이즈 보안',
      desc: '테넌트 격리, 역할 기반 접근 제어(RBAC), AES 암호화 저장으로 데이터를 보호합니다.',
    },
    {
      icon: Users,
      title: '팀 협업',
      desc: '영업, 매니저, 관리자 역할별 맞춤 워크플로우로 팀 전체가 함께 일합니다.',
    },
    {
      icon: BarChart3,
      title: '실시간 인사이트',
      desc: '갱신 현황, 위험 고객, 팀 성과를 실시간 대시보드로 한눈에 파악합니다.',
    },
    {
      icon: Bell,
      title: '자동 알림 발송',
      desc: 'SMS, 이메일, 카카오알림톡으로 갱신 시점에 맞춰 자동으로 고객에게 연락합니다.',
    },
    {
      icon: Globe,
      title: '멀티테넌트 아키텍처',
      desc: '완전한 테넌트 격리로 여러 조직이 동일 플랫폼을 독립적으로 안전하게 사용합니다.',
    },
  ]

  return (
    <section id="features" className="py-28 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">플랫폼 특징</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            왜 SaaS Platform인가
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            빠른 도입, 강력한 보안, 뛰어난 확장성을 하나의 플랫폼에서
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(f => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/30 hover:bg-white/[0.04] rounded-xl p-6 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center mb-4 transition-colors">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { step: '01', title: '플랜 선택', desc: '솔루션별 요금제 페이지에서 팀에 맞는 플랜을 선택하세요.' },
    { step: '02', title: '계정 생성', desc: '회사명·이메일·비밀번호 입력 후 즉시 계정이 만들어집니다.' },
    { step: '03', title: '팀원 초대', desc: '관리자 대시보드에서 초대 링크를 공유해 팀원을 추가하세요.' },
    { step: '04', title: '바로 시작', desc: '데이터를 입력하고 자동화된 운영 흐름을 즉시 경험하세요.' },
  ]

  return (
    <section className="py-28 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">시작 방법</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            4단계로 시작하는 운영 자동화
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
              )}
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center mb-4">
                  <span className="text-indigo-400 text-sm font-bold">{s.step}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section id="contact" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative bg-gradient-to-br from-indigo-900/40 to-purple-900/30 border border-indigo-500/20 rounded-3xl p-12 md:p-20 text-center overflow-hidden">
          {/* Glows */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-4">지금 시작하세요</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
              고객 갱신율을 높이고<br />
              매출을 지키세요
            </h2>
            <p className="text-slate-300 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
              Revenue Retention OS로 갱신 업무를 자동화하고<br className="hidden sm:block" />
              영업팀이 진짜 중요한 일에 집중하게 하세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing/rros"
                className="flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-xl shadow-indigo-900/60 hover:-translate-y-0.5"
              >
                플랜 보기
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:contact@saas-platform.io"
                className="px-8 py-4 text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-xl transition-all"
              >
                도입 문의하기
              </a>
            </div>
            <p className="mt-6 text-xs text-slate-600">신용카드 불필요 · 언제든지 해지</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-white font-semibold">SaaS Platform</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a href="#solutions" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">솔루션</a>
            <a href="#features"  className="text-slate-500 hover:text-slate-300 text-sm transition-colors">특징</a>
            <a href="mailto:contact@saas-platform.io" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">문의</a>
          </div>

          {/* Copyright */}
          <p className="text-slate-700 text-sm">© 2025 SaaS Platform</p>
        </div>

        <div className="mt-8 pt-8 border-t border-white/[0.04] flex items-center gap-6">
          <Link href="/terms" className="text-slate-700 hover:text-slate-400 text-xs transition-colors">이용약관</Link>
          <Link href="/privacy" className="text-slate-700 hover:text-slate-400 text-xs transition-colors">개인정보처리방침</Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="bg-[#020209] min-h-screen">
      <Nav />
      <Hero />
      <Stats />
      <Solutions />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  )
}
