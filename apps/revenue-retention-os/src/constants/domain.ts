// ============================================================
// Revenue Retention OS — 상수 & 레이블
// ============================================================

// ─── 위험도 ───────────────────────────────────────────────
export const RISK_LEVEL = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export const RISK_LABEL: Record<string, string> = {
  high: '위험',
  medium: '주의',
  low: '안전',
}

export const RISK_CLASS: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  medium: 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  low: 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
}

// ─── 갱신 상태 ────────────────────────────────────────────
export const RENEWAL_STATUS = {
  PENDING: 'pending',
  CONTACTED: 'contacted',
  NEGOTIATING: 'negotiating',
  WON: 'won',
  LOST: 'lost',
} as const

export const RENEWAL_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  contacted: '연락완료',
  negotiating: '협의중',
  won: '갱신완료',
  lost: '이탈',
}

export const RENEWAL_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  contacted: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  negotiating: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  won: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  lost: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
}

// ─── 계약 상태 ────────────────────────────────────────────
export const CONTRACT_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  RENEWED: 'renewed',
} as const

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  active: '계약중',
  expired: '만료',
  cancelled: '해지',
  renewed: '갱신완료',
}

export const CONTRACT_STATUS_CLASS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  expired: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  renewed: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
}

// ─── 영업 활동 유형 ───────────────────────────────────────
export const ACTIVITY_TYPE = {
  CALL: 'call',
  VISIT: 'visit',
  EMAIL: 'email',
  SMS: 'sms',
  KAKAO: 'kakao',
} as const

export const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  call: '통화',
  visit: '방문',
  email: '이메일',
  sms: '문자',
  kakao: '카카오',
}

// ─── 통화 결과 ────────────────────────────────────────────
export const CALL_RESULT = {
  CONNECTED: 'connected',
  NO_ANSWER: 'no_answer',
  REJECTED: 'rejected',
  SCHEDULED: 'scheduled',
} as const

export const CALL_RESULT_LABEL: Record<string, string> = {
  connected: '연결됨',
  no_answer: '부재중',
  rejected: '거절',
  scheduled: '예약통화',
}

export const CALL_RESULT_CLASS: Record<string, string> = {
  connected: 'bg-[#0f2d1c] text-[#3FB950]',
  no_answer: 'bg-[#3d2b0d] text-[#E3B341]',
  rejected:  'bg-[#3d1a1a] text-[#FF7B72]',
  scheduled: 'bg-[#1c2d4a] text-[#58A6FF]',
}

// ─── 방문 목적 ────────────────────────────────────────────
export const VISIT_PURPOSE_LABEL: Record<string, string> = {
  demo: '제품 시연',
  proposal: '제안',
  contract: '계약',
  followup: '사후관리',
}

// ─── 업무 상태 ────────────────────────────────────────────
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const

export const TASK_STATUS_LABEL: Record<string, string> = {
  todo: '할일',
  in_progress: '진행중',
  done: '완료',
  cancelled: '취소',
}

export const TASK_STATUS_CLASS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-600',
  done: 'bg-green-50 text-green-600',
  cancelled: 'bg-slate-50 text-slate-400 line-through',
}

// ─── 업무 우선순위 ────────────────────────────────────────
export const TASK_PRIORITY_LABEL: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

export const TASK_PRIORITY_CLASS: Record<string, string> = {
  high:   'bg-[#3d1a1a] text-[#FF7B72]',
  medium: 'bg-[#3d2b0d] text-[#E3B341]',
  low:    'bg-dk-surface2 text-dk-muted',
}

// ─── 업무 유형 ────────────────────────────────────────────
export const TASK_TYPE_LABEL: Record<string, string> = {
  call: '통화',
  visit: '방문',
  email: '이메일',
  renewal: '갱신',
  manual: '수동',
}

// ─── 메시지 채널 ──────────────────────────────────────────
export const MESSAGE_CHANNEL_LABEL: Record<string, string> = {
  email: '이메일',
  sms: '문자',
  kakao: '카카오',
}

export const MESSAGE_STATUS_LABEL: Record<string, string> = {
  sent: '발송',
  delivered: '수신',
  failed: '실패',
  read: '읽음',
}

export const MESSAGE_STATUS_CLASS: Record<string, string> = {
  sent: 'bg-blue-50 text-blue-600',
  delivered: 'bg-green-50 text-green-600',
  failed: 'bg-red-50 text-red-600',
  read: 'bg-green-50 text-green-700',
}

// ─── 고객사 상태 ──────────────────────────────────────────
export const COMPANY_STATUS_LABEL: Record<string, string> = {
  prospect: '발굴',
  active: '계약',
  dormant: '미접촉',
  churned: '해지',
}

export const COMPANY_STATUS_CLASS: Record<string, string> = {
  prospect: 'bg-blue-50 text-blue-600',
  active: 'bg-green-50 text-green-600',
  dormant: 'bg-slate-100 text-slate-500',
  churned: 'bg-red-50 text-red-600',
}

// ─── 플랜 ─────────────────────────────────────────────────
export const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  standard: 'Standard',
  pro: 'Pro',
}

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trialing: '체험중',
  active: '활성',
  past_due: '연체',
  cancelled: '해지',
}

export const SUBSCRIPTION_STATUS_CLASS: Record<string, string> = {
  trialing: 'bg-blue-50 text-blue-600',
  active: 'bg-green-50 text-green-600',
  past_due: 'bg-red-50 text-red-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: '미납',
  paid: '납부완료',
  failed: '결제실패',
  refunded: '환불',
}

export const INVOICE_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  paid: 'bg-green-50 text-green-600',
  failed: 'bg-red-50 text-red-600',
  refunded: 'bg-slate-100 text-slate-500',
}
