# API Route 인벤토리 — revenue-retention-os

> 분석 기준일: 2026-05-25  
> 소스 경로: `apps/revenue-retention-os/src/app/api/`

---

## 분류 기준

| 분류 | 설명 |
|------|------|
| **공통** | 인증, 초대, 감사 로그 등 도메인에 무관한 공통 인프라 |
| **도메인** | 비즈니스 핵심 데이터 CRUD (고객사/계약/갱신/활동/업무) |
| **집계/조회** | 읽기 전용 집계·분석 (대시보드, 리포트) |
| **설정** | 테넌트 내부 설정 (사용자/팀/제품/템플릿/구독) |
| **슈퍼어드민** | 플랫폼 전체 운영 (테넌트 관리, 결제, 공지) |

---

## API Route 목록

### 공통 (인증/공지)

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/auth/accept-invite` | GET | 초대 토큰 유효성 확인 (초대 페이지 진입 시) | 공통 |
| `/api/auth/accept-invite` | POST | 초대 토큰 검증 후 Supabase Auth 계정 생성 | 공통 |
| `/api/auth/invite` | POST | 사용자 초대 이메일 발송 (admin/manager 전용) | 공통 |
| `/api/auth/log-access` | POST | 로그인 성공/실패를 audit_logs에 기록 + last_login_at 갱신 | 공통 |
| `/api/announcements/active` | GET | 현재 게시 중인 공지/점검 반환 (인증 불필요) | 공통 |

### 도메인 — 고객사

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/companies` | GET | 고객사 목록 (필터·페이지네이션, 활성 계약 정보 포함) | 도메인 |
| `/api/companies` | POST | 고객사 생성 (사업자번호 중복 체크) | 도메인 |
| `/api/companies/[id]` | GET | 고객사 상세 + 담당자/계약/활동/업무/메시지 연관 데이터 | 도메인 |
| `/api/companies/[id]` | PATCH | 고객사 정보 수정 (사업자번호 중복 재검증) | 도메인 |
| `/api/companies/[id]` | DELETE | 고객사 소프트 딜리트 (활성 계약 있으면 거부, admin 전용) | 도메인 |

### 도메인 — 담당자

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/contacts` | GET | 담당자 목록 (company_id 필터 지원) | 도메인 |
| `/api/contacts` | POST | 담당자 등록 | 도메인 |
| `/api/contacts/[id]` | PATCH | 담당자 정보 수정 | 도메인 |
| `/api/contacts/[id]` | DELETE | 담당자 삭제 | 도메인 |

### 도메인 — 계약

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/contracts` | GET | 계약 목록 (만료 임박 필터, 결제 상태 필터 등) | 도메인 |
| `/api/contracts` | POST | 계약 생성 (DB 트리거로 renewals 자동 생성) | 도메인 |
| `/api/contracts/[id]` | GET | 계약 상세 + 계정 목록 + 갱신 이력 | 도메인 |
| `/api/contracts/[id]` | PATCH | 계약 수정 (결제 완료 처리 시 paid_at 자동 설정) | 도메인 |
| `/api/contracts/[id]` | DELETE | 활성 계약은 cancelled 처리, 비활성은 삭제 (admin/manager) | 도메인 |

### 도메인 — 갱신 파이프라인

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/renewals` | GET | 갱신 목록 (만료일 범위, 위험도, 상태 필터) | 도메인 |
| `/api/renewals` | POST | 갱신 레코드 수동 생성 | 도메인 |
| `/api/renewals/[id]` | GET | 갱신 상세 + 연관 활동 이력 | 도메인 |
| `/api/renewals/[id]` | PATCH | 갱신 상태 업데이트 / 결과 처리 (won/lost 시 계약 연동) | 도메인 |
| `/api/renewals/[id]` | DELETE | 미완료 갱신 삭제 (admin 전용) | 도메인 |

### 도메인 — 영업 활동

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/activities` | GET | 활동 목록 (유형/회사/담당자/날짜 필터, 역할별 접근 제한) | 도메인 |
| `/api/activities` | POST | 활동 기록 생성 (next_action_at 있으면 업무 자동 생성) | 도메인 |
| `/api/activities/[id]` | GET | 활동 상세 | 도메인 |
| `/api/activities/[id]` | PATCH | 활동 수정 (sales는 본인 활동만, next_action_at 변경 시 연결 업무 동기화) | 도메인 |
| `/api/activities/[id]` | DELETE | 활동 삭제 + 연결된 자동 업무도 삭제 | 도메인 |

### 도메인 — 업무(Task)

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/tasks` | GET | 업무 목록 (내 업무/팀 업무, 지연 필터, 완료일 범위) | 도메인 |
| `/api/tasks` | POST | 업무 수동 생성 | 도메인 |
| `/api/tasks/[id]` | GET | 업무 상세 | 도메인 |
| `/api/tasks/[id]` | PATCH | 업무 수정 (done 상태 시 done_at 자동 설정) | 도메인 |
| `/api/tasks/[id]` | DELETE | 업무 삭제 | 도메인 |

### 집계/조회 — 대시보드 및 리포트

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/dashboard` | GET | 홈 대시보드 요약 (집계 통계 + 임박 갱신 + 오늘 업무 + 최근 활동) | 집계/조회 |
| `/api/reports/arr-movement` | GET | 월별 ARR 순변동 (재계약/업셀/다운셀/이탈 분해, NRR 계산) | 집계/조회 |
| `/api/reports/forecast` | GET | 90일 갱신 파이프라인 예측 (D-7/14/30/60/90 버킷) | 집계/조회 |
| `/api/reports/performance` | GET | 담당자별 월간 갱신 성과 (갱신율/금액/통화·방문 횟수) | 집계/조회 |
| `/api/reports/product-rate` | GET | 상품별 갱신율 분석 | 집계/조회 |
| `/api/reports/renewal-rate` | GET | 월별 갱신율 추이 + 이탈 사유 집계 | 집계/조회 |
| `/api/reports/risk-dashboard` | GET | 진행 중 갱신 건 위험도 현황 스냅샷 (high/medium/low) | 집계/조회 |
| `/api/reports/years` | GET | 리포트 선택 가능 연도 목록 (완료 갱신 기준) | 집계/조회 |

### 설정 (Settings)

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/settings/tenant` | GET | 현재 테넌트 기본 정보 + 고객사/사용자/메시지 통계 | 설정 |
| `/api/settings/tenant` | PATCH | 테넌트 이름/대표/연락처/주소 수정 (admin 전용) | 설정 |
| `/api/settings/users` | GET | 테넌트 사용자 목록 + 플랜 한도 | 설정 |
| `/api/settings/users` | POST | 사용자 초대 (플랜 한도 체크, 이메일 발송) | 설정 |
| `/api/settings/users/[id]` | GET | 사용자 상세 + 담당 고객사/계약 수 | 설정 |
| `/api/settings/users/[id]` | PATCH | 사용자 역할/팀/활성화 수정 | 설정 |
| `/api/settings/users/[id]` | DELETE | 사용자 소프트 딜리트 + 담당 데이터 재배정 (admin) | 설정 |
| `/api/settings/teams` | GET | 팀 목록 (멤버 수, 매니저명 포함) | 설정 |
| `/api/settings/teams` | POST | 팀 생성 (admin) | 설정 |
| `/api/settings/teams/[id]` | PATCH | 팀 이름 수정 (admin) | 설정 |
| `/api/settings/teams/[id]` | DELETE | 팀 삭제 + 소속 사용자 team_id null 처리 (admin) | 설정 |
| `/api/settings/products` | GET | 제품 목록 (활성 계약 수 포함) | 설정 |
| `/api/settings/products` | POST | 제품 생성 (admin) | 설정 |
| `/api/settings/products/[id]` | GET | 제품 상세 | 설정 |
| `/api/settings/products/[id]` | PATCH | 제품 수정 (admin) | 설정 |
| `/api/settings/products/[id]` | DELETE | 제품 삭제 또는 소프트 비활성화 (admin) | 설정 |
| `/api/settings/templates` | GET | 메시지 템플릿 목록 (채널/카테고리 필터) | 설정 |
| `/api/settings/templates` | POST | 메시지 템플릿 생성 (admin) | 설정 |
| `/api/settings/templates/[id]` | GET | 템플릿 상세 | 설정 |
| `/api/settings/templates/[id]` | PATCH | 템플릿 수정 (variables 자동 재추출) | 설정 |
| `/api/settings/templates/[id]` | DELETE | 발송 이력 있으면 소프트 딜리트 (admin) | 설정 |
| `/api/settings/subscription` | GET | 현재 테넌트 구독/플랜 정보 + 사용량 + 전환 가능 플랜 목록 (admin) | 설정 |
| `/api/settings/invoices` | GET | 현재 테넌트 결제 인보이스 이력 (admin) | 설정 |

### 슈퍼어드민 (Super-Admin)

| 경로 | 메서드 | 역할 요약 | 분류 |
|------|--------|-----------|------|
| `/api/super-admin/dashboard` | GET | 운영 대시보드 (MRR/ARR, 테넌트 수, 미납/만료 임박, 이탈 사유, MRR 추이) | 슈퍼어드민 |
| `/api/super-admin/tenants` | GET | 전체 테넌트 목록 (구독/플랜/사용자수/MRR 포함) | 슈퍼어드민 |
| `/api/super-admin/tenants` | POST | 신규 테넌트 등록 + 체험 구독 생성 + 관리자 초대 발송 | 슈퍼어드민 |
| `/api/super-admin/tenants/[id]` | GET | 테넌트 상세 (기본정보/구독/사용자/인보이스/사용량) | 슈퍼어드민 |
| `/api/super-admin/tenants/[id]` | PATCH | 테넌트 정보/활성화 상태 수정 | 슈퍼어드민 |
| `/api/super-admin/tenants/[id]/subscription` | PATCH | 테넌트 구독 변경 (플랜/주기/상태/만료일) | 슈퍼어드민 |
| `/api/super-admin/tenants/[id]/notes` | GET | 테넌트 운영 메모 목록 | 슈퍼어드민 |
| `/api/super-admin/tenants/[id]/notes` | POST | 테넌트 운영 메모 추가 | 슈퍼어드민 |
| `/api/super-admin/tenants/[id]/resend-invite` | POST | 테넌트 관리자에게 초대 메일 재발송 | 슈퍼어드민 |
| `/api/super-admin/tenants/[id]/reset-password` | POST | 테넌트 관리자 임시 비밀번호 강제 발급 | 슈퍼어드민 |
| `/api/super-admin/subscriptions` | GET | 전체 구독 목록 (상태 필터, MRR 계산 포함) | 슈퍼어드민 |
| `/api/super-admin/invoices` | GET | 전체 인보이스 목록 (테넌트/상태 필터) | 슈퍼어드민 |
| `/api/super-admin/invoices/[id]` | GET | 인보이스 상세 (세금계산서/크레딧 정보 포함) | 슈퍼어드민 |
| `/api/super-admin/invoices/[id]` | PATCH | 인보이스 결제 상태/메모/세금계산서 수동 처리 | 슈퍼어드민 |
| `/api/super-admin/plans` | GET | 요금제 목록 + 구독자 수 + MRR 기여 | 슈퍼어드민 |
| `/api/super-admin/plans/[id]` | PATCH | 요금제 가격/제한 수정 | 슈퍼어드민 |
| `/api/super-admin/announcements` | GET | 공지/점검 목록 | 슈퍼어드민 |
| `/api/super-admin/announcements` | POST | 공지/점검 생성 | 슈퍼어드민 |
| `/api/super-admin/announcements/[id]` | PATCH | 공지 수정 / 활성 토글 | 슈퍼어드민 |
| `/api/super-admin/announcements/[id]` | DELETE | 공지 삭제 | 슈퍼어드민 |
| `/api/super-admin/impersonate` | POST | 특정 사용자 대리 로그인용 magic link 생성 | 슈퍼어드민 |
| `/api/super-admin/notifications` | GET | 즉각 조치 필요 알림 (미납/실패 인보이스, 만료 임박, 로그인 실패) | 슈퍼어드민 |
| `/api/super-admin/notes/[id]` | DELETE | 테넌트 운영 메모 삭제 | 슈퍼어드민 |
| `/api/super-admin/search` | GET | 글로벌 검색 (테넌트/사용자/인보이스 통합) | 슈퍼어드민 |
| `/api/super-admin/system/logs` | GET | 접속 감사 로그 목록 (audit_logs) | 슈퍼어드민 |
| `/api/super-admin/users/[id]` | PATCH | 사용자 역할/활성화 변경 + 선택적 강제 로그아웃 | 슈퍼어드민 |

---

## 외부 서비스

| 서비스 | 용도 | 상태 |
|--------|------|------|
| **Supabase Auth** | 사용자 인증, 세션 관리, Auth Admin API (계정 생성/비밀번호/magic link) | 사용 중 |
| **Supabase Database (PostgreSQL)** | 모든 도메인 데이터 저장소, RLS 정책, pg_cron 스케줄 | 사용 중 |
| **이메일 (Resend)** | 초대 이메일 발송 (`RESEND_API_KEY` 참조) | **미구현** — `lib/invite.ts`에서 코드가 주석 처리됨, 현재는 console.log만 |
| **SMS** | 메시지 채널(`sms`) 지원 예정 | **미구현** — DB 스키마만 존재, 발송 코드 없음 |
| **카카오알림톡** | 메시지 채널(`kakao`) 지원 예정 | **미구현** — DB 스키마만 존재, 발송 코드 없음 |
| **PG (결제 게이트웨이)** | 구독 결제 (`pg_payment_id`, `pg_customer_id`, `pg_sub_id` 필드 존재) | **미구현** — 필드·인보이스 스키마는 있으나 실제 결제 연동 코드 없음 |

---

## Supabase 테이블 목록 (public 스키마)

### TypeScript 타입 파일(`database.types.ts`) 기준 — 17개

| 테이블 | 역할 | RLS 정책 |
|--------|------|----------|
| `tenants` | SaaS 테넌트(회사) 단위 레코드 | 없음 (service role로만 접근) |
| `users` | 테넌트 소속 사용자 | ✅ `users_read` (테넌트 내 전체), `users_write`/`users_update` (admin 또는 본인) |
| `teams` | 사용자 팀 그룹 | ✅ `teams_read` (테넌트 내 전체), `teams_write` (admin) |
| `companies` | 고객사 | ✅ `companies_tenant_isolation` (admin/manager), `companies_sales_own` (sales, 담당 고객사만) |
| `contacts` | 고객사 담당자 | ✅ `contacts_tenant_isolation` / `contacts_sales_own` |
| `contracts` | 판매 계약 | ✅ `contracts_tenant_isolation` / `contracts_sales_own` |
| `contract_accounts` | 계약별 계정(라이선스) | ✅ `contract_accounts_tenant` (admin/manager 또는 담당 계약의 sales) |
| `products` | 판매 제품 | ✅ `products_read` (전체), `products_write`/`products_update` (admin) |
| `renewals` | 갱신 파이프라인 | ✅ `renewals_tenant_isolation` / `renewals_sales_own` |
| `activities` | 영업 활동 기록 (통화/방문/메시지) | ✅ `activities_tenant_isolation` / `activities_sales_own` |
| `tasks` | 업무 (자동 생성 포함) | ✅ `tasks_tenant_isolation` / `tasks_sales_own` |
| `messages` | 발송된 메시지 이력 | ✅ `messages_tenant_isolation` / `messages_sales_own` |
| `message_templates` | 메시지 템플릿 (이메일/SMS/카카오) | ✅ `message_templates_read` (전체), `write`/`update`/`delete` (admin) |
| `api_integrations` | 테넌트별 외부 API 연동 설정 | ✅ `api_integrations_admin` (admin) |
| `plans` | SaaS 요금제 정의 | 없음 (service role로만 쓰기, 읽기는 공개) |
| `tenant_subscriptions` | 테넌트 구독 상태 | ✅ `tenant_subscriptions_admin` (admin 읽기) |
| `tenant_invoices` | 테넌트 결제 인보이스 | ✅ `tenant_invoices_admin` (admin 읽기) |

### 마이그레이션으로 추가된 테이블 — 5개

| 테이블 | 마이그레이션 파일 | 역할 | RLS 정책 |
|--------|-----------------|------|----------|
| `invite_tokens` | `20260521_invite_tokens.sql` | 초대 토큰 저장 (사용 후 삭제) | 없음 (service role) |
| `announcements` | `20260522_announcements.sql` | 시스템 공지/점검 게시 | 없음 (service role) |
| `audit_logs` | `20260522_audit_logs.sql` | 로그인 접속 감사 로그 | 없음 (service role) |
| `tenant_notes` | `20260522_roadmap_features.sql` | 슈퍼어드민 운영 메모 | 없음 (service role) |
| `usage_snapshots` | `20260522_roadmap_features.sql` | 일별 테넌트 사용량 스냅샷 | 없음 (service role) |

### RLS 운영 패턴 요약

- **테넌트 격리**: `tenant_id = fn_my_tenant_id()` — 테넌트 간 데이터 접근 원천 차단
- **역할 분기**: `fn_my_role() IN ('admin', 'manager')` vs `fn_my_role() = 'sales'`  
  sales는 본인 담당(`assigned_user_id = auth.uid()` 또는 `user_id = auth.uid()`) 데이터만 접근
- **슈퍼어드민**: `createServiceClient()` (service role key) 사용 → RLS 완전 우회
- **공개 읽기**: `announcements/active` 엔드포인트는 인증 없이 `createServiceClient()`로 조회

---

## pg_cron 스케줄 (DB 내부)

| Job 이름 | 주기 | 내용 |
|----------|------|------|
| `refresh-renewal-risk` | 매일 02:00 KST | 갱신 위험도 점수 일괄 갱신 |
| `create-renewal-tasks` | 매일 02:30 KST | D-30/D-14/D-7 갱신 알림 업무 자동 생성 |
| `expire-contracts` | 매일 01:00 KST | 만료된 계약 상태 `expired`로 자동 변경 |
| `daily-usage-snapshot` | 매일 00:00 KST | 테넌트별 일별 사용량 스냅샷 저장 |
| `deactivate-inactive-users` | 매일 02:00 KST | 6개월 미로그인 사용자 자동 비활성화 |
| `retry-failed-invoices` | 매시 00분 | 결제 실패 인보이스 자동 재시도 (최대 3회) |
| `monthly-invoice-generation` | 매월 1일 01:00 | 활성 구독에 대한 인보이스 자동 발행 |
