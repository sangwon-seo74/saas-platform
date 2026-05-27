# revenue-retention-os 도메인 지침

## 도메인 요약
B2B 고객 갱신·리텐션 운영 SaaS (고객사 / 계약 / 갱신 파이프라인 / 영업활동 / 업무).
DB 스키마: `rros` (도메인 테이블), 공통 인프라는 `core` 스키마.

## 핵심 테이블 / 역할
- 핵심 테이블: companies, contacts, contracts, contract_accounts, products,
  renewals, activities, tasks, messages, message_templates, api_integrations
- 역할·권한: admin / manager / sales.
  RLS = 테넌트 격리(`fn_my_tenant_id()`) + sales는 본인 담당 데이터만. 슈퍼어드민은 service role로 RLS 우회.

## 외부 연동 현황
- SMS / 카카오알림톡 / Resend 이메일 — 구현 완료. core-client 경유. 자격증명은 `platform_settings` DB (슈퍼어드민 관리).
- PG 결제 — 미구현 (스키마만 존재). 연동 추가 시 core 경유로 구현.

## 스키마 (SSOT)
- 도메인(`rros`) 테이블 / RLS / cron / 연동: [./SCHEMA.md](./SCHEMA.md)
- 공통(`core`) 스키마: [../../core-api/SCHEMA.md](../../core-api/SCHEMA.md)

@AGENTS.md
