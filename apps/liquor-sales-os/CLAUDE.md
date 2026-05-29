# liquor-sales-os 도메인 지침

## 도메인 요약
주류업체 영업담당자 관리 SaaS. 거래처(주류 판매처) 관리와 영업담당자 방문·영업 내역 추적.
관리자는 PC에서 지도 기반 영업 현황을 파악하고, 영업담당자는 모바일에서 방문 체크인을 입력한다.
DB 스키마: `lso` (도메인 테이블), 공통 인프라는 `core` 스키마.

## 핵심 테이블 / 역할
- 핵심 테이블: clients, visits, visit_items, products, orders, sales_assignments, rep_locations
- 역할·권한:
  - `admin`: 전체 관리. 모든 거래처·담당자·방문기록 조회·수정. 담당 배정 변경.
  - `manager`: 지역 관리자. 자기 팀 담당자와 거래처만 접근.
  - `rep`: 영업담당자. 자신에게 배정된 거래처와 본인 방문기록만 접근.
  - RLS = 테넌트 격리(`fn_my_tenant_id()`) + 역할별 행 필터링.

## 비즈니스 규칙 (SSOT)

### 방문 기록
- 방문 체크인 시 GPS 좌표(lat, lng)를 필수 저장한다.
- 방문 상태: `planned`(예정) → `checked_in`(체크인) → `completed`(완료) → `cancelled`(취소).
- 체크인 후 `completed`까지 최대 8시간. 초과 시 자동으로 `completed` 처리 (배치 또는 트리거).
- 방문당 visit_items(상담 내역·주문)는 0개 이상 가능.

### 거래처 관리
- 거래처는 사업자등록번호(`biz_no`)로 중복 감지. null이면 skip.
- 거래처 유형(`client_type`): `restaurant`(음식점), `bar`(주점), `wholesale`(도매), `retail`(소매), `other`.
- 거래처 GPS 좌표는 등록 시 카카오 지도 API로 주소 → 좌표 변환.

### 지도 / 위치
- 지도는 카카오맵 API (`NEXT_PUBLIC_KAKAO_MAP_KEY`). 키 없으면 위치 목록 테이블로 폴백.
- 영업담당자 마지막 위치는 방문 체크인 시 `rep_locations` 테이블에 upsert.
- 위치 데이터는 GDPR/개인정보보호법상 민감 데이터: 담당자 본인과 admin/manager만 접근.

### 제품·주문
- 제품 목록(`products`)은 admin만 관리.
- 주문(`orders`)은 방문 기록에 연결. 별도 주문 워크플로는 Phase 2.
- 현재 MVP는 방문 시 상담 내용과 수량 메모 수준.

### 구독 / 사용량 한도
- TBD — 플랜 확정 시 기재.

## UI/UX 방향
- **관리자(PC)**: 사이드바 네비게이션, 지도 대시보드, 테이블형 데이터 보기.
- **영업담당자(모바일)**: 하단 탭 네비게이션, 카드형 UI, 한 손 조작 최적화.
- 디바이스 구분은 `useMediaQuery` + URL path (`/mobile/*`) 병행. 영업담당자도 PC 접속 가능.

## 스키마 (SSOT)
- 도메인(`lso`) 테이블 / RLS / 트리거: [./SCHEMA.md](./SCHEMA.md)
- 공통(`core`) 스키마: [../../core-api/SCHEMA.md](../../core-api/SCHEMA.md)

## Vercel 프로젝트
| 항목 | 값 |
|------|-----|
| 앱 디렉토리 | `apps/liquor-sales-os` |
| Vercel 프로젝트명 | `lso` |
| 배포 URL | (별도 Vercel 프로젝트) |

@AGENTS.md
