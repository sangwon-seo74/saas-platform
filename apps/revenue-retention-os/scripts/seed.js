// ============================================================
// Revenue Retention OS — Seed Data Script
// node scripts/seed.js 로 실행
// ============================================================

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL        = process.env.SUPABASE_URL        || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요.')
  process.exit(1)
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 고정 UUID (재실행 시 중복 방지)
const IDS = {
  TENANT:   'a1000000-0000-0000-0000-000000000001',
  TEAM1:    'b1000000-0000-0000-0000-000000000001',
  TEAM2:    'b1000000-0000-0000-0000-000000000002',
  ADMIN:    'f0e34447-7ad8-4389-a1a5-3a5ab4a16e03', // auth 유저 ID
  USER2:    'c1000000-0000-0000-0000-000000000002',
  USER3:    'c1000000-0000-0000-0000-000000000003',
  USER4:    'c1000000-0000-0000-0000-000000000004',
  PROD1:    'd1000000-0000-0000-0000-000000000001',
  PROD2:    'd1000000-0000-0000-0000-000000000002',
  PROD3:    'd1000000-0000-0000-0000-000000000003',
  COMP: (n) => `e1000000-0000-0000-0000-${String(n).padStart(12,'0')}`,
  CONT: (n) => `f1000000-0000-0000-0000-${String(n).padStart(12,'0')}`,
  CTR:  (n) => `11000000-0000-0000-0000-${String(n).padStart(12,'0')}`,
  REN:  (n) => `21000000-0000-0000-0000-${String(n).padStart(12,'0')}`,
  ACT:  (n) => `31000000-0000-0000-0000-${String(n).padStart(12,'0')}`,
  TASK: (n) => `41000000-0000-0000-0000-${String(n).padStart(12,'0')}`,
  TMPL: (n) => `51000000-0000-0000-0000-${String(n).padStart(12,'0')}`,
}

const T = IDS.TENANT

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

async function insert(table, rows) {
  const { data, error } = await supabase.from(table).upsert(rows, { onConflict: 'id' }).select()
  if (error) throw new Error(`${table}: ${error.message}`)
  console.log(`  ✓ ${table}: ${data.length}건`)
  return data
}

async function seed() {
  console.log('🌱 시드 데이터 삽입 시작...\n')

  await insert('tenants', [
    { id: T, name: '(주)테크솔루션', biz_no: '123-45-67890', is_active: true }
  ])

  await insert('teams', [
    { id: IDS.TEAM1, tenant_id: T, name: '영업 1팀' },
    { id: IDS.TEAM2, tenant_id: T, name: '영업 2팀' },
  ])

  await insert('users', [
    { id: IDS.ADMIN, tenant_id: T, team_id: IDS.TEAM1, name: '관리자',  email: 'elecb74@gmail.com',      role: 'admin',   is_active: true },
    { id: IDS.USER2, tenant_id: T, team_id: IDS.TEAM1, name: '김영업',  email: 'sales1@techsolution.com', role: 'sales',   is_active: true },
    { id: IDS.USER3, tenant_id: T, team_id: IDS.TEAM2, name: '이매니저', email: 'manager@techsolution.com',role: 'manager', is_active: true },
    { id: IDS.USER4, tenant_id: T, team_id: IDS.TEAM2, name: '박영업',  email: 'sales2@techsolution.com', role: 'sales',   is_active: true },
  ])

  await insert('products', [
    { id: IDS.PROD1, tenant_id: T, name: '고객관리 솔루션 Pro', category: 'CRM', unit_price: 5000000, billing_cycle: 'yearly', is_active: true },
    { id: IDS.PROD2, tenant_id: T, name: '영업지원 Standard',   category: 'SFA', unit_price: 2400000, billing_cycle: 'yearly', is_active: true },
    { id: IDS.PROD3, tenant_id: T, name: '분석 대시보드',       category: 'BI',  unit_price: 1800000, billing_cycle: 'yearly', is_active: true },
  ])

  await insert('companies', [
    { id: IDS.COMP(1), tenant_id: T, name: '삼성SDS(주)',         biz_no: '123-81-00001', industry: 'IT서비스', company_size: 'large',  address_city: '서울', status: 'active',  grade: 'A', renewal_risk: 'high',   assigned_user_id: IDS.USER2, team_id: IDS.TEAM1 },
    { id: IDS.COMP(2), tenant_id: T, name: '(주)카카오엔터프라이즈', biz_no: '234-81-00002', industry: 'IT서비스', company_size: 'large',  address_city: '성남', status: 'active',  grade: 'A', renewal_risk: 'low',    assigned_user_id: IDS.USER2, team_id: IDS.TEAM1 },
    { id: IDS.COMP(3), tenant_id: T, name: '현대오토에버(주)',    biz_no: '345-81-00003', industry: '자동차IT', company_size: 'large',  address_city: '서울', status: 'active',  grade: 'B', renewal_risk: 'medium', assigned_user_id: IDS.USER4, team_id: IDS.TEAM2 },
    { id: IDS.COMP(4), tenant_id: T, name: '(주)LG CNS',         biz_no: '456-81-00004', industry: 'IT서비스', company_size: 'large',  address_city: '서울', status: 'active',  grade: 'A', renewal_risk: 'low',    assigned_user_id: IDS.USER4, team_id: IDS.TEAM2 },
    { id: IDS.COMP(5), tenant_id: T, name: '(주)롯데정보통신',   biz_no: '567-81-00005', industry: 'IT서비스', company_size: 'medium', address_city: '서울', status: 'active',  grade: 'B', renewal_risk: 'high',   assigned_user_id: IDS.USER2, team_id: IDS.TEAM1 },
    { id: IDS.COMP(6), tenant_id: T, name: '에스케이텔레콤(주)', biz_no: '678-81-00006', industry: '통신',     company_size: 'large',  address_city: '서울', status: 'active',  grade: 'A', renewal_risk: 'medium', assigned_user_id: IDS.ADMIN, team_id: IDS.TEAM1 },
    { id: IDS.COMP(7), tenant_id: T, name: '(주)KT DS',          biz_no: '789-81-00007', industry: 'IT서비스', company_size: 'large',  address_city: '서울', status: 'dormant', grade: 'C', renewal_risk: 'high',   assigned_user_id: IDS.USER4, team_id: IDS.TEAM2 },
    { id: IDS.COMP(8), tenant_id: T, name: '(주)신한DS',         biz_no: '890-81-00008', industry: '금융IT',  company_size: 'medium', address_city: '서울', status: 'active',  grade: 'B', renewal_risk: 'low',    assigned_user_id: IDS.USER2, team_id: IDS.TEAM1 },
  ])

  await insert('contacts', [
    { id: IDS.CONT(1), tenant_id: T, company_id: IDS.COMP(1), name: '이담당', title: '팀장', department: '구매팀',   mobile: '010-1234-5678', email: 'lee@samsung.com',  is_primary: true,  is_decision_maker: true  },
    { id: IDS.CONT(2), tenant_id: T, company_id: IDS.COMP(1), name: '김결재', title: '이사', department: 'IT전략팀', mobile: '010-2345-6789', email: 'kim@samsung.com',  is_primary: false, is_decision_maker: true  },
    { id: IDS.CONT(3), tenant_id: T, company_id: IDS.COMP(2), name: '박카카오', title: '과장', department: '구매팀', mobile: '010-3456-7890', email: 'park@kakao.com',   is_primary: true,  is_decision_maker: false },
    { id: IDS.CONT(4), tenant_id: T, company_id: IDS.COMP(3), name: '최현대', title: '차장', department: 'IT기획팀', mobile: '010-4567-8901', email: 'choi@hyundai.com', is_primary: true,  is_decision_maker: true  },
    { id: IDS.CONT(5), tenant_id: T, company_id: IDS.COMP(4), name: '정LG',  title: '부장', department: '구매팀',   mobile: '010-5678-9012', email: 'jung@lgcns.com',   is_primary: true,  is_decision_maker: true  },
    { id: IDS.CONT(6), tenant_id: T, company_id: IDS.COMP(5), name: '한롯데', title: '과장', department: 'IT팀',    mobile: '010-6789-0123', email: 'han@lotte.com',    is_primary: true,  is_decision_maker: false },
  ])

  await insert('contracts', [
    { id: IDS.CTR(1), tenant_id: T, company_id: IDS.COMP(1), product_id: IDS.PROD1, assigned_user_id: IDS.USER2, contract_no: 'CT-2025-0001', started_at: '2025-06-01', expires_at: '2026-05-31', amount: 5000000, discount_rate: 0,  final_amount: 5000000, is_paid: true, status: 'active',  account_count: 10, renewal_count: 2 },
    { id: IDS.CTR(2), tenant_id: T, company_id: IDS.COMP(2), product_id: IDS.PROD1, assigned_user_id: IDS.USER2, contract_no: 'CT-2025-0002', started_at: '2025-07-01', expires_at: '2026-06-30', amount: 5000000, discount_rate: 10, final_amount: 4500000, is_paid: true, status: 'active',  account_count: 8,  renewal_count: 1 },
    { id: IDS.CTR(3), tenant_id: T, company_id: IDS.COMP(3), product_id: IDS.PROD2, assigned_user_id: IDS.USER4, contract_no: 'CT-2025-0003', started_at: '2025-08-01', expires_at: '2026-07-31', amount: 2400000, discount_rate: 0,  final_amount: 2400000, is_paid: true, status: 'active',  account_count: 5,  renewal_count: 0 },
    { id: IDS.CTR(4), tenant_id: T, company_id: IDS.COMP(4), product_id: IDS.PROD3, assigned_user_id: IDS.USER4, contract_no: 'CT-2025-0004', started_at: '2025-05-01', expires_at: '2026-06-30', amount: 1800000, discount_rate: 0,  final_amount: 1800000, is_paid: true, status: 'active',  account_count: 3,  renewal_count: 3 },
    { id: IDS.CTR(5), tenant_id: T, company_id: IDS.COMP(5), product_id: IDS.PROD1, assigned_user_id: IDS.USER2, contract_no: 'CT-2025-0005', started_at: '2025-09-01', expires_at: '2026-08-31', amount: 5000000, discount_rate: 20, final_amount: 4000000, is_paid: true, status: 'active',  account_count: 6,  renewal_count: 0 },
    { id: IDS.CTR(6), tenant_id: T, company_id: IDS.COMP(6), product_id: IDS.PROD2, assigned_user_id: IDS.ADMIN, contract_no: 'CT-2025-0006', started_at: '2025-10-01', expires_at: '2026-09-30', amount: 2400000, discount_rate: 0,  final_amount: 2400000, is_paid: true, status: 'active',  account_count: 4,  renewal_count: 1 },
    { id: IDS.CTR(7), tenant_id: T, company_id: IDS.COMP(7), product_id: IDS.PROD1, assigned_user_id: IDS.USER4, contract_no: 'CT-2023-0012', started_at: '2023-11-01', expires_at: '2024-10-31', amount: 5000000, discount_rate: 0,  final_amount: 5000000, is_paid: true, status: 'expired', account_count: 10, renewal_count: 1 },
    { id: IDS.CTR(8), tenant_id: T, company_id: IDS.COMP(8), product_id: IDS.PROD3, assigned_user_id: IDS.USER2, contract_no: 'CT-2026-0001', started_at: '2026-01-01', expires_at: '2026-12-31', amount: 1800000, discount_rate: 0,  final_amount: 1800000, is_paid: true, status: 'active',  account_count: 2,  renewal_count: 0 },
  ])

  await insert('renewals', [
    { id: IDS.REN(1), tenant_id: T, contract_id: IDS.CTR(1), company_id: IDS.COMP(1), assigned_user_id: IDS.USER2, status: 'negotiating', risk_level: 'high',   risk_score: 75, contract_expires_at: '2026-05-31', target_renewal_at: '2026-05-25', memo: '가격 인상 협의 중' },
    { id: IDS.REN(2), tenant_id: T, contract_id: IDS.CTR(2), company_id: IDS.COMP(2), assigned_user_id: IDS.USER2, status: 'contacted',   risk_level: 'low',    risk_score: 20, contract_expires_at: '2026-06-30', target_renewal_at: '2026-06-15' },
    { id: IDS.REN(3), tenant_id: T, contract_id: IDS.CTR(3), company_id: IDS.COMP(3), assigned_user_id: IDS.USER4, status: 'pending',     risk_level: 'medium', risk_score: 45, contract_expires_at: '2026-07-31' },
    { id: IDS.REN(4), tenant_id: T, contract_id: IDS.CTR(4), company_id: IDS.COMP(4), assigned_user_id: IDS.USER4, status: 'contacted',   risk_level: 'low',    risk_score: 15, contract_expires_at: '2026-06-30', target_renewal_at: '2026-06-15' },
    { id: IDS.REN(5), tenant_id: T, contract_id: IDS.CTR(5), company_id: IDS.COMP(5), assigned_user_id: IDS.USER2, status: 'pending',     risk_level: 'high',   risk_score: 80, contract_expires_at: '2026-08-31', memo: '담당자 교체로 관계 재구축 필요' },
    { id: IDS.REN(6), tenant_id: T, contract_id: IDS.CTR(6), company_id: IDS.COMP(6), assigned_user_id: IDS.ADMIN, status: 'negotiating', risk_level: 'medium', risk_score: 40, contract_expires_at: '2026-09-30' },
    { id: IDS.REN(7), tenant_id: T, contract_id: IDS.CTR(7), company_id: IDS.COMP(7), assigned_user_id: IDS.USER4, status: 'lost',        risk_level: 'high',   risk_score: 95, contract_expires_at: '2024-10-31', result: 'churned', lost_reason: '경쟁사 전환' },
    { id: IDS.REN(8), tenant_id: T, contract_id: IDS.CTR(8), company_id: IDS.COMP(8), assigned_user_id: IDS.USER2, status: 'pending',     risk_level: 'low',    risk_score: 10, contract_expires_at: '2026-12-31' },
  ])

  await insert('activities', [
    { id: IDS.ACT(1),  tenant_id: T, company_id: IDS.COMP(1), contact_id: IDS.CONT(1), user_id: IDS.USER2, type: 'call',  activity_at: daysFromNow(-1), call_result: 'connected', call_duration: 25, summary: '갱신 조건 논의. 가격 10% 인상 제안에 검토 필요', next_action: '견적서 발송', next_action_at: daysFromNow(2) },
    { id: IDS.ACT(2),  tenant_id: T, company_id: IDS.COMP(1), contact_id: IDS.CONT(2), user_id: IDS.USER2, type: 'visit', activity_at: daysFromNow(-3), visit_purpose: 'proposal',  summary: '이사님 대면 미팅. 비용 부담 논의', next_action: '결재선 확인', next_action_at: daysFromNow(5) },
    { id: IDS.ACT(3),  tenant_id: T, company_id: IDS.COMP(2), contact_id: IDS.CONT(3), user_id: IDS.USER2, type: 'call',  activity_at: daysFromNow(-2), call_result: 'connected', call_duration: 15, summary: '갱신 의사 확인. 긍정적 반응', next_action: '계약서 발송', next_action_at: daysFromNow(3) },
    { id: IDS.ACT(4),  tenant_id: T, company_id: IDS.COMP(3), contact_id: IDS.CONT(4), user_id: IDS.USER4, type: 'email', activity_at: daysFromNow(-5), summary: '갱신 안내 이메일 발송' },
    { id: IDS.ACT(5),  tenant_id: T, company_id: IDS.COMP(4), contact_id: IDS.CONT(5), user_id: IDS.USER4, type: 'call',  activity_at: daysFromNow(0),  call_result: 'connected', call_duration: 30, summary: '장기 거래 감사 및 갱신 협의. 긍정적' },
    { id: IDS.ACT(6),  tenant_id: T, company_id: IDS.COMP(5), contact_id: IDS.CONT(6), user_id: IDS.USER2, type: 'call',  activity_at: daysFromNow(-7), call_result: 'no_answer',  summary: '부재중. 문자 발송' },
    { id: IDS.ACT(7),  tenant_id: T, company_id: IDS.COMP(6), contact_id: null,          user_id: IDS.ADMIN, type: 'visit', activity_at: daysFromNow(-4), visit_purpose: 'followup',  summary: '분기 방문. 신규 기능 데모 진행' },
    { id: IDS.ACT(8),  tenant_id: T, company_id: IDS.COMP(1), contact_id: IDS.CONT(1), user_id: IDS.USER2, type: 'call',  activity_at: daysFromNow(0),  call_result: 'connected', call_duration: 10, summary: '견적서 수신 확인 통화' },
    { id: IDS.ACT(9),  tenant_id: T, company_id: IDS.COMP(2), contact_id: IDS.CONT(3), user_id: IDS.USER2, type: 'sms',   activity_at: daysFromNow(-1), summary: '갱신 일정 확인 문자' },
    { id: IDS.ACT(10), tenant_id: T, company_id: IDS.COMP(8), contact_id: null,          user_id: IDS.USER2, type: 'email', activity_at: daysFromNow(-6), summary: '신년 인사 및 서비스 업데이트 안내' },
  ])

  await insert('tasks', [
    { id: IDS.TASK(1), tenant_id: T, assigned_user_id: IDS.USER2, company_id: IDS.COMP(1), renewal_id: IDS.REN(1), title: '삼성SDS 갱신 견적서 발송',       type: 'email',   priority: 'high',   status: 'todo',        due_at: daysFromNow(2) },
    { id: IDS.TASK(2), tenant_id: T, assigned_user_id: IDS.USER2, company_id: IDS.COMP(1), renewal_id: IDS.REN(1), title: '삼성SDS 계약 조건 미팅 일정',     type: 'call',    priority: 'high',   status: 'in_progress', due_at: daysFromNow(1) },
    { id: IDS.TASK(3), tenant_id: T, assigned_user_id: IDS.USER2, company_id: IDS.COMP(2), renewal_id: IDS.REN(2), title: '카카오엔터프라이즈 계약서 발송',  type: 'email',   priority: 'medium', status: 'todo',        due_at: daysFromNow(3) },
    { id: IDS.TASK(4), tenant_id: T, assigned_user_id: IDS.USER4, company_id: IDS.COMP(3), renewal_id: IDS.REN(3), title: '현대오토에버 갱신 의향 확인',     type: 'call',    priority: 'medium', status: 'todo',        due_at: daysFromNow(0) },
    { id: IDS.TASK(5), tenant_id: T, assigned_user_id: IDS.USER4, company_id: IDS.COMP(4), renewal_id: IDS.REN(4), title: 'LG CNS 계약 갱신 완료 처리',     type: 'renewal', priority: 'high',   status: 'in_progress', due_at: daysFromNow(-1) },
    { id: IDS.TASK(6), tenant_id: T, assigned_user_id: IDS.USER2, company_id: IDS.COMP(5), renewal_id: IDS.REN(5), title: '롯데정보통신 신규 담당자 방문',   type: 'visit',   priority: 'high',   status: 'todo',        due_at: daysFromNow(7) },
    { id: IDS.TASK(7), tenant_id: T, assigned_user_id: IDS.ADMIN, company_id: IDS.COMP(6), renewal_id: IDS.REN(6), title: 'SKT 갱신 협상 최종안 정리',      type: 'renewal', priority: 'medium', status: 'todo',        due_at: daysFromNow(5) },
    { id: IDS.TASK(8), tenant_id: T, assigned_user_id: IDS.USER2, company_id: IDS.COMP(1),                         title: '삼성SDS 월간 리포트 작성',       type: 'manual',  priority: 'low',    status: 'todo',        due_at: daysFromNow(10) },
    { id: IDS.TASK(9), tenant_id: T, assigned_user_id: IDS.USER4, company_id: IDS.COMP(3),                         title: '현대오토에버 신규 모듈 제안서',  type: 'manual',  priority: 'medium', status: 'todo',        due_at: daysFromNow(14) },
    { id: IDS.TASK(10),tenant_id: T, assigned_user_id: IDS.USER2, company_id: IDS.COMP(5),                         title: '롯데 부재중 follow-up 문자',     type: 'call',    priority: 'high',   status: 'done',        due_at: daysFromNow(-3), done_at: daysFromNow(-3) },
  ])

  await insert('message_templates', [
    { id: IDS.TMPL(1), tenant_id: T, name: '갱신 안내 이메일 (기본)', channel: 'email', category: 'renewal',  subject: '[{company_name}] 계약 갱신 안내',      content: '안녕하세요 {contact_name}님,\n\n{product_name} 계약이 {expires_at}에 만료됩니다.\n\n갱신 상담을 원하시면 연락 부탁드립니다.\n\n감사합니다.',                          variables: ['company_name','contact_name','product_name','expires_at'], is_active: true },
    { id: IDS.TMPL(2), tenant_id: T, name: '갱신 안내 SMS',           channel: 'sms',   category: 'renewal',  content: '[{company_name}] {expires_at} 계약 만료 예정. 갱신 문의: 02-0000-0000',                                                                             variables: ['company_name','expires_at'],                               is_active: true },
    { id: IDS.TMPL(3), tenant_id: T, name: '첫 인사 이메일',          channel: 'email', category: 'intro',    subject: '안녕하세요 {contact_name}님, 담당자 인사드립니다', content: '안녕하세요 {contact_name}님,\n\n저는 귀사 담당자 {user_name}입니다.\n앞으로 잘 부탁드립니다!',                                               variables: ['contact_name','user_name'],                                is_active: true },
    { id: IDS.TMPL(4), tenant_id: T, name: '방문 일정 확인 카카오',   channel: 'kakao', category: 'followup', content: '안녕하세요 {contact_name}님! {visit_date} {visit_time} 방문 일정 확인드립니다 :)',                                                                    variables: ['contact_name','visit_date','visit_time'],                  is_active: true },
  ])

  console.log('\n✅ 시드 데이터 삽입 완료!')
  console.log(`   TENANT_ID: ${T}`)
}

seed().catch(console.error)
