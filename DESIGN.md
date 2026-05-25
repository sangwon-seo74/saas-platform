# 디자인 정책 (모든 SaaS 공통 · DESIGN SSOT)

> 이 문서는 현재 구현된 디자인(`apps/revenue-retention-os`)에서 도출한 **공통 디자인 단일 출처**다.
> 모든 apps/*는 이 정책을 따른다. 디자인은 향후 여러 차례 수정될 예정이므로, **토큰/원칙 중심**으로
> 관리하고 변경 시 토큰 소스와 이 문서를 **같은 PR에서 함께 갱신**한다.

## 0. 적용 범위 & 갱신 규칙
- 모든 SaaS 앱에 공통 적용. 앱 고유 예외가 필요하면 해당 앱 폴더 문서에 따로 명시한다.
- 토큰 실제 소스(현재): `apps/revenue-retention-os/tailwind.config.ts` + `src/app/globals.css`.
  → 2번째 앱이 생기면 `packages/`의 공유 디자인 패키지로 추출하는 것을 권장(현재는 미추출).
- 임의의 색·폰트·간격·컴포넌트 스타일을 새로 도입하지 않는다. 토큰에 없으면 이 문서를 먼저 갱신한다.

## 1. 기반 (Foundations)
- **테마**: 다크 모드 기본. `<html class="dark">` 강제, Tailwind `darkMode: 'class'`.
  라이트 토큰도 `:root`에 정의되어 있어 향후 라이트/토글 확장 가능.
- **폰트**: 본문 `Pretendard Variable`(CDN import), 숫자·코드 `JetBrains Mono`.
  금액·수치 표기는 `.font-tabular`(`tabular-nums`)로 자릿수 정렬.
- **빌드**: Tailwind CSS v3 (`tailwind.config.ts` + `@tailwind` 디렉티브 + postcss `tailwindcss`/`autoprefixer`).
- **접근성/모션**: `:focus-visible` 링(2px solid `--border-focus`, offset 2px), `prefers-reduced-motion` 존중,
  `-webkit-font-smoothing: antialiased`. 커스텀 스크롤바 6px.

## 2. 컬러 토큰
- **brand (blue 50–900)** — 주요 액션/링크/포커스. 기본값 `brand-500 #3b82f6`(다크 강조 `#58A6FF`).
- **dk.* (GitHub 다크 계열)** — 다크 UI 표면/경계/텍스트.
  `bg #0D1117 · surface #161B22 · surface2 #1C2128 · border #21262D · border2 #30363D ·`
  `text #E6EDF3 · muted #8B949E · dim #6E7681 · blue #58A6FF · green #3FB950 · purple #D2A8FF · red #FF7B72 · orange #E3B341`.
- **CSS 변수** (`:root` 라이트 / `.dark` 다크): `--bg-*`, `--text-*`, `--border-*`, `--interactive-*`, `--risk-*`.
  컴포넌트는 가능한 한 토큰/변수를 사용하고 **하드코딩 hex를 지양**한다.

## 3. 시맨틱 상태 색상 (배지·태그)
- 색의 **의미 표준**: 성공/완료 = green, 진행/정보 = blue, 주의/대기 = amber, 위험/실패/이탈 = red, 중립/비활성 = slate.
- 위험도(risk): high = red, medium = amber, low = green (라이트/다크 변형 모두 `--risk-*`에 정의).
- 도메인 상태의 레이블·색은 **`src/constants/domain.ts`의 `*_LABEL` / `*_CLASS` 맵에서 중앙 관리**한다.
  컴포넌트에서 색을 임의 지정하지 말고 이 맵을 사용한다.
- 배지 권장 패턴(모두 dark 변형 포함):
  `bg-{color}-50 text-{color}-600 dark:bg-{color}-950 dark:text-{color}-400`.

## 4. 컴포넌트 스택
- **shadcn/ui** (`components.json`: style `radix-nova`, baseColor `neutral`, cssVariables). Radix UI primitives.
- **아이콘**: `lucide-react`.
- **클래스 병합**: `cn()` = `clsx` + `tailwind-merge`. 변형 정의는 `class-variance-authority`(CVA).
- **alias**: `@/components/ui`, `@/lib/utils`, `@/components`, `@/hooks`, `@/lib`.
- 새 컴포넌트는 shadcn 규약 + 위 토큰을 따른다. 새 UI 라이브러리·아이콘 세트 도입은 사전 합의.

## 5. 구현 규약 (Consistency Rules)
- 상태 배지 클래스는 `constants/domain.ts`의 `*_CLASS`에 **3절 패턴으로 통일**되어 있다
  (하드코딩 hex·`dk-*` 미사용, 모두 `dark:` 변형 포함). 새 상태 추가 시 동일 패턴을 따른다.
  예외: `RISK_CLASS`만 강조용 `border`를 포함한다.
- 토큰성 클래스를 담는 디렉토리는 Tailwind `content` 글롭에 포함되어야 purge되지 않는다.
  현재 `content`에 `src/constants/**` 포함됨. 새 위치에 클래스를 두면 `content`에 추가한다.
- Tailwind는 **v3 단일 구성**으로 유지한다. v4 도입은 별도 마이그레이션으로 사전 합의(혼용 금지).
