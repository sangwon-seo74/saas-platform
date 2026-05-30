# SaaS Platform — 작업 현황 (WORKLOG)

> 진행 중인 작업, 미완료 항목, 결정 사항을 기록하는 파일.
> 완료 후에도 삭제하지 말고 [완료] 처리. 이유: 맥락 유지.
> 날짜는 `YYYY-MM-DD` 형식.

---

## 진행 중 작업

### [2026-05-30] liquor-sales-os (LSO) 스캐폴딩

**목표**: 주류업체 영업담당자 방문·거래처 관리 SaaS 신규 앱 초기 구조 생성

**완료된 작업**:
- [x] `apps/liquor-sales-os/CLAUDE.md` — 도메인 지침
- [x] `apps/liquor-sales-os/SCHEMA.md` — DB 스키마 정의
- [x] `apps/liquor-sales-os/package.json` — 의존성 (port 3002)
- [x] `apps/liquor-sales-os/next.config.ts`
- [x] `apps/liquor-sales-os/tailwind.config.ts` — 오렌지 브랜드 컬러
- [x] `apps/liquor-sales-os/tsconfig.json`
- [x] `apps/liquor-sales-os/.env.example` — KAKAO_MAP_KEY 포함
- [x] `apps/liquor-sales-os/src/middleware.ts` + `proxy.ts` — 인증 미들웨어
- [x] `apps/liquor-sales-os/src/lib/supabase/` — 클라이언트 3종 (browser/server/proxy)
- [x] `apps/liquor-sales-os/src/types/domain.ts` — 전체 도메인 타입
- [x] `apps/liquor-sales-os/src/lib/utils.ts` — 유틸 (GPS 거리 계산 포함)
- [x] `apps/liquor-sales-os/src/app/layout.tsx` — 모바일 PWA 메타태그
- [x] `apps/liquor-sales-os/src/app/(auth)/login/page.tsx` — 오렌지 테마 로그인
- [x] `apps/liquor-sales-os/src/app/app/layout.tsx` — 사이드바 (role-based 메뉴)
- [x] `apps/liquor-sales-os/src/app/app/dashboard/page.tsx` — 통계 + 최근 방문 + 담당자 위치
- [x] `apps/liquor-sales-os/src/app/app/map/page.tsx` — 카카오맵 뷰
- [x] `apps/liquor-sales-os/src/components/map/MapView.tsx` — 카카오맵 컴포넌트 (키 없으면 폴백)
- [x] `apps/liquor-sales-os/src/app/app/clients/page.tsx` — 거래처 목록
- [x] `apps/liquor-sales-os/src/app/app/clients/[id]/page.tsx` — 거래처 상세
- [x] `apps/liquor-sales-os/src/app/app/visits/page.tsx` — 방문 내역
- [x] `apps/liquor-sales-os/src/app/app/visits/[id]/page.tsx` — 방문 상세
- [x] `apps/liquor-sales-os/src/app/app/reps/page.tsx` — 영업담당자 목록
- [x] `apps/liquor-sales-os/src/app/app/products/page.tsx` — 제품 목록
- [x] `apps/liquor-sales-os/src/app/mobile/layout.tsx` — 하단 탭 모바일 레이아웃
- [x] `apps/liquor-sales-os/src/app/mobile/checkin/page.tsx` — GPS 체크인 (4단계 플로)
- [x] `apps/liquor-sales-os/src/app/mobile/visits/page.tsx` — 내 방문기록 (모바일)
- [x] `apps/liquor-sales-os/src/app/mobile/clients/page.tsx` — 내 거래처 (모바일)
- [x] `apps/liquor-sales-os/src/app/api/me/route.ts`
- [x] `apps/liquor-sales-os/src/app/api/visits/route.ts` — GET/POST
- [x] `apps/liquor-sales-os/src/app/api/visits/[id]/route.ts` — GET/PATCH
- [x] `apps/liquor-sales-os/src/app/api/clients/route.ts` — GET/POST
- [x] `apps/liquor-sales-os/src/app/api/clients/nearby/route.ts` — GPS 근처 거래처
- [x] `apps/liquor-sales-os/src/app/api/dashboard/route.ts`
- [x] `db/migrations/20260530_lso_init.sql` — 전체 스키마 + RLS + 트리거
- [x] `AGENTS.md` — 앱 표에 lso 추가
- [x] `apps/landing/src/app/page.tsx` — LSO 제품 카드 추가
- [x] `apps/landing/.env.example` — LSO_URL 추가

**다음 작업 (Phase 2)**:
- [x] `pnpm install` 실행 후 빌드 검증 (visits/[id]/edit 미사용 import 수정 포함)
- [x] `apps/liquor-sales-os/src/app/app/clients/new/page.tsx` — 거래처 등록 폼 (스캐폴딩 시 생성됨)
- [x] `apps/liquor-sales-os/src/app/app/clients/[id]/edit/page.tsx` — 거래처 수정 (스캐폴딩 시 생성됨)
- [x] `apps/liquor-sales-os/src/app/app/reps/[id]/page.tsx` — 담당자 상세 (스캐폴딩 시 생성됨)
- [x] `apps/liquor-sales-os/src/app/app/settings/page.tsx` — 설정 (스캐폴딩 시 생성됨)
- [x] 카카오맵 API 키 발급 후 지도 기능 검증 (완료 확인됨, 건너뜀)
- [x] Vercel 프로젝트 `lso` 생성 (프로젝트명: `liquor-sales-os`, 이미 존재)
- [x] Vercel 환경변수 설정 (`liquor-sales-os` 프로젝트) — 이전 배포에서 이미 설정됨
- [x] `apps/landing/.env.local`에 `NEXT_PUBLIC_LSO_URL` 설정 — `.env.production`에 https://liquor-sales-os.vercel.app로 설정. Vercel alias 확인.
- [x] 담당자 배정 UI (`/app/clients/[id]`) — `addAssignmentAction` server action 구현됨
- [x] 방문 완료 처리 (체크아웃 기능) — `completeVisitAction` server action 구현됨
- [x] 주간/월간 방문 리포트 페이지 (`/app/reports`, 사이드바 메뉴 추가, admin/manager 전용)

**가정/결정 사항**:
- 지도: 카카오맵 API 사용. 키 없으면 목록 폴백으로 자동 처리됨.
- DB: Supabase 공유 프로젝트 사용 (ncm과 동일 Supabase 인스턴스).
- 스키마: `public.users` (core)를 직접 참조. `lso.*` 테이블은 모두 `lso` 스키마.
- 역할: `admin`, `manager`, `rep` — core.users의 role 컬럼 재사용.
- 모바일 진입: `/mobile/*` 경로 (미들웨어에서 인증 처리).
- 브랜드 컬러: 오렌지(#ea580c) — 주류 브랜드 이미지.

---

## 완료된 작업

### [2026-05-30] 프로젝트 공통 WORKLOG 신설
- `WORKLOG.md` 생성 (이 파일). 모든 SaaS 작업 현황을 단일 파일로 추적.

---

## 앱별 배포 현황

| 앱 | 상태 | URL |
|---|---|---|
| landing | 배포됨 | saas-foundry.vercel.app |
| revenue-retention-os | 배포됨 | revenue-retention-os.vercel.app |
| namecard-crm | 배포됨 | (별도 URL) |
| liquor-sales-os | **스캐폴딩 완료 / 미배포** | — |
