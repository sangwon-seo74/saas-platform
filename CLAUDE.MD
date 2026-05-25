# 프로젝트 지침 (최우선 적용)

## 프로젝트 개요
여러 Micro SaaS를 단일 모노레포에서 운영. 공통 인프라(인증/알림/결제)는
core-api에 집중, 각 제품은 apps/* 아래에 독립 Next.js 앱.

## 절대 규칙
1. 공통 기능(회원가입/이메일/SMS/카카오톡/결제)은 절대 각 SaaS 앱 안에서
   재구현하지 않는다. 반드시 core-api를 호출하거나 packages/core-client를 import한다.
2. DB 접근:
   - core.* 스키마는 core-api를 통해서만 수정한다. 프론트나 다른 도메인 코드가
     직접 INSERT/UPDATE 금지.
   - 각 도메인 스키마(saas_a, saas_b...)는 해당 앱에서만 수정한다.
3. 인증은 Supabase JWT를 신뢰의 단일 소스로 사용. core-api는 검증만 한다.
4. 환경변수는 .env.example을 항상 동기화해서 커밋한다.

## 기술 스택 (이외 도입 시 사전 합의 필요)
- Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 + Alembic
- Frontend: Next.js 15 App Router + TypeScript (strict) + TailwindCSS
- DB: PostgreSQL 16 (Supabase)
- 패키지 매니저: pnpm (workspaces)
- 테스트: pytest (백엔드), Vitest + Playwright (프론트)

## 코드 컨벤션
- Python: ruff + mypy strict. 함수 시그니처에 타입 힌트 필수.
- TypeScript: strict 모드. any 금지. 외부 데이터는 zod로 파싱.
- 커밋: Conventional Commits (feat:, fix:, refactor:, docs:, test:)
- API 응답: { data, error } 형태로 통일. HTTP 상태 코드는 표준 준수.

## 작업 시 행동 규칙
1. 어떤 SaaS의 작업인지 먼저 확인. apps/saas-x/ 안에서 작업 시
   해당 폴더의 CLAUDE.md를 추가로 읽는다.
2. 공통기능을 추가/수정해야 할 때는 core-api 또는 packages/core-client만
   건드린다. 절대 각 앱에 복붙하지 않는다.
3. DB 스키마 변경은 db/migrations/<scope>/ 안에 Alembic 또는 SQL 마이그레이션
   파일로 생성. 직접 DB를 수정하지 않는다.
4. 새 기능 추가 시 테스트 코드를 같은 PR에 포함한다.

## 디렉토리 책임 요약
- core-api/        공통 API (인증/알림/결제/테넌트)
- packages/core-client/  core-api TypeScript 클라이언트 SDK
- apps/*/          각 SaaS 프론트엔드
- db/migrations/   DB 마이그레이션 (스키마별 분리)

## 자주 하는 실수 방지
- 새 SaaS의 사용자 테이블을 만들지 말 것. core.users를 참조한다.
- 이메일 발송 라이브러리를 프론트에 직접 설치하지 말 것. 
  core-client의 notify.sendEmail() 호출한다.
- 결제 키(Stripe, Toss, PortOne 등)는 core-api 환경변수로만 둔다. 
  프론트 .env에 절대 노출 금지.

## 권한 우회 예외 — 정지 게이트 (최우선)
`--dangerously-skip-permissions` / `"defaultMode": "bypassPermissions"` 가 켜져 있어도,
아래에 해당하는 결정의 근거가 문서(CLAUDE.md, 각 앱 CLAUDE.md, docs/, db/migrations/,
.env.example, 코드 주석 등)에 명시되어 있지 않으면 **자동 진행하지 말고
AskUserQuestion 으로 먼저 질문한다.**
- 도메인 정책: 어떤 SaaS/스키마/테넌트에 속하는지, 데이터 소유·접근 경계
- 수정 방향: 되돌리기 어렵거나 공개 영향이 있는 변경의 방향성
  (스키마 변경, 공통 기능 수정, 결제·인증 흐름 변경, 비가역 마이그레이션)
- 비즈니스 규칙: 요금/한도/권한/정산 등 코드·문서에 명시되지 않은 규칙

원칙: "문서에 근거 없음 → 질문" 을 기본값으로 한다. 문서에 근거가 있으면 그대로 진행한다.
이 규칙은 권한 모드보다 우선하며, bypass 모드에서도 질문은 정상 동작한다.