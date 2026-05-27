# rros 스키마 (revenue-retention-os 도메인)

> 갱신(Renewal) 중심 영업관리 SaaS 도메인 테이블의 **현재 상태** 단일 출처(SSOT).
> 스키마 변경은 Supabase SQL Editor에서 적용하고 이 문서를 함께 갱신한다.
> 공통 인프라(테넌트/사용자/구독/인보이스 등)는 `core` 스키마 → [../../core-api/SCHEMA.md](../../core-api/SCHEMA.md).

## 테이블 (12)

| 테이블 | 역할 | RLS |
|--------|------|-----|
| `companies` | 고객사 | `companies_tenant_isolation`(admin/manager), `companies_sales_own`(sales 담당만) |
| `contacts` | 고객사 담당자 (`business_card_url` 컬럼 포함) | `contacts_tenant_isolation` / `contacts_sales_own` |
| `contracts` | 판매 계약 | `contracts_tenant_isolation` / `contracts_sales_own` |
| `contract_accounts` | 계약별 계정(라이선스) | `contract_accounts_tenant`(admin/manager 또는 담당 계약의 sales) |
| `products` | 판매 제품 | `products_read`(전체), `products_write`/`products_update`(admin) |
| `renewals` | 갱신 파이프라인 | `renewals_tenant_isolation` / `renewals_sales_own` |
| `activities` | 영업 활동(통화/방문/메시지) | `activities_tenant_isolation` / `activities_sales_own` |
| `tasks` | 업무(자동 생성 포함) | `tasks_tenant_isolation` / `tasks_sales_own` |
| `messages` | 발송된 메시지 이력 | `messages_tenant_isolation` / `messages_sales_own` |
| `message_templates` | 메시지 템플릿(이메일/SMS/카카오) | `message_templates_read`(전체), `write`/`update`/`delete`(admin) |
| `api_integrations` | 테넌트별 외부 API 연동 설정 | `api_integrations_admin`(admin) |
| `user_preferences` | 사용자별 조회 범위(`view_scope`: own\|all) | `user_preferences_admin_manage`(admin/manager 전체), `user_preferences_own_read`(본인 읽기) |

## 역할 · RLS 패턴
- 역할: `admin` / `manager` / `sales`. (슈퍼어드민은 환경변수 화이트리스트 → service role로 RLS 우회)
- 테넌트 격리: `tenant_id = fn_my_tenant_id()` — 테넌트 간 접근 원천 차단.
- 역할 분기: admin/manager는 테넌트 전체, sales는 본인 담당(`assigned_user_id`/`user_id = auth.uid()`)만.
- 공통 헬퍼 `fn_my_tenant_id()` / `fn_my_role()` 정의는 core 스키마 문서 참조.

## 도메인 트리거 / 프로시저
| 객체 | 시점 | 동작 |
|------|------|------|
| `trg_contract_create_renewal` | 계약 INSERT | `renewals` 자동 생성 |
| `pr_refresh_renewal_risk` | cron 매일 02:00 | 갱신 risk_level/risk_score 갱신 |
| `pr_create_renewal_tasks` | cron 매일 02:30 | D-30/D-14/D-7 갱신 알림 Task 자동 생성 |
| `expire-contracts` (cron) | 매일 01:00 | 만료 계약 `status='expired'` 처리 |

> ⚠️ `pr_refresh_renewal_risk`, `pr_create_renewal_tasks`의 **본문 정의는 라이브 Supabase DB에만 존재**한다(저장소에 DDL 없음). 수정 시 DB에서 본문을 받아와 작업할 것.

## Supabase Storage 버킷

| 버킷 | 공개 여부 | 경로 패턴 | 용도 |
|------|----------|-----------|------|
| `rros-business-cards` | private | `{tenant_id}/{contact_id}.{ext}` | 명함 이미지 영구 보관 |

> ⚠️ 버킷은 Supabase 대시보드 Storage > New bucket 에서 수동 생성 필요.
> RLS: `(storage.foldername(name))[1] = fn_my_tenant_id()::text` 패턴으로 tenant 격리.

## 외부 연동 현황
- Resend 이메일 — **구현 완료**. core-api `POST /v1/notify/email` → core-client `sendEmail()`. 자격증명은 `platform_settings` DB 및 `RESEND_API_KEY` 환경변수.
- SMS (Solapi) — **구현 완료**. core-api `POST /v1/notify/sms` → core-client `sendSms()`. 자격증명은 `platform_settings` DB.
- 카카오 알림톡 (Solapi ATA) — **구현 완료**. core-api `POST /v1/notify/kakao` → core-client `sendKakao()`. 자격증명은 `platform_settings` DB.
- PG 결제 — **미구현**. `pg_payment_id`/`pg_customer_id`/`pg_sub_id` 필드·인보이스 스키마만 존재.
- 연동 추가 시 앱에서 재구현하지 말고 core(core-client) 경유로 구현한다.
