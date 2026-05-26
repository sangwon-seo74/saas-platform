# 프로젝트 공통 지침 (모든 AI 에이전트 공통 · 최우선 적용)

> 이 파일이 프로젝트 규칙의 단일 출처(SSOT)다. Claude Code는 `CLAUDE.md`가 이 파일을
> import하며, Claude 전용 보조 지침만 `CLAUDE.md`에 둔다. 같은 규칙을 두 파일에 중복 기재 금지.

## 프로젝트 개요
**SaaS Platform** — 다양한 B2B SaaS 제품을 단일 모노레포에서 개발·운영하는 플랫폼.
공통 인프라(인증/알림/결제)는 `core-api`에 집중하고 각 제품은 `apps/*` 아래 독립 Next.js 앱으로 운영한다.
단일 모노레포를 택한 이유는 공통 인프라 재사용과 배포·의존성 관리 일원화다.

### 플랫폼 구조 (앱별 배포 URL)

| 앱 | 역할 | 배포 URL | Vercel 프로젝트 |
|----|------|----------|-----------------|
| `apps/landing` | 플랫폼 마케팅 랜딩 페이지 | saas-platform.vercel.app | saas-platform |
| `apps/revenue-retention-os` | B2B 고객 갱신·리텐션 운영 SaaS | (별도 Vercel 프로젝트) | rros |
| `core-api/` | 공통 백엔드 API (FastAPI) | — | — |
| `packages/core-client/` | 공유 TypeScript 클라이언트 SDK | — | — |

> 새 SaaS 앱 추가 시: 이 표를 업데이트하고 `apps/landing/src/app/page.tsx` Solutions 섹션에 제품 카드를 추가한다.

## 절대 규칙 (협의 없이 위반 금지)
1. 공통 기능(회원가입/이메일/SMS/카카오톡/결제)은 각 SaaS 앱 안에서 재구현하지 않는다.
   반드시 core-api를 호출하거나 packages/core-client를 import한다.
2. DB 접근:
   - core.* 스키마는 core-api를 통해서만 수정한다. 프론트나 다른 도메인 코드의
     직접 INSERT/UPDATE 금지. *(이유: 감사 로그 단일화, 권한 집중화. 우회 시 접근 제어 구멍 발생)*
   - 각 도메인 스키마(rros 등)는 해당 앱에서만 수정한다. cross-domain import 금지.
     *(이유: 도메인 경계 보호. 타 도메인 스키마 직접 참조 시 결합도가 높아져 독립 배포 불가)*
3. 인증은 Supabase JWT를 신뢰의 단일 소스로 사용. core-api는 검증만 한다.
   *(이유: 인증 로직 분산 방지. 자체 세션·토큰을 별도로 발급하면 토큰 무효화·RLS 연동이 깨진다)*
4. 환경변수는 .env.example을 항상 동기화해서 커밋한다. 결제·외부 서비스 키
   (Stripe/Toss/PortOne/Resend 등)는 core-api 환경변수로만 두고 프론트 .env에 노출 금지.
5. 레이어 경계:
   - apps/* 는 UI와 자기 도메인 기능만 가진다.
   - packages/* 는 앱들이 공유하는 계약과 core-api 클라이언트(core-client)만 둔다.
     도메인 로직·UI는 두지 않는다.

## 행동 원칙
**계획 우선 (Plan First)**
- 구현 전에 변경 범위를 분석하고, 영향받는 디렉토리/API/DB/테스트 범위를 명시한다.
- 큰 작업은 Plan → Implement → Verify 순서로 진행한다.
- 작업을 **검증 가능한 성공 기준**으로 바꾼다(예: 버그→재현 테스트 작성 후 통과). 단위 테스트가
  없으면 type-check/lint/실행 확인으로 기준을 정한다.
- 다단계 작업은 `[단계] → 검증: [확인]` 형태로 단계별 기준을 적는다.

**추정 금지 (Ask, Don't Guess)**
- 요구사항·API 계약·DB 구조·비즈니스 규칙이 불명확하면 추정 구현하지 말고 질문한다.
- 존재하지 않는 파일/테이블/엔드포인트를 가정하지 않는다.
- 진행하더라도 핵심 **가정을 명시**한다(틀린 전제를 사용자가 바로잡을 수 있게).
- 해석이 둘 이상이면 임의로 고르지 말고 제시해 확인받는다.
- 더 단순한 방법이 있으면 제안하고, 근거가 있으면 요청에 반박한다.

**변경 최소화 (Minimal Change)**
- 요청 범위를 넘는 리팩토링·무관한 코드 스타일 변경 금지. 필요한 최소 변경으로 해결한다.
- 추측성 코드 금지: 단일 사용 코드의 추상화, 요청하지 않은 유연성·설정화, 일어날 수 없는
  시나리오용 에러 핸들링을 만들지 않는다.

**수술적 변경 (Surgical Changes)**
- 기존 코드 수정 시 기존 스타일을 따르고 무관한 코드는 건드리지 않는다.
- 내 변경이 만든 미사용 import/변수/함수만 제거한다. 기존의 무관한 dead code는 삭제하지 말고
  언급만 한다(삭제는 요청 시).
- 모든 변경 라인이 요청에 직결되는지 확인한다.

**근본 원인 우선 (Root Cause First)**
- 증상이 아니라 원인을 수정한다. 임시 workaround보다 root cause 해결을 우선한다.
- 에러 suppression 및 타입 우회(any / @ts-ignore / `# type: ignore`) 금지. (상세: 코드 컨벤션)

**완료 검증 (Verify Before Finish)** — 작업 완료 전 반드시:
1. 테스트 실행  2. lint / typecheck 실행  3. 변경 범위 재검토  4. 요구사항 충족 확인

**파일 규율 (File Discipline)**
- 기존 파일 수정이 가능하면 우선 수정한다. 새 파일 생성은 최후 수단으로 한다.
- 동일 책임의 파일 중복 생성 금지. utils/helper/common 파일 남발 금지.
- 예외: 신규 앱(도메인) 스캐폴딩 시 다량 파일 생성은 정상이다. "신규 도메인 생성 절차" 참조.

## 기술 스택 (이외 도입 시 사전 합의 필요)
- Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 + Alembic
- Frontend: Next.js 15 App Router + TypeScript (strict) + TailwindCSS
- DB: PostgreSQL 16 (Supabase)
- 패키지 매니저: pnpm (workspaces: apps/*, packages/*)
- 테스트: pytest (백엔드), Vitest + Playwright (프론트)
- 상태 관리: 서버 상태 → TanStack Query, 클라이언트 전역 상태 → Zustand.
  컴포넌트 로컬 상태는 useState. 셋 중 하나로 통일하고 혼용 금지.

## 코드 컨벤션
- Python: ruff + mypy strict. 함수 시그니처에 타입 힌트 필수. `# type: ignore` 우회 금지.
- TypeScript: strict 모드. `any` 및 `@ts-ignore` 금지. 외부 데이터는 zod로 파싱.
- 커밋: Conventional Commits (feat:, fix:, refactor:, docs:, test:)
- API 응답: { data, error } 형태로 통일. HTTP 상태 코드는 표준 준수.
- UI/디자인: 공통 디자인 정책 **DESIGN.md**를 따른다 (다크 기본, Pretendard, brand/dk 토큰,
  시맨틱 상태색, shadcn/ui). 임의 색·폰트·컴포넌트 스타일 도입 금지.

## 디렉토리 책임 & 네이밍
- core-api/              공통 API (인증/알림/결제/테넌트). 공통 스키마는 core-api/SCHEMA.md
- packages/core-client/  core-api TypeScript 클라이언트 SDK
- apps/*/                각 SaaS 프론트엔드 (UI + 자기 도메인). 도메인 스키마는 apps/*/SCHEMA.md
- db/migrations/         DB 마이그레이션 (Supabase SQL Editor에서 실행)

네이밍 규칙
- 앱 디렉토리명 ↔ DB 도메인 스키마명(약어)을 1:1로 매핑한다.
  예: `revenue-retention-os` → 스키마 `rros`. 공통 테이블은 `core` 스키마.
- 마이그레이션 파일: `db/migrations/YYYYMMDD_<설명>.sql` (flat, 날짜 프리픽스).
  현재는 폴더 분리 없이 파일명으로 구분. (스키마별 하위폴더 분리는 향후 검토 항목)

## 신규 도메인(새 앱) 생성 절차
새 SaaS 앱은 정의상 도메인 문서가 아직 없으므로 아래 순서로 진행한다.
1. **도메인 정의 먼저**: `apps/<app>/CLAUDE.md`에 도메인 책임 / 스키마명 / 핵심 테이블 /
   역할·권한 / 비즈니스 규칙을 적고 합의한다. (이 단계를 건너뛰면 Claude Code의 "정지 게이트"가 계속 걸린다.)
2. **스키마/스코프 확정**: 도메인 스키마명(약어) 결정, core에서 재사용할 항목 확인.
3. **스캐폴딩**: 새 Next.js 앱 생성. 이 단계의 다량 파일 생성은 파일 규율의 예외.
4. **core 연동**: 인증/알림/결제는 core-client로 호출한다. 절대 재구현하지 않는다.
5. **마이그레이션**: `db/migrations/`에 날짜 프리픽스 SQL로 도메인 스키마/테이블을 생성한다.

앱별 CLAUDE.md 최소 템플릿:
```markdown
# <app-name> 도메인 지침

## 도메인 요약
<한 줄 설명>. DB 스키마: <약어> (공통은 core).

## 핵심 테이블 / 역할
- 핵심 테이블: <table1, table2, ...>
- 역할·권한: <admin/manager/... + RLS 요약>

## 비즈니스 규칙 (SSOT)
- <규칙 요약 또는 상세 문서 링크>

@AGENTS.md
```

## 자주 하는 실수 방지
- 새 SaaS의 사용자 테이블을 만들지 말 것. core.users를 참조한다.
- 이메일 발송 라이브러리를 프론트에 직접 설치하지 말 것.
  core-client의 notify.sendEmail()을 호출한다.
- 결제·외부 서비스 키는 core-api 환경변수로만 둔다. 프론트 .env에 절대 노출 금지. (절대 규칙 4)
