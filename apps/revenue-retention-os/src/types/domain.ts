// ============================================================
// Revenue Retention OS — 도메인 타입 정의
// 스키마 SSOT: SCHEMA.md (rros) / ../../core-api/SCHEMA.md (core)
// ============================================================

export type RiskLevel = 'high' | 'medium' | 'low'
export type RenewalStatus = 'pending' | 'contacted' | 'negotiating' | 'won' | 'lost'
export type ContractStatus = 'active' | 'expired' | 'cancelled' | 'renewed'
export type ActivityType = 'call' | 'visit' | 'email' | 'sms' | 'kakao'
export type CallResult = 'connected' | 'no_answer' | 'rejected' | 'scheduled'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskType = 'call' | 'visit' | 'email' | 'renewal' | 'manual'
export type MessageChannel = 'email' | 'sms' | 'kakao'
export type MessageStatus = 'sent' | 'delivered' | 'failed' | 'read'
export type CompanyStatus = 'prospect' | 'active' | 'dormant' | 'churned'
export type UserRole = 'admin' | 'manager' | 'sales'
export type BillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled'
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded'

// ─── 사용자 ───────────────────────────────────────────────
export interface User {
  id: string
  tenant_id: string
  team_id: string | null
  email: string
  name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

// ─── 고객사 ───────────────────────────────────────────────
export interface Company {
  id: string
  tenant_id: string
  assigned_user_id: string | null
  team_id: string | null
  name: string
  biz_no: string | null
  industry: string | null
  website: string | null
  company_size: 'micro' | 'small' | 'medium' | 'large' | null
  employee_count: number | null
  revenue_range: string | null
  revenue_amount: number | null
  address_zip: string | null
  address_road: string | null
  address_detail: string | null
  lat: number | null
  lng: number | null
  status: CompanyStatus
  grade: string | null
  renewal_risk: RiskLevel | null
  risk_updated_at: string | null
  memo: string | null
  created_at: string
  updated_at: string
  // 조인 데이터
  assigned_user?: Pick<User, 'id' | 'name'>
}

// ─── 담당자 ───────────────────────────────────────────────
export interface Contact {
  id: string
  tenant_id: string
  company_id: string
  name: string
  title: string | null
  department: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  is_primary: boolean
  is_decision_maker: boolean
  preferred_channel: MessageChannel | null
  memo: string | null
  created_at: string
}

// ─── 계약 ─────────────────────────────────────────────────
export interface Contract {
  id: string
  tenant_id: string
  company_id: string
  product_id: string | null
  assigned_user_id: string | null
  contract_no: string | null
  started_at: string
  expires_at: string
  amount: number
  discount_rate: number
  final_amount: number | null
  is_paid: boolean
  paid_at: string | null
  payment_method: string | null
  account_count: number
  status: ContractStatus
  cancel_reason: string | null
  parent_contract_id: string | null
  renewal_count: number
  memo: string | null
  created_at: string
  updated_at: string
  // 조인 데이터
  company?: Pick<Company, 'id' | 'name' | 'biz_no'>
  assigned_user?: Pick<User, 'id' | 'name'>
  product?: { id: string; name: string }
}

// ─── 갱신 ─────────────────────────────────────────────────
export interface Renewal {
  id: string
  tenant_id: string
  contract_id: string
  company_id: string
  assigned_user_id: string | null
  status: RenewalStatus
  risk_level: RiskLevel | null
  risk_score: number | null
  contract_expires_at: string
  target_renewal_at: string | null
  result: 'renewed' | 'churned' | 'upsell' | 'downgrade' | null
  result_contract_id: string | null
  lost_reason: string | null
  memo: string | null
  created_at: string
  updated_at: string
  // 조인 데이터
  company?: Pick<Company, 'id' | 'name'>
  contract?: Pick<Contract, 'id' | 'final_amount' | 'amount' | 'contract_no'>
  assigned_user?: Pick<User, 'id' | 'name'>
}

// ─── 영업 활동 ────────────────────────────────────────────
export interface Activity {
  id: string
  tenant_id: string
  company_id: string
  contact_id: string | null
  user_id: string
  contract_id: string | null
  renewal_id: string | null
  type: ActivityType
  activity_at: string
  call_result: CallResult | null
  call_duration: number | null
  visit_purpose: 'demo' | 'proposal' | 'contract' | 'followup' | null
  companions: string | null
  summary: string | null
  next_action: string | null
  next_action_at: string | null
  contact_value: string | null   // 통화 시 사용 번호, 이메일 시 사용 주소 (당시 값 보존)
  created_at: string
  // 조인 데이터
  company?: Pick<Company, 'id' | 'name'>
  contact?: Pick<Contact, 'id' | 'name' | 'title'>
  user?: Pick<User, 'id' | 'name'>
}

// ─── 업무 ─────────────────────────────────────────────────
export interface Task {
  id: string
  tenant_id: string
  assigned_user_id: string
  company_id: string | null
  contract_id: string | null
  renewal_id: string | null
  activity_id: string | null
  title: string
  description: string | null
  type: TaskType | null
  priority: TaskPriority
  status: TaskStatus
  due_at: string | null
  done_at: string | null
  is_auto: boolean
  created_at: string
  // 조인 데이터
  company?: Pick<Company, 'id' | 'name'>
  assigned_user?: Pick<User, 'id' | 'name'>
}

// ─── 메시지 ───────────────────────────────────────────────
export interface Message {
  id: string
  tenant_id: string
  company_id: string | null
  contact_id: string | null
  user_id: string | null
  activity_id: string | null
  channel: MessageChannel
  template_id: string | null
  recipient: string
  content: string | null
  status: MessageStatus
  sent_at: string
  read_at: string | null
  // 조인 데이터
  company?: Pick<Company, 'id' | 'name'>
  contact?: Pick<Contact, 'id' | 'name'>
}

// ─── 메시지 템플릿 ─────────────────────────────────────────
export interface MessageTemplate {
  id: string
  tenant_id: string
  name: string
  channel: MessageChannel
  category: 'renewal' | 'intro' | 'followup' | 'custom' | null
  subject: string | null
  content: string
  variables: string[] | null
  is_active: boolean
  created_at: string
}

// ─── API 연동 ─────────────────────────────────────────────
export interface ApiIntegration {
  id: string
  tenant_id: string
  provider: 'kakao' | 'sms' | 'email' | 'naver_map'
  is_active: boolean
  config: Record<string, unknown>
  tested_at: string | null
  created_at: string
  updated_at: string
}

// ─── 제품 ─────────────────────────────────────────────────
export interface Product {
  id: string
  tenant_id: string
  name: string
  category: string | null
  unit_price: number | null
  billing_cycle: BillingCycle
  description: string | null
  is_active: boolean
  created_at: string
}

// ─── 팀 ──────────────────────────────────────────────────
export interface Team {
  id: string
  tenant_id: string
  name: string
  created_at: string
}

// ─── SaaS 운영 ────────────────────────────────────────────
export interface Plan {
  id: string
  name: string
  code: 'free' | 'standard' | 'pro'
  max_users: number | null
  max_companies: number | null
  max_messages: number | null
  monthly_price: number
  yearly_price: number
  is_active: boolean
  created_at: string
}

export interface Tenant {
  id: string
  name: string
  biz_no: string | null
  is_active: boolean
  created_at: string
}

export interface TenantSubscription {
  id: string
  tenant_id: string
  plan_id: string
  billing_cycle: BillingCycle
  started_at: string
  expires_at: string
  next_billing_at: string | null
  status: SubscriptionStatus
  pg_customer_id: string | null
  pg_sub_id: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  // 조인 데이터
  plan?: Plan
  tenant?: Tenant
}

export interface TenantInvoice {
  id: string
  tenant_id: string
  subscription_id: string | null
  plan_id: string | null
  invoice_no: string | null
  billing_cycle: BillingCycle | null
  period_start: string
  period_end: string
  amount: number
  status: InvoiceStatus
  payment_method: string | null
  paid_at: string | null
  pg_payment_id: string | null
  memo: string | null
  processed_by: string | null
  due_at: string | null
  created_at: string
  // 조인 데이터
  tenant?: Pick<Tenant, 'id' | 'name'>
  plan?: Pick<Plan, 'id' | 'name'>
}

// ─── API 공통 응답 ────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    code: string
    message: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
}
