# Revenue Retention OS

B2B 데이터 라이선스 판매사 전용 **갱신(Renewal) 중심 영업관리 SaaS**

> 일반 CRM(Salesforce/HubSpot 스타일)이 아닌,  
> **계약 만료일 기반 갱신 파이프라인**을 핵심으로 설계된 영업 OS입니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Style | TailwindCSS + Pretendard |
| API | REST (Next.js Route Handlers) |

---

## 시작하기

### 1. 환경변수 설정

```bash
cp .env.local.example .env.local
# .env.local 편집 후 Supabase 키 입력
```

### 2. 의존성 설치

```bash
npm install
```

### 3. DB 스키마

DB 스키마는 Supabase에서 직접 관리한다. 현재 상태는 [`SCHEMA.md`](./SCHEMA.md)(도메인 `rros`) 및
[`../../core-api/SCHEMA.md`](../../core-api/SCHEMA.md)(공통 `core`)를 단일 출처로 한다.
스키마 변경은 Supabase 대시보드 SQL Editor에서 적용하고 해당 문서를 함께 갱신한다.

### 4. DB 타입 자동생성 (선택)

```bash
npm run db:types
```

### 5. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

---

## 주요 기능

### 엔드유저 영역 `/app`

| 메뉴 | 설명 |
|------|------|
| 대시보드 | 오늘 통화목표, D-7/14/30 갱신 알림, 미처리 Task |
| 고객사 | 검색/필터, Company 360 (6탭) |
| 영업활동 | 통화·방문·발송 기록 |
| 계약 | 계약 등록/상세, 발급계정, 결제처리 |
| **갱신관리** ★ | 칸반 파이프라인, D-day 위험도, 1클릭 메시지 |
| 업무 | 내 할일 / 팀 업무현황 |
| 리포트 | 갱신율·실적·ARR 예측 (manager 이상) |
| 설정 | 팀·사용자·제품·템플릿·API연동 (admin) |

### super-admin 영역 `/super-admin`

| 메뉴 | 설명 |
|------|------|
| 대시보드 | MRR/ARR, 신규가입, 만료임박, 미납 |
| 테넌트 관리 | 목록·상세(5탭)·등록 |
| 구독 관리 | 만료임박 경고, 상태 필터 |
| 결제 관리 | 수동 결제처리, 환불 |
| 플랜 관리 | 가격·제한 편집, MRR 분포 |
| 시스템 | 접속로그, 공지/점검 관리 |

---

## 폴더 구조

```
src/
├── app/
│   ├── (app)/          엔드유저 영역 (사이드바 레이아웃)
│   ├── (auth)/         로그인 / 초대수락
│   ├── (super-admin)/  운영자 영역 (다크 레이아웃)
│   └── api/            Route Handlers
├── lib/
│   ├── supabase/       클라이언트·Auth·쿼리 헬퍼
│   ├── api.ts          withAuth 래퍼, 페이지네이션
│   └── utils.ts        날짜·금액·D-day 포맷 유틸
├── types/
│   ├── domain.ts       도메인 타입
│   └── supabase.ts     DB 타입 (CLI 자동생성 대체)
└── constants/
    └── domain.ts       상태 레이블·CSS 클래스
```

---

## 권한 모델

```
super_admin  → 환경변수 화이트리스트 / /super-admin/*
admin        → 테넌트 전체 / /app/settings/*
manager      → 팀 전체    / /app/reports/*
sales        → 본인 담당만
```

---

## 자동화 (DB 레벨)

| 트리거/프로시저 | 시점 | 동작 |
|----------------|------|------|
| `trg_contract_create_renewal` | 계약 INSERT | renewals 자동 생성 |
| `pr_refresh_renewal_risk` | 매일 02:00 | risk_level/risk_score 갱신 |
| `pr_create_renewal_tasks` | 매일 02:30 | D-30/14/7 Task 자동 생성 |
| `fn_handle_new_auth_user` | Auth 가입 | users 테이블 동기화 |
| `fn_update_last_login` | Auth 로그인 | last_login_at 갱신 |

---

## 참조 문서

- [`SCHEMA.md`](./SCHEMA.md) — 도메인(`rros`) DB 스키마 현재 상태 SSOT
- [`../../core-api/SCHEMA.md`](../../core-api/SCHEMA.md) — 공통(`core`) 스키마 SSOT
- [`CLAUDE.md`](./CLAUDE.md) — 도메인 지침 (역할·핵심 테이블·연동 상태)
- [`../../DESIGN.md`](../../DESIGN.md) — 공통 디자인 정책 (토큰·테마·컴포넌트)
- [`docs/super-admin-roadmap.md`](./docs/super-admin-roadmap.md) — 슈퍼어드민 로드맵
- 플랫폼 공통 규칙: [`../../CLAUDE.md`](../../CLAUDE.md)
