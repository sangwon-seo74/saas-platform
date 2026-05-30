# core 스키마 (공통 인프라)

> SaaS 플랫폼 공통 테이블의 **현재 상태** 단일 출처(SSOT).
> 스키마 변경은 Supabase SQL Editor에서 적용하고 이 문서를 함께 갱신한다.
> (마이그레이션 전환 이력은 보관하지 않음 — 현재 상태만 기술)

## 테이블 (13)

| 테이블 | 역할 | RLS |
|--------|------|-----|
| `platform_settings` | 플랫폼 전역 key-value 설정 (SMS/카카오/이메일 자격증명 등) | 없음 (service role 전용) |
| `tenants` | SaaS 테넌트(회사) 단위 레코드 | 없음 (service role 전용) |
| `plans` | SaaS 요금제 정의 | 없음 (쓰기 service role, 읽기 공개) |
| `users` | 테넌트 소속 사용자 | `users_read`(테넌트 내 전체), `users_write`/`users_update`(admin 또는 본인) |
| `teams` | 사용자 팀 그룹 | `teams_read`(테넌트 내), `teams_write`(admin) |
| `announcements` | 시스템 공지/점검 게시 | 없음 (service role) |
| `tenant_notes` | 슈퍼어드민 운영 메모 | 없음 (service role) |
| `usage_snapshots` | 일별 테넌트 사용량 스냅샷 | 없음 (service role) |
| `tenant_subscriptions` | 테넌트 구독 상태 | `tenant_subscriptions_admin`(admin 읽기) |
| `tenant_invoices` | 테넌트 결제 인보이스 | `tenant_invoices_admin`(admin 읽기) |
| `invite_tokens` | 초대 토큰 (사용 후 삭제) | 없음 (service role) |
| `team_invite_links` | Slack 스타일 팀 초대 링크 (다회 사용) | `team_invite_links_tenant_isolation` |
| `audit_logs` | 로그인 접속 감사 로그 | 없음 (service role) |

## RLS 공통 헬퍼 함수 (core + 모든 도메인 스키마 공용)
- `fn_my_tenant_id()` — 현재 JWT의 tenant_id. 모든 테넌트 격리 정책의 기준.
- `fn_my_role()` — 현재 사용자 역할(admin/manager/sales). 역할 분기 정책의 기준.

## Auth 트리거 (auth.users 대상, SECURITY DEFINER · search_path 고정)
- `fn_handle_new_auth_user` — 초대 수락 후 Auth 가입 시 `core.users` 동기화 INSERT.
- `fn_update_last_login` — 로그인 시 `core.users.last_login_at` 갱신.

## pg_cron 작업 (core 대상)
| Job | 주기 | 동작 |
|-----|------|------|
| `daily-usage-snapshot` | 매일 00:00 | 테넌트별 사용량 스냅샷 저장 (`usage_snapshots`; rros.companies/messages 참조) |
| `retry-failed-invoices` | 매시 00분 | 실패 인보이스 자동 재시도 (최대 3회) |
| `monthly-invoice-generation` | 매월 1일 01:00 | 활성 구독 인보이스 자동 발행 |
| `deactivate-inactive-users` | 매일 02:00 | 6개월 미로그인 사용자 비활성화 |
| `cleanup-expired-invite-tokens` | 매일 03:00 | 만료 초대 토큰 삭제 |
| `cleanup-old-audit-logs` | 매일 04:00 | 6개월 지난 감사 로그 삭제 |

## 접근 규칙
- `core.*`는 core-api를 통해서만 수정한다. 도메인 앱/프론트의 직접 INSERT/UPDATE 금지. (루트 CLAUDE.md 절대 규칙 2)
- 공개 읽기(`announcements/active`)와 슈퍼어드민 작업은 `createServiceClient()`(service role)로 RLS를 우회한다.
