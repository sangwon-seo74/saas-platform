// 도메인별 요금제 정의 — 프론트엔드 SSOT
// DB의 core.plans와 1:1 매핑. code 필드가 고유 키.

export type BillingCycle = 'monthly' | 'yearly'

export interface PlanFeature {
  text: string
  highlight?: boolean
}

export interface DomainPlan {
  code: string
  name: string
  monthlyPrice: number  // 원, 0이면 무료
  yearlyPrice: number
  maxUsers: number      // 0 = 무제한
  maxCompanies: number  // 0 = 무제한
  maxMessages: number   // 0 = 무제한
  features: PlanFeature[]
  highlight?: boolean   // UI에서 "추천" 배지
  ctaLabel: string
}

export interface DomainPricingConfig {
  slug: string
  name: string
  tagline: string
  accentColor: string   // Tailwind color name (e.g. 'indigo')
  plans: DomainPlan[]
}

// ─── RROS ────────────────────────────────────────────────────────────────────
export const RROS_PRICING: DomainPricingConfig = {
  slug: 'rros',
  name: 'Revenue Retention OS',
  tagline: 'B2B 고객 갱신·리텐션 운영 솔루션',
  accentColor: 'indigo',
  plans: [
    {
      code: 'rros_free',
      name: '무료',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxUsers: 5,
      maxCompanies: 50,
      maxMessages: 100,
      ctaLabel: '무료로 시작',
      features: [
        { text: '사용자 5명' },
        { text: '고객사 50개' },
        { text: '갱신 파이프라인' },
        { text: '기본 활동 이력' },
        { text: '이메일 알림 100건/월' },
      ],
    },
    {
      code: 'rros_standard',
      name: '스탠다드',
      monthlyPrice: 79000,
      yearlyPrice: 790000,
      maxUsers: 20,
      maxCompanies: 500,
      maxMessages: 2000,
      highlight: true,
      ctaLabel: '14일 무료 체험',
      features: [
        { text: '사용자 20명' },
        { text: '고객사 500개' },
        { text: 'SMS · 카카오 알림 2,000건/월', highlight: true },
        { text: '팀 업무 자동 배분', highlight: true },
        { text: '실시간 매출 대시보드', highlight: true },
        { text: '리포트 & 엑스포트' },
        { text: '우선 지원' },
      ],
    },
    {
      code: 'rros_pro',
      name: '프로',
      monthlyPrice: 199000,
      yearlyPrice: 1990000,
      maxUsers: 0,
      maxCompanies: 0,
      maxMessages: 0,
      ctaLabel: '도입 문의',
      features: [
        { text: '사용자 무제한' },
        { text: '고객사 무제한' },
        { text: '알림 무제한' },
        { text: 'AI 위험도 자동 감지', highlight: true },
        { text: 'API 전체 접근' },
        { text: '전담 CS 매니저' },
        { text: 'SLA 99.9%' },
      ],
    },
  ],
}

// ─── LSO ─────────────────────────────────────────────────────────────────────
export const LSO_PRICING: DomainPricingConfig = {
  slug: 'lso',
  name: '주류영업 관리',
  tagline: '영업담당자 방문·거래처 관리 솔루션',
  accentColor: 'orange',
  plans: [
    {
      code: 'lso_free',
      name: '무료',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxUsers: 3,
      maxCompanies: 30,
      maxMessages: 0,
      ctaLabel: '무료로 시작',
      features: [
        { text: '영업담당자 3명' },
        { text: '거래처 30개' },
        { text: '방문 기록 관리' },
        { text: '기본 대시보드' },
      ],
    },
    {
      code: 'lso_standard',
      name: '스탠다드',
      monthlyPrice: 49000,
      yearlyPrice: 490000,
      maxUsers: 10,
      maxCompanies: 200,
      maxMessages: 500,
      highlight: true,
      ctaLabel: '14일 무료 체험',
      features: [
        { text: '영업담당자 10명' },
        { text: '거래처 200개' },
        { text: '카카오맵 기반 현황 지도', highlight: true },
        { text: 'GPS 실시간 위치 추적', highlight: true },
        { text: '알림 500건/월' },
        { text: '방문 통계 리포트' },
      ],
    },
    {
      code: 'lso_pro',
      name: '프로',
      monthlyPrice: 99000,
      yearlyPrice: 990000,
      maxUsers: 0,
      maxCompanies: 0,
      maxMessages: 0,
      ctaLabel: '도입 문의',
      features: [
        { text: '담당자·거래처 무제한' },
        { text: '주문 관리 워크플로' },
        { text: '정기 배송 일정 관리', highlight: true },
        { text: '매출·수금 현황 분석', highlight: true },
        { text: 'API 연동' },
        { text: '전담 CS 매니저' },
      ],
    },
  ],
}

// ─── NCM ─────────────────────────────────────────────────────────────────────
export const NCM_PRICING: DomainPricingConfig = {
  slug: 'ncm',
  name: 'Namecard CRM',
  tagline: 'AI 명함 인식 고객관리 솔루션',
  accentColor: 'teal',
  plans: [
    {
      code: 'ncm_free',
      name: '무료',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxUsers: 2,
      maxCompanies: 200,
      maxMessages: 0,
      ctaLabel: '무료로 시작',
      features: [
        { text: '사용자 2명' },
        { text: '연락처 200개' },
        { text: 'AI 명함 자동 인식' },
        { text: '기본 고객 이력' },
      ],
    },
    {
      code: 'ncm_standard',
      name: '스탠다드',
      monthlyPrice: 39000,
      yearlyPrice: 390000,
      maxUsers: 10,
      maxCompanies: 5000,
      maxMessages: 200,
      highlight: true,
      ctaLabel: '14일 무료 체험',
      features: [
        { text: '사용자 10명' },
        { text: '연락처 5,000개' },
        { text: 'VIP 고객 관리', highlight: true },
        { text: '활동 이력·태그 관리', highlight: true },
        { text: '카카오·이메일 알림 200건/월' },
        { text: '연락처 엑스포트' },
      ],
    },
    {
      code: 'ncm_pro',
      name: '프로',
      monthlyPrice: 89000,
      yearlyPrice: 890000,
      maxUsers: 0,
      maxCompanies: 0,
      maxMessages: 0,
      ctaLabel: '도입 문의',
      features: [
        { text: '사용자·연락처 무제한' },
        { text: '명함 일괄 스캔', highlight: true },
        { text: 'CRM 자동 그룹화 AI', highlight: true },
        { text: 'CRM 연동 API' },
        { text: '전담 CS 매니저' },
      ],
    },
  ],
}

export const ALL_DOMAIN_PRICING: Record<string, DomainPricingConfig> = {
  rros: RROS_PRICING,
  lso:  LSO_PRICING,
  ncm:  NCM_PRICING,
}

export function formatPrice(price: number): string {
  if (price === 0) return '무료'
  return `₩${price.toLocaleString('ko-KR')}`
}
